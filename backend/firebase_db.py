import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger("EcoPulseFirebase")

db = None

from config import settings

# Initialize Firebase with dynamic fallback
try:
    cred_path = settings.firebase_service_account_path
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logger.info("Firebase Admin initialized successfully using service account JSON.")
    else:
        # Fallback to default initialization if environment supports it
        firebase_admin.initialize_app()
        db = firestore.client()
        logger.info("Firebase Admin initialized successfully using Application Default Credentials.")
except Exception as e:
    logger.warning(f"Firebase not initialized: {e}. Falling back to in-memory mocks.")
    db = None

# In-memory fallback databases
_mock_search_history = []
_mock_carbon_history = []

def save_search_event(location: str, metrics: dict):
    """Saves city search metrics event to Firestore or in-memory mock."""
    data = {
        "location": location,
        "metrics": metrics,
        "timestamp": "now"
    }
    if db:
        try:
            data["timestamp"] = firestore.SERVER_TIMESTAMP
            db.collection("search_history").add(data)
            logger.info(f"Logged search for {location} to Firestore.")
        except Exception as e:
            logger.error(f"Error logging search to Firestore: {e}")
    else:
        _mock_search_history.append(data)
        logger.info(f"[Mock DB] Stored search for {location} in memory.")

def save_carbon_event(inputs: dict, result: dict):
    """Saves carbon calculations to Firestore or in-memory mock."""
    data = {
        "inputs": inputs,
        "result": result,
        "timestamp": "now"
    }
    if db:
        try:
            data["timestamp"] = firestore.SERVER_TIMESTAMP
            db.collection("carbon_history").add(data)
            logger.info("Logged carbon footprint calculation to Firestore.")
        except Exception as e:
            logger.error(f"Error logging carbon footprint to Firestore: {e}")
    else:
        _mock_carbon_history.append(data)
        logger.info("[Mock DB] Stored carbon calculation in memory.")
