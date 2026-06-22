import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

/**
 * Tracks Firebase RTDB connection state via the special .info/connected path.
 * Returns null while the initial state is unknown, then true/false.
 * Prefer this over navigator.onLine which lies about real Firebase connectivity.
 */
export function useConnectionStatus(): boolean | null {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const connRef = ref(db, '.info/connected');
    const unsub = onValue(connRef, snap => {
      setConnected(snap.val() === true);
    });
    return unsub;
  }, []);

  return connected;
}
