
import sqlite3
from pathlib import Path

data_dir = Path(__file__).resolve().parent / "data"

for filename in ("searcher.db", "finder.db"):
    db_path = data_dir / filename
    print(f"\n{filename}:")

    if not db_path.exists():
        print("Database file not found!")
        continue

    with sqlite3.connect(db_path) as connection:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
        ).fetchall()
        for table in tables:
            print("-", table[0])
