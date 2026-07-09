import urllib.request
import urllib.parse
import json
import time
import sys

API_URL = "http://backend:8000/api"

def submit_download(video_url):
    print(f"[*] Submitting video: {video_url}")
    data = json.dumps({"url": video_url}).encode("utf-8")
    req = urllib.request.Request(f"{API_URL}/download", data=data, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print(f"[+] Task Queued: {res_data['task_id']}")
            return res_data['task_id']
    except Exception as e:
        print(f"[-] Failed to submit: {e}")
        sys.exit(1)

def poll_status(task_id):
    print(f"[*] Polling status for {task_id}...")
    while True:
        try:
            with urllib.request.urlopen(f"{API_URL}/download/{task_id}") as response:
                status = json.loads(response.read().decode())
                
                state = status.get("state")
                progress = status.get("progress", 0)
                text = status.get("status_text", "")
                
                print(f"    -> State: {state} | Progress: {progress}% | Info: {text}")
                
                if state in ["SUCCESS", "FAILURE"]:
                    print(f"\n[+] Final Result: {status}")
                    break
        except Exception as e:
            print(f"[-] Failed to poll: {e}")
            break
        
        time.sleep(2)

if __name__ == "__main__":
    print("--- YHTV QA Simulator ---")
    time.sleep(2) # wait for backend to be fully up
    task_id = submit_download("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    poll_status(task_id)
    print("--- QA Finished ---")
