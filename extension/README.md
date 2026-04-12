# Knowledge Vault — Browser Extension

A Chrome Manifest V3 extension to save pages, text, and images directly to your Knowledge Vault.

## Structure

```
extension/
├── src/
│   ├── lib/           # Shared utilities
│   │   ├── api.ts     # Fetch wrapper (Bearer token, no cookies)
│   │   ├── storage.ts # chrome.storage.local helpers
│   │   └── types.ts   # TypeScript types (mirrors frontend)
│   ├── popup/         # React popup UI
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── Popup.tsx       # Auth gate
│   │   ├── Login.tsx       # Login form
│   │   ├── Dashboard.tsx   # Tabs: Save | Recent
│   │   ├── QuickSave.tsx   # Save current tab
│   │   └── RecentItems.tsx # Last 8 vault items
│   ├── background/
│   │   └── background.ts  # Service worker + context menus
│   └── content/
│       └── content.ts     # In-page toast notifications
├── public/
│   └── manifest.json      # MV3 manifest (source)
├── vite.config.ts
├── package.json
└── tsconfig.json
```

## Development

```bash
cd extension
npm install
npm run build       # builds to extension/dist/
npm run dev         # watch mode
```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/dist/` folder
5. The extension icon appears in the toolbar

## Features

- **Login** — uses the same credentials as the web app
- **Quick Save** — pre-fills current tab URL, supports notes and links  
- **Tag support** — add tags before saving
- **Recent Items** — shows last 8 vault items, click to open
- **Context Menu** — right-click any page/selection/image to save directly
- **Toast Notifications** — in-page confirmation after context-menu saves
- **Logout** — clears token from storage

## Auth Strategy

The extension cannot share HTTP-only cookies with the web app. Instead, it stores the JWT access token returned in the login JSON response in `chrome.storage.local`.

## API Base

By default points to `http://localhost:5000/api`. This is stored in `chrome.storage.local` as `apiBase` and can be overridden programmatically.
