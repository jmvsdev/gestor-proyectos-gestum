import { useEffect, useMemo, useState } from 'react';
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
import { ShareModal } from '../ui/ShareModal';
import {
  compressToBase64, downloadShareFile, MAX_B64_CHARS, type SharePayload,
} from '../../utils/share';
import type {
  Assignee, FilterState, Phase, ProjectData, Task,
  RawAssignee, StoredProject, ProjectStore, StoredPhase,
} from '../../data/types';
import { EMPTY_FILTERS, applyFilters, ALL_PHASES_ID } from '../../data/types';

interface AppShellProps {
  data: ProjectData;
  onImportSharedView: () => void;
  /** Non-null when App.tsx has parsed a shared-view file to import as a new project */
  pendingImport?: SharePayload | null;
  onPendingImportDone?: () => void;
  /** When provided (from Firebase), used as the initial store instead of localStorage */
  initialStore?: ProjectStore | null;
  /** Called when user clicks "Cerrar sesión" */
  onSignOut?: () => void;
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
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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

export function AppShell({ data, onImportSharedView, pendingImport, onPendingImportDone, initialStore, onSignOut }: AppShellProps) {
  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]           = useState('Panel');
  const [importResult, setImportResult]     = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl]             = useState<string | null>(null);
  const [filters, setFilters]               = useState<FilterState>(EMPTY_FILTERS);
  const [showTaskForm, setShowTaskForm]     = useState(false);
  const [selectedTask, setSelectedTask]     = useState<Task | null>(null);

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

  // Compute KPIs + workload from active project tasks (all phases)
  const kpis = useMemo(() => [
    { label: 'Sin asignar',  value: tasks.filter(t => !t.assigneeId).length,              color: '#9aa3b2' },
    { label: 'En curso',     value: tasks.filter(t => t.status === 'en-curso').length,    color: accentColor },
    { label: 'Completadas',  value: tasks.filter(t => t.status === 'completada').length,  color: '#1f9d63' },
  ], [tasks, accentColor]);

  const workload = useMemo(() => [
    { label: 'Sin empezar', value: tasks.filter(t => t.status === 'sin-empezar').length, color: '#9aa3b2' },
    { label: 'En curso',    value: tasks.filter(t => t.status === 'en-curso').length,    color: accentColor },
    { label: 'En revisión', value: tasks.filter(t => t.status === 'en-revision').length, color: '#f97316' },
    { label: 'Bloqueada',   value: tasks.filter(t => t.status === 'bloqueada').length,   color: '#ef4444' },
    { label: 'Por validar', value: tasks.filter(t => t.status === 'por-validar').length, color: '#b58aa6' },
  ], [tasks, accentColor]);

  // ── Persistence ───────────────────────────────────────────────────────────────

  useEffect(() => {
    try { localStorage.setItem('pm-projects', JSON.stringify(store)); } catch { /* quota */ }
  }, [store]);

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
    updateActiveProject(p => ({ ...p, tasks: p.tasks.filter(t => t.id !== taskId) }));
    setSelectedTask(null);
  }

  async function handleShare() {
    const payload: SharePayload = {
      version: 1,
      projectName: activeProject?.name ?? 'Proyecto',
      tasks,
      phases: dynamicPhases,
      assignees: rawAssigneesForImport,
    };
    const json = JSON.stringify(payload);
    const b64  = await compressToBase64(json);
    setShareUrl(
      b64.length <= MAX_B64_CHARS
        ? `${window.location.origin}${window.location.pathname}#shared=${b64}`
        : null
    );
    setShowShareModal(true);
  }

  // ── Project CRUD ──────────────────────────────────────────────────────────────

  function switchToProject(id: string) {
    setStore(prev => ({ ...prev, activeProjectId: id }));
    const project = store.projects[id];
    const firstId = project?.phases.find(p => !p.isImport)?.id ?? project?.phases[0]?.id ?? 'f1';
    setActivePhaseId(firstId);
    setFilters(EMPTY_FILTERS);
    setActiveTab('Panel');
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
  }

  function handleDeleteProject(id: string) {
    const remaining = Object.keys(store.projects).filter(k => k !== id);
    if (remaining.length === 0) {
      // Last project deleted — create a fresh default
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
  }

  function handleRenameProject(id: string, name: string) {
    setStore(prev => ({
      ...prev,
      projects: { ...prev.projects, [id]: { ...prev.projects[id], name } },
    }));
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

  return (
    <div className="flex flex-col h-screen overflow-hidden text-[#272b36] bg-[#f6f7f9]" style={{ fontSize: 13, lineHeight: 1.45 }}>
      <GlobalTopBar workspaceName={workspaceName} accentColor={accentColor} currentUser={currentUser} photoURL={currentUser.photoURL} onSignOut={onSignOut} />

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
          />
          <Toolbar
            accentColor={accentColor}
            onReset={handleReset}
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

          {activeTab === 'Tablero' ? (
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
              kpis={kpis}
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

      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          url={shareUrl}
          projectName={activeProject?.name ?? 'Proyecto'}
          onDownload={() => downloadShareFile({
            version: 1,
            projectName: activeProject?.name ?? 'Proyecto',
            tasks,
            phases: dynamicPhases,
            assignees: rawAssigneesForImport,
          })}
          onClose={() => setShowShareModal(false)}
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
