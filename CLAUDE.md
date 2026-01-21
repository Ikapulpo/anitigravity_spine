# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Spinal OVF (Osteoporotic Vertebral Fracture) Patient Management Dashboard** built with Next.js. It fetches patient data from Google Sheets via Google Apps Script and displays statistics, charts, and patient lists.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Icons**: lucide-react
- **Data Source**: Google Sheets via Google Apps Script API

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Main dashboard page (SSR)
│   ├── layout.tsx            # Root layout
│   ├── actions/auth.ts       # Server actions for authentication
│   └── login/page.tsx        # Login page
├── components/
│   └── Dashboard.tsx         # Main dashboard component (charts, tables, stats)
├── services/
│   └── dataService.ts        # Data fetching from GAS API
├── types/
│   └── patient.ts            # PatientRecord type definition
└── middleware.ts             # Route protection
```

## Key Files

- **google_apps_script.js**: Google Apps Script code deployed to fetch data from Google Sheets. Must be deployed separately via Google Apps Script editor.
- **src/services/dataService.ts**: Contains the GAS API URL. Update this when redeploying GAS.
- **src/components/Dashboard.tsx**: Main UI component with date calculation logic.

## Date Handling

The codebase handles flexible date formats (MM/DD, YYYY/MM/DD) and year boundary issues:

- **Year boundary problem**: When admission is in December and discharge is in January, simple date subtraction returns negative values
- **Solution**: Helper functions `parseFlexibleDate`, `extractBaseYear`, and `calculateFromDates` handle year inference from timestamps and correct year boundary calculations
- Both frontend (Dashboard.tsx) and GAS (google_apps_script.js) have this logic

## Google Apps Script Deployment

1. Open Google Apps Script editor
2. Paste contents of `google_apps_script.js`
3. Deploy → New deployment → Web app
4. Update the API URL in `src/services/dataService.ts`

## Common Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

## Data Flow

```
Google Sheets (Form + Manual input)
    ↓
Google Apps Script (doGet)
    ↓ JSON API
Next.js (dataService.ts)
    ↓
Dashboard.tsx (display + calculations)
```

## Column Mapping (Google Sheets)

| Index | Field |
|-------|-------|
| 0 | Timestamp |
| 1 | ID |
| 14 | Admission Date |
| 19 | Surgery Date |
| 20 | Discharge Date |
| 21 | Hospitalization Period (calculated) |

See `google_apps_script.js` for full mapping.
