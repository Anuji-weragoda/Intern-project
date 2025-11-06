Accessibility Test Report
Date: 2025-11-06
Repository: Intern-project (branch: Testing)

Summary
-------
This report summarizes the accessibility issues found in the admin frontend during an automated accessibility scan (findings captured 2025-11-06). It lists the issues, their impact, where they were found, and concrete remediation performed or recommended. A browsable HTML version is also provided in the same folder so you can open it in a browser and print to PDF.

Key findings
------------
1. Insufficient color contrast (WCAG 2.0 AA)
   - Description: Text using Tailwind class `text-green-600` on white backgrounds had contrast ~3.29:1, below the 4.5:1 threshold for normal text.
   - Impact: Serious (affects readability for low-vision users)
   - Files found (examples):
     - `admin_frontend/src/pages/Dashboard.tsx`
     - `admin_frontend/src/pages/Profile.tsx`
     - `admin_frontend/src/pages/AuditLog.tsx`
     - Generated artifacts in `admin_frontend/dist/...` and e2e reports also showed `.text-green-600` CSS entries.
   - Fix applied: Replaced `text-green-600` with `text-green-900` in the source files above to increase contrast against white backgrounds.
   - Notes: After changing source files you must rebuild the frontend so generated artifacts (dist, e2e snapshots) are updated.

2. Select elements missing accessible name (WCAG 2.0 A)
   - Description: Several `<select>` elements lacked an explicit or implicit label (no `label` with `for`, no `aria-label`, etc.). Automated findings reported critical impact.
   - Impact: Critical (form controls must be programmatically associated with labels)
   - Files found (examples):
     - `admin_frontend/src/pages/Profile.tsx` (SelectField used for Preferred Language)
     - `admin_frontend/src/pages/AuditLog.tsx` (Event Type, Status, Rows-per-page selects)
     - `admin_frontend/src/pages/UserManagement.tsx` (Role filter)
   - Fix applied: Updated source to associate labels and selects by adding `id` on the `<select>` and `htmlFor` on the `<label>`. For the reusable `SelectField` component the label now uses `htmlFor={name}` and the select uses `id={name}`.
   - Recommendation: If controls are repeated on a page you may need unique ids (e.g. `id={`${name}-${index}`}`); the component can accept an `id` prop if needed.

3. Icon-only buttons lacked accessible name (name-role-value)
   - Description: Buttons that contained only an icon (no visible text) were missing programmatic names (no `aria-label` or title), causing them to be invisible to screen readers.
   - Impact: Critical
   - Files found (examples):
     - Pagination previous/next buttons in `admin_frontend/src/pages/AuditLog.tsx`
     - Modal close buttons (X icon) in `admin_frontend/src/pages/UserManagement.tsx`
     - Some other icon-only buttons in the app (grep for single-icon buttons)
   - Fix applied: Added `aria-label` and `title` attributes for those icon-only buttons (e.g. `aria-label="Previous page"`).
   - Recommendation: Use visually-hidden text (svr-only) or `aria-label` for icon-only controls across the app for consistency.

4. Horizontally scrollable containers not keyboard-focusable (WCAG 2.1)
   - Description: Containers with `overflow-x-auto` were not focusable, making it hard for keyboard-only users to reach horizontally scrollable regions.
   - Impact: Serious
   - Files found: `admin_frontend/src/pages/AuditLog.tsx` (audit table) and `admin_frontend/src/pages/UserManagement.tsx` (users table)
   - Fix applied: Added `tabIndex={0}` and an `aria-label` to the scroll containers so keyboard users can focus them and get a clear label.
   - Recommendation: Consider adding visible keyboard focus styles (outline) for these containers.

Other notes observed in reports
-----------------------------
- The automated scan also reported problems found inside generated artifacts (e.g., files under `admin_frontend/dist` and e2e HTML snapshots). Those reflect previous builds — rebuild the app after source changes to refresh those artifacts.
- Use of dynamic class names (templated Tailwind classes) sometimes moves color usage into generated CSS in `dist` — check the compiled CSS if your CI or deployed site still shows old colors.

Files changed (source)
----------------------
- `admin_frontend/src/pages/Dashboard.tsx` — replaced `text-green-600` with `text-green-900` for badges, icons and stats.
- `admin_frontend/src/pages/Profile.tsx` — replaced `text-green-600` with `text-green-900` for small-status badges; updated `SelectField` to use `id` and `htmlFor` association.
- `admin_frontend/src/pages/AuditLog.tsx` — replaced `text-green-600` with `text-green-900` for Successful stat; added `id` to selects and `htmlFor` to labels; added aria-label and title to pagination icon buttons; made table container focusable with `tabIndex` and `aria-label`.
- `admin_frontend/src/pages/UserManagement.tsx` — added ids for search/filter controls; added aria-label/title to icon-only close buttons; made table container focusable and labelled.
- `authservice/perf/results/k6-report.md` — documented the accessibility changes made.

How to reproduce locally
------------------------
1. Start from repository root in PowerShell:

```powershell
cd C:\Users\AnujiWeragoda\git\staff-management-system\Intern-project\admin_frontend
npm install   # only if dependencies changed or first time
npm run build # build production assets (updates dist/)
npm run dev   # for local dev server (optional)
```

2. Re-run your accessibility scanner (aXe, WAVE, or whichever tool produced the original report). Confirm the previously reported violations are resolved.

Verification checklist
----------------------
- [ ] Rebuild app and verify `dist/` no longer contains `.text-green-600` or old markup.
- [ ] Run automated accessibility scan and check that:
  - Color contrast violation for the green text is resolved.
  - Select controls have accessible names.
  - Icon-only buttons have accessible names.
  - Scroll containers are keyboard-focusable.
- [ ] Manual keyboard testing: Tab through the pages to ensure keyboard users can reach controls and scrollable regions.

Recommendations & next steps
----------------------------
- Add an accessibility (axe) check to CI to prevent regressions (run axe-core against Storybook or app pages).
- Add a small lint script to fail builds when Tailwind color classes used in components are below contrast thresholds (or prefer a design token system where accessible colors are enforced).
- Consider adding `aria-hidden` or `role=presentation` appropriately for purely decorative icons.
- Make the `SelectField` accept an optional `id` prop for unique ids when used in repeated lists.

Appendix: Quick code examples
----------------------------
- Label/select association:

```tsx
<label htmlFor="eventTypeFilter">Event Type</label>
<select id="eventTypeFilter" value={eventTypeFilter} onChange={...}>
  <option value="">All Events</option>
</select>
```

- Icon-only button with accessible name:

```tsx
<button aria-label="Close" title="Close">
  <X className="w-5 h-5" />
</button>
```

- Focusable scroll container with aria-label:

```tsx
<div className="overflow-x-auto" tabIndex={0} aria-label="Audit logs table, scrollable horizontally">
  ...table...
</div>
```


-----
Generated by the automated accessibility sweep and follow-up edits on 2025-11-06. Open `accessibility-report.html` to print to PDF from your browser (File → Print → Save as PDF). If you want me to generate the PDF here, I can run a build and produce a PDF file — tell me to proceed and I'll run the build and conversion steps.
