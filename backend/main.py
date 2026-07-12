from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
import os
import time
import asyncio
import yt_dlp

from database import init_db, get_db
from models import Video, Channel, DownloadTask

app = FastAPI(title="YHTV Media Server")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

DOWNLOADS_DIR = os.environ.get("DOWNLOADS_DIR", "/downloads")
if not os.path.exists(DOWNLOADS_DIR):
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
app.mount("/downloads", StaticFiles(directory=DOWNLOADS_DIR), name="downloads")

CONFIG_FILE = os.path.join(DOWNLOADS_DIR, "config.json")

# Default yt-dlp configuration (ТЗ defaults)
DEFAULT_CONFIG = {
    "limit-rate": "", "throttled-rate": "", "http-chunk-size": "",
    "proxy": "", "geo-bypass": False, "geo-bypass-country": "",
    "cookies-from-browser": "", "username": "", "password": "",
    "retries": "10", "file-access-retries": "3", "fragment-retries": "10",
    "retry-sleep": "", "concurrent-fragments": "1", "buffer-size": "1024",
    "resize-buffer": True, "keep-fragments": False, "xattr-set-filesize": False,
    "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best", "lazy-playlist": False,
    "playlist-random": False, "hls-use-mpegts": False,
    "skip-unavailable-fragments": True, "playlist-start": "",
    "playlist-end": "", "match-title": "", "reject-title": "",
    "max-downloads": "", "min-filesize": "", "max-filesize": "",
    "extract-audio": False, "audio-format": "best", "audio-quality": "5",
    "remux-video": "", "embed-subs": False, "embed-thumbnail": False,
    "write-auto-subs": False,
    "sub-langs": "en", "paths": "./downloads", "output": "%(uploader)s/%(title)s.%(ext)s",
    "restrict-filenames": False, "windows-filenames": False,
    "trim-filenames": "", "no-overwrites": True, "continue": True,
    "write-description": False, "write-info-json": False,
    "write-comments": False,
    "sponsorblock-remove": "", "sponsorblock-mark": "",
    "auto-cleanup": False
}

def perform_cleanup():
    deleted_files = []
    try:
        for root, dirs, files in os.walk(DOWNLOADS_DIR, topdown=False):
            for name in files:
                filepath = os.path.join(root, name)
                if name.endswith('.part') or name.endswith('.ytdl'):
                    if time.time() - os.path.getmtime(filepath) > 86400:
                        try:
                            os.remove(filepath)
                            deleted_files.append(filepath)
                        except: pass
                elif name.endswith('.info.json') or name.endswith('.description') or name.endswith('.jpg') or name.endswith('.webp'):
                    base = name.rsplit('.', 2)[0] if name.endswith('.info.json') else name.rsplit('.', 1)[0]
                    has_media = any(os.path.exists(os.path.join(root, base + ext)) for ext in ['.mp4', '.mkv', '.webm', '.m4a'])
                    if not has_media:
                        try:
                            os.remove(filepath)
                            deleted_files.append(filepath)
                        except: pass
            
            for name in dirs:
                dirpath = os.path.join(root, name)
                if not os.listdir(dirpath):
                    try:
                        os.rmdir(dirpath)
                        deleted_files.append(dirpath)
                    except: pass
    except Exception as e:
        print(f"Cleanup error: {e}")
    return deleted_files

async def cleanup_worker():
    while True:
        await asyncio.sleep(3600)  # Every hour
        config = load_config()
        if config.get("auto-cleanup", False):
            perform_cleanup()

@app.on_event("startup")
async def startup_event():
    init_db()
    asyncio.create_task(cleanup_worker())

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
from tasks import download_video_task, refresh_metadata_task

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

