import { useState, useEffect } from 'react';
import { get, set } from 'firebase/database';
import type { User } from 'firebase/auth';
import type { ProjectStore } from '../data/types';
import { userStoreRef } from '../firebase';

const LOCAL_STORE_KEY   = 'pm-projects';
const LOCAL_VERSION_KEY = 'pm-version';
const STORAGE_VERSION   = '4';

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

    get(userStoreRef(user.uid))
      .then(async snapshot => {
        let result: ProjectStore | null = null;

        if (snapshot.exists()) {
          // Firebase has data — stored as a JSON string to preserve array types
          const val = snapshot.val();
          result = JSON.parse(val as string) as ProjectStore;
        } else {
          // No Firebase data — check if localStorage has a v4 store to migrate
          const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);
          const localRaw     = localStorage.getItem(LOCAL_STORE_KEY);

          if (localVersion === STORAGE_VERSION && localRaw) {
            try {
              result = JSON.parse(localRaw) as ProjectStore;
              // One-time migration: push localStorage → Firebase
              await set(userStoreRef(user.uid), JSON.stringify(result));
            } catch {
              result = null;
            }
          }
        }

        setStore(result);
        setLoading(false);
        setReady(true);
      })
      .catch(() => {
        // Firebase unreachable (offline) — fall back to localStorage cache
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
