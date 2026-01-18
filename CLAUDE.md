# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Mobbin-style app for capturing and viewing website flows. Two main components:
- **flow-capture/** - CLI tool using Playwright to capture screenshots with Chrome CDP support for authenticated pages
- **app/** - Next.js 16 web viewer with tree sidebar and gallery

Screenshots are stored in **captures/** with manifest.json files describing flows.

## Commands

### Flow Capture Tool
```bash
cd flow-capture
npm install && npx playwright install chromium  # Initial setup

# Basic capture
node src/capture.js -i --name myproject --flow "Flow Name"

# Authenticated capture (connect to Chrome with existing session)
# First: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
node src/capture.js -c -i --name myproject --flow "Dashboard"

# Single screenshot
node src/capture.js --url "https://example.com" --name demo --flow "Homepage" --headless
```

### Web Viewer
```bash
cd app
npm install   # Initial setup
npm run dev   # Start at localhost:3000
npm run build # Production build
```

## Architecture

### Data Flow
1. `flow-capture/src/capture.js` writes screenshots + `manifest.json` to `captures/<project>/`
2. `app/src/lib/flows.ts` reads manifests from filesystem
3. `app/src/app/api/flows/route.ts` exposes projects/flows as JSON
4. `app/src/app/api/screenshot/[...path]/route.ts` serves screenshot images

### Manifest Structure
Flows support hierarchical nesting via `children` array and `--parent` flag:
```json
{
  "projectName": "myapp",
  "flows": [{
    "id": "onboarding",
    "name": "Onboarding",
    "steps": [{ "order": 1, "name": "Step", "filename": "001-step.png", "url": "..." }],
    "children": [{ "id": "child-flow", ... }]
  }]
}
```

### Key Types (app/src/lib/flows.ts)
- `Step` - Individual screenshot with order, name, filename, url
- `Flow` - Named flow with steps array and optional children
- `Project` / `ProjectWithPath` - Project containing flows

### Chrome CDP Connection
The capture tool can connect to an existing Chrome instance via `--connect-chrome` / `-c` flag to capture authenticated pages. Chrome must be running with `--remote-debugging-port=9222`.
