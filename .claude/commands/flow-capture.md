# Screenshot & Flow Capture

Capture screenshots and summarize website pages using Playwright MCP.

## Usage

Tell me: "Capture [URL]" or "Capture [URL] with depth [N]"

I will:
1. Launch browser and navigate to the URL
2. Take a full-page screenshot
3. Summarize what the page is about
4. Find internal links on the page
5. Capture child pages (up to N levels deep, default 2)
6. Save screenshots to captures/ folder

## Examples

- "Capture https://crossbar.org"
- "Capture https://example.com with depth 1"
- "Screenshot https://mysite.com/pricing and summarize"
- "Capture the homepage and all linked pages of https://docs.example.com"

## What I Use

- `browser_navigate` - Go to URLs
- `browser_take_screenshot` - Capture pages
- `browser_snapshot` - Get page content for link discovery
- `Write` tool - Save screenshots to files
