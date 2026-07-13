import time
import yt_dlp
import os
import re
import datetime
from celery_app import celery_app
from database import SessionLocal
from models import DownloadTask, Video, Channel

@celery_app.task(bind=True)
def download_video_task(self, url: str, config: dict):
    """
    Celery task that downloads a video using yt-dlp.
    It receives the URL and the configuration dictionary.
    """
    task_id = self.request.id
    db = SessionLocal()
    
    db_task = db.query(DownloadTask).filter(DownloadTask.task_id == task_id).first()
    if db_task:
        db_task.status = 'DOWNLOADING'
        db_task.updated_at = datetime.datetime.utcnow()
        db.commit()

    self.update_state(state='PROGRESS', meta={'progress': 0, 'status': 'Starting download...'})
    
    # Define progress hook to update Celery state
    last_db_update = time.time()
    def progress_hook(d):
        nonlocal last_db_update
        if d['status'] == 'downloading':
            try:
                # Extract percentage (e.g. " 45.0%" or "45.0%")
                percent_str = d['_percent_str'].strip().replace('%', '')
                ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
                percent_str = ansi_escape.sub('', percent_str)
                
                progress = float(percent_str)
                speed = d.get('_speed_str', 'N/A').strip()
                eta = d.get('_eta_str', 'N/A').strip()
                
                status_text = f"Downloading... {progress:.1f}% ({speed}) - ETA {eta}"
                self.update_state(state='PROGRESS', meta={'progress': progress, 'status': status_text})
                
                # Update DB max once every 2 seconds
                if time.time() - last_db_update > 2.0:
                    if db_task:
                        db_task.progress = progress
                        db_task.speed = speed
                        db_task.eta = eta
                        db_task.updated_at = datetime.datetime.utcnow()
                        db.commit()
                    last_db_update = time.time()
            except Exception as e:
                pass
        elif d['status'] == 'finished':
            self.update_state(state='PROGRESS', meta={'progress': 100, 'status': 'Processing/Merging files...'})

    # Map our UI config to yt-dlp Python options
    ydl_opts = {
        'outtmpl': os.path.join('/downloads', config.get('output', '%(title)s.%(ext)s')),
        'progress_hooks': [progress_hook],
        'quiet': True,
        'no_warnings': True,
        'js_runtimes': {'deno': {}},
        'merge_output_format': 'mp4',
        'remote_components': ['ejs:github'],
        'postprocessor_args': ['-movflags', '+faststart']
    }
    
    # Network & Connection
    if config.get('limit-rate'): ydl_opts['ratelimit'] = config.get('limit-rate')
    if config.get('proxy'): ydl_opts['proxy'] = config.get('proxy')
    if config.get('geo-bypass'): ydl_opts['geo_bypass'] = True
    
    # Download settings
    ydl_opts['retries'] = int(config.get('retries', 10))
    ydl_opts['fragment_retries'] = int(config.get('fragment-retries', 10))
    if config.get('concurrent-fragments') and int(config.get('concurrent-fragments')) > 1:
        ydl_opts['concurrent_fragment_downloads'] = int(config.get('concurrent-fragments'))
        
    # Format settings
    # Tube Archivist optimized format for max compatibility:
    # Force MP4 compatible codecs! If yt-dlp puts Opus audio in an MP4 container, Chrome hangs indefinitely!
    ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
    # Bypass HTTP 403 Forbidden by trying web, tv and default clients, and explicitly disabling android_sdkless
    ydl_opts['extractor_args'] = {'youtube': ['player_client=web_embedded,web,tv,default,-android_sdkless']}
    # Guarantee moov atom is at the start of the MP4 so browsers can seek immediately
    ydl_opts['postprocessor_args'] = {'video': ['-movflags', '+faststart']}
    
    if config.get('hls-use-mpegts'): ydl_opts['hls_use_mpegts'] = True
    if config.get('no-download'): ydl_opts['skip_download'] = True
    if config.get('embed-thumbnail'):
        ydl_opts['writethumbnail'] = True
        ydl_opts.setdefault('postprocessors', []).append({'key': 'EmbedThumbnail'})
    
    if config.get('extract-audio'):
        ydl_opts.setdefault('postprocessors', []).append({
            'key': 'FFmpegExtractAudio',
            'preferredcodec': config.get('audio-format', 'best'),
            'preferredquality': config.get('audio-quality', '5'),
        })
        
    if config.get('download-sections'):
        from yt_dlp.utils import download_range_func
        ydl_opts['download_ranges'] = download_range_func(None, [config.get('download-sections')])
        
    if config.get('force-thumbnail'):
        ydl_opts['skip_download'] = True
        ydl_opts['writethumbnail'] = True
        ydl_opts.setdefault('postprocessors', []).append({
            'key': 'FFmpegThumbnailsConvertor',
            'format': 'jpg',
        })
        
    if config.get('write-description'):
        ydl_opts['writedescription'] = True
    if config.get('write-comments'):
        ydl_opts['getcomments'] = True
        ydl_opts['writeinfojson'] = True  # Required to save comments to disk
    if config.get('write-info-json'):
        ydl_opts['writeinfojson'] = True
        
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # We must get info to create models
            info = ydl.extract_info(url, download=True)
            title = info.get('title', 'Unknown Title')
            filename = ydl.prepare_filename(info)
            
            # yt-dlp might change the extension to .mkv or .mp4 after merging with ffmpeg
            if not os.path.exists(filename):
                base_path, _ = os.path.splitext(filename)
                for ext in ['.mkv', '.mp4', '.webm', '.m4a']:
                    if os.path.exists(base_path + ext):
                        filename = base_path + ext
                        break
            channel_name = info.get('uploader', 'Unknown Channel')
            channel_id = info.get('channel_id', 'unknown_channel_' + str(time.time()))
            
            # Manually save description and comments for the frontend, regardless of yt-dlp config
            try:
                base_path, _ = os.path.splitext(filename)
                custom_info_path = base_path + ".info.json"
                if not os.path.exists(custom_info_path):
                    import json
                    to_save = {
                        "description": info.get("description", ""),
                        "comments": info.get("comments", [])
                    }
                    with open(custom_info_path, "w", encoding="utf-8") as f:
                        json.dump(to_save, f, ensure_ascii=False)
            except Exception as e:
                pass
            
        if db_task:
            db_task.status = 'COMPLETED'
            db_task.title = title
            db_task.progress = 100.0
            db_task.updated_at = datetime.datetime.utcnow()
            
        db_channel = db.query(Channel).filter(Channel.id == channel_id).first()
        if not db_channel:
            db_channel = Channel(id=channel_id, name=channel_name)
            db.add(db_channel)
            
        video_id = info.get('id', str(time.time()))
        db_video = db.query(Video).filter(Video.id == video_id).first()
        if not db_video:
            db_video = Video(
                id=video_id,
                title=title,
                channel_id=channel_id,
                duration=str(info.get('duration_string', info.get('duration', ''))),
                resolution=info.get('resolution', ''),
                filesize=str(info.get('filesize_approx', '') or info.get('filesize', '')),
                thumbnail=info.get('thumbnail', ''),
                file_path=filename
            )
            db.add(db_video)
        else:
            # Update existing video record
            db_video.title = title
            db_video.file_path = filename
            db_video.duration = str(info.get('duration_string', info.get('duration', '')))
            db_video.resolution = info.get('resolution', '')
            db_video.filesize = str(info.get('filesize_approx', '') or info.get('filesize', ''))
            db_video.thumbnail = info.get('thumbnail', '')
            
        db.commit()

        return {
            'progress': 100,
            'status': 'Completed',
            'url': url,
            'title': title,
            'filename': filename
        }
    except Exception as e:
        if db_task:
            db_task.status = 'ERROR'
            db_task.error_message = str(e)
            db_task.updated_at = datetime.datetime.utcnow()
            db.commit()
        raise Exception(str(e))
    finally:
        db.close()

@celery_app.task(bind=True)
def refresh_metadata_task(self, url: str, file_path: str):
    """
    Celery task that fetches only the metadata (description and comments) for a given URL
    and updates the .info.json file without downloading the video.
    """
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'getcomments': True,
        'writeinfojson': False, # We'll write it manually to ensure format
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if file_path:
                base_path, _ = os.path.splitext(file_path)
                custom_info_path = base_path + ".info.json"
                
                import json
                to_save = {
                    "description": info.get("description", ""),
                    "comments": info.get("comments", [])
                }
                with open(custom_info_path, "w", encoding="utf-8") as f:
                    json.dump(to_save, f, ensure_ascii=False)
                    
        return {'status': 'Completed', 'url': url}
    except Exception as e:
        raise Exception(f"Failed to refresh metadata: {str(e)}")
