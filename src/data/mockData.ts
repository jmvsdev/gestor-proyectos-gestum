import type { ProjectData } from './types';

// Replace this entire file's return value with a real API/Supabase fetch in useProjectData.ts
// when connecting to the backend. Components never import this directly.
//
// NOTE: assignees here omit totalTasks/openTasks — useProjectData computes them from tasks.
// IDs use the same scheme as the Excel template (f1..f5, u1..u4, import) so that
// imported data merges correctly without a mapping layer.

const mockData = {
  projectName: 'Proyecto Hospital test',
  workspaceName: 'Gestum',
  accentColor: '#5a67f2',
  lastUpdated: 'hace 2 min.',

  currentUser: {
    name: 'Juan Manuel Vargas',
    shortName: 'Juan',
    initials: 'JV',
  },

  aiSummary: {
    summaryText: 'No se actualizaron tareas en la última semana.',
    keyInitiativesText: 'No hay tareas activas.',
  },

  phases: [
    { id: 'f1',     name: 'Fase 1 – Planeación',              taskCount: 10, active: true },
    { id: 'f2',     name: 'Fase 2 – Licitación y Compras',    taskCount: 5,  active: false },
    { id: 'f3',     name: 'Fase 3 – Obra Civil',              taskCount: 4,  active: false },
    { id: 'f4',     name: 'Fase 4 – Instalación y Pruebas',   taskCount: 6,  active: false },
    { id: 'f5',     name: 'Fase 5 – Capacitación y Arranque', taskCount: 5,  active: false },
    { id: 'import', name: 'Spreadsheet Import',               taskCount: 0,  active: false, isImport: true },
  ],

  tasks: [
    { id: 't1',  title: 'Definir alcance del proyecto',      status: 'en-curso',    assigneeId: 'u1', phaseId: 'f1', startDate: '2026-06-01', dueDate: '2026-06-20', priority: 'alta' },
    { id: 't2',  title: 'Levantamiento de requerimientos',   status: 'en-curso',    assigneeId: 'u2', phaseId: 'f1', startDate: '2026-06-05', dueDate: '2026-06-22', priority: 'alta',   tags: ['equipos'] },
    { id: 't3',  title: 'Plan de trabajo Fase 1',            status: 'en-revision', assigneeId: 'u3', phaseId: 'f1', startDate: '2026-06-08', dueDate: '2026-06-19', priority: 'normal' },
    { id: 't4',  title: 'Validación con dirección',          status: 'bloqueada',   assigneeId: 'u4', phaseId: 'f1', startDate: '2026-06-10', dueDate: '2026-06-18', priority: 'urgente' },
    { id: 't5',  title: 'Análisis de riesgos',               status: 'por-validar', assigneeId: 'u1', phaseId: 'f1', startDate: '2026-06-12', dueDate: '2026-06-25', priority: 'alta' },
    { id: 't6',  title: 'Definir proveedores clave',         status: 'en-curso',    assigneeId: 'u1', phaseId: 'f1', startDate: '2026-06-15', dueDate: '2026-06-24', priority: 'normal', tags: ['licitación'] },
    { id: 't7',  title: 'Cronograma general del proyecto',   status: 'en-curso',    assigneeId: 'u2', phaseId: 'f1', startDate: '2026-06-02', dueDate: '2026-06-21', priority: 'alta' },
    { id: 't8',  title: 'Presupuesto inicial',               status: 'en-revision', assigneeId: 'u3', phaseId: 'f1', startDate: '2026-06-08', dueDate: '2026-06-20', priority: 'normal' },
    { id: 't9',  title: 'Identificar stakeholders clave',    status: 'por-validar', assigneeId: null, phaseId: 'f1', startDate: '2026-06-18', dueDate: '2026-06-26', priority: 'baja' },
    { id: 't10', title: 'Kick-off meeting con equipo',       status: 'sin-empezar', assigneeId: null, phaseId: 'f1', startDate: '2026-06-28', dueDate: '2026-07-05', priority: 'normal' },
  ],

  // totalTasks and openTasks are intentionally omitted — useProjectData computes them from tasks.
  assignees: [
    { id: 'u1', name: 'Juan Manuel Vargas', shortName: 'Juan',   color: '#5a67f2' },
    { id: 'u2', name: 'Ana Torres',         shortName: 'Ana',    color: '#8b5cf6' },
    { id: 'u3', name: 'Carlos Méndez',      shortName: 'Carlos', color: '#f97316' },
    { id: 'u4', name: 'Lucía Fernández',    shortName: 'Lucía',  color: '#f5b400' },
    { id: 'sa', name: 'Sin asignar',        shortName: '—',      color: '#9aa3b2' },
  ],

  kpis: [
    { label: 'Sin asignar',  value: 0,  color: '#9aa3b2' },
    { label: 'En curso',     value: 10, color: '#5a67f2' },
    { label: 'Completadas',  value: 0,  color: '#1f9d63' },
  ],

  workload: [
    { label: 'Sin empezar', value: 4,  color: '#9aa3b2' },
    { label: 'En curso',    value: 46, color: '#5a67f2' },
    { label: 'En revisión', value: 14, color: '#f97316' },
    { label: 'Bloqueada',   value: 9,  color: '#f5b400' },
    { label: 'Por validar', value: 22, color: '#b58aa6' },
  ],
} satisfies Omit<ProjectData, 'assignees'> & { assignees: Omit<ProjectData['assignees'][number], 'totalTasks' | 'openTasks'>[] };

export default mockData;
