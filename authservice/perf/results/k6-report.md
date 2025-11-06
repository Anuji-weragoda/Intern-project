# k6 run report (sample)

This file contains the human-friendly summary produced after running `parse-k6.ps1` against the raw `result.json` file.

## Accessibility fix note (2025-11-06)

During an accessibility audit the team found insufficient color contrast for elements using the Tailwind class `text-green-600` on white backgrounds (contrast ~3.29:1). To meet WCAG 2.0 AA (4.5:1) requirements these occurrences in the admin frontend were updated to a darker color class.

- Files changed:
	- `admin_frontend/src/pages/Dashboard.tsx` — replaced `text-green-600` with `text-green-900` for badges, icons, and stats.
	- `admin_frontend/src/pages/Profile.tsx` — replaced `text-green-600` with `text-green-900` for small-status badges.
	- `admin_frontend/src/pages/AuditLog.tsx` — replaced `text-green-600` with `text-green-900` for the Successful stat card.

This change increases foreground contrast against white backgrounds. Follow-up: run the accessibility scan again (or re-run your aXe/WAVE tool) to confirm the issue is resolved across all pages and generated artifacts.
