import { useEffect, useMemo, useRef, useState } from 'react';
import { onValue, onDisconnect, set, remove, get, update, ref } from 'firebase/database';
import type { User } from 'firebase/auth';
import { GlobalTopBar } from './GlobalTopBar';
import { SidebarPanel } from './SidebarPanel';
import { TopBar } from './TopBar';
import { Toolbar } from './Toolbar';
import { DashboardGrid } from '../widgets/DashboardGrid';
import { KanbanBoard } from '../widgets/KanbanBoard';
import { GanttChart } from '../widgets/GanttChart';
import { CalendarView } from '../widgets/CalendarView';
import { ListView } from '../widgets/ListView';
import { TeamView } from '../widgets/TeamView';
import { TaskFormModal } from '../widgets/TaskFormModal';
import { ProjectDropdown } from '../widgets/ProjectDropdown';
import { CSVImporter } from '../widgets/CSVImporter';
import { InviteModal } from '../ui/InviteModal';
import type { PresenceUser } from './TopBar';
import type { SharePayload } from '../../utils/share';
import { X } from 'lucide-react';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { ResetProjectModal } from '../ui/ResetProjectModal';
import type {
  Assignee, FilterState, Phase, ProjectData, Task,
  RawAssignee, StoredProject, ProjectStore, StoredPhase,
} from '../../data/types';
import { EMPTY_FILTERS, applyFilters, ALL_PHASES_ID } from '../../data/types';
import {
  db, projectRef, projectMetaRef, projectPayloadRef,
  userProjectRef,
  presenceRef, presenceListRef,
} from '../../firebase';

// Unique per browser tab — used to detect our own writes echoed back via onValue
const SESSION_ID = crypto.randomUUID();

interface AppShellProps {
  data: ProjectData;
  onImportSharedView: () => void;
  pendingImport?: SharePayload | null;
  onPendingImportDone?: () => void;
  initialStore?: ProjectStore | null;
  onSignOut?: () => void;
  user?: User | null;
}

// ── Storage version ───────────────────────────────────────────────────────────

const STORAGE_VERSION = '4';

// ── Base project template ─────────────────────────────────────────────────────

const BASE_PHASES: StoredPhase[] = [
  { id: 'f1',     name: 'Fase 1 – Planeación' },
  { id: 'f2',     name: 'Fase 2 – Licitación y Compras' },
  { id: 'f3',     name: 'Fase 3 – Obra Civil' },
  { id: 'f4',     name: 'Fase 4 – Instalación y Pruebas' },
  { id: 'f5',     name: 'Fase 5 – Capacitación y Arranque' },
  { id: 'import', name: 'Spreadsheet Import', isImport: true },
];

function getBasePhases(): StoredPhase[] {
  return BASE_PHASES.map(p => ({ ...p }));
}

function getBaseAssignees(data: ProjectData): RawAssignee[] {
  return data.assignees.map(({ totalTasks: _t, openTasks: _o, ...a }) => a);
}

// ── Validation helpers ────────────────────────────────────────────────────────

const VALID_STATUSES = new Set<string>([
  'sin-empezar', 'en-curso', 'en-revision', 'bloqueada', 'por-validar', 'completada',
]);

function isValidTask(t: unknown): t is Task {
  if (typeof t !== 'object' || t === null) return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.id      === 'string' && o.id.length > 0 &&
    typeof o.title   === 'string' && o.title.length > 0 &&
    typeof o.phaseId === 'string' && o.phaseId.length > 0 &&
    typeof o.status  === 'string' && VALID_STATUSES.has(o.status)
  );
}

function isValidStore(s: unknown): s is ProjectStore {
  if (typeof s !== 'object' || s === null) return false;
  const o = s as Record<string, unknown>;
  return typeof o.activeProjectId === 'string' && typeof o.projects === 'object' && o.projects !== null;
}

// ── Merge helper ──────────────────────────────────────────────────────────────

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map(item => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()];
}

// ── Project factory ───────────────────────────────────────────────────────────

function makeProjectId() {
  return crypto.randomUUID();
}

function createProject(
  name: string,
  phases: StoredPhase[],
  assignees: RawAssignee[],
  tasks: Task[],
): StoredProject {
  return { id: makeProjectId(), name, createdAt: new Date().toISOString(), tasks, phases, assignees };
}

// ── Load / migrate from localStorage ─────────────────────────────────────────

