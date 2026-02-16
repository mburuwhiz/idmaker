# WhizPoint ID

High-resolution design, data binding, calibration, and batch printing of CR80 ID cards onto Epson DVD tray.

## Features

- **300 DPI Precision**: All measurements in millimeters.
- **Mechanical Tray Alignment**: Absolute anchors for Slot 1 and Slot 2.
- **Calibration Wizard**: Correct for printer-specific offsets and scaling errors.
- **Dynamic Data Binding**: Use `{{NAME}}`, `{{ADM_NO}}`, etc., mapped from Excel.
- **Smart Photo Processing**: Auto-crop head-and-shoulders using smartcrop.
- **Batch Management**: Permanent SQLite storage for every import.

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm

### Installation

```bash
# Install dependencies
npm install

# Rebuild native modules (REQUIRED for better-sqlite3)
npm run rebuild
```

### Development

```bash
npm run dev
```

### Troubleshooting Native Modules

If you see an error like `The module ... better_sqlite3.node was compiled against a different Node.js version`, run:

```bash
npm run rebuild
```

This will use `@electron/rebuild` to synchronize the native SQLite module with the Electron version.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS + Fabric.js
- **Main Process**: Electron (TypeScript)
- **Database**: SQLite (via `better-sqlite3`)
- **PDF Generation**: `jspdf`