@app.get("/api/videos/{video_id}/metadata")
async def get_video_metadata(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or not video.file_path:
        return {"description": "", "comments": []}
    
    base_path, _ = os.path.splitext(video.file_path)
    info_path = base_path + ".info.json"
    desc_path = base_path + ".description"
    
    description = ""
    comments = []
    
    if os.path.exists(desc_path):
        try:
            with open(desc_path, "r", encoding="utf-8") as f:
                description = f.read()
        except: pass
        
    if os.path.exists(info_path):
        try:
            with open(info_path, "r", encoding="utf-8") as f:
                info = json.load(f)
                if not description:
                    description = info.get("description", "")
                comments = info.get("comments", [])
        except: pass
        
    return {"description": description, "comments": comments}

@app.post("/api/videos/{video_id}/refresh-metadata")
async def refresh_metadata(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        return JSONResponse(status_code=404, content={"message": "Video not found"})
    
    url = f"https://www.youtube.com/watch?v={video.id}"
    refresh_metadata_task.delay(url, video.file_path)
    return {"status": "success", "message": "Metadata refresh task started in background."}


@app.get("/api/channels")
async def get_channels(db: Session = Depends(get_db)):
    channels = db.query(Channel).order_by(Channel.last_refreshed.desc()).all()
    return channels

@app.delete("/api/videos/{video_id}")
async def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video:
        if video.file_path:
            full_path = os.path.join(DOWNLOADS_DIR, video.file_path)
            if os.path.exists(full_path):
                try:
                    os.remove(full_path)
                except:
                    pass
        db.delete(video)
        db.commit()
        perform_cleanup()
    return {"status": "success"}

@app.delete("/api/channels/{channel_id}")
async def delete_channel(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if channel:
        # Delete associated videos as well
        videos = db.query(Video).filter(Video.channel_id == channel_id).all()
        for v in videos:
            if v.file_path:
                full_path = os.path.join(DOWNLOADS_DIR, v.file_path)
                if os.path.exists(full_path):
                    try: os.remove(full_path)
                    except: pass
            db.delete(v)
        db.delete(channel)
        db.commit()
        # Also clean up empty directories and orphaned metadata
        perform_cleanup()
    return {"status": "success"}

@app.post("/api/cleanup")
async def manual_cleanup():
    deleted = perform_cleanup()
    return {"status": "success", "deleted_count": len(deleted), "deleted_files": deleted}

@app.get("/api/channels/{channel_id}/browse")
async def browse_channel(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        return JSONResponse(status_code=404, content={"message": "Channel not found"})
        
    if channel_id.startswith('@'):
        base_url = f"https://www.youtube.com/{channel_id}"
    elif channel_id.startswith('UC'):
        base_url = f"https://www.youtube.com/channel/{channel_id}"
    else:
        base_url = f"https://www.youtube.com/c/{channel_id}"
        
    ydl_opts = {
        'quiet': True,
        'extract_flat': 'in_playlist',
        'playlistend': 30, # Get last 30 items
        'no_warnings': True
    }
    
    videos = []
    shorts = []
    streams = []
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            for suffix in ["/videos", "/shorts", "/streams"]:
                try:
                    info = ydl.extract_info(base_url + suffix, download=False)
                    entries = info.get('entries', [])
                    
                    for entry in entries:
                        if entry:
                            vid_url = entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}"
                            thumbnail = f"https://img.youtube.com/vi/{entry.get('id')}/hqdefault.jpg"
                            if entry.get('thumbnails'):
                                thumbnail = entry['thumbnails'][-1].get('url', thumbnail)
                                
                            item = {
                                "id": entry.get('id'),
                                "title": entry.get('title'),
                                "url": vid_url,
                                "duration": entry.get('duration'),
                                "view_count": entry.get('view_count'),
                                "thumbnail": thumbnail,
                                "type": suffix.strip("/")
                            }
                            if suffix == "/videos":
                                videos.append(item)
                            elif suffix == "/shorts":
                                shorts.append(item)
                            elif suffix == "/streams":
                                streams.append(item)
                except Exception:
                    pass # Ignore if a channel doesn't have a specific tab
            
            return {"status": "success", "videos": videos, "shorts": shorts, "streams": streams}
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
