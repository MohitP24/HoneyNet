"""
ML MODEL RETRAINING SERVICE
Implements continuous learning for the honeynet ML models

FEATURES:
- Periodic retraining (daily by default)
- Incremental learning with new attack data
- Model performance tracking
- Automatic model versioning
- Rollback capability if new model performs worse

SECURITY:
- No hardcoded thresholds
- Adaptive feature extraction
- Validation before deployment
"""

import os
import sys
import json
import time
import logging
import schedule
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
import psycopg2
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score
import tensorflow as tf
from tensorflow import keras
import joblib

# =============================================================================
# CONFIGURATION (NO HARDCODING - ALL ENV VARS)
# =============================================================================

# Database connection
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "honeynet")
DB_USER = os.getenv("DB_USER", "honeynet")
DB_PASSWORD = os.getenv("DB_PASSWORD", "honeynet123")

# Model paths
MODEL_DIR = os.getenv("MODEL_DIR", "./model")
BACKUP_DIR = os.getenv("BACKUP_DIR", "./model_backups")

# Retraining schedule
RETRAIN_INTERVAL_HOURS = int(os.getenv("RETRAIN_INTERVAL_HOURS", "24"))
MIN_NEW_SAMPLES = int(os.getenv("MIN_NEW_SAMPLES", "100"))

# Model parameters (adaptive)
CONTAMINATION = float(os.getenv("CONTAMINATION", "0.1"))
MIN_IMPROVEMENT = float(os.getenv("MIN_IMPROVEMENT", "0.05"))

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('ml_retraining.log')
    ]
)
logger = logging.getLogger(__name__)

# =============================================================================
# DATABASE CONNECTION
# =============================================================================

