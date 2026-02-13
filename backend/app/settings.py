from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_URL = "sqlite:///" + str(BASE_DIR / "app.db")
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
