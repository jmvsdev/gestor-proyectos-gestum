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
import { CSVImporter, type RawAssignee } from '../widgets/CSVImporter';
import { ShareModal } from '../ui/ShareModal';
import { compressToBase64, downloadShareFile, MAX_B64_CHARS, type SharePayload } from '../../utils/share';
import type { Assignee, FilterState, Phase, ProjectData, Task } from '../../data/types';
import { EMPTY_FILTERS, applyFilters } from '../../data/types';

interface AppShellProps {
  data: ProjectData;
  onImportSharedView: () => void;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_VERSION = '3';

function checkStorageVersion() {
  if (localStorage.getItem('pm-version') !== STORAGE_VERSION) {
    ['pm-tasks', 'pm-extra-assignees', 'pm-extra-phases'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('pm-version', STORAGE_VERSION);
  }
}

const VALID_STATUSES = new Set<string>([
  'sin-empezar','en-curso','en-revision','bloqueada','por-validar','completada',
]);

function isValidTask(t: unknown): t is Task {
  if (typeof t !== 'object' || t === null) return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.id     === 'string' && o.id.length > 0 &&
    typeof o.title  === 'string' && o.title.length > 0 &&
    typeof o.phaseId === 'string' && o.phaseId.length > 0 &&
    typeof o.status === 'string' && VALID_STATUSES.has(o.status)
  );
}

function readStorage<T>(key: string, fallback: T, validate?: (v: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) {
      console.warn(`[PM] "${key}" corrupted — resetting.`);
      localStorage.removeItem(key);
      return fallback;
    }
    return parsed as T;
  } catch {
    console.warn(`[PM] "${key}" parse error — resetting.`);
    localStorage.removeItem(key);
    return fallback;
  }
}

function saveStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ }
}

// ── Merge helpers ─────────────────────────────────────────────────────────────

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map(item => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()];
}

