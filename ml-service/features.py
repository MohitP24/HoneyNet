import re
import math
from typing import List
from datetime import datetime
import joblib
import os
import numpy as np

# ------------------------------
# Load TF-IDF Vectorizer (Colab)
# ------------------------------
TFIDF_PATH = os.path.join("model", "tfidf_vectorizer_colab.pkl")
_tfidf_vec = joblib.load(TFIDF_PATH) if os.path.exists(TFIDF_PATH) else None
_tfidf_k = len(_tfidf_vec.get_feature_names_out()) if _tfidf_vec else 0

# ------------------------------
# Feature Utilities
# ------------------------------
def count_digits(s: str) -> int:
    return sum(c.isdigit() for c in s)

def count_words(s: str) -> int:
    return len(s.split())

# ------------------------------
# Final Feature Extractor
# ------------------------------
def extract_features(record: dict) -> List[float]:
    payload = (record.get("payload") or "")
    event = (record.get("event") or "")
    text = f"{event} {payload}".lower()

    # ✅ Only these 3 numeric features
    numeric = [
        float(len(payload)),
        float(count_digits(payload)),
        float(count_words(payload)),
    ]

    # ✅ TF-IDF features
    tfidf = []
    if _tfidf_vec:
        try:
            vec = _tfidf_vec.transform([payload])
            arr = vec.toarray().reshape(-1)
            if len(arr) < _tfidf_k:
                arr = np.concatenate([arr, np.zeros(_tfidf_k - len(arr))])
            else:
                arr = arr[:_tfidf_k]
            tfidf = arr.tolist()
        except:
            tfidf = [0.0] * _tfidf_k

    return numeric + tfidf
