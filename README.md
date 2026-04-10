# PreventAI Desktop

Medical device risk intelligence. Local-only desktop app built with Electron + React + TypeScript.

## What it does

Upload your device files (DMR, Risk Management File, optional DHF). The app:
1. Extracts components, materials, and suppliers using Claude
2. Cross-references each component against the FDA MAUDE adverse event database
3. Scores findings by likelihood + severity
4. Suggests new FMEA rows for flagged components
5. Generates a written risk brief
6. Re-runs on a schedule you set, surfacing what's new since last run

All data stays on your machine. No cloud, no telemetry, no accounts.

## Setup

```bash
npm install
npx electron-rebuild  # rebuild native modules for Electron
```

## Run in development

```bash
npm run dev
```

Starts the Vite dev server and Electron together with hot reload.

## Build a distributable

```bash
npm run build
```

Output goes to `release/` (.dmg / .exe / .AppImage).

## Architecture

```
electron/                 Main process (Node.js)
├── main.ts               Window lifecycle
├── preload.ts            contextBridge IPC API
├── ipc.ts                IPC handler registry
├── settings.ts           keytar wrapper for API key
├── scheduler.ts          Re-analysis scheduling logic
├── analysis/             The pipeline
│   ├── extraction.ts     PDF/DOCX → Claude → components
│   ├── retrieval.ts      openFDA MAUDE + recall queries
│   ├── matching.ts       Claude semantic matching + scoring
│   ├── summary.ts        Risk brief generation
│   └── fmea.ts           FMEA suggestion generation
├── db/
│   ├── database.ts       better-sqlite3 + migrations
│   ├── migrations/
│   └── repos/            Typed query layer
└── prompts/              Claude prompt templates

renderer/                 React app (renderer process)
└── src/
    ├── pages/            Welcome, Dashboard, AddProduct, ProductDetail, Settings
    ├── components/       BomSidebar, SummaryView, ComponentDetail, etc.
    └── lib/              ipc, format, markdown helpers

shared/types.ts           Types shared between main and renderer
```

## Configuration

You bring your own Anthropic API key. The app stores it in your OS keychain via `keytar`.
You pay Anthropic directly for inference. PreventAI itself is free.

## License

UNLICENSED. Private project.