const OPEN_STATUSES: Task['status'][] = [
  'sin-empezar','en-curso','en-revision','bloqueada','por-validar',
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AppShell({ data, onImportSharedView }: AppShellProps) {
  const [activeTab, setActiveTab]         = useState('Panel');
  const [importResult, setImportResult]   = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl]           = useState<string | null>(null);
  const [filters, setFilters]             = useState<FilterState>(EMPTY_FILTERS);
  const [showTaskForm, setShowTaskForm]   = useState(false);
  const [selectedTask, setSelectedTask]   = useState<Task | null>(null);

  const [tasks, setTasks] = useState<Task[]>(() => {
    checkStorageVersion();
    return readStorage('pm-tasks', data.tasks, v => Array.isArray(v) && (v as unknown[]).every(isValidTask));
  });

  const [extraAssignees, setExtraAssignees] = useState<RawAssignee[]>(() =>
    readStorage('pm-extra-assignees', [], Array.isArray)
  );

  const [extraPhases, setExtraPhases] = useState<Phase[]>(() =>
    readStorage('pm-extra-phases', [], Array.isArray)
  );

  const [activePhaseId, setActivePhaseId] = useState<string>(
    data.phases.find(p => p.active)?.id ?? data.phases[0]?.id ?? 'f1'
  );

  const { projectName, workspaceName, accentColor, kpis, workload, currentUser } = data;

  // ── Derived state ───────────────────────────────────────────────────────────

  const rawAssigneesForImport = useMemo<RawAssignee[]>(() => {
    const base: RawAssignee[] = data.assignees.map(({ totalTasks: _t, openTasks: _o, ...a }) => a);
    return mergeById(base, extraAssignees);
  }, [data.assignees, extraAssignees]);

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

  const allBasePhases = useMemo(() => {
    const baseIds = new Set(data.phases.map(p => p.id));
    return [...data.phases, ...extraPhases.filter(p => !baseIds.has(p.id))];
  }, [data.phases, extraPhases]);

  const dynamicPhases = useMemo(
    () => allBasePhases.map(p => ({
      ...p,
      taskCount: tasks.filter(t => t.phaseId === p.id).length,
      active: p.id === activePhaseId,
    })),
    [allBasePhases, tasks, activePhaseId]
  );

  const phaseTasks = useMemo(
    () => tasks.filter(t => t.phaseId === activePhaseId),
    [tasks, activePhaseId]
  );

  // Filtered tasks — passed to all task-list views (Tablero, Gantt, Calendario, Lista, Equipo)
  const filteredTasks = useMemo(
    () => applyFilters(phaseTasks, filters),
    [phaseTasks, filters]
  );

  // IDs of visible tasks, needed to reconcile partial updates from views
  const filteredTaskIds = useMemo(
    () => new Set(filteredTasks.map(t => t.id)),
    [filteredTasks]
  );

  const activePhase = dynamicPhases.find(p => p.active)?.name ?? '';
  const completedThisWeek = phaseTasks.filter(t => t.status === 'completada').length;

  // ── Persistence effects ─────────────────────────────────────────────────────

  useEffect(() => { saveStorage('pm-tasks', tasks); }, [tasks]);
  useEffect(() => { saveStorage('pm-extra-assignees', extraAssignees); }, [extraAssignees]);
  useEffect(() => { saveStorage('pm-extra-phases', extraPhases); }, [extraPhases]);

  useEffect(() => {
    if (!importResult) return;
    const t = setTimeout(() => setImportResult(null), 6000);
    return () => clearTimeout(t);
  }, [importResult]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleReset() {
    ['pm-tasks', 'pm-extra-assignees', 'pm-extra-phases'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('pm-version', STORAGE_VERSION);
    setTasks(data.tasks);
    setExtraAssignees([]);
    setExtraPhases([]);
    setFilters(EMPTY_FILTERS);
  }

  // Views receive filteredTasks. When they call onTasksChange we merge the update
  // back: keep tasks from other phases + hidden (filtered-out) phase tasks + updated visible tasks.
  function handleViewTasksChange(updatedVisible: Task[]) {
    setTasks(prev => [
      ...prev.filter(t => t.phaseId !== activePhaseId),
      ...prev.filter(t => t.phaseId === activePhaseId && !filteredTaskIds.has(t.id)),
      ...updatedVisible,
    ]);
  }

  function handleImport(newTasks: Task[], newAssignees: RawAssignee[], newPhases: Phase[]) {
    setTasks(prev => mergeById(prev, newTasks));
    setExtraAssignees(prev => mergeById(prev, newAssignees));
    setExtraPhases(prev => mergeById(prev, newPhases));
  }

  function handleAddTask(task: Task) {
    setTasks(prev => [...prev, task]);
    setShowTaskForm(false);
    if (task.phaseId !== activePhaseId) setActivePhaseId(task.phaseId);
  }

  function handleEditTask(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTask(null);
    if (updated.phaseId !== activePhaseId) setActivePhaseId(updated.phaseId);
  }

  function handleDeleteTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
  }

  async function handleShare() {
    const payload: SharePayload = {
      version: 1,
      projectName,
      tasks,
      phases: dynamicPhases,
      assignees: rawAssigneesForImport,
    };
    const json = JSON.stringify(payload);
    const b64 = await compressToBase64(json);
    if (b64.length <= MAX_B64_CHARS) {
      const url = `${window.location.origin}${window.location.pathname}#shared=${b64}`;
      setShareUrl(url);
    } else {
      setShareUrl(null);
    }
    setShowShareModal(true);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen overflow-hidden text-[#272b36] bg-[#f6f7f9]" style={{ fontSize: 13, lineHeight: 1.45 }}>
      <GlobalTopBar workspaceName={workspaceName} accentColor={accentColor} currentUser={currentUser} />

      <div className="flex flex-1 min-h-0">
        <SidebarPanel
          projectName={projectName}
          accentColor={accentColor}
          phases={dynamicPhases}
          activePhaseId={activePhaseId}
          onPhaseChange={setActivePhaseId}
        />

        <main className="flex flex-col flex-1 min-w-0 min-h-0 bg-[#f6f7f9]">
          <TopBar
            projectName={projectName}
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
              onTasksChange={handleViewTasksChange}
              onTaskClick={setSelectedTask}
            />
          ) : activeTab === 'Calendario' ? (
            <CalendarView tasks={filteredTasks} assignees={allAssignees} onTaskClick={setSelectedTask} />
          ) : activeTab === 'Lista' ? (
            <ListView
              tasks={filteredTasks}
              assignees={allAssignees}
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
              completedThisWeek={completedThisWeek}
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
          projectName={projectName}
          onDownload={() => downloadShareFile({
            version: 1,
            projectName,
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
          defaultPhaseId={activePhaseId}
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
          defaultPhaseId={activePhaseId}
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
