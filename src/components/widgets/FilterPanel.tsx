import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Filter, X } from 'lucide-react';
import type { Assignee, FilterState, Task } from '../../data/types';
import { countActiveFilters, EMPTY_FILTERS } from '../../data/types';

const PRIORITIES: Array<{ value: NonNullable<Task['priority']>; label: string }> = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'alta',    label: 'Alta' },
  { value: 'normal',  label: 'Normal' },
  { value: 'baja',    label: 'Baja' },
];

const STATUSES: Array<{ value: Task['status']; label: string }> = [
  { value: 'sin-empezar', label: 'Sin empezar' },
  { value: 'en-curso',    label: 'En curso' },
  { value: 'en-revision', label: 'En revisión' },
  { value: 'bloqueada',   label: 'Bloqueada' },
  { value: 'por-validar', label: 'Por validar' },
  { value: 'completada',  label: 'Completada' },
];

const RISKS: Array<{ value: NonNullable<Task['risk']>; label: string }> = [
  { value: 'alto',  label: 'Alto' },
  { value: 'medio', label: 'Medio' },
  { value: 'bajo',  label: 'Bajo' },
];

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  assignees: Assignee[];
  accentColor: string;
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

export function FilterPanel({ filters, onFiltersChange, assignees, accentColor }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = countActiveFilters(filters);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const realAssignees = assignees.filter(a => a.id !== 'sa');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-[7px] bg-white border rounded-lg px-3 py-[6px] text-[12.5px] font-semibold cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.02)] transition-colors"
        style={
          count > 0
            ? { borderColor: accentColor, color: accentColor }
            : { borderColor: '#e4e6ec', color: '#4a4f5c' }
        }
      >
        <Filter size={14} strokeWidth={2} style={{ color: count > 0 ? accentColor : '#8b909c' }} />
        {count > 0 ? `Filtros (${count})` : 'Filtros'}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-40 bg-white border border-[#e4e6ec] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] w-[300px] p-4 flex flex-col gap-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#272b36]">Filtros</span>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => onFiltersChange(EMPTY_FILTERS)}
                  className="text-[11.5px] font-medium cursor-pointer bg-transparent border-0 hover:underline"
                  style={{ color: accentColor }}
                >
                  Limpiar filtros
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-[#9aa0ad] hover:bg-[#f0f1f4] border-0 bg-transparent cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Prioridad */}
          <Section title="Prioridad">
            {PRIORITIES.map(({ value, label }) => (
              <CheckItem
                key={value}
                label={label}
                checked={filters.priorities.includes(value)}
                onChange={() => onFiltersChange({ ...filters, priorities: toggle(filters.priorities, value) })}
                accentColor={accentColor}
              />
            ))}
          </Section>

          {/* Asignado */}
          <Section title="Asignado">
            {realAssignees.map(a => (
              <CheckItem
                key={a.id}
                label={a.name}
                checked={filters.assigneeIds.includes(a.id)}
                onChange={() => onFiltersChange({ ...filters, assigneeIds: toggle(filters.assigneeIds, a.id) })}
                accentColor={accentColor}
                dot={a.color}
              />
            ))}
            <CheckItem
              label="Sin asignar"
              checked={filters.assigneeIds.includes('__unassigned__')}
              onChange={() => onFiltersChange({ ...filters, assigneeIds: toggle(filters.assigneeIds, '__unassigned__') })}
              accentColor={accentColor}
            />
          </Section>

          {/* Estado */}
          <Section title="Estado">
            {STATUSES.map(({ value, label }) => (
              <CheckItem
                key={value}
                label={label}
                checked={filters.statuses.includes(value)}
                onChange={() => onFiltersChange({ ...filters, statuses: toggle(filters.statuses, value) })}
                accentColor={accentColor}
              />
            ))}
          </Section>

          {/* Riesgo */}
          <Section title="Riesgo">
            {RISKS.map(({ value, label }) => (
              <CheckItem
                key={value}
                label={label}
                checked={filters.risks.includes(value)}
                onChange={() => onFiltersChange({ ...filters, risks: toggle(filters.risks, value) })}
                accentColor={accentColor}
              />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10.5px] font-bold text-[#9aa0ad] uppercase tracking-wide">{title}</span>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function CheckItem({
  label, checked, onChange, accentColor, dot,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  accentColor: string;
  dot?: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        className="w-[15px] h-[15px] rounded flex items-center justify-center border flex-shrink-0 transition-colors"
        style={{ background: checked ? accentColor : 'white', borderColor: checked ? accentColor : '#d1d5db' }}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5l2 2L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />}
      <span className="text-[12.5px] text-[#4a4f5c] group-hover:text-[#272b36] transition-colors select-none">{label}</span>
    </label>
  );
}
