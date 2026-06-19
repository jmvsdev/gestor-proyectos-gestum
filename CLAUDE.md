# PM — Gestum Project Dashboard

## Stack
- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite` — no `tailwind.config.js` needed)
- **Recharts** for all charts (`<ResponsiveContainer>` always)
- **lucide-react** for all icons
- **localStorage** is allowed and used for task persistence (key: `pm-tasks`).
  The original "no localStorage" rule only applied to Claude.ai artifacts where it doesn't work.

## Folder structure
```
src/
  components/
    layout/    AppShell  IconRail  SidebarPanel  TopBar  Toolbar
    widgets/   AISummaryCard  KpiCard  WorkloadBar
               TasksByAssigneeDonut  OpenTasksBar  CompletedThisWeekCard
    ui/        Card  Button  Toggle  Badge
  data/        mockData.ts  types.ts
  hooks/       useProjectData.ts
  App.tsx
```

## Data / API contract
- All data enters components via props — no hardcoded numbers inside components.
- `useProjectData()` is the single data hook. Today it reads from `mockData.ts`; tomorrow it will fetch from Supabase / API without touching the components.
- Types live in `src/data/types.ts`: `Phase`, `Task`, `Assignee`, `KPI`.

## UI conventions
- Accent color: `#5a67f2` (indigo-blue). Exposed as `accentColor` prop on AppShell.
- Typography: Inter (loaded via Google Fonts in index.css).
- Language: Spanish for all UI labels. Component names stay in English.
- Rounded cards: `rounded-2xl shadow-sm border border-gray-100`.
- Colors follow the design palette: neutral grays for structure, accent for interactive states.

## Dev workflow
1. `npm run dev` — start dev server
2. Fix all console errors before moving to the next component.
3. Commit per component (not per file).
