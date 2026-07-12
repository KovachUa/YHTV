import os
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Video

def fix_extensions():
    db = SessionLocal()
    videos = db.query(Video).all()
    
    for v in videos:
        # e.g., /downloads/Channel/Video.webm
        path = v.file_path
        if not path: continue
        
        # In the container, /downloads is mounted. On the host, it's ./yhtv_downloads
        # But this script will run on the host using the db container? 
        # Actually I can run this inside the yhtv-backend container!
        if not os.path.exists(path):
            base_path, _ = os.path.splitext(path)
            for ext in ['.mkv', '.mp4', '.webm', '.m4a']:
                if os.path.exists(base_path + ext):
                    print(f"Fixing {path} -> {base_path + ext}")
                    v.file_path = base_path + ext
                    db.commit()
                    break

if __name__ == "__main__":
    fix_extensions()
    print("Done")
