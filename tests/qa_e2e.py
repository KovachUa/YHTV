import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()
        
        # Handle any JS confirm dialogues automatically
        page.on("dialog", lambda dialog: asyncio.create_task(dialog.accept()))
        
        print("[*] Starting YHTV E2E Web QA Test...")
        print("[*] Navigating to http://localhost:8080")
        # Note: frontend container maps to port 80 internally
        await page.goto("http://localhost:8080")
        
        print("[*] Verifying Homepage (All Videos)...")
        await page.wait_for_selector("#all-videos-container")
        videos_count = await page.locator(".video-card").count()
        print(f"    -> Found {videos_count} videos on homepage.")
        
        print("[*] Testing Navigation -> Channels...")
        await page.click("#nav-channels")
        await page.wait_for_selector("#channels-container")
        channels_count = await page.locator(".card").count()
        print(f"    -> Found {channels_count} channels.")
        
        print("[*] Testing Navigation -> Config...")
        await page.click("#nav-config")
        await page.wait_for_selector("#config-view:not(.hidden)")
        await page.click('button[data-target="config-filesystem"]')
        await page.wait_for_selector("#config-filesystem.active")
        await page.fill("#output-template", "%(title)s.%(ext)s")
        print("    -> Config form interaction successful.")
        
        print("[*] Testing Navigation -> Queue...")
        await page.click("#nav-queue")
        await page.wait_for_selector("#queue-view:not(.hidden)")
        
        print("[*] Submitting a new Video Download...")
        await page.click("#add-video-btn")
        await page.wait_for_selector("#add-modal.active")
        await page.fill(".url-input", "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        await page.click("#add-submit-btn")
        
        # Wait for the toast or queue to update
        await page.wait_for_timeout(2000)
        
        queue_items = await page.locator(".queue-item").count()
        print(f"    -> Queue currently has {queue_items} items.")
        
        print("[*] Testing Stop All functionality...")
        if queue_items > 0:
            await page.click("#stop-all-btn")
            await page.wait_for_timeout(1000)
            print("    -> Stop All button clicked and confirmed via JS dialog.")
        
        print("[*] Testing Clear All functionality...")
        await page.click("#clear-all-btn")
        await page.wait_for_selector("#delete-modal.active")
        await page.click("#confirm-delete-btn")
        await page.wait_for_timeout(1000)
        queue_items_after = await page.locator(".queue-item").count()
        print(f"    -> Queue has {queue_items_after} items after Clear All.")
        
        await browser.close()
        print("[+] QA Tests Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(main())
