Leave pages
===============

This folder contains example pages for the Leave & Attendance module.

How to integrate
- Import pages into your admin routes (React Router) and mount them under a path like `/admin/leave`.

Example (React Router):

```tsx
import { LeaveRequests, Attendance, LeavePolicies } from './pages/leave';

<Route path="/admin/leave" element={<LeaveLayout />}>
  <Route index element={<LeaveRequests/>} />
  <Route path="attendance" element={<Attendance/>} />
  <Route path="policies" element={<LeavePolicies/>} />
</Route>
```

Environment
- `VITE_LEAVE_API_BASE_URL` - optional. If not present the code will fall back to the main `VITE_API_BASE_URL`.

Notes
- The pages call the small client under `src/leave/api/leaveApi.ts`. Adjust payloads and field names to match your backend Lambda API responses.
- These pages are intentionally minimal; expand them with validations, pagination, and UI polish as needed.
