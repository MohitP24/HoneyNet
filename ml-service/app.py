# app.py — Final Ensemble with weighted majority, suspicious token override

# Suppress TensorFlow info and warning messages
import os

# Change to script directory to find model files
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # 0=all, 1=info, 2=warning, 3=error
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN messages

import warnings
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', category=FutureWarning)

import time
import json
import logging
from datetime import datetime
import numpy as np

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict

import joblib
from tensorflow.keras.models import load_model  

from features import extract_features

# --------------------------
# Config + Paths
# --------------------------
IF_MODEL_PATH = os.environ.get("MODEL_PATH", "model/isolation_forest_model.pkl")
IF_MODEL_VERSION = os.environ.get("MODEL_VERSION", "v1.0")

AE_MODEL_PATH = os.environ.get("AE_MODEL_PATH", "model/autoencoder_model_colab.keras")
NUM_SCALER_PATH = os.environ.get("NUM_SCALER_PATH", "model/num_scaler_colab.pkl")
TFIDF_VECTORIZER_PATH = os.environ.get("TFIDF_VECTORIZER_PATH", "model/tfidf_vectorizer_colab.pkl")

ANOMALY_THRESHOLD = float(os.environ.get("ANOMALY_THRESHOLD", "0.55"))
IF_WEIGHT = float(os.environ.get("IF_WEIGHT", "0.85"))
NUMERIC_DIM = 3  # payload_len, num_digits, num_words
AE_OUTLIER_RATIO = float(os.environ.get("AE_OUTLIER_RATIO", "100.0"))

# --------------------------
# Logging + FastAPI setup
# --------------------------
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("ml_service")
app = FastAPI(title="AI Honeynet ML Service — Weighted Ensemble")

class PredictRequest(BaseModel):
    honeypotId: str
    srcIp: str
    event: str
    payload: str
    timestamp: Optional[str] = None

class PredictResponse(BaseModel):
    score: Optional[float]
    label: Optional[str]
    model_version: Optional[Dict]
    explanation: Optional[Dict]

# --------------------------
# Globals
# --------------------------
if_model = None
ae_model = None
num_scaler = None
tfidf_vec = None

# --------------------------
# Helpers
# --------------------------
def sigmoid(x: float) -> float:
    x = float(np.clip(x, -50.0, 50.0))
    return 1.0 / (1.0 + np.exp(-x))

def safe_float(x, default=0.0):
    try:
        return float(x)
    except:
        return default

# --------------------------
# Startup
# --------------------------
@app.on_event("startup")
def startup_event():
    global if_model, ae_model, num_scaler, tfidf_vec

    try:
        if_model = joblib.load(IF_MODEL_PATH)
        logger.info(f"✅ Loaded Isolation Forest model from {IF_MODEL_PATH}")
    except Exception as e:
        logger.error(f"❌ IF model load error: {e}")

    try:
        ae_model = load_model(AE_MODEL_PATH)
        num_scaler = joblib.load(NUM_SCALER_PATH)
        tfidf_vec = joblib.load(TFIDF_VECTORIZER_PATH)
        logger.info("✅ Loaded Autoencoder model + scalers")
    except Exception as e:
        logger.error(f"❌ AE model load error: {e}")

# --------------------------
# Health Check Endpoint
# --------------------------
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models_loaded": if_model is not None and ae_model is not None,
        "timestamp": datetime.utcnow().isoformat()
    }

# --------------------------
# Prediction Endpoint
# --------------------------
@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    start = time.perf_counter()

    feats = extract_features(req.dict())
    feats = np.array(feats).reshape(1, -1)

    X_num = feats[:, :NUMERIC_DIM]
    X_tfidf = feats[:, NUMERIC_DIM:]

    # ----- Isolation Forest
    if_score = None
    try:
        raw = if_model.decision_function(feats)[0]
        if_score = 1.0 / (1.0 + np.exp(float(raw)))
    except:
        pass

    # ----- Autoencoder
    ae_score = None
    try:
        X_num_scaled = num_scaler.transform(X_num)
        X_tfidf_scaled = X_tfidf  # already tfidf vectorized
        X_combined = np.hstack([X_num_scaled, X_tfidf_scaled])
        recon = ae_model.predict(X_combined, verbose=0)
        recon_error = float(np.mean((X_combined - recon) ** 2))
        ae_score = sigmoid(recon_error * AE_OUTLIER_RATIO)
    except:
        pass

    # ----- Fusion (Weighted Average)
    final_score = None
    if (if_score is not None) and (ae_score is not None):
        final_score = IF_WEIGHT * if_score + (1 - IF_WEIGHT) * ae_score
    elif if_score is not None:
        final_score = if_score
    elif ae_score is not None:
        final_score = ae_score

    # ----- Rule-Based Override (Token Heuristic)
    text = f"{req.event} {req.payload}".lower()
    suspicious_tokens = ["curl", "bash", "password", "root", "wget", "eval"]
    matched_tokens = [tok for tok in suspicious_tokens if tok in text]
    if matched_tokens:
        final_score = max(final_score or 0, 0.9)

    # ----- Final Label
    label = "anomalous" if final_score is not None and final_score >= ANOMALY_THRESHOLD else "normal"

    latency_ms = int((time.perf_counter() - start) * 1000)
    logger.info(json.dumps({
        "ts": datetime.utcnow().isoformat(),
        "srcIp": req.srcIp,
        "latency_ms": latency_ms,
        "if_score": if_score,
        "ae_score": ae_score,
        "final_score": final_score,
        "label": label,
        "if_weight": IF_WEIGHT,
        "matched_tokens": matched_tokens
    }))

    return {
        "score": final_score,
        "label": label,
        "model_version": {
            "isolation_forest": IF_MODEL_VERSION,
            "autoencoder": "colab-final"
        },
        "explanation": {
            "if_score": if_score,
            "ae_score": ae_score,
            "fusion": f"Weighted average (IF={IF_WEIGHT}, AE={1 - IF_WEIGHT})",
            "matched_tokens": matched_tokens if matched_tokens else None,
            "reason": "suspicious token override" if matched_tokens else "model ensemble decision"
        }
    }

# --------------------------
# Run the FastAPI server
# --------------------------
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting ML Service on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
