import os
from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE videos ADD COLUMN progress FLOAT DEFAULT 0.0;"))
        except Exception as e:
            print("progress column might already exist:", e)
        
        try:
            conn.execute(text("ALTER TABLE videos ADD COLUMN watched BOOLEAN DEFAULT FALSE;"))
        except Exception as e:
            print("watched column might already exist:", e)
            
        conn.commit()

if __name__ == "__main__":
    migrate()
    print("Migration done")
