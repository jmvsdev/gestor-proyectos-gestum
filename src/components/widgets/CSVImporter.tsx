import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import type { Task, Phase, RawAssignee } from '../../data/types';

export type { RawAssignee } from '../../data/types';

interface CSVImporterProps {
  existingPhases: Phase[];
  existingAssignees: RawAssignee[];
  onImport: (tasks: Task[], assignees: RawAssignee[], phases: Phase[]) => void;
  onResult: (msg: string) => void;
}

// ── String helpers ─────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(s: string): string {
  return normalize(s)
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

// ── Title stripping for assignees ─────────────────────────────────────────────

// Only strip genuine title prefixes that precede a personal name.
// "Físico Médico externo" is a role descriptor (the full string IS the name), so it is NOT included here.
const TITLE_RE = /^(Dr\.|Dra\.|Ing\.|Lic\.|Arq\.)\s+/i;

function stripTitle(name: string): string {
  return name.replace(TITLE_RE, '').trim();
}

// ── Mappings ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, Task['status']> = {
  'por hacer':   'sin-empezar',
  'sin empezar': 'sin-empezar',
  'en curso':    'en-curso',
  'en progreso': 'en-curso',
  'en revision': 'en-revision',
  'bloqueada':   'bloqueada',
  'por validar': 'por-validar',
  'completada':  'completada',
  'hecho':       'completada',
  'cerrado':     'completada',
};

const PRIORITY_MAP: Record<string, NonNullable<Task['priority']>> = {
  urgente: 'urgente',
  alta:    'alta',
  normal:  'normal',
  baja:    'baja',
};

const RISK_MAP: Record<string, NonNullable<Task['risk']>> = {
  alto:  'alto',
  medio: 'medio',
  bajo:  'bajo',
};

// ── Date: DD/MM/AAAA → AAAA-MM-DD ─────────────────────────────────────────────

