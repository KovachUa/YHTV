import yt_dlp
opts = {'skip_download': True, 'writethumbnail': True, 'quiet': True}
with yt_dlp.YoutubeDL(opts) as ydl:
    info = ydl.extract_info("https://www.youtube.com/watch?v=BaW_jenozKc", download=True)
    print("Downloaded info for:", info.get('title'))
