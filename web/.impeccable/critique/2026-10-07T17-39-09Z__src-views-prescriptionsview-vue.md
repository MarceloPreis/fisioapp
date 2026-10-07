---
target: Sessões de Treino
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-10-07T17-39-09Z
slug: src-views-prescriptionsview-vue
---
⚠️ DEGRADED: single-context (no sub-agent tool exposed)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good loading states and success toasts, but saving modal blocks without progress context. |
| 2 | Match System / Real World | 3 | "Templates" vs "Sessões" concepts are fairly clear, but "Template" badge uses dev-jargon instead of "Modelo". |
| 3 | User Control and Freedom | 3 | Cancel buttons present on modals. Easy to delete sessions. |
| 4 | Consistency and Standards | 3 | Consistent DataTables now, but the inline form for Exercises in the modal breaks standard layouts. |
| 5 | Error Prevention | 2 | Deleting a session skips a confirmation modal (uses native `confirm`), which feels jarring. Form inputs allow invalid reps. |
| 6 | Recognition Rather Than Recall | 3 | Good use of dropdowns for patients/exercises, though no search within dropdowns for large lists. |
| 7 | Flexibility and Efficiency | 3 | Date shortcuts (Esta semana) help speed up filtering. |
| 8 | Aesthetic and Minimalist Design | 2 | The results modal and the exercise addition row are quite dense and visually noisy. |
| 9 | Error Recovery | 2 | Basic alerts for errors, but they don't guide the user well. |
| 10 | Help and Documentation | 1 | No inline help for what "Dias da Semana" implies for recurrence vs fixed date. |
| **Total** | | **25/40** | **Acceptable** |

### Design Specificity Verdict

**LLM assessment**: The interface functions adequately for an "Operate" mode, relying heavily on standard Tailwind utility classes and native HTML elements (`<select>`, native `confirm()`). It feels slightly generic and administrative, lacking the clinical polish expected of a modern health-tech platform.

**Deterministic scan**: The automated scan found 1 warning: `border-accent-on-rounded` on line 468 (`border-b-2`). However, this is a false positive because it is being used to create a loading spinner ring (`animate-spin rounded-full border-b-2`).

### Overall Impression
The screen handles a lot of complexity well (templates vs individual sessions), and the new filters help significantly. The biggest opportunity lies in **decluttering the modals** (Creation and Results), which currently feel overwhelming and technical.

### What's Working
- **Standardized List Views**: The new `<DataTable>` with unified search creates a predictable and clean browsing experience.
- **Date Filtering**: The `DateRangePicker` component brings excellent efficiency (especially the "Esta semana" shortcut) for managing the schedule.

### Priority Issues

**[P1] Cluttered "Nova Sessão" Modal Layout**
- **Why it matters**: The exercise selection rows (`select` + `sets` + `x` + `reps` + `delete`) become extremely dense, leading to cognitive overload (violating the working memory rule of ≤4 items) and potential input errors.
- **Fix**: Redesign the exercise row to use a clearer grid layout. Use visual grouping for the Sets x Reps. Consider a searchable dropdown for exercises.
- **Suggested command**: `$impeccable layout`

**[P1] Jargon and Native Prompts**
- **Why it matters**: Using browser-native `confirm('Deseja realmente excluir...')` and developer terms like `Template` (in the badge) breaks immersion and looks unprofessional for a clinical system.
- **Fix**: Replace native confirms with a custom styled confirmation modal. Change "Template" badges to "Modelo Fixo".
- **Suggested command**: `$impeccable clarify`

**[P2] Results Modal is Overwhelming**
- **Why it matters**: The video review modal (`openResults`) crams the execution list, alerts, and a video player into a tight space, making it hard for the physio to focus on patient form.
- **Fix**: Give the video player more breathing room. Move the AI alerts to overlay or a dedicated, cleaner sidebar panel.
- **Suggested command**: `$impeccable shape`

### Persona Red Flags

**Alex (Power User)**: 
- Has to click 4 times to add a single exercise and fill it out. Needs to use a mouse because the dense inline form doesn't tab cleanly. Needs bulk-add for exercises.

**Jordan (First-Timer)**: 
- Might not understand the difference between creating a "Sessão" and a "Template" because the checkbox "Sessão Recorrente" is buried in a blue box inside the modal. The UI doesn't explain how recurrence generation works.

### Minor Observations
- The patient `<select>` filter in the header could use a more distinct style to separate it from action buttons.
- Empty states on the DataTables are a bit plain (just a text row).

### Questions to Consider
- Does the physiotherapist need to see the video and the AI text alerts simultaneously, or could the alerts act as timeline markers on the video player itself?
- Could we extract the "Nova Sessão" modal into its own full-page flow given its complexity?
