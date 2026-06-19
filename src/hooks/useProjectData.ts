import { useState, useEffect } from 'react';
import type { ProjectData } from '../data/types';
import mockData from '../data/mockData';

// Swap the body of this hook to fetch from Supabase / API without touching any component.
// Example Supabase swap:
//   const { data } = await supabase.from('projects').select('*, phases(*), tasks(*), assignees(*)')
//   return enrich(mapToProjectData(data))

function enrich(raw: typeof mockData): ProjectData {
  const OPEN_STATUSES: ProjectData['tasks'][number]['status'][] = [
    'sin-empezar', 'en-curso', 'en-revision', 'bloqueada', 'por-validar',
  ];

  const assignees: ProjectData['assignees'] = raw.assignees.map(a => ({
    ...a,
    totalTasks: raw.tasks.filter(t => t.assigneeId === a.id).length,
    openTasks:  raw.tasks.filter(t => t.assigneeId === a.id && OPEN_STATUSES.includes(t.status)).length,
  }));

  // "Sin asignar" pseudo-assignee counts tasks with no assigneeId
  return {
    ...raw,
    assignees: assignees.map(a =>
      a.id === 'sa'
        ? {
            ...a,
            totalTasks: raw.tasks.filter(t => t.assigneeId === null).length,
            openTasks:  raw.tasks.filter(t => t.assigneeId === null && OPEN_STATUSES.includes(t.status)).length,
          }
        : a,
    ),
  };
}

export function useProjectData(): { data: ProjectData | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setData(enrich(mockData));
      } catch {
        setError('Error al cargar los datos del proyecto.');
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return { data, loading, error };
}
