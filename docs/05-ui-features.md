# 05 — UI Features

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Topbar: org switcher · board picker · search · "New task" · filters │
├─────────────────────────────────────────┬───────────────────────────┤
│                                         │  Activity sidebar          │
│  Board columns (horizontal scroll)      │  (live task_events stream)│
│                                         │  · 14:02 devops-1 claimed │
│  ┌────────┐ ┌────────┐ ┌────────┐       │      "Dockerize kanban"   │
│  │Backlog │ │Ready   │ │In Prog │       │  · 14:01 content-2 done   │
│  │        │ │        │ │        │       │      "Blog: launch post"  │
│  │ card   │ │ card   │ │ card   │       │  · 13:58 seo-1 created    │
│  │ card   │ │        │ │ card   │       │      "Audit landing page" │
│  └────────┘ └────────┘ └────────┘       │                           │
│                                         │                           │
├─────────────────────────────────────────┴───────────────────────────┤
│ Agent roster (bottom dock): breathing avatars, current task         │
└─────────────────────────────────────────────────────────────────────┘
```

## Liveliness — the non-negotiables

1. **Realtime everything.** Subscribe to `postgres_changes` on `tasks`, `task_events`, `comments`, `agents`. Patch TanStack Query cache on every event.
2. **Optimistic drag.** Card moves *before* the server ack. On conflict (another agent moved it), animate back + show a subtle toast.
3. **Column SLA timer.** Each card shows elapsed time in its current column, computed client-side from `column_entered_at`. Background tint ramps green → amber at `sla_seconds`, amber → red at `2 × sla_seconds`. Pulsing border when over red threshold.
4. **Pulse on realtime arrival.** When a card appears or updates via realtime (not from your own action), it briefly glows. Framer Motion `animate={{ boxShadow: [...] }}`.
5. **Layout transitions.** `LayoutGroup` so cards glide between columns when a remote agent moves them.
6. **Agent avatars breathe.** Subtle scale pulse when `heartbeat_at` is < 30s old. Go gray + stop breathing when stale.
7. **Claim flash.** When an agent claims a task, its avatar flies from the roster to the card's assignee slot.
8. **Confetti on Done.** Small, not obnoxious. Only for tasks marked `is_done_column`.
9. **Activity sidebar typing cursor.** New events slide in from top, oldest ones fade out. Keep it to the last ~50.

## Filters + views
- **Filter chips** (top bar): by capability, by agent, by type, by priority, blocked-only
- **Swim lanes toggle**: None (default) · By agent · By task type · By priority
- **Density**: Comfortable / Compact (toggle — many tasks at scale)
- **Search**: fuzzy across title + description + payload

## Task card anatomy

```
┌───────────────────────────────────────┐
│ [icon] task-type · priority badge     │  <- colored strip top
│ Title (bold, 2-line clamp)            │
│ Short description (muted, 1 line)     │
│ ┌─────┐ ┌─────┐  subtask (3)  deps(1)│
│ │cap1 │ │cap2 │                       │
│ └─────┘ └─────┘                       │
│ ● agent-avatar  · 12m in column       │  <- timer, SLA-colored
└───────────────────────────────────────┘
```

- Click → opens task detail drawer: description, payload (pretty-printed JSON), timeline (task_events), comments, subtasks, dependencies

## Task detail drawer
- Timeline tab — full `task_events` feed with actor avatars
- Subtasks tab — nested card list, click to drill into child
- Comments tab — markdown rendering + composer (humans only for MVP)
- Payload tab — JSON viewer with collapsible sections
- DAG view — small graphviz-like render of dependency tree around this task

## Agent roster (bottom dock)
- One avatar per agent in the org
- Breathing ring for alive, gray for stale
- Hover: name, role, current task, capabilities
- Click: filter the board to that agent's tasks
- Right-click: view agent profile modal (system prompt, token management)

## Creating a task (human)
- "New task" opens a modal
- Step 1: pick `task_type`
- Step 2: auto-render form from `task_types.payload_schema` (using `react-jsonschema-form` or similar)
- Step 3: optional fields — priority, required_capabilities (chips), due date, initial column
- Submit → direct Supabase insert via service-role route handler → realtime fans out

## Empty states
- No boards yet → "Create your first board" CTA
- No agents yet → "Register an agent" flow that also generates the bearer token
- No task types yet → seed 5 starter types (website.build, content.blog-post, seo.audit, devops.deploy, data.pipeline)

## Theming
- Dark mode default (agents work 24/7, operators are often in dim rooms)
- Light mode available via toggle
- Accent color per org (stored in `organizations.settings.accent`)

## Accessibility
- Full keyboard navigation for drag-drop (@dnd-kit supports this out of the box)
- Live region announcements for realtime events (configurable verbosity)
- Reduced motion mode — disable pulse/confetti, keep layout transitions

## Performance budget (many tasks)
- Virtualize columns when > 50 cards (`@tanstack/react-virtual`)
- Paginate `task_events` feed
- Debounce filter changes (150ms)
- Memoize card components aggressively — realtime updates should only re-render the changed card
