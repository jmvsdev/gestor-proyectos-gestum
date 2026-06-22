import { useState, useEffect } from 'react';
import { get, remove, update, ref } from 'firebase/database';
import type { User } from 'firebase/auth';
import type { ProjectStore, StoredProject, Task, StoredPhase, RawAssignee } from '../data/types';
import {
  db,
  userStoreRef,
  userProjectsRef,
  projectMetaRef, projectPayloadRef,
} from '../firebase';

const LOCAL_STORE_KEY   = 'pm-projects';
const LOCAL_VERSION_KEY = 'pm-version';
const STORAGE_VERSION   = '4';

interface ProjectMeta {
  name: string;
  ownerUid: string;
  createdAt: string;
}

interface ProjectPayload {
  tasks: Task[];
  phases: StoredPhase[];
  assignees: RawAssignee[];
}

export function useFirebaseProjects(user: User | null): {
  store: ProjectStore | null;
  loading: boolean;
  ready: boolean;
} {
  const [store, setStore]     = useState<ProjectStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady]     = useState(false);

  useEffect(() => {
    if (!user) {
      setStore(null);
      setLoading(false);
      setReady(false);
      return;
    }

    setLoading(true);

    loadUserStore(user.uid)
      .then(result => {
        setStore(result);
        setLoading(false);
        setReady(true);
      })
      .catch(() => {
        // Offline — fall back to localStorage
        const localRaw = localStorage.getItem(LOCAL_STORE_KEY);
        if (localRaw) {
          try { setStore(JSON.parse(localRaw) as ProjectStore); } catch { /* ignore */ }
        }
        setLoading(false);
        setReady(true);
      });
  }, [user?.uid]);

  return { store, loading, ready };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function loadUserStore(uid: string): Promise<ProjectStore | null> {
  // Check whether the Phase 2 index exists already
  const userProjectsSnap = await get(userProjectsRef(uid));

  if (!userProjectsSnap.exists()) {
    // Try to migrate from Phase 1 blob
    await migrateFromPhase1(uid);
    // Re-read after migration
    const after = await get(userProjectsRef(uid));
    if (!after.exists()) return null;
  }

  // Load all projects from /userProjects/{uid} index
  const projectIds = Object.keys(
    (await get(userProjectsRef(uid))).val() as Record<string, true>,
  );

  const projects: Record<string, StoredProject> = {};
  await Promise.all(
    projectIds.map(async pid => {
      try {
        const [metaSnap, payloadSnap] = await Promise.all([
          get(projectMetaRef(pid)),
          get(projectPayloadRef(pid)),
        ]);
        if (!metaSnap.exists() || !payloadSnap.exists()) return;

        const meta       = metaSnap.val() as ProjectMeta;
        const rawPayload = payloadSnap.val() as string | Record<string, unknown> | null;

        let tasks:     Task[]          = [];
        let phases:    StoredPhase[]   = [];
        let assignees: RawAssignee[]   = [];

        if (typeof rawPayload === 'string') {
          // OLD FORMAT — JSON blob; parse and trigger migration
          const parsed = JSON.parse(rawPayload) as ProjectPayload;
          tasks     = (parsed.tasks     ?? []).map((t, i) => ({ ...t,  order: i }));
          phases    = (parsed.phases    ?? []).map((p, i) => ({ ...p, order: i }));
          assignees =  parsed.assignees ?? [];
          // Fire-and-forget: convert blob to keyed structure
          const writes: Record<string, unknown> = {
            [`projects/${pid}/payload/_meta`]: { migratedAt: Date.now() },
          };
          tasks.forEach(t     => { writes[`projects/${pid}/payload/tasks/${t.id}`]     = t; });
          phases.forEach(p    => { writes[`projects/${pid}/payload/phases/${p.id}`]    = p; });
          assignees.forEach(a => { writes[`projects/${pid}/payload/assignees/${a.id}`] = a; });
          update(ref(db), writes).catch(() => {});
        } else if (rawPayload && typeof rawPayload === 'object') {
          // NEW FORMAT — keyed by ID, sort by order field
          tasks     = Object.values((rawPayload.tasks     ?? {}) as Record<string, Task>)
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          phases    = Object.values((rawPayload.phases    ?? {}) as Record<string, StoredPhase>)
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          assignees = Object.values((rawPayload.assignees ?? {}) as Record<string, RawAssignee>);
        }

        projects[pid] = {
          id:        pid,
          name:      meta.name,
          createdAt: meta.createdAt,
          ownerUid:  meta.ownerUid,
          tasks,
          phases,
          assignees,
        };
      } catch { /* skip corrupt project */ }
    }),
  );

  if (Object.keys(projects).length === 0) return null;

  // Determine active project — prefer last-used stored in localStorage
  let activeProjectId = Object.keys(projects)[0];
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STORE_KEY) ?? 'null') as ProjectStore | null;
    if (local?.activeProjectId && projects[local.activeProjectId]) {
      activeProjectId = local.activeProjectId;
    }
  } catch { /* ignore */ }

  return { activeProjectId, projects };
}

async function migrateFromPhase1(uid: string): Promise<void> {
  // Try old JSON-blob path first
  let oldStore: ProjectStore | null = null;

  const phase1Snap = await get(userStoreRef(uid)).catch(() => null);
  if (phase1Snap?.exists()) {
    try { oldStore = JSON.parse(phase1Snap.val() as string) as ProjectStore; } catch { /* ignore */ }
  }

  // Also try localStorage v4
  if (!oldStore) {
    const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);
    const localRaw     = localStorage.getItem(LOCAL_STORE_KEY);
    if (localVersion === STORAGE_VERSION && localRaw) {
      try { oldStore = JSON.parse(localRaw) as ProjectStore; } catch { /* ignore */ }
    }
  }

  if (!oldStore) return;

  // Migrate each project to the new structure
  await Promise.all(
    Object.entries(oldStore.projects).map(async ([pid, project]) => {
      const writes: Record<string, unknown> = {
        [`projects/${pid}/meta/name`]:           project.name,
        [`projects/${pid}/meta/ownerUid`]:        uid,
        [`projects/${pid}/meta/createdAt`]:       project.createdAt,
        [`projects/${pid}/meta/members/${uid}`]:  true,
        [`userProjects/${uid}/${pid}`]:           true,
        [`projects/${pid}/payload/_meta`]:        { migratedAt: Date.now() },
      };
      project.tasks.forEach((t, i)    => { writes[`projects/${pid}/payload/tasks/${t.id}`]     = { ...t, order: i }; });
      project.phases.forEach((p, i)   => { writes[`projects/${pid}/payload/phases/${p.id}`]    = { ...p, order: i }; });
      project.assignees.forEach(a     => { writes[`projects/${pid}/payload/assignees/${a.id}`] = a; });
      await update(ref(db), writes);
    }),
  );

  // Remove Phase 1 blob after successful migration
  if (phase1Snap?.exists()) {
    await remove(userStoreRef(uid)).catch(() => {});
  }
}
