"""Step-by-step HF deployment via Playwright."""
import time, sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright

CTX = "C:/Users/essaj/.playwright-hf-context"
GITHUB_REPO = "https://github.com/dev-sajid-junejo/fortyguard-teamthermora"
STEP = sys.argv[1] if len(sys.argv) > 1 else "1"

# Load API keys
env = {}
for line in Path("C:/Users/essaj/Desktop/FortyGuard-TeamThermora/.env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

def ss(page, name):
    page.screenshot(path=f"C:/Users/essaj/Desktop/FortyGuard-TeamThermora/{name}.png")
    print(f"  Saved: {name}.png")

p = sync_playwright().start()
browser = p.chromium.launch_persistent_context(
    CTX, headless=False, viewport={"width": 1280, "height": 900}, channel="chrome"
)
page = browser.pages[0] if browser.pages else browser.new_page()

if STEP == "1":
    # Navigate to new-space and inspect
    page.goto("https://huggingface.co/new-space", wait_until="domcontentloaded")
    time.sleep(5)
    ss(page, "hf_s1")
    print("URL:", page.url)
    if "login" in page.url:
        print("NEED_LOGIN - please log in manually in the browser")
    else:
        print("LOGGED_IN")
        # List all visible form elements
        for sel, label in [("input", "input"), ("button", "button"), ("select", "select"), ("label", "label")]:
            elems = page.locator(sel).all()
            print(f"  {label}s ({len(elems)}):")
            for i, e in enumerate(elems[:15]):
                txt = e.inner_text()[:40] if sel in ("button", "label") else ""
                nm = e.get_attribute("name") or ""
                ph = e.get_attribute("placeholder") or ""
                val = e.get_attribute("value") or ""
                print(f"    [{i}] text='{txt}' name='{nm}' placeholder='{ph}' value='{val}'")

elif STEP == "2":
    # Fill form and create space
    page.goto("https://huggingface.co/new-space", wait_until="domcontentloaded")
    time.sleep(4)

    # Fill name
    name_input = page.locator('input[name="name"]')
    if name_input.count() == 0:
        name_input = page.locator('input').first
    name_input.fill("siteverdict")
    print("Filled name: siteverdict")
    time.sleep(1)

    # Click Docker SDK option
    docker = page.locator("text=Docker")
    if docker.count() > 0:
        docker.first.click()
        print("Selected Docker SDK")
        time.sleep(1)

    ss(page, "hf_s2_filled")

    # Click Create Space
    create = page.locator('button:has-text("Create")')
    if create.count() > 0:
        create.first.click()
        print("Clicked Create Space")
        time.sleep(8)
    else:
        # Try submit button
        submit = page.locator('button[type="submit"]')
        if submit.count() > 0:
            submit.first.click()
            print("Clicked Submit")
            time.sleep(8)

    ss(page, "hf_s2_created")
    print("URL:", page.url)

elif STEP == "3":
    # We should be on the space page now. Check for file browser / README editor
    # Try to go to the main files page
    current = page.url
    print("Current URL:", current)

    # Check if there's a README.md we can edit, or an upload/files interface
    # Look for "Files" tab
    files_tab = page.locator('text=Files').first
    if files_tab.count() > 0:
        files_tab.click()
        time.sleep(3)
        ss(page, "hf_s3_files")

    # Look for upload or "Add file" button
    add_file = page.locator('text=Add file').first
    upload = page.locator('text=Upload').first
    print(f"  'Add file': {add_file.count() > 0}")
    print(f"  'Upload': {upload.count() > 0}")

    # List visible buttons
    buttons = page.locator("button").all()
    print(f"  Buttons ({len(buttons)}):")
    for i, b in enumerate(buttons[:15]):
        txt = b.inner_text()[:50]
        print(f"    [{i}] '{txt}'")

    ss(page, "hf_s3")

elif STEP == "4":
    # Try "Import from GitHub"
    current = page.url
    print("Current URL:", current)

    import_btn = page.locator("text=Import from GitHub").first
    if import_btn.count() > 0:
        import_btn.click()
        print("Clicked Import from GitHub")
        time.sleep(3)
        ss(page, "hf_s4_import")

        # Find and fill repo URL input
        inputs = page.locator("input").all()
        for inp in inputs:
            ph = inp.get_attribute("placeholder") or ""
            nm = inp.get_attribute("name") or ""
            if "github" in ph.lower() or "repo" in ph.lower() or "repo" in nm.lower() or "url" in ph.lower():
                inp.fill(GITHUB_REPO)
                print(f"Filled repo URL: {GITHUB_REPO}")
                break
        
        ss(page, "hf_s4_filled")

        # Click import/confirm button
        import_confirm = page.locator('button:has-text("Import")').first
        if import_confirm.count() > 0:
            import_confirm.click()
            print("Confirmed import")
            time.sleep(15)
            ss(page, "hf_s4_imported")
            print("URL:", page.url)
    else:
        print("No 'Import from GitHub' found. Listing buttons:")
        buttons = page.locator("button").all()
        for i, b in enumerate(buttons[:15]):
            txt = b.inner_text()[:50]
            print(f"  [{i}] '{txt}'")
        ss(page, "hf_s4_no_import")

elif STEP == "5":
    # Set environment variables
    current_url = page.url.split("/settings")[0].rstrip("/")
    env_url = current_url + "/settings/env"
    print("Going to:", env_url)
    page.goto(env_url, wait_until="domcontentloaded")
    time.sleep(4)
    ss(page, "hf_s5_env_page")

    for key_name in ["FORTYGUARD_API_KEY", "GEMINI_API_KEY"]:
        if key_name not in env:
            print(f"  {key_name} not in .env, skipping")
            continue
        
        print(f"  Adding {key_name}...")
        # Click "New secret" or "Add" button
        add_btns = page.locator('button:has-text("New"), button:has-text("Add"), a:has-text("New")').all()
        for btn in add_btns:
            if btn.is_visible():
                btn.click()
                time.sleep(1)
                break
        
        # Find key and value inputs
        key_inputs = page.locator('input[name="name"], input[placeholder*="Name"], input[placeholder*="key"]').all()
        val_inputs = page.locator('input[name="value"], input[placeholder*="Value"], textarea').all()
        
        visible_keys = [i for i in key_inputs if i.is_visible()]
        visible_vals = [i for i in val_inputs if i.is_visible()]
        
        if visible_keys and visible_vals:
            visible_keys[0].fill(key_name)
            visible_vals[0].fill(env[key_name])
            print(f"    Filled {key_name}")
            time.sleep(1)
            
            save = page.locator('button:has-text("Save"), button:has-text("Add"), button:has-text("Confirm")').all()
            for s in save:
                if s.is_visible():
                    s.click()
                    print(f"    Saved {key_name}")
                    time.sleep(2)
                    break
        else:
            print(f"    Could not find inputs for {key_name}")
            ss(page, f"hf_s5_no_input_{key_name}")
            break

    ss(page, "hf_s5_done")
    print("URL:", page.url)

print("\nDone. Browser left open.")
browser.disconnect()
p.stop()