function loadOrMigrate(data: ProjectData): ProjectStore {
  const storedVersion = localStorage.getItem('pm-version');

  // Try to read new format first
  if (storedVersion === STORAGE_VERSION) {
    try {
      const raw = localStorage.getItem('pm-projects');
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValidStore(parsed)) return parsed;
      }
    } catch { /* fall through to migration */ }
  }

  // Migration from v3 → v4 (or fresh start)
  let migratedTasks: Task[] = data.tasks;
  let migratedAssignees: RawAssignee[] = getBaseAssignees(data);
  let migratedPhases: StoredPhase[] = getBasePhases();

  if (storedVersion === '3') {
    try {
      const oldTasks: unknown = JSON.parse(localStorage.getItem('pm-tasks') ?? 'null');
      if (Array.isArray(oldTasks) && (oldTasks as unknown[]).every(isValidTask)) {
        migratedTasks = oldTasks as Task[];
      }
    } catch { /* ignore */ }
    try {
      const oldExtra: unknown = JSON.parse(localStorage.getItem('pm-extra-assignees') ?? 'null');
      if (Array.isArray(oldExtra)) {
        migratedAssignees = mergeById(migratedAssignees, oldExtra as RawAssignee[]);
      }
    } catch { /* ignore */ }
    try {
      const oldPhases: unknown = JSON.parse(localStorage.getItem('pm-extra-phases') ?? 'null');
      if (Array.isArray(oldPhases)) {
        const extras = (oldPhases as Array<Record<string, unknown>>).map(p => ({
          id: String(p.id ?? ''),
          name: String(p.name ?? ''),
          ...(p.isImport ? { isImport: true as const } : {}),
        })).filter(p => p.id && p.name);
        migratedPhases = mergeById(migratedPhases, extras);
      }
    } catch { /* ignore */ }
  }

  // Clean up old keys
  ['pm-tasks', 'pm-extra-assignees', 'pm-extra-phases'].forEach(k => localStorage.removeItem(k));

  const firstProject = createProject(data.projectName, migratedPhases, migratedAssignees, migratedTasks);
  const newStore: ProjectStore = {
    activeProjectId: firstProject.id,
    projects: { [firstProject.id]: firstProject },
  };

  try {
    localStorage.setItem('pm-version', STORAGE_VERSION);
    localStorage.setItem('pm-projects', JSON.stringify(newStore));
  } catch { /* quota exceeded */ }

  return newStore;
}

// ── Open statuses ─────────────────────────────────────────────────────────────

