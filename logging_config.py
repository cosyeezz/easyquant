# easyquant/logging_config.py
import logging
import sys
from .config import LOG_LEVEL, LOG_FORMAT, LOG_FILE

def setup_logging():
    """
    Configures the logging for the entire application.
    """
    logging.basicConfig(
        level=LOG_LEVEL,
        format=LOG_FORMAT,
        handlers=[
            logging.FileHandler(LOG_FILE),
            logging.StreamHandler(sys.stdout)
        ]
    )
    logging.info("Logging configured.")

# To be called at the application entry point
# setup_logging()
