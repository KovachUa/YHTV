from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
import os
import yt_dlp

from database import init_db, get_db
from models import Video, Channel, DownloadTask

app = FastAPI(title="YHTV Media Server")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")

DOWNLOADS_DIR = os.environ.get("DOWNLOADS_DIR", "/downloads")
if not os.path.exists(DOWNLOADS_DIR):
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
app.mount("/downloads", StaticFiles(directory=DOWNLOADS_DIR), name="downloads")

# Default yt-dlp configuration (ТЗ defaults)
DEFAULT_CONFIG = {
    "limit-rate": "", "throttled-rate": "", "http-chunk-size": "",
    "proxy": "", "geo-bypass": False, "geo-bypass-country": "",
    "cookies-from-browser": "", "username": "", "password": "",
    "retries": "10", "file-access-retries": "3", "fragment-retries": "10",
    "retry-sleep": "", "concurrent-fragments": "1", "buffer-size": "1024",
    "resize-buffer": True, "keep-fragments": False, "xattr-set-filesize": False,
    "format": "bestvideo+bestaudio/best", "lazy-playlist": False,
    "playlist-random": False, "hls-use-mpegts": False,
    "skip-unavailable-fragments": True, "playlist-start": "",
    "playlist-end": "", "match-title": "", "reject-title": "",
    "max-downloads": "", "min-filesize": "", "max-filesize": "",
    "extract-audio": False, "audio-format": "best", "audio-quality": "5",
    "remux-video": "", "embed-subs": False, "embed-thumbnail": False,
    "embed-metadata": False, "embed-chapters": False, "write-auto-subs": False,
    "sub-langs": "en", "paths": "./downloads", "output": "%(title)s.%(ext)s",
    "restrict-filenames": False, "windows-filenames": False,
    "trim-filenames": "", "no-overwrites": True, "continue": True,
    "write-description": False, "write-info-json": False,
    "sponsorblock-remove": "", "sponsorblock-mark": ""
}

@app.on_event("startup")
def startup_event():
    init_db()

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                return {**DEFAULT_CONFIG, **saved}
        except Exception:
            pass
    return DEFAULT_CONFIG

def save_config(config_data):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=4)

@app.get("/api/config")
async def get_config():
    return load_config()

@app.post("/api/config")
async def update_config(request: Request):
    data = await request.json()
    current = load_config()
    current.update(data)
    save_config(current)
    return {"status": "success", "message": "Configuration saved"}

@app.get("/api/config/default")
async def get_default_config():
    return DEFAULT_CONFIG

from pydantic import BaseModel
from tasks import download_video_task

class DownloadRequest(BaseModel):
    url: str
    type: str = "video"

class ChannelAddRequest(BaseModel):
    url: str

class SubscribeRequest(BaseModel):
    subscribed: bool

@app.post("/api/channels/add")
async def add_channel_only(req: ChannelAddRequest, db: Session = Depends(get_db)):
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        'playlistend': 1,
        'no_warnings': True
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=False)
            
            # Extract channel ID and Name from the result
            channel_id = info.get('channel_id') or info.get('uploader_id') or info.get('id')
            channel_name = info.get('channel') or info.get('uploader') or info.get('title')
            
            description = info.get('description', '')
            banner = None
            avatar = None
            if info.get('thumbnails'):
                for t in info.get('thumbnails'):
                    if t.get('url', '').endswith('=s0') or '=w1060' in t.get('url', ''):
                        if not banner: banner = t.get('url')
                    if t.get('url', '').endswith('=s900') or '=s176' in t.get('url', ''):
                        if not avatar: avatar = t.get('url')
                # Fallback if specific resolutions not found
                if not banner: banner = info['thumbnails'][0].get('url')
                if not avatar: avatar = info['thumbnails'][-1].get('url')

            if not channel_id or not channel_name:
                return JSONResponse(status_code=400, content={"message": "Could not extract channel metadata from the URL."})
                
            db_channel = db.query(Channel).filter(Channel.id == channel_id).first()
            if not db_channel:
                db_channel = Channel(
                    id=channel_id,
                    name=channel_name,
                    description=description,
                    banner=banner,
                    avatar=avatar,
                    subscribed=True
                )
                db.add(db_channel)
            else:
                db_channel.description = description
                db_channel.banner = banner
                db_channel.avatar = avatar
            db.commit()
            return {"status": "success", "channel_id": channel_id, "name": channel_name}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Error: {str(e)}"})