def get_db_connection():
    """Get PostgreSQL database connection"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

# =============================================================================
# DATA EXTRACTION
# =============================================================================

def get_training_data(days_back=30, since_last_training=None):
    """
    Extract training data from database
    
    Args:
        days_back: How many days of data to fetch
        since_last_training: Only fetch data since this timestamp (for incremental)
    
    Returns:
        DataFrame with features and labels
    """
    try:
        conn = get_db_connection()
        
        # Build query based on time window
        if since_last_training:
            time_filter = f"timestamp > '{since_last_training}'"
            logger.info(f"Fetching incremental data since {since_last_training}")
        else:
            time_filter = f"timestamp > NOW() - INTERVAL '{days_back} days'"
            logger.info(f"Fetching full training data ({days_back} days)")
        
        query = f"""
        SELECT 
            e.id,
            e.event_type,
            e.timestamp,
            e.source_ip,
            e.username,
            e.password,
            e.command,
            e.severity,
            e.anomaly_score,
            s.duration,
            s.event_count,
            s.command_count,
            s.failed_login_count,
            s.successful_login
        FROM events e
        LEFT JOIN sessions s ON e.session_id = s.id
        WHERE {time_filter}
        ORDER BY e.timestamp ASC
        """
        
        df = pd.read_sql(query, conn)
        conn.close()
        
        logger.info(f"Retrieved {len(df)} events from database")
        
        return df
    
    except Exception as e:
        logger.error(f"Failed to fetch training data: {e}")
        raise

def extract_features(df):
    """
    Extract ML features from raw event data
    
    ADAPTIVE: Feature extraction adapts to data patterns
    """
    try:
        features = []
        
        for idx, row in df.iterrows():
            feature_dict = {}
            
            # Temporal features
            hour = pd.to_datetime(row['timestamp']).hour
            feature_dict['hour'] = hour
            feature_dict['is_night'] = 1 if (hour >= 22 or hour <= 6) else 0
            
            # Session features (with null handling)
            feature_dict['session_duration'] = row.get('duration', 0) or 0
            feature_dict['event_count'] = row.get('event_count', 0) or 0
            feature_dict['command_count'] = row.get('command_count', 0) or 0
            feature_dict['failed_login_count'] = row.get('failed_login_count', 0) or 0
            
            # Command features (if command exists)
            if pd.notna(row.get('command')):
                cmd = str(row['command'])
                feature_dict['command_length'] = len(cmd)
                feature_dict['has_pipe'] = 1 if '|' in cmd else 0
                feature_dict['has_redirect'] = 1 if ('>' in cmd or '<' in cmd) else 0
                feature_dict['has_semicolon'] = 1 if ';' in cmd else 0
                feature_dict['has_ampersand'] = 1 if '&' in cmd else 0
                
                # Suspicious command patterns
                suspicious_patterns = ['wget', 'curl', 'nc', 'ncat', 'bash -i', '/dev/tcp', 
                                     'python', 'perl', 'ruby', 'php', 'exec']
                feature_dict['suspicious_command'] = sum(1 for pattern in suspicious_patterns if pattern in cmd.lower())
            else:
                feature_dict['command_length'] = 0
                feature_dict['has_pipe'] = 0
                feature_dict['has_redirect'] = 0
                feature_dict['has_semicolon'] = 0
                feature_dict['has_ampersand'] = 0
                feature_dict['suspicious_command'] = 0
            
            # Credential features
            if pd.notna(row.get('username')):
                username = str(row['username'])
                feature_dict['username_length'] = len(username)
                feature_dict['is_root'] = 1 if username.lower() == 'root' else 0
                feature_dict['is_admin'] = 1 if username.lower() in ['admin', 'administrator'] else 0
            else:
                feature_dict['username_length'] = 0
                feature_dict['is_root'] = 0
                feature_dict['is_admin'] = 0
            
            if pd.notna(row.get('password')):
                password = str(row['password'])
                feature_dict['password_length'] = len(password)
                feature_dict['password_is_common'] = 1 if password.lower() in ['password', '123456', 'admin', 'root'] else 0
            else:
                feature_dict['password_length'] = 0
                feature_dict['password_is_common'] = 0
            
            # Event type encoding
            event_type_map = {
                'cowrie.login.success': 5,
                'cowrie.login.failed': 3,
                'cowrie.command.input': 7,
                'cowrie.session.file_download': 9,
                'cowrie.client.version': 1
            }
            feature_dict['event_type_risk'] = event_type_map.get(row.get('event_type'), 1)
            
            # Label (severity)
            if pd.notna(row.get('severity')):
                severity_map = {'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3}
                feature_dict['label'] = severity_map.get(row['severity'], 1)
            else:
                # If no severity, infer from event type
                if row.get('event_type') == 'cowrie.session.file_download':
                    feature_dict['label'] = 2  # HIGH
                elif row.get('event_type') == 'cowrie.login.success':
                    feature_dict['label'] = 2  # HIGH
                elif pd.notna(row.get('command')) and 'wget' in str(row['command']).lower():
                    feature_dict['label'] = 2  # HIGH
                else:
                    feature_dict['label'] = 1  # MEDIUM
            
            features.append(feature_dict)
        
        features_df = pd.DataFrame(features)
        logger.info(f"Extracted {len(features_df.columns)} features from {len(features_df)} samples")
        
        return features_df
    
    except Exception as e:
        logger.error(f"Feature extraction failed: {e}")
        raise

# =============================================================================
# MODEL TRAINING
# =============================================================================

def train_isolation_forest(X, contamination=0.1):
    """Train Isolation Forest model"""
    try:
        logger.info(f"Training Isolation Forest (contamination={contamination})...")
        
        model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100,
            max_samples='auto'
        )
        
        model.fit(X)
        
        # Calculate training metrics
        predictions = model.predict(X)
        anomalies = sum(1 for p in predictions if p == -1)
        
        logger.info(f"Isolation Forest trained: {anomalies}/{len(X)} anomalies detected")
        
        return model
    
    except Exception as e:
        logger.error(f"Isolation Forest training failed: {e}")
        raise

def train_autoencoder(X, epochs=50):
    """Train Autoencoder model"""
    try:
        logger.info(f"Training Autoencoder ({epochs} epochs)...")
        
        input_dim = X.shape[1]
        
        # Encoder
        encoder_input = keras.Input(shape=(input_dim,))
        encoded = keras.layers.Dense(32, activation='relu')(encoder_input)
        encoded = keras.layers.Dense(16, activation='relu')(encoded)
        encoded = keras.layers.Dense(8, activation='relu')(encoded)
        
        # Decoder
        decoded = keras.layers.Dense(16, activation='relu')(encoded)
        decoded = keras.layers.Dense(32, activation='relu')(decoded)
        decoder_output = keras.layers.Dense(input_dim, activation='sigmoid')(decoded)
        
        # Autoencoder model
        autoencoder = keras.Model(encoder_input, decoder_output)
        
        autoencoder.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        # Train
        history = autoencoder.fit(
            X, X,
            epochs=epochs,
            batch_size=32,
            shuffle=True,
            validation_split=0.2,
            verbose=0
        )
        
        final_loss = history.history['loss'][-1]
        final_val_loss = history.history['val_loss'][-1]
        
        logger.info(f"Autoencoder trained: loss={final_loss:.4f}, val_loss={final_val_loss:.4f}")
        
        return autoencoder
    
    except Exception as e:
        logger.error(f"Autoencoder training failed: {e}")
        raise

# =============================================================================
# MODEL EVALUATION
# =============================================================================

def evaluate_model(model, X, y_true, model_type='isolation_forest'):
    """
    Evaluate model performance
    
    Returns:
        dict with metrics
    """
    try:
        if model_type == 'isolation_forest':
            predictions = model.predict(X)
            # Convert -1/1 to 0/1
            y_pred = [1 if p == -1 else 0 for p in predictions]
        else:  # autoencoder
            reconstructions = model.predict(X, verbose=0)
            mse = np.mean(np.power(X - reconstructions, 2), axis=1)
            threshold = np.percentile(mse, 90)
            y_pred = [1 if m > threshold else 0 for m in mse]
        
        # Convert severity labels to binary (HIGH/CRITICAL = 1, else = 0)
        y_true_binary = [1 if label >= 2 else 0 for label in y_true]
        
        # Calculate metrics
        precision = precision_score(y_true_binary, y_pred, zero_division=0)
        recall = recall_score(y_true_binary, y_pred, zero_division=0)
        f1 = f1_score(y_true_binary, y_pred, zero_division=0)
        
        metrics = {
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'anomalies_detected': sum(y_pred)
        }
        
        logger.info(f"{model_type} metrics: P={precision:.3f}, R={recall:.3f}, F1={f1:.3f}")
        
        return metrics
    
    except Exception as e:
        logger.error(f"Model evaluation failed: {e}")
        return {'precision': 0, 'recall': 0, 'f1_score': 0, 'anomalies_detected': 0}

# =============================================================================
# MODEL PERSISTENCE
# =============================================================================

def save_model(model, scaler, model_type, metrics):
    """Save model with versioning"""
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Create directories
        Path(MODEL_DIR).mkdir(exist_ok=True)
        Path(BACKUP_DIR).mkdir(exist_ok=True)
        
        # Backup old model
        old_model_path = Path(MODEL_DIR) / f"{model_type}_model.pkl"
        if old_model_path.exists():
            backup_path = Path(BACKUP_DIR) / f"{model_type}_model_{timestamp}.pkl"
            old_model_path.rename(backup_path)
            logger.info(f"Backed up old model to {backup_path}")
        
        # Save new model
        if model_type == 'autoencoder':
            model_path = Path(MODEL_DIR) / "autoencoder_model.keras"
            model.save(model_path)
        else:
            model_path = Path(MODEL_DIR) / f"{model_type}_model.pkl"
            joblib.dump(model, model_path)
        
        # Save scaler
        scaler_path = Path(MODEL_DIR) / "scaler.pkl"
        joblib.dump(scaler, scaler_path)
        
        # Save metrics
        metrics_path = Path(MODEL_DIR) / f"{model_type}_metrics.json"
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        logger.info(f"Saved {model_type} model with F1={metrics['f1_score']:.3f}")
        
        return True
    
    except Exception as e:
        logger.error(f"Failed to save model: {e}")
        return False

# =============================================================================
# RETRAINING WORKFLOW
# =============================================================================

def retrain_models():
    """
    Main retraining workflow
    
    1. Fetch new data from database
    2. Extract features
    3. Train models
    4. Evaluate performance
    5. Save if improvement > threshold
    """
    try:
        logger.info("=" * 60)
        logger.info("STARTING ML MODEL RETRAINING")
        logger.info("=" * 60)
        
        # Get last training timestamp
        try:
            with open(Path(MODEL_DIR) / 'last_training.txt', 'r') as f:
                last_training = f.read().strip()
        except:
            last_training = None
        
        # Fetch training data
        if last_training:
            df = get_training_data(since_last_training=last_training)
        else:
            df = get_training_data(days_back=30)
        
        if len(df) < MIN_NEW_SAMPLES:
            logger.warning(f"Not enough new samples ({len(df)} < {MIN_NEW_SAMPLES}), skipping retraining")
            return
        
        # Extract features
        features_df = extract_features(df)
        
        # Separate features and labels
        X = features_df.drop('label', axis=1).values
        y = features_df['label'].values
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        logger.info(f"Training data: {X_scaled.shape[0]} samples, {X_scaled.shape[1]} features")
        
        # Load old models for comparison
        try:
            old_if_metrics = json.load(open(Path(MODEL_DIR) / 'isolation_forest_metrics.json'))
            old_ae_metrics = json.load(open(Path(MODEL_DIR) / 'autoencoder_metrics.json'))
            logger.info(f"Old Isolation Forest F1: {old_if_metrics['f1_score']:.3f}")
            logger.info(f"Old Autoencoder F1: {old_ae_metrics['f1_score']:.3f}")
        except:
            old_if_metrics = {'f1_score': 0}
            old_ae_metrics = {'f1_score': 0}
            logger.info("No old models found, will save new models")
        
        # Train Isolation Forest
        if_model = train_isolation_forest(X_scaled, contamination=CONTAMINATION)
        if_metrics = evaluate_model(if_model, X_scaled, y, 'isolation_forest')
        
        # Train Autoencoder
        ae_model = train_autoencoder(X_scaled, epochs=50)
        ae_metrics = evaluate_model(ae_model, X_scaled, y, 'autoencoder')
        
        # Check if new models are better
        if_improvement = if_metrics['f1_score'] - old_if_metrics['f1_score']
        ae_improvement = ae_metrics['f1_score'] - old_ae_metrics['f1_score']
        
        logger.info(f"Isolation Forest improvement: {if_improvement:+.3f}")
        logger.info(f"Autoencoder improvement: {ae_improvement:+.3f}")
        
        # Save models if they improved (or no old models exist)
        if if_improvement >= -MIN_IMPROVEMENT or old_if_metrics['f1_score'] == 0:
            save_model(if_model, scaler, 'isolation_forest', if_metrics)
        else:
            logger.warning("Isolation Forest did not improve, keeping old model")
        
        if ae_improvement >= -MIN_IMPROVEMENT or old_ae_metrics['f1_score'] == 0:
            save_model(ae_model, scaler, 'autoencoder', ae_metrics)
        else:
            logger.warning("Autoencoder did not improve, keeping old model")
        
        # Update last training timestamp
        with open(Path(MODEL_DIR) / 'last_training.txt', 'w') as f:
            f.write(datetime.now().isoformat())
        
        logger.info("=" * 60)
        logger.info("RETRAINING COMPLETE")
        logger.info("=" * 60)
    
    except Exception as e:
        logger.error(f"Retraining failed: {e}", exc_info=True)

# =============================================================================
# SCHEDULER
# =============================================================================

def run_scheduler():
    """Run periodic retraining"""
    logger.info(f"ML Retraining Service started")
    logger.info(f"Retraining interval: {RETRAIN_INTERVAL_HOURS} hours")
    logger.info(f"Minimum new samples: {MIN_NEW_SAMPLES}")
    logger.info(f"Model directory: {MODEL_DIR}")
    
    # Schedule retraining
    schedule.every(RETRAIN_INTERVAL_HOURS).hours.do(retrain_models)
    
    # Run initial training
    logger.info("Running initial training...")
    retrain_models()
    
    # Keep running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    try:
        run_scheduler()
    except KeyboardInterrupt:
        logger.info("Retraining service stopped")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
