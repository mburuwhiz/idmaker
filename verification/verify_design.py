from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Define mock IPC
    mock_ipc = """
    window.ipcRenderer = {
        invoke: async (channel, ...args) => {
            console.log('Mock invoke:', channel, args);
            if (channel === 'get-profiles') return [{id: 1, name: 'Default'}];
            if (channel === 'get-layouts') return [
                {id: 1, name: 'Student ID Card', content: '{}'},
                {id: 2, name: 'Staff Badge', content: '{}'},
                {id: 3, name: 'Visitor Pass', content: '{}'}
            ];
            if (channel === 'get-system-fonts') return ['Mock Font A', 'Mock Font B'];
            if (channel === 'get-batches') return [];
            return null;
        },
        on: () => {},
        off: () => {},
        send: () => {},
        removeListener: () => {}
    };
    """

    page.add_init_script(mock_ipc)

    try:
        print("Navigating to app...")
        page.goto("http://localhost:5173", timeout=60000)

        print("Waiting for sidebar...")
        # Wait for loading to finish (App.tsx checks connection)
        page.wait_for_selector("nav", timeout=10000)

        print("Opening Template Manager...")
        # Click Template Manager button (title="Templates Library")
        page.click("button[title='Templates Library']")

        print("Waiting for modal...")
        # Check for Template Manager Modal
        page.wait_for_selector("text=Template Library", timeout=5000)

        # Take screenshot of the new Template Manager UI
        page.screenshot(path="verification/verification.png")
        print("Verification screenshot saved.")

    except Exception as e:
        print(f"Error: {e}")
        try:
            page.screenshot(path="verification/error.png")
        except:
            pass
    finally:
        browser.close()

with sync_playwright() as p:
    run(p)
