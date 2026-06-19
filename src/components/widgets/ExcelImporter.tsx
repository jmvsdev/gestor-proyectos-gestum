import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload } from 'lucide-react';
import type { Task, Assignee, Phase } from '../../data/types';

export type RawAssignee = Omit<Assignee, 'totalTasks' | 'openTasks'>;

interface ExcelImporterProps {
  existingPhaseIds: Set<string>;
  onImport: (tasks: Task[], assignees: RawAssignee[], phases: Phase[]) => void;
  onResult: (msg: string) => void;
}

// Maps Excel status values (underscore or hyphen) → internal Task['status']
const STATUS_MAP: Record<string, Task['status']> = {
  sin_empezar:  'sin-empezar',
  en_curso:     'en-curso',
  en_revision:  'en-revision',
  bloqueada:    'bloqueada',
  por_validar:  'por-validar',
  completada:   'completada',
  'sin-empezar':'sin-empezar',
  'en-curso':   'en-curso',
  'en-revision':'en-revision',
  'por-validar':'por-validar',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sheetRows(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  const s = str(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExcelImporter({ existingPhaseIds, onImport, onResult }: ExcelImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      // ── 1. Parse each sheet ─────────────────────────────────────────────────
      const rawAssignados = sheetRows(wb, 'Asignados');
      const rawFases      = sheetRows(wb, 'Fases');
      const rawTareas     = sheetRows(wb, 'Tareas');
      // Estados is used only for validation — we rely on STATUS_MAP for status
      // Instrucciones is intentionally ignored

      // ── 2. Build assignee map  id → RawAssignee ────────────────────────────
      const assigneeMap = new Map<string, RawAssignee>();
      for (const row of rawAssignados) {
        const id = str(row.id);
        if (!id) continue;
        const name = str(row.name) || id;
        assigneeMap.set(id, {
          id,
          name,
          // initials field → shortName for display; fall back to first word of name
          shortName: str(row.initials) || name.split(' ')[0] || id,
          color: str(row.color) || '#9aa3b2',
        });
      }

      // ── 3. Parse phases from Excel ─────────────────────────────────────────
      const importedPhases: Phase[] = [];
      const allPhaseIds = new Set(existingPhaseIds);
      for (const row of rawFases) {
        const id   = str(row.id);
        const name = str(row.name);
        if (!id || !name) continue;
        const phase: Phase = {
          id,
          name,
          taskCount: 0,      // dynamicPhases in AppShell will recompute
          active: false,
          isImport: toBool(row.isImport),
        };
        importedPhases.push(phase);
        allPhaseIds.add(id);
      }

      // The fallback phase for tasks with unknown phaseId
      const fallbackPhaseId = 'import';

      // ── 4. Parse and validate tasks ────────────────────────────────────────
      const importedTasks: Task[] = [];
      const errors: string[] = [];

      rawTareas.forEach((row, i) => {
        const rowNum = i + 2; // header = row 1
        const id    = str(row.id);
        const title = str(row.title);

        if (!id)    { errors.push(`Fila ${rowNum}: falta id`); return; }
        if (!title) { errors.push(`Fila ${rowNum}: falta título (id=${id})`); return; }

        const rawStatus = str(row.status).toLowerCase().replace(/ /g, '_');
        const status = STATUS_MAP[rawStatus];
        if (!status) {
          errors.push(`Fila ${rowNum}: status inválido "${str(row.status)}" (id=${id})`);
          return;
        }

        const phaseId = str(row.phaseId);
        const resolvedPhaseId = allPhaseIds.has(phaseId) ? phaseId : fallbackPhaseId;

        const rawAssigneeId = str(row.assigneeId);
        const assigneeId: string | null = (rawAssigneeId && assigneeMap.has(rawAssigneeId))
          ? rawAssigneeId
          : null;

        const dueDateRaw = str(row.dueDate);

        const task: Task = {
          id,
          title,
          phaseId: resolvedPhaseId,
          assigneeId,
          status,
        };
        if (dueDateRaw) task.dueDate = dueDateRaw;

        importedTasks.push(task);
      });

      const assignees = [...assigneeMap.values()];
      onImport(importedTasks, assignees, importedPhases);

      // ── 5. Build result message ────────────────────────────────────────────
      const omitted = errors.length;
      const sample  = errors.slice(0, 3).join('; ');
      const more    = omitted > 3 ? ` (y ${omitted - 3} más)` : '';
      const msg = omitted > 0
        ? `Importadas ${importedTasks.length} tarea${importedTasks.length !== 1 ? 's' : ''}, ${omitted} omitida${omitted !== 1 ? 's' : ''}: ${sample}${more}`
        : `✅ ${importedTasks.length} tarea${importedTasks.length !== 1 ? 's' : ''} importada${importedTasks.length !== 1 ? 's' : ''} correctamente.`;
      onResult(msg);

    } catch (err) {
      onResult(`❌ Error al leer el archivo: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      // Reset so the same file can be re-imported
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        aria-label="Importar archivo Excel"
        onChange={handleFile}
      />
      <button
        type="button"
        aria-label="Importar Excel"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-[7px] bg-white border border-[#e4e6ec] rounded-lg px-3 py-[6px] text-[12.5px] font-semibold text-[#4a4f5c] cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.02)] hover:border-[#5a67f2] hover:text-[#5a67f2] transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        <Upload size={13} strokeWidth={2} />
        {loading ? 'Importando…' : 'Importar Excel'}
      </button>
    </>
  );
}
