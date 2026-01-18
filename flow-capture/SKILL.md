# Flow Capture Skill

Capture website flows with screenshots using Playwright. Supports connecting to your existing Chrome browser for authenticated pages.

## Installation

```bash
cd flow-capture
npm install
npx playwright install chromium
```

## Usage

### Basic Capture

```bash
# Single screenshot
node src/capture.js --url "https://example.com" --name myproject --flow "homepage"

# Interactive mode - capture multiple screens
node src/capture.js --interactive --name myproject --flow "onboarding"
```

### Authenticated Pages (Chrome CDP)

For capturing logged-in states, connect to your existing Chrome session:

```bash
# Terminal 1: Start Chrome with debugging port
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Terminal 2: Log into your apps in Chrome, then run capture
node src/capture.js --connect-chrome --interactive --name myapp --flow "dashboard"
```

### Interactive Commands

When running in interactive mode (`-i`), use these commands:

| Command | Alias | Description |
|---------|-------|-------------|
| `capture <name>` | `c` | Take a screenshot with the given name |
| `goto <url>` | `g` | Navigate to URL |
| `click <selector>` | - | Click an element |
| `scroll <pixels>` | - | Scroll down by pixels |
| `wait <ms>` | `w` | Wait for milliseconds |
| `done` | `q` | Save manifest and exit |
| `help` | `h` | Show commands |

### Hierarchical Flows

Create nested flows for complex user journeys:

```bash
# Create parent flow
node src/capture.js -i --name myapp --flow "Onboarding"

# Create child flows
node src/capture.js -i --name myapp --flow "Upload Logo" --parent "onboarding"
node src/capture.js -i --name myapp --flow "Invite Team" --parent "onboarding"
```

## CLI Options

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Project name (default: "default") |
| `-f, --flow <name>` | Flow name |
| `-p, --parent <id>` | Parent flow ID for nesting |
| `-u, --url <url>` | URL to navigate to |
| `-i, --interactive` | Interactive capture mode |
| `-c, --connect-chrome` | Connect to existing Chrome via CDP |
| `--headless` | Run in headless mode |

## Output Structure

Screenshots and manifests are saved to `captures/<project-name>/`:

```
captures/
└── myapp/
    ├── manifest.json
    ├── 001-homepage.png
    ├── 002-login-form.png
    └── 003-dashboard.png
```

### Manifest Format

```json
{
  "projectName": "myapp",
  "flows": [
    {
      "id": "onboarding",
      "name": "Onboarding",
      "capturedAt": "2024-01-15T10:30:00.000Z",
      "steps": [
        {
          "order": 1,
          "name": "Welcome Screen",
          "filename": "001-welcome-screen.png",
          "url": "https://app.example.com/onboarding",
          "timestamp": "2024-01-15T10:30:00.000Z"
        }
      ],
      "children": [
        {
          "id": "upload-logo",
          "name": "Upload Logo",
          "steps": [...]
        }
      ]
    }
  ]
}
```