function parseDate(s: string): string | undefined {
  if (!s) return undefined;
  const parts = s.split('/');
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return undefined;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseBudget(s: string): number | undefined {
  if (!s) return undefined;
  const n = parseFloat(s.replace(/[$,\s]/g, ''));
  return isNaN(n) ? undefined : n;
}

// ── Color palette for new assignees ──────────────────────────────────────────

const PALETTE = [
  '#10b981', '#06b6d4', '#ec4899', '#84cc16',
  '#a855f7', '#14b8a6', '#f59e0b', '#3b82f6',
  '#e11d48', '#64748b',
];

// ── Component ─────────────────────────────────────────────────────────────────

export function CSVImporter({ existingPhases, existingAssignees, onImport, onResult }: CSVImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const raw = await file.text();
      const text = raw.replace(/^﻿/, ''); // strip BOM

      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      const rows = result.data;

      // ── 1. Phase lookup: normalized name → phase id ────────────────────────
      const phaseByName = new Map<string, string>();
      for (const p of existingPhases) {
        phaseByName.set(normalize(p.name), p.id);
      }

      // ── 2. Assignee lookup: normalized name → id ───────────────────────────
      // Seed with existing assignees (both full name and shortName)
      const assigneeByNorm = new Map<string, string>();
      for (const a of existingAssignees) {
        assigneeByNorm.set(normalize(a.name), a.id);
        assigneeByNorm.set(normalize(a.shortName), a.id);
      }

      const newAssignees = new Map<string, RawAssignee>(); // stable id → RawAssignee
      let paletteIdx = 0;

      function resolveAssignee(csvName: string): string {
        const trimmed = str(csvName);
        if (!trimmed) return 'sa';

        const cleanName = stripTitle(trimmed);
        const normClean = normalize(cleanName);

        // Exact match
        if (assigneeByNorm.has(normClean)) return assigneeByNorm.get(normClean)!;

        // Word-level match: split into words ≥ 4 chars and look for overlap.
        // Raw substring match ("ana" ⊂ "anaya") caused false positives, so we
        // only match on whole words that are long enough to be distinctive.
        const csvWords = normClean.split(' ').filter(w => w.length >= 4);
        if (csvWords.length > 0) {
          for (const [norm, id] of assigneeByNorm) {
            const existingWords = norm.split(' ').filter(w => w.length >= 4);
            if (csvWords.some(w => existingWords.includes(w))) {
              assigneeByNorm.set(normClean, id); // cache
              return id;
            }
          }
        }

        // Create new assignee with stable id from cleaned name
        const newId = `ext-${slugify(cleanName)}`;
        if (!newAssignees.has(newId)) {
          const color = PALETTE[paletteIdx % PALETTE.length];
          paletteIdx++;
          newAssignees.set(newId, {
            id: newId,
            name: cleanName,
            shortName: cleanName.split(' ')[0] || cleanName,
            color,
          });
        }
        assigneeByNorm.set(normClean, newId); // cache
        return newId;
      }

      // ── 3. Parse rows ──────────────────────────────────────────────────────
      const importedTasks: Task[] = [];
      const errors: string[] = [];

      rows.forEach((row, i) => {
        const rowNum = i + 2; // header = row 1

        const title = str(row['Nombre de tarea']);
        if (!title) { errors.push(`Fila ${rowNum}: falta nombre de tarea`); return; }

        const rawStatus = normalize(str(row['Estado']));
        const status = STATUS_MAP[rawStatus];
        if (!status) {
          errors.push(`Fila ${rowNum}: estado inválido "${str(row['Estado'])}" (tarea="${title}")`);
          return;
        }

        const phaseId = phaseByName.get(normalize(str(row['Fase']))) ?? 'import';
        const assigneeId = resolveAssignee(str(row['Responsable']));

        const rawPriority = normalize(str(row['Prioridad']));
        const priority = PRIORITY_MAP[rawPriority];

        const startDate = parseDate(str(row['Fecha de inicio']));
        const dueDate   = parseDate(str(row['Fecha límite']));

        const rawRisk = normalize(str(row['Riesgo']));
        const risk = RISK_MAP[rawRisk];

        const rawMilestone = normalize(str(row['Hito']));
        const isMilestone = rawMilestone === 'si' || rawMilestone === 'sí';

        const description      = str(row['Descripción']) || undefined;
        const equipmentType    = str(row['Tipo de equipo']) || undefined;
        const vendor           = str(row['Proveedor']) || undefined;
        const budget           = parseBudget(str(row['Presupuesto MXN']));
        const regulatoryStatus = str(row['Estatus regulatorio']) || undefined;
        const dependsOn        = str(row['Depende de']) || undefined;

        // ID is stable from title slug — reimport merges via mergeById
        const id = `csv-${slugify(title)}`;

        importedTasks.push({
          id,
          title,
          status,
          assigneeId,
          phaseId,
          ...(startDate        && { startDate }),
          ...(dueDate          && { dueDate }),
          ...(priority         && { priority }),
          ...(description      && { description }),
          ...(equipmentType    && { equipmentType }),
          ...(vendor           && { vendor }),
          ...(budget !== undefined && { budget }),
          ...(regulatoryStatus && { regulatoryStatus }),
          ...(risk             && { risk }),
          ...(isMilestone      && { isMilestone }),
          ...(dependsOn        && { dependsOn }),
        });
      });

      const createdAssignees = [...newAssignees.values()];
      const phasesHit = new Set(importedTasks.map(t => t.phaseId)).size;

      // No new phases — CSV always maps to existing ones (or 'import')
      onImport(importedTasks, createdAssignees, []);

      const omitted = errors.length;
      const sample  = errors.slice(0, 3).join('; ');
      const more    = omitted > 3 ? ` (y ${omitted - 3} más)` : '';
      const newCount = createdAssignees.length;
      const msg = omitted > 0
        ? `Importadas ${importedTasks.length} tareas en ${phasesHit} fases, ${newCount} responsable${newCount !== 1 ? 's' : ''} nuevo${newCount !== 1 ? 's' : ''}. Errores: ${sample}${more}`
        : `✅ Importadas ${importedTasks.length} tareas en ${phasesHit} fases, ${newCount} responsable${newCount !== 1 ? 's' : ''} nuevo${newCount !== 1 ? 's' : ''} creado${newCount !== 1 ? 's' : ''}.`;
      onResult(msg);

    } catch (err) {
      onResult(`❌ Error al leer el archivo: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        aria-label="Importar archivo CSV"
        onChange={handleFile}
      />
      <button
        type="button"
        aria-label="Importar CSV"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-[7px] bg-white border border-[#e4e6ec] rounded-lg px-3 py-[6px] text-[12.5px] font-semibold text-[#4a4f5c] cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.02)] hover:border-[#5a67f2] hover:text-[#5a67f2] transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        <Upload size={13} strokeWidth={2} />
        {loading ? 'Importando…' : 'Importar CSV'}
      </button>
    </>
  );
}
