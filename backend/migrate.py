import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from sqlalchemy import text
from database import engine

IS_SQLITE = "sqlite" in str(engine.url)

def column_exists(conn, table, column):
    if IS_SQLITE:
        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
        return any(r[1] == column for r in rows)
    else:
        row = conn.execute(text(
            "SELECT 1 FROM information_schema.columns "
            f"WHERE table_name='{table}' AND column_name='{column}'"
        )).fetchone()
        return row is not None

MIGRATIONS = [
    ("users", "sender_title",        "ALTER TABLE users ADD COLUMN sender_title VARCHAR(200) NOT NULL DEFAULT ''"),
    ("users", "company_name",        "ALTER TABLE users ADD COLUMN company_name VARCHAR(200) NOT NULL DEFAULT ''"),
    ("users", "product_description", "ALTER TABLE users ADD COLUMN product_description TEXT NOT NULL DEFAULT ''"),
    ("users", "value_proposition",   "ALTER TABLE users ADD COLUMN value_proposition VARCHAR(500) NOT NULL DEFAULT ''"),
    ("users", "website",             "ALTER TABLE users ADD COLUMN website VARCHAR(500) NOT NULL DEFAULT ''"),
    ("leads", "contact_email",       "ALTER TABLE leads ADD COLUMN contact_email VARCHAR(254) NOT NULL DEFAULT ''"),
]

with engine.connect() as conn:
    for table, column, sql in MIGRATIONS:
        if not column_exists(conn, table, column):
            conn.execute(text(sql))
            conn.commit()
            print(f"Added:  {table}.{column}")
        else:
            print(f"Skip:   {table}.{column}")

print("Migration complete.")