@app.post("/api/channels/{channel_id}/subscribe")
async def toggle_subscribe(channel_id: str, req: SubscribeRequest, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if channel:
        channel.subscribed = req.subscribed
        db.commit()
    return {"status": "success"}

@app.post("/api/download")
async def start_download(req: DownloadRequest, db: Session = Depends(get_db)):
    config = load_config()
    if req.type == "thumbnail":
        config['force-thumbnail'] = True
    task = download_video_task.delay(req.url, config)
    
    # Save to db
    new_task = DownloadTask(task_id=task.id, url=req.url, status="QUEUED")
    db.add(new_task)
    db.commit()
    
    return {"task_id": task.id, "status": "Queued"}

@app.get("/api/queue")
async def get_queue(db: Session = Depends(get_db)):
    tasks = db.query(DownloadTask).order_by(DownloadTask.created_at.desc()).all()
    return tasks

@app.get("/api/videos")
async def get_videos(db: Session = Depends(get_db)):
    videos = db.query(Video).order_by(Video.downloaded_at.desc()).all()
    return videos

@app.get("/api/channels")
async def get_channels(db: Session = Depends(get_db)):
    channels = db.query(Channel).order_by(Channel.last_refreshed.desc()).all()
    return channels

@app.delete("/api/videos/{video_id}")
async def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video:
        if video.file_path and os.path.exists(video.file_path):
            try:
                os.remove(video.file_path)
            except:
                pass
        db.delete(video)
        db.commit()
    return {"status": "success"}

@app.delete("/api/channels/{channel_id}")
async def delete_channel(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if channel:
        # Delete associated videos as well
        videos = db.query(Video).filter(Video.channel_id == channel_id).all()
        for v in videos:
            if v.file_path and os.path.exists(v.file_path):
                try: os.remove(v.file_path)
                except: pass
            db.delete(v)
        db.delete(channel)
        db.commit()
    return {"status": "success"}

@app.get("/api/channels/{channel_id}/browse")
async def browse_channel(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        return JSONResponse(status_code=404, content={"message": "Channel not found"})
        
    if channel_id.startswith('@'):
        url = f"https://www.youtube.com/{channel_id}/videos"
    elif channel_id.startswith('UC'):
        url = f"https://www.youtube.com/channel/{channel_id}/videos"
    else:
        url = f"https://www.youtube.com/c/{channel_id}/videos"
        
    ydl_opts = {
        'quiet': True,
        'extract_flat': 'in_playlist',
        'playlistend': 30, # Get last 30 videos
        'no_warnings': True
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            entries = info.get('entries', [])
            
            videos = []
            for entry in entries:
                if entry:
                    # extract_flat sometimes returns url, sometimes not. ID is always there.
                    vid_url = entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}"
                    thumbnail = f"https://img.youtube.com/vi/{entry.get('id')}/hqdefault.jpg"
                    if entry.get('thumbnails'):
                        thumbnail = entry['thumbnails'][-1].get('url', thumbnail)
                        
                    videos.append({
                        "id": entry.get('id'),
                        "title": entry.get('title'),
                        "url": vid_url,
                        "duration": entry.get('duration'),
                        "view_count": entry.get('view_count'),
                        "thumbnail": thumbnail
                    })
            return {"status": "success", "videos": videos}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Error browsing channel: {str(e)}"})

@app.delete("/api/queue/{task_id}")
async def delete_queue_task(task_id: str, db: Session = Depends(get_db)):
    # Cancel the running celery task
    from celery_app import celery_app
    celery_app.control.revoke(task_id, terminate=True, signal='SIGKILL')
    
    task = db.query(DownloadTask).filter(DownloadTask.task_id == task_id).first()
    if task:
        db.delete(task)
        db.commit()
    return {"status": "success"}

@app.delete("/api/queue")
async def clear_queue(status: str = None, db: Session = Depends(get_db)):
    query = db.query(DownloadTask)
    if status:
        query = query.filter(DownloadTask.status == status.upper())
    tasks = query.all()
    for t in tasks:
        if t.status in ["QUEUED", "DOWNLOADING", "PROGRESS"]:
            from celery_app import celery_app
            celery_app.control.revoke(t.task_id, terminate=True, signal='SIGKILL')
        db.delete(t)
    db.commit()
    return {"status": "success"}

@app.post("/api/queue/{task_id}/retry")
async def retry_queue_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(DownloadTask).filter(DownloadTask.task_id == task_id).first()
    if task and task.status == "ERROR":
        url = task.url
        db.delete(task)
        db.commit()
        config = load_config()
        new_celery_task = download_video_task.delay(url, config)
        new_task = DownloadTask(task_id=new_celery_task.id, url=url, status="QUEUED")
        db.add(new_task)
        db.commit()
        return {"status": "success"}
    return JSONResponse(status_code=400, content={"message": "Task not found or not in ERROR state"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
