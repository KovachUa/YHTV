from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class Channel(Base):
    __tablename__ = 'channels'
    id = Column(String, primary_key=True, index=True) # youtube channel id
    name = Column(String, nullable=False)
    subscribers = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    banner = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    last_refreshed = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    subscribed = Column(Boolean, default=False)
    settings = Column(Text, nullable=True)
    browse_data = Column(Text, nullable=True)
    
    videos = relationship("Video", back_populates="channel")

class Video(Base):
    __tablename__ = 'videos'
    id = Column(String, primary_key=True, index=True) # file path or unique identifier
    title = Column(String, nullable=True)
    channel_id = Column(String, ForeignKey('channels.id'), nullable=True)
    duration = Column(String, nullable=True)
    resolution = Column(String, nullable=True)
    filesize = Column(String, nullable=True)
    thumbnail = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    downloaded_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    progress = Column(Float, default=0.0)
    watched = Column(Boolean, default=False)
    
    channel = relationship("Channel", back_populates="videos")

class DownloadTask(Base):
    __tablename__ = 'download_tasks'
    task_id = Column(String, primary_key=True, index=True) # celery task id
    url = Column(String)
    title = Column(String, nullable=True)
    status = Column(String, default='QUEUED') # QUEUED, DOWNLOADING, COMPLETED, ERROR, PAUSED
    progress = Column(Float, default=0.0)
    speed = Column(String, nullable=True)
    eta = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))
