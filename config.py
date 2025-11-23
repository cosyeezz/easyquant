# easyquant/config.py
import os
from dotenv import load_dotenv

load_dotenv()

# --- Database Configuration ---
DB_USER = os.getenv("DB_USER", "easyquant")
DB_PASSWORD = os.getenv("DB_PASSWORD", "easyquant20251123")
DB_HOST = os.getenv("DB_HOST", "192.168.3.15")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "easyquant")

# Construct the async database URL
DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# --- Data Source Configuration ---
CSV_FOLDER_PATH = os.getenv("CSV_FOLDER_PATH", "data/csv")


# --- Logging Configuration ---
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
LOG_FILE = "easyquant.log"
