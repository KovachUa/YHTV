import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://yhtv:yhtv_db_pass_2026@db:5432/yhtv")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from sqlalchemy import text

def init_db():
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE videos ADD COLUMN progress FLOAT DEFAULT 0.0;"))
            conn.commit()
    except Exception:
        pass
        
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE channels ADD COLUMN settings TEXT NULL;"))
            conn.commit()
    except Exception:
        pass
        
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE channels ADD COLUMN browse_data TEXT NULL;"))
            conn.commit()
    except Exception:
        pass
        
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE videos ADD COLUMN watched BOOLEAN DEFAULT FALSE;"))
            conn.commit()
    except Exception:
        pass
