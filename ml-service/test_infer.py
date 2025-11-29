# test_infer.py — Weighted Ensemble Evaluation

import joblib
import os
import json
import numpy as np
from features import extract_features
from tensorflow.keras.models import load_model

# Paths
IF_PATH = "model/isolation_forest_model.pkl"
AE_PATH = "model/autoencoder_model_colab.h5"
SCALER_PATH = "model/num_scaler_colab.pkl"

# Load models
if_model = joblib.load(IF_PATH)
autoencoder = load_model(AE_PATH, compile=False)
scaler = joblib.load(SCALER_PATH)

print("✅ Models loaded.")

# Sample payloads
normal = {
    "honeypotId": "hp1",
    "srcIp": "10.0.0.5",
    "event": "connection",
    "payload": "GET /index.html HTTP/1.1",
    "timestamp": "2025-11-29T14:55:00"
}
anom = {
    "honeypotId": "hp1",
    "srcIp": "203.0.113.77",
    "event": "failed_login",
    "payload": "root tried password '123456' and failed",
    "timestamp": "2025-11-29T14:55:00"
}

examples = [("NORMAL", normal), ("ANOMALOUS", anom)]

# Ensemble weights
WEIGHT_IF = 0.7
WEIGHT_AE = 0.3
THRESHOLD = 0.5

for name, rec in examples:
    feats = extract_features(rec)
    feats = np.array(feats).reshape(1, -1)

    # Isolation Forest anomaly score (lower means more normal)
    if_score_raw = -if_model.decision_function(feats)[0]  # make higher = more anomalous
    if_score = 1 / (1 + np.exp(-if_score_raw))

    # Autoencoder reconstruction error (higher = more anomalous)
    feats_scaled = scaler.transform(feats[:, :3])  # only scale numeric
    tfidf_part = feats[:, 3:]
    ae_input = np.hstack([feats_scaled, tfidf_part])
    ae_recon = autoencoder.predict(ae_input, verbose=0)
    ae_score = np.mean(np.square(ae_input - ae_recon))

    # Normalize AE score
    ae_score_norm = 1 / (1 + np.exp(-ae_score * 10))  # non-linear stretch

    # Weighted ensemble
    combined = WEIGHT_IF * if_score + WEIGHT_AE * ae_score_norm
    label = "anomalous" if combined >= THRESHOLD else "normal"

    print(f"--- {name} ---")
    print(f"IF Score:        {round(if_score, 4)}")
    print(f"AE Score (norm): {round(ae_score_norm, 4)}")
    print(f"Combined Score:  {round(combined, 4)}")
    print(f"Predicted Label: {label}")
    print("")
