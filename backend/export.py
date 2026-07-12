from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from fastapi.responses import Response
import json
import os
import datetime
import models
from database import get_db

router = APIRouter()
config_path = "/data/config.json"

@router.get("/api/export")
def export_database(db: Session = Depends(get_db)):
    channels = db.query(models.Channel).all()
    videos = db.query(models.Video).all()
    tasks = db.query(models.DownloadTask).all()
    
    export_json = {
        "channels": [{"id": c.id, "name": c.name, "subscribers": c.subscribers, "avatar": c.avatar, "banner": c.banner, "description": c.description, "last_refreshed": c.last_refreshed.isoformat() if c.last_refreshed else None, "subscribed": c.subscribed, "settings": c.settings} for c in channels],
        "videos": [{"id": v.id, "title": v.title, "channel_id": v.channel_id, "duration": v.duration, "resolution": v.resolution, "filesize": v.filesize, "thumbnail": v.thumbnail, "file_path": v.file_path, "downloaded_at": v.downloaded_at.isoformat() if v.downloaded_at else None, "progress": v.progress, "watched": v.watched} for v in videos],
        "tasks": [{"task_id": t.task_id, "url": t.url, "title": t.title, "status": t.status, "progress": t.progress, "speed": t.speed, "eta": t.eta, "error_message": t.error_message, "created_at": t.created_at.isoformat() if t.created_at else None, "updated_at": t.updated_at.isoformat() if t.updated_at else None} for t in tasks]
    }
    
    config_data = {}
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            try:
                config_data = json.load(f)
            except:
                pass
            
    export_json["global_config"] = config_data
    
    return Response(
        content=json.dumps(export_json, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=yhtv_export.json"}
    )

@router.post("/api/import")
async def import_database(request: Request, db: Session = Depends(get_db)):
    content = await request.body()
    try:
        data = json.loads(content.decode("utf-8"))
    except:
        return Response(status_code=400, content="Invalid JSON format")
        
    for c_data in data.get("channels", []):
        if c_data.get("last_refreshed"):
            c_data["last_refreshed"] = datetime.datetime.fromisoformat(c_data["last_refreshed"])
        c = models.Channel(**c_data)
        db.merge(c)
        
    for v_data in data.get("videos", []):
        if v_data.get("downloaded_at"):
            v_data["downloaded_at"] = datetime.datetime.fromisoformat(v_data["downloaded_at"])
        v = models.Video(**v_data)
        db.merge(v)
        
    for t_data in data.get("tasks", []):
        if t_data.get("created_at"):
            t_data["created_at"] = datetime.datetime.fromisoformat(t_data["created_at"])
        if t_data.get("updated_at"):
            t_data["updated_at"] = datetime.datetime.fromisoformat(t_data["updated_at"])
        t = models.DownloadTask(**t_data)
        db.merge(t)
        
    if "global_config" in data:
        with open(config_path, "w") as f:
            json.dump(data["global_config"], f, indent=2)
            
    db.commit()
    return {"status": "success", "message": "Database restored"}

@router.post("/api/channels/{channel_id}/settings")
async def update_channel_settings(channel_id: str, request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    channel = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if channel:
        channel.settings = json.dumps(data)
        db.commit()
        return {"status": "success"}
    return {"status": "error", "message": "Channel not found"}

