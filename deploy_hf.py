"""Deploy SiteVerdict to Hugging Face Spaces via Playwright."""
import time
from playwright.sync_api import sync_playwright

HF_URL = "https://huggingface.co"
GITHUB_REPO = "https://github.com/dev-sajid-junejo/fortyguard-teamthermora"
SPACE_NAME = "siteverdict"
CONTEXT_DIR = "C:/Users/essaj/.playwright-hf-context"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            CONTEXT_DIR,
            headless=False,
            viewport={"width": 1280, "height": 900},
            channel="chrome",
        )
        page = browser.pages[0] if browser.pages else browser.new_page()

        # 1. Go to HF
        print("[1] Navigating to Hugging Face...")
        page.goto(HF_URL, wait_until="domcontentloaded")
        time.sleep(3)

        # Check if logged in
        avatar = page.query_selector('img[alt*="Avatar"]') or page.query_selector('[data-testid="user-menu"]') or page.query_selector('nav img[src*="avatar"]')
        login_btn = page.query_selector('a[href="/login"]')

        if login_btn and not avatar:
            print("[!] Not logged in. Please log in to Hugging Face in the browser.")
            print("    After logging in, press Enter here to continue...")
            input()
            page.reload(wait_until="domcontentloaded")
            time.sleep(3)
        else:
            print("[OK] Logged in to Hugging Face")

        # 2. Create new Space
        print("[2] Creating new Space...")
        page.goto(f"{HF_URL}/new-space", wait_until="domcontentloaded")
        time.sleep(3)

        # Fill space name
        name_input = page.query_selector('input[name="name"]') or page.query_selector('input[placeholder*="Space name"]') or page.query_selector('input[id*="name"]')
        if name_input:
            name_input.fill("")
            name_input.fill(SPACE_NAME)
            print(f"    Space name: {SPACE_NAME}")
        else:
            print("[!] Could not find space name input. Taking screenshot...")
            page.screenshot(path="screenshot_new_space.png")
            print("    Please fill the form manually and press Enter...")
            input()

        # Select Docker SDK
        docker_option = page.query_selector('text=Docker') or page.query_selector('[value="docker"]')
        if docker_option:
            docker_option.click()
            print("    SDK: Docker selected")
            time.sleep(1)

        # Select Public
        public_option = page.query_selector('text=Public') or page.query_selector('input[value="public"]')
        if public_option:
            public_option.click()
            print("    Visibility: Public")

        # Click Create
        create_btn = page.query_selector('button:has-text("Create")') or page.query_selector('button[type="submit"]')
        if create_btn:
            create_btn.click()
            print("[3] Space created! Waiting for page...")
            time.sleep(5)
        else:
            page.screenshot(path="screenshot_create_btn.png")
            print("[!] Could not find Create button. Please click it manually and press Enter...")
            input()

        # 4. Import from GitHub
        print("[4] Importing from GitHub...")
        current_url = page.url
        print(f"    Current URL: {current_url}")

        # Look for Import from GitHub button/link
        import_btn = page.query_selector('text=Import from GitHub') or page.query_selector('text=Import repository')
        if import_btn:
            import_btn.click()
            time.sleep(3)
        
        # Fill GitHub URL if there's an input
        gh_input = page.query_selector('input[placeholder*="github"]') or page.query_selector('input[name="repository"]') or page.query_selector('input[type="url"]')
        if gh_input:
            gh_input.fill(GITHUB_REPO)
            print(f"    GitHub repo: {GITHUB_REPO}")
            time.sleep(1)
            
            # Click Import/Confirm
            confirm = page.query_selector('button:has-text("Import")') or page.query_selector('button:has-text("Confirm")')
            if confirm:
                confirm.click()
                print("[5] Import started!")
                time.sleep(5)
        else:
            page.screenshot(path="screenshot_import.png")
            print("    Could not find GitHub import input.")
            print("    Please import manually from GitHub and press Enter...")
            input()

        # 5. Set Environment Variables
        print("[6] Setting environment variables...")
        settings_url = current_url.rstrip("/") + "/settings"
        if "/spaces/" in settings_url:
            # Navigate to settings/env vars
            env_url = current_url.rstrip("/") + "/settings/env"
            page.goto(env_url, wait_until="domcontentloaded")
            time.sleep(3)
        else:
            page.screenshot(path="screenshot_settings.png")
            print("    Could not navigate to settings. Please set env vars manually.")
            print("    You need: FORTYGUARD_API_KEY and GEMINI_API_KEY")
        
        page.screenshot(path="screenshot_final.png")
        print("\n[DONE] Check the browser for the Space URL.")
        print("    Set FORTYGUARD_API_KEY and GEMINI_API_KEY in Space Settings > Variables and Secrets")
        print("\nPress Enter to close...")
        input()
        browser.close()

if __name__ == "__main__":
    main()
