# WhizPoint ID Production System — Documentation

## 1. System Overview
WhizPoint ID is a high-resolution, desktop-based card production system designed for **Epson DVD tray printing**. Unlike standard document printers, this system treats the print area as a physical mechanical tray with absolute coordinates.

## 2. Technical Architecture
- **Frontend**: React 19 + TypeScript + Vite.
- **Desktop Wrapper**: Electron.js.
- **Styling**: Tailwind CSS for a modern, responsive UI.
- **Graphics Engine**: Fabric.js for 300 DPI canvas manipulation.
- **Database**: SQLite (via `better-sqlite3`) for persistent batch and student records.
- **PDF Generation**: `jsPDF` for millimeter-perfect output.

## 3. Coordinate Model (300 DPI)
The system operates on a fixed **300 DPI** scale. All internal measurements are calculated in millimeters (mm) and converted to pixels (px) using:
`px = mm * (300 / 25.4)`

### CR80 Standard Dimensions:
- **Width**: 86 mm (1016 px)
- **Height**: 54 mm (638 px)

### Tray Anchors (Default):
- **Slot 1 (Top)**: X = 31.8 mm, Y = 12.3 mm
- **Slot 2 (Bottom)**: X = 31.8 mm, Y = 97.8 mm (12.3 + 54 + 31.5 gap)

## 4. Calibration System
Because every printer has slight mechanical variations, the system includes a five-parameter calibration engine:
1. `offsetX`: Global horizontal shift.
2. `offsetY`: Global vertical shift.
3. `slot2YOffset`: Independent vertical correction for the bottom slot.
4. `scaleX`: Horizontal stretch compensation.
5. `scaleY`: Vertical stretch compensation.

## 5. Design Features
- **Placeholders**: Map variables like `{{NAME}}` or `{{ADM_NO}}` directly to Excel columns.
- **Photo Slots**: Dedicated rounded-rectangle frames for student photos.
- **Watermarks**: Support for logos with opacity and layering controls.
- **Fonts**: Integration with system fonts and formatting (Bold, Italic, Size).

## 6. Batch Workflow
1. **Import**: Upload an Excel file. Columns are automatically detected.
2. **Photo Match**: Select a folder. Photos are matched if `filename == ADM_NO`.
3. **Validation**: The system checks for missing photos or duplicate IDs before printing.
4. **Print**: Generates a mechanical A4 PDF where cards are placed exactly at tray anchors.

## 7. Development & Troubleshooting
- **Build**: `npm run build`
- **Native Rebuild**: If SQLite fails due to Node version mismatch, run `npm run rebuild`.
- **Database Location**: Data is stored in the application's `userData` directory as `whizpoint.db`.
