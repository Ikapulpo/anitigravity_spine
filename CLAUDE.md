# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Spinal OVF (Osteoporotic Vertebral Fracture) Patient Management Dashboard** built with Next.js. It fetches patient data from Google Sheets via Google Apps Script and provides a Japanese-language, dark-themed analytics UI: epidemiology overview, length-of-stay comparison (surgery vs conservative), a flow-cytometry-style correlation workstation, and a research-grade patient table with CSV export.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS 4 (CSS-first config in `globals.css`, always-dark theme)
- **Charts**: Recharts
- **Icons**: lucide-react
- **Data Source**: Google Sheets via Google Apps Script API
- **Statistics**: in-house pure-TS engine (`src/lib/stats.ts`) — no external stats dependency

## Architecture

```
src/
├── app/
│   ├── page.tsx              # SSR entry: fetchPatients() → <Dashboard/>
│   ├── layout.tsx            # lang="ja", metadata, dark body
│   ├── actions/auth.ts       # Server actions for authentication
│   └── login/page.tsx        # Login page (dark/Japanese)
├── components/
│   ├── Dashboard.tsx         # Thin client shell: derive + global filters + tabs
│   ├── ui/                   # TabBar / StatCard / ChartCard / Section / Select / chartTheme
│   ├── tabs/                 # OverviewTab / AnalysisTab / PatientsTab
│   ├── overview/             # KpiRow / EpidemiologySection / LosSection / OutcomeSection
│   ├── analysis/             # ScatterPanel / GroupComparePanel / StatsPanel
│   └── patients/             # PatientTable / CsvExportButton
├── lib/
│   ├── dates.ts              # Flexible date parsing + year-boundary logic (DO NOT "fix")
│   ├── derive.ts             # derivePatient(): the ONLY place raw → derived fields happens
│   ├── variables.ts          # Variable registry driving axis selectors, stats, table, CSV
│   ├── stats.ts              # mean/sd/median/IQR, Pearson/Spearman, Welch, Mann-Whitney, chi-square
│   ├── colors.ts             # Chart hex colors (mirrored in globals.css @theme)
│   ├── aggregate.ts          # countBy etc.
│   └── csv.ts                # Japanese-header CSV + BOM download
├── services/dataService.ts   # GAS fetch + sanitization + mock fallback
├── types/patient.ts          # PatientRecord (incl. optional research fields)
└── middleware.ts             # Route protection (session cookie)
```

## Key Conventions

- **Adding a new data field** = 1 sheet column (append right-most) + 1 line in `google_apps_script.js` + optional field in `types/patient.ts` + sanitize line in `dataService.ts` + parse in `derive.ts` + 1 registry entry in `variables.ts`. It then auto-appears in the analysis axis selectors (≥3 non-null rows), patient table (≥1), and CSV.
- **Treatment classification** is centralized in `derive.ts#classifyTreatment` (outcome contains 手術/Surgery → surgery; 保存/経過観察/Conservative/Observation → conservative; else other).
- **Colors**: surgery = rose `#fb7185`, conservative = sky `#38bdf8` everywhere. Defined in `src/lib/colors.ts` AND mirrored in `globals.css @theme` (Recharts can't read CSS vars in SVG fills) — update both.
- **Recharts dark theme**: every chart must use the shared props from `components/ui/chartTheme.tsx` and `isAnimationActive={false}`.
- **Statistics**: degenerate inputs return `null`; UI shows "—"/"データ不足". All tests are exploratory (no multiplicity correction) — see RESEARCH.md.

## Date Handling

The codebase handles flexible date formats (MM/DD, YYYY/MM/DD) and year boundary issues:

- **Year boundary problem**: When admission is in December and discharge is in January, simple date subtraction returns negative values
- **Solution**: Helper functions `parseFlexibleDate`, `extractBaseYear`, `calculateFromDates`, `calculateHospitalizationDays` in `src/lib/dates.ts` handle year inference from timestamps and correct year boundary calculations. They encode real data quirks (incl. Chrome's year-2001 default for "MM-DD") — do not "clean up" without comparing outputs
- Both frontend (`src/lib/dates.ts`) and GAS (`google_apps_script.js`) have this logic

## Google Apps Script Deployment

1. Open Google Apps Script editor
2. Paste contents of `google_apps_script.js`
3. Deploy → New deployment → Web app
4. Set the URL in env `NEXT_PUBLIC_GAS_API_URL` (fallback URL lives in `src/services/dataService.ts`)

## Common Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production (includes TS check)
npm run start    # Start production server
npx eslint src   # Lint
# Offline visual check (forces mock-data fallback):
NEXT_PUBLIC_GAS_API_URL=http://127.0.0.1:9 npm run dev
```

## Data Flow

```
Google Sheets (Form + Manual input)
    ↓
Google Apps Script (doGet)
    ↓ JSON API
Next.js (dataService.ts: fetch + sanitize, mock fallback)
    ↓ PatientRecord[]
Dashboard.tsx (derivePatient → DerivedPatient[], global filters)
    ↓
tabs: 概況 / 相関分析 / 症例一覧 (+ CSV export)
```

## Column Mapping (Google Sheets)

| Index | Field |
|-------|-------|
| 0 | Timestamp |
| 1 | ID |
| 14 | Admission Date |
| 17 | Outcome (転帰) |
| 19 | Surgery Date |
| 20 | Discharge Date |
| 21 | Hospitalization Period (calculated) |
| 27 | Remarks 2 |
| 28–42 | Optional research fields (BMD YAM%/T-score, NRS, Barthel, ambulation, Alb, 25(OH)D, complications, adjacent fracture, readmission, death, brace, OP medication) |

See `google_apps_script.js` for the full mapping, `SPECIFICATION.md` for the full functional specification (Japanese), and `RESEARCH.md` for the research-field definitions and usage guide.
