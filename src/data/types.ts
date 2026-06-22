export interface CurrentUser {
  name: string;
  shortName: string;
  initials: string;
}

export interface AISummary {
  summaryText: string;
  keyInitiativesText: string;
}

export interface Phase {
  id: string;
  name: string;
  taskCount: number;
  active: boolean;
  isImport?: boolean;
}

export interface Task {
  id: string;
  title: string;
  status: 'sin-empezar' | 'en-curso' | 'en-revision' | 'bloqueada' | 'por-validar' | 'completada';
  assigneeId: string | null;
  phaseId: string;
  /** ISO date string "YYYY-MM-DD" */
  startDate?: string;
  /** ISO date string "YYYY-MM-DD" — also acts as the end date in Gantt */
  dueDate?: string;
  priority?: 'urgente' | 'alta' | 'normal' | 'baja';
  tags?: string[];
  // ── CSV-imported fields (all optional for backward compat) ──────────────────
  description?: string;
  equipmentType?: string;
  vendor?: string;
  budget?: number;
  regulatoryStatus?: string;
  risk?: 'alto' | 'medio' | 'bajo';
  isMilestone?: boolean;
  dependsOn?: string;
}

export interface Assignee {
  id: string;
  name: string;
  shortName: string;
  color: string;
  /** Computed by useProjectData from the tasks array — do not hardcode in mockData */
  totalTasks: number;
  /** Computed by useProjectData from the tasks array — do not hardcode in mockData */
  openTasks: number;
}

export interface KPI {
  label: string;
  value: number;
  color: string;
}

export interface WorkloadSegment {
  label: string;
  value: number;
  color: string;
}

/** Sentinel value for "show all phases at once" */
export const ALL_PHASES_ID = 'ALL' as const;

// ── Filters ───────────────────────────────────────────────────────────────────

export interface FilterState {
  priorities: Array<NonNullable<Task['priority']>>;
  assigneeIds: string[];   // '__unassigned__' sentinel for tasks with no assignee
  statuses: Task['status'][];
  risks: Array<NonNullable<Task['risk']>>;
}

export const EMPTY_FILTERS: FilterState = { priorities: [], assigneeIds: [], statuses: [], risks: [] };

export function countActiveFilters(f: FilterState): number {
  return f.priorities.length + f.assigneeIds.length + f.statuses.length + f.risks.length;
}

export function applyFilters(tasks: Task[], f: FilterState): Task[] {
  if (!countActiveFilters(f)) return tasks;
  return tasks.filter(t => {
    if (f.priorities.length > 0) {
      if (!t.priority || !f.priorities.includes(t.priority)) return false;
    }
    if (f.assigneeIds.length > 0) {
      if (!f.assigneeIds.includes(t.assigneeId ?? '__unassigned__')) return false;
    }
    if (f.statuses.length > 0 && !f.statuses.includes(t.status)) return false;
    if (f.risks.length > 0) {
      if (!t.risk || !f.risks.includes(t.risk)) return false;
    }
    return true;
  });
}

// ── Multi-project store ───────────────────────────────────────────────────────

/** Assignee without computed task counts */
export type RawAssignee = Omit<Assignee, 'totalTasks' | 'openTasks'>;

/** Minimal phase definition stored per-project (taskCount + active are always computed) */
export interface StoredPhase {
  id: string;
  name: string;
  isImport?: boolean;
}

export interface StoredProject {
  id: string;
  name: string;
  createdAt: string;
  tasks: Task[];
  phases: StoredPhase[];
  assignees: RawAssignee[];
}

export interface ProjectStore {
  activeProjectId: string;
  projects: Record<string, StoredProject>;
}

export interface ProjectData {
  projectName: string;
  workspaceName: string;
  accentColor: string;
  lastUpdated: string;
  currentUser: CurrentUser;
  aiSummary: AISummary;
  phases: Phase[];
  tasks: Task[];
  assignees: Assignee[];
  kpis: KPI[];
  workload: WorkloadSegment[];
}