const OPEN_STATUSES: Task['status'][] = [
  'sin-empezar', 'en-curso', 'en-revision', 'bloqueada', 'por-validar',
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AppShell({ data, onImportSharedView, pendingImport, onPendingImportDone, initialStore, onSignOut, user }: AppShellProps) {
  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]             = useState('Panel');
  const [importResult, setImportResult]       = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [filters, setFilters]                 = useState<FilterState>(EMPTY_FILTERS);
  const [presenceUsers, setPresenceUsers]     = useState<PresenceUser[]>([]);

  const connected = useConnectionStatus();
  const [showTaskForm, setShowTaskForm]       = useState(false);
  const [selectedTask, setSelectedTask]       = useState<Task | null>(null);
  const [showSettings, setShowSettings]       = useState(false);
  const [deletedTask, setDeletedTask]         = useState<Task | null>(null);
  const undoTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the task whose Firebase deletion is deferred during the undo window.
  // The write effect skips this task ID so Firebase is NOT touched until the 5s timer fires.
  const deferredDeleteRef = useRef<{ taskId: string; pid: string } | null>(null);

  // ── Project store ─────────────────────────────────────────────────────────────
  const [store, setStore] = useState<ProjectStore>(() => initialStore ?? loadOrMigrate(data));

  const activeProject: StoredProject | undefined = store.projects[store.activeProjectId];

  const [activePhaseId, setActivePhaseId] = useState<string>(() => {
    const phases = activeProject?.phases ?? [];
    return phases.find(p => !p.isImport)?.id ?? phases[0]?.id ?? 'f1';
  });

  const { workspaceName, accentColor, currentUser } = data;

  // ── Helper: update only the active project ────────────────────────────────────
  function updateActiveProject(updater: (p: StoredProject) => StoredProject) {
    setStore(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        [prev.activeProjectId]: updater(prev.projects[prev.activeProjectId]),
      },
    }));
  }

  // ── Derived state ─────────────────────────────────────────────────────────────

  const tasks                = useMemo(() => activeProject?.tasks      ?? [], [activeProject]);
  const rawPhases            = useMemo(() => activeProject?.phases     ?? [], [activeProject]);
  const rawAssigneesForImport = useMemo(() => activeProject?.assignees ?? [], [activeProject]);

  const allAssignees: Assignee[] = useMemo(() =>
    rawAssigneesForImport.map(a => ({
      ...a,
      totalTasks: a.id === 'sa'
        ? tasks.filter(t => !t.assigneeId).length
        : tasks.filter(t => t.assigneeId === a.id).length,
      openTasks: a.id === 'sa'
        ? tasks.filter(t => !t.assigneeId && OPEN_STATUSES.includes(t.status)).length
        : tasks.filter(t => t.assigneeId === a.id && OPEN_STATUSES.includes(t.status)).length,
    })),
    [rawAssigneesForImport, tasks]
  );

  const dynamicPhases: Phase[] = useMemo(() =>
    rawPhases.map(p => ({
      ...p,
      taskCount: tasks.filter(t => t.phaseId === p.id).length,
      active: p.id === activePhaseId,
    })),
    [rawPhases, tasks, activePhaseId]
  );

  const phaseTasks = useMemo(
    () => activePhaseId === ALL_PHASES_ID ? tasks : tasks.filter(t => t.phaseId === activePhaseId),
    [tasks, activePhaseId]
  );

  const filteredTasks = useMemo(
    () => applyFilters(phaseTasks, filters),
    [phaseTasks, filters]
  );

  const filteredTaskIds = useMemo(
    () => new Set(filteredTasks.map(t => t.id)),
    [filteredTasks]
  );

  const activePhase = activePhaseId === ALL_PHASES_ID
    ? 'Todo el proyecto'
    : (dynamicPhases.find(p => p.active)?.name ?? '');

  const today = new Date().toISOString().slice(0, 10);

  // Compute workload from active project tasks (all phases)
  const workload = useMemo(() => [
    { label: 'Sin empezar', value: tasks.filter(t => t.status === 'sin-empezar').length, color: '#9aa3b2' },
    { label: 'En curso',    value: tasks.filter(t => t.status === 'en-curso').length,    color: accentColor },
    { label: 'En revisión', value: tasks.filter(t => t.status === 'en-revision').length, color: '#f97316' },
    { label: 'Bloqueada',   value: tasks.filter(t => t.status === 'bloqueada').length,   color: '#ef4444' },
    { label: 'Por validar', value: tasks.filter(t => t.status === 'por-validar').length, color: '#b58aa6' },
  ], [tasks, accentColor]);

  // ── Persistence: localStorage ─────────────────────────────────────────────────

  useEffect(() => {
    try { localStorage.setItem('pm-projects', JSON.stringify(store)); } catch { /* quota */ }
  }, [store]);

  // ── Firebase: bootstrap new projects (create meta if missing) ─────────────────

  useEffect(() => {
    if (!user) return;
    for (const [pid, project] of Object.entries(store.projects)) {
      get(projectMetaRef(pid)).then(snap => {
        if (snap.exists()) return;
        const writes: Record<string, unknown> = {
          [`projects/${pid}/meta/name`]:                project.name,
          [`projects/${pid}/meta/ownerUid`]:            user.uid,
          [`projects/${pid}/meta/createdAt`]:           project.createdAt,
          [`projects/${pid}/meta/members/${user.uid}`]: true,
          [`userProjects/${user.uid}/${pid}`]:          true,
          [`projects/${pid}/payload/_meta`]:            { lastModified: Date.now(), _sid: SESSION_ID },
        };
        project.tasks.forEach((t, i)    => { writes[`projects/${pid}/payload/tasks/${t.id}`]     = { ...t, order: i }; });
        project.phases.forEach((p, i)   => { writes[`projects/${pid}/payload/phases/${p.id}`]    = { ...p, order: i }; });
        project.assignees.forEach(a     => { writes[`projects/${pid}/payload/assignees/${a.id}`] = a; });
        update(ref(db), writes).catch(() => {});
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ── Firebase: granular debounced write — only changed tasks/phases/assignees ───

  const writeTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevProjectRef  = useRef<StoredProject | undefined>(undefined);
  const pendingWritesRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (!user) return;
    const pid     = store.activeProjectId;
    const project = store.projects[pid];
    if (!project) return;

    // Assign canonical order (array index) before diffing
    const tasksWithOrder  = project.tasks.map((t, i)  => ({ ...t,  order: i }));
    const phasesWithOrder = project.phases.map((p, i) => ({ ...p, order: i }));

    const prev = prevProjectRef.current;

    // First render or project switch — set baseline without writing
    if (!prev || prev.id !== project.id) {
      prevProjectRef.current = { ...project, tasks: tasksWithOrder, phases: phasesWithOrder };
      return;
    }

    // ── Diff tasks ────────────────────────────────────────────────────────────
    const prevTaskMap = new Map(prev.tasks.map(t => [t.id, t]));
    for (const task of tasksWithOrder) {
      const pt = prevTaskMap.get(task.id);
      if (!pt || JSON.stringify(task) !== JSON.stringify(pt)) {
        pendingWritesRef.current[`projects/${pid}/payload/tasks/${task.id}`] = task;
      }
    }
    const currTaskIds = new Set(project.tasks.map(t => t.id));
    for (const pt of prev.tasks) {
      if (!currTaskIds.has(pt.id)) {
        // Skip: deletion is within the undo window — Firebase write is deferred to the 5s timer
        if (deferredDeleteRef.current?.taskId === pt.id) continue;
        pendingWritesRef.current[`projects/${pid}/payload/tasks/${pt.id}`] = null;
      }
    }

    // ── Diff phases ───────────────────────────────────────────────────────────
    const prevPhaseMap = new Map(prev.phases.map(p => [p.id, p]));
    for (const phase of phasesWithOrder) {
      const pp = prevPhaseMap.get(phase.id);
      if (!pp || JSON.stringify(phase) !== JSON.stringify(pp)) {
        pendingWritesRef.current[`projects/${pid}/payload/phases/${phase.id}`] = phase;
      }
    }
    const currPhaseIds = new Set(project.phases.map(p => p.id));
    for (const pp of prev.phases) {
      if (!currPhaseIds.has(pp.id)) {
        pendingWritesRef.current[`projects/${pid}/payload/phases/${pp.id}`] = null;
      }
    }

    // ── Diff assignees (unordered) ────────────────────────────────────────────
    const prevAssigneeMap = new Map(prev.assignees.map(a => [a.id, a]));
    for (const assignee of project.assignees) {
      const pa = prevAssigneeMap.get(assignee.id);
      if (!pa || JSON.stringify(assignee) !== JSON.stringify(pa)) {
        pendingWritesRef.current[`projects/${pid}/payload/assignees/${assignee.id}`] = assignee;
      }
    }
    const currAssigneeIds = new Set(project.assignees.map(a => a.id));
    for (const pa of prev.assignees) {
      if (!currAssigneeIds.has(pa.id)) {
        pendingWritesRef.current[`projects/${pid}/payload/assignees/${pa.id}`] = null;
      }
    }

    // Update baseline to current state
    prevProjectRef.current = { ...project, tasks: tasksWithOrder, phases: phasesWithOrder };

    if (Object.keys(pendingWritesRef.current).length === 0) return;

    // Tag with session ID so our own onValue echo is ignored
    pendingWritesRef.current[`projects/${pid}/payload/_meta`] = { lastModified: Date.now(), _sid: SESSION_ID };

    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => {
      const writes = { ...pendingWritesRef.current };
      pendingWritesRef.current = {};
      update(ref(db), writes).catch(() => {});
    }, 300);
  });

  // ── Firebase: real-time listener for active project ───────────────────────────

  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);

  useEffect(() => {
    if (!user) return;
    const pid = store.activeProjectId;
    const unsub = onValue(projectPayloadRef(pid), snap => {
      if (!snap.exists()) return;
      try {
        const rawSnap = snap.val() as string | Record<string, unknown> | null;
        let tasks: Task[], phases: StoredPhase[], assignees: RawAssignee[], sid: string | undefined;

        if (typeof rawSnap === 'string') {
          // OLD FORMAT (blob not yet migrated)
          const data = JSON.parse(rawSnap) as { tasks: Task[]; phases: StoredPhase[]; assignees: RawAssignee[]; _sid?: string };
          tasks     = data.tasks     ?? [];
          phases    = data.phases    ?? [];
          assignees = data.assignees ?? [];
          sid       = data._sid;
        } else if (rawSnap && typeof rawSnap === 'object') {
          // NEW FORMAT — keyed by ID
          const meta = rawSnap._meta as { _sid?: string } | null;
          sid       = meta?._sid;
          tasks     = Object.values((rawSnap.tasks     ?? {}) as Record<string, Task>)
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          phases    = Object.values((rawSnap.phases    ?? {}) as Record<string, StoredPhase>)
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          assignees = Object.values((rawSnap.assignees ?? {}) as Record<string, RawAssignee>);
        } else {
          return;
        }

        // Ignore our own write echoed back
        if (sid === SESSION_ID) return;

        const current = storeRef.current.projects[pid];
        if (!current) return;

        // Update prevProjectRef baseline so the write effect doesn't re-write Firebase data
        const tasksWithOrder  = tasks.map((t, i)  => ({ ...t,  order: i }));
        const phasesWithOrder = phases.map((p, i) => ({ ...p, order: i }));
        prevProjectRef.current = { ...current, tasks: tasksWithOrder, phases: phasesWithOrder, assignees };

        // Apply remote update — never overwrite meta fields (name, ownerUid, etc.)
        setStore(prev => ({
          ...prev,
          projects: {
            ...prev.projects,
            [pid]: { ...prev.projects[pid], tasks, phases, assignees },
          },
        }));
      } catch { /* corrupt payload — ignore */ }
    });
    return unsub;
  // Re-subscribe only when project or user changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.activeProjectId, user?.uid]);

  // Cancel timers when AppShell unmounts (avoid ghost writes / state updates)
  useEffect(() => {
    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // ── Firebase: presence ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const pid = store.activeProjectId;
    const pRef = presenceRef(pid, user.uid);

    // Write own presence
    set(pRef, {
      displayName: user.displayName ?? null,
      photoURL:    user.photoURL    ?? null,
      ts:          Date.now(),
    }).catch(() => {});

    // Auto-remove on disconnect
    onDisconnect(pRef).remove();

    // Listen for other users' presence
    const unsub = onValue(presenceListRef(pid), snap => {
      if (!snap.exists()) { setPresenceUsers([]); return; }
      const all = snap.val() as Record<string, { displayName: string | null; photoURL: string | null }>;
      setPresenceUsers(
        Object.entries(all)
          .filter(([uid]) => uid !== user.uid)
          .map(([uid, d]) => ({ uid, displayName: d.displayName, photoURL: d.photoURL })),
      );
    });

    return () => {
      unsub();
      onDisconnect(pRef).cancel();
      remove(pRef).catch(() => {});
    };
  // Re-run when switching projects or changing user
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.activeProjectId, user?.uid]);

  useEffect(() => {
    if (!importResult) return;
    const t = setTimeout(() => setImportResult(null), 6000);
    return () => clearTimeout(t);
  }, [importResult]);

  // ── Handle file-imported shared project from App.tsx ──────────────────────────

  useEffect(() => {
    if (!pendingImport) return;
    handleImportProject(pendingImport);
    onPendingImportDone?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingImport]);

  // ── Task handlers ─────────────────────────────────────────────────────────────

  function handleReset() {
    updateActiveProject(p => ({ ...p, tasks: [] }));
    setFilters(EMPTY_FILTERS);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    deferredDeleteRef.current = null;
    setDeletedTask(null);
  }

  function handleViewTasksChange(updatedVisible: Task[]) {
    if (activePhaseId === ALL_PHASES_ID) {
      updateActiveProject(p => ({
        ...p,
        tasks: [
          ...p.tasks.filter(t => !filteredTaskIds.has(t.id)),
          ...updatedVisible,
        ],
      }));
      return;
    }
    updateActiveProject(p => ({
      ...p,
      tasks: [
        ...p.tasks.filter(t => t.phaseId !== activePhaseId),
        ...p.tasks.filter(t => t.phaseId === activePhaseId && !filteredTaskIds.has(t.id)),
        ...updatedVisible,
      ],
    }));
  }

  function handleImport(newTasks: Task[], newAssignees: RawAssignee[], newPhases: Phase[]) {
    updateActiveProject(p => ({
      ...p,
      tasks:     mergeById(p.tasks,     newTasks),
      assignees: mergeById(p.assignees, newAssignees),
      phases:    mergeById(p.phases,    newPhases.map(({ taskCount: _t, active: _a, ...ph }) => ph)),
    }));
  }

  function handleAddTask(task: Task) {
    updateActiveProject(p => ({ ...p, tasks: [...p.tasks, task] }));
    setShowTaskForm(false);
    if (task.phaseId !== activePhaseId) setActivePhaseId(task.phaseId);
  }

  function handleEditTask(updated: Task) {
    updateActiveProject(p => ({
      ...p,
      tasks: p.tasks.map(t => t.id === updated.id ? updated : t),
    }));
    setSelectedTask(null);
    if (updated.phaseId !== activePhaseId) setActivePhaseId(updated.phaseId);
  }

  function handleDeleteTask(taskId: string) {
    const task = activeProject?.tasks.find(t => t.id === taskId);
    if (!task) return;
    const pid = store.activeProjectId;

    // If another task is already deferred, its undo window is being preempted —
    // flush that deletion to Firebase immediately before opening the new window.
    if (deferredDeleteRef.current) {
      const { taskId: prevId, pid: prevPid } = deferredDeleteRef.current;
      deferredDeleteRef.current = null;
      if (user) {
        update(ref(db), {
          [`projects/${prevPid}/payload/tasks/${prevId}`]:       null,
          [`projects/${prevPid}/payload/_meta`]: { lastModified: Date.now(), _sid: SESSION_ID },
        }).catch(() => {});
      }
    }

    updateActiveProject(p => ({ ...p, tasks: p.tasks.filter(t => t.id !== taskId) }));
    setSelectedTask(null);
    setDeletedTask(task);
    deferredDeleteRef.current = { taskId, pid };

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      // Undo window expired — now write the deletion to Firebase
      deferredDeleteRef.current = null;
      setDeletedTask(null);
      if (user) {
        update(ref(db), {
          [`projects/${pid}/payload/tasks/${taskId}`]:       null,
          [`projects/${pid}/payload/_meta`]: { lastModified: Date.now(), _sid: SESSION_ID },
        }).catch(() => {});
      }
    }, 5000);
  }

  function handleUndoDelete() {
    if (!deletedTask) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    // Cancel the deferred deletion — task is reinstated, no Firebase deletion needed
    deferredDeleteRef.current = null;
    updateActiveProject(p => ({ ...p, tasks: [...p.tasks, deletedTask] }));
    setDeletedTask(null);
  }

  function handleShare() {
    setShowInviteModal(true);
  }

  // ── Project CRUD ──────────────────────────────────────────────────────────────

  function switchToProject(id: string) {
    setStore(prev => ({ ...prev, activeProjectId: id }));
    const project = store.projects[id];
    const firstId = project?.phases.find(p => !p.isImport)?.id ?? project?.phases[0]?.id ?? 'f1';
    setActivePhaseId(firstId);
    setFilters(EMPTY_FILTERS);
    setActiveTab('Panel');
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    // Cancel the deferred deletion — user left the project without confirming ("no borrar tras salir")
    deferredDeleteRef.current = null;
    setDeletedTask(null);
  }

  function handleCreateProject(name: string) {
    const np = createProject(name, getBasePhases(), getBaseAssignees(data), []);
    setStore(prev => ({
      activeProjectId: np.id,
      projects: { ...prev.projects, [np.id]: np },
    }));
    setActivePhaseId(np.phases[0].id);
    setFilters(EMPTY_FILTERS);
    setActiveTab('Panel');

    if (user) {
      const writes: Record<string, unknown> = {
        [`projects/${np.id}/meta/name`]:                np.name,
        [`projects/${np.id}/meta/ownerUid`]:            user.uid,
        [`projects/${np.id}/meta/createdAt`]:           np.createdAt,
        [`projects/${np.id}/meta/members/${user.uid}`]: true,
        [`userProjects/${user.uid}/${np.id}`]:          true,
        [`projects/${np.id}/payload/_meta`]:            { lastModified: Date.now(), _sid: SESSION_ID },
      };
      np.phases.forEach((p, i) => { writes[`projects/${np.id}/payload/phases/${p.id}`] = { ...p, order: i }; });
      np.assignees.forEach(a   => { writes[`projects/${np.id}/payload/assignees/${a.id}`] = a; });
      update(ref(db), writes).catch(() => {});
    }
  }

  function handleDeleteProject(id: string) {
    const remaining = Object.keys(store.projects).filter(k => k !== id);
    if (remaining.length === 0) {
      const np = createProject(data.projectName, getBasePhases(), getBaseAssignees(data), []);
      setStore({ activeProjectId: np.id, projects: { [np.id]: np } });
      setActivePhaseId(np.phases[0].id);
      setFilters(EMPTY_FILTERS);
      setActiveTab('Panel');
      return;
    }
    const newActiveId = id === store.activeProjectId ? remaining[0] : store.activeProjectId;
    setStore(prev => {
      const { [id]: _removed, ...rest } = prev.projects;
      return { activeProjectId: newActiveId, projects: rest };
    });
    if (id === store.activeProjectId) {
      const newActive = store.projects[remaining[0]];
      const firstId = newActive?.phases.find(p => !p.isImport)?.id ?? newActive?.phases[0]?.id ?? 'f1';
      setActivePhaseId(firstId);
      setFilters(EMPTY_FILTERS);
      setActiveTab('Panel');
    }

    if (user) {
      remove(projectRef(id)).catch(() => {});
      remove(userProjectRef(user.uid, id)).catch(() => {});
    }
  }

  function handleRenameProject(id: string, name: string) {
    setStore(prev => ({
      ...prev,
      projects: { ...prev.projects, [id]: { ...prev.projects[id], name } },
    }));

    if (user) {
      // Only write the name — never touch meta/members or other sub-nodes
      set(ref(db, `projects/${id}/meta/name`), name).catch(() => {});
    }
  }

  function handleRenamePhase(phaseId: string, name: string) {
    updateActiveProject(p => ({
      ...p,
      phases: p.phases.map(ph => ph.id === phaseId ? { ...ph, name } : ph),
    }));
  }

  function handleImportProject(payload: SharePayload) {
    const phases: StoredPhase[] = payload.phases.map(({ taskCount: _t, active: _a, ...p }) => p);
    const np = createProject(payload.projectName, phases, payload.assignees, payload.tasks);
    setStore(prev => ({
      activeProjectId: np.id,
      projects: { ...prev.projects, [np.id]: np },
    }));
    const firstId = phases.find(p => !p.isImport)?.id ?? phases[0]?.id ?? 'f1';
    setActivePhaseId(firstId);
    setFilters(EMPTY_FILTERS);
    setActiveTab('Panel');
    setImportResult(`✅ Proyecto “${np.name}” importado y activado.`);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const TASK_TABS = ['Tablero', 'Gantt', 'Calendario', 'Lista', 'Equipo'];
  const showEmptyState = tasks.length === 0 && TASK_TABS.includes(activeTab);

  return (
    <div className="flex flex-col h-screen overflow-hidden text-[#272b36] bg-[#f6f7f9]" style={{ fontSize: 13, lineHeight: 1.45 }}>
      <GlobalTopBar workspaceName={workspaceName} accentColor={accentColor} currentUser={currentUser} photoURL={currentUser.photoURL} onSignOut={onSignOut} />

      {/* Offline banner — non-blocking, shown only when definitively disconnected */}
      {connected === false && (
        <div className="flex items-center justify-center gap-2 px-4 py-[7px] bg-[#fefce8] border-b border-[#fef08a] text-[12.5px] text-[#a16207] font-medium flex-shrink-0">
          <span className="w-[7px] h-[7px] rounded-full bg-[#ca8a04] flex-shrink-0" />
          Sin conexión — los cambios se guardarán al reconectar
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <SidebarPanel
          projectName={activeProject?.name ?? ''}
          accentColor={accentColor}
          phases={dynamicPhases}
          activePhaseId={activePhaseId}
          onPhaseChange={setActivePhaseId}
          onRenamePhase={handleRenamePhase}
        />

        <main className="flex flex-col flex-1 min-w-0 min-h-0 bg-[#f6f7f9]">
          <TopBar
            projectSelector={
              <ProjectDropdown
                projects={store.projects}
                activeProjectId={store.activeProjectId}
                accentColor={accentColor}
                currentUid={user?.uid}
                onSwitch={switchToProject}
                onCreate={handleCreateProject}
                onDelete={handleDeleteProject}
                onRename={handleRenameProject}
              />
            }
            accentColor={accentColor}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activePhase={activePhase}
            onShare={handleShare}
            presenceUsers={presenceUsers}
            onSettings={() => setShowSettings(true)}
          />
          <Toolbar
            accentColor={accentColor}
            onImportSharedView={onImportSharedView}
            filters={filters}
            onFiltersChange={setFilters}
            assignees={allAssignees}
            onAddTask={() => setShowTaskForm(true)}
            extraActions={
              <CSVImporter
                existingPhases={dynamicPhases}
                existingAssignees={rawAssigneesForImport}
                onImport={handleImport}
                onResult={setImportResult}
              />
            }
          />

          {showEmptyState ? (
            <div className="flex flex-col flex-1 items-center justify-center gap-4 text-center p-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${accentColor}18` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M9 12h6M12 9v6"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[15px] text-[#272b36]">Este proyecto no tiene tareas aún</p>
                <p className="text-[12.5px] text-[#9aa0ad] mt-1">Crea la primera tarea para empezar a gestionar el proyecto.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white rounded-xl border-0 cursor-pointer hover:brightness-110 transition-all shadow-sm"
                style={{ background: accentColor }}
              >
                + Crear primera tarea
              </button>
            </div>
          ) : activeTab === 'Tablero' ? (
            <KanbanBoard
              tasks={filteredTasks}
              assignees={allAssignees}
              accentColor={accentColor}
              onTasksChange={handleViewTasksChange}
              onTaskClick={setSelectedTask}
            />
          ) : activeTab === 'Gantt' ? (
            <GanttChart
              tasks={filteredTasks}
              assignees={allAssignees}
              phases={activePhaseId === ALL_PHASES_ID ? dynamicPhases : undefined}
              onTasksChange={handleViewTasksChange}
              onTaskClick={setSelectedTask}
            />
          ) : activeTab === 'Calendario' ? (
            <CalendarView tasks={filteredTasks} assignees={allAssignees} onTaskClick={setSelectedTask} />
          ) : activeTab === 'Lista' ? (
            <ListView
              tasks={filteredTasks}
              assignees={allAssignees}
              phases={activePhaseId === ALL_PHASES_ID ? dynamicPhases : undefined}
              onTasksChange={handleViewTasksChange}
              onTaskClick={setSelectedTask}
            />
          ) : activeTab === 'Equipo' ? (
            <TeamView tasks={filteredTasks} assignees={allAssignees} />
          ) : (
            <DashboardGrid
              accentColor={accentColor}
              workload={workload}
              assignees={allAssignees}
              tasks={tasks}
              today={today}
            />
          )}
        </main>
      </div>

      {/* Import result toast */}
      {importResult && (
        <div
          className="fixed bottom-5 right-5 bg-white border border-[#e8eaee] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] px-5 py-3.5 text-[13px] text-[#272b36] max-w-[420px] z-50 cursor-pointer"
          onClick={() => setImportResult(null)}
          role="status"
        >
          {importResult}
          <span className="ml-3 text-[#9aa0ad] text-[11px]">clic para cerrar</span>
        </div>
      )}

      {/* Undo delete toast */}
      {deletedTask && (
        <div
          className="fixed bottom-5 right-5 flex items-center gap-3 bg-white border border-[#e8eaee] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] px-4 py-3 text-[13px] text-[#272b36] z-50 max-w-[360px]"
          role="status"
        >
          <span className="flex-1 truncate">Tarea eliminada</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="text-[#5a67f2] font-semibold text-[12.5px] bg-transparent border-0 cursor-pointer hover:underline flex-shrink-0"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={() => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); setDeletedTask(null); }}
            className="text-[#9aa0ad] bg-transparent border-0 cursor-pointer p-0.5 flex-shrink-0 flex items-center"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Invite / share modal */}
      {showInviteModal && user && (
        <InviteModal
          projectId={store.activeProjectId}
          projectName={activeProject?.name ?? 'Proyecto'}
          user={user}
          accentColor={accentColor}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Create modal */}
      {showTaskForm && (
        <TaskFormModal
          phases={dynamicPhases}
          assignees={allAssignees}
          defaultPhaseId={activePhaseId === ALL_PHASES_ID
            ? (dynamicPhases.find(p => !p.isImport)?.id ?? dynamicPhases[0]?.id ?? 'f1')
            : activePhaseId}
          accentColor={accentColor}
          mode="create"
          onSave={handleAddTask}
          onCancel={() => setShowTaskForm(false)}
        />
      )}

      {/* Project settings / danger zone */}
      {showSettings && (
        <ResetProjectModal
          projectName={activeProject?.name ?? 'Proyecto'}
          onReset={handleReset}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Edit modal */}
      {selectedTask && (
        <TaskFormModal
          phases={dynamicPhases}
          assignees={allAssignees}
          defaultPhaseId={activePhaseId === ALL_PHASES_ID
            ? (dynamicPhases.find(p => !p.isImport)?.id ?? dynamicPhases[0]?.id ?? 'f1')
            : activePhaseId}
          accentColor={accentColor}
          mode="edit"
          initialTask={selectedTask}
          onSave={handleEditTask}
          onDelete={handleDeleteTask}
          onCancel={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
