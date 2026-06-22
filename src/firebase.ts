import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, ref } from 'firebase/database';

// Client-side Firebase keys are not secret (they end up in the bundle regardless).
// The real security boundary is Firebase Security Rules.
// Fallbacks ensure the app keeps working if Vercel env vars are not yet configured.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             || 'AIzaSyBz4G_FS1UnsoE0hClXS88YjjqsGeGg4EA',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         || 'gestor-proyectos-gestum.firebaseapp.com',
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL        || 'https://gestor-proyectos-gestum-default-rtdb.firebaseio.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          || 'gestor-proyectos-gestum',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      || 'gestor-proyectos-gestum.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '460432855718',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              || '1:460432855718:web:a17acfc7424cbfad80da67',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID      || 'G-WW0QEQCTWD',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// ── Phase 1 (legacy, kept for migration) ─────────────────────────────────────
export const userStoreRef = (uid: string) => ref(db, `users/${uid}/store`);

// ── Phase 2 paths ─────────────────────────────────────────────────────────────
export const projectRef         = (pid: string)           => ref(db, `projects/${pid}`);
export const projectMetaRef     = (pid: string)           => ref(db, `projects/${pid}/meta`);
export const projectPayloadRef  = (pid: string)           => ref(db, `projects/${pid}/payload`);
export const projectMemberRef   = (pid: string, uid: string) => ref(db, `projects/${pid}/meta/members/${uid}`);
export const userProjectsRef    = (uid: string)           => ref(db, `userProjects/${uid}`);
export const userProjectRef     = (uid: string, pid: string) => ref(db, `userProjects/${uid}/${pid}`);
export const invitationRef      = (token: string)         => ref(db, `invitations/${token}`);
export const userProfileRef     = (uid: string)           => ref(db, `users/${uid}/profile`);
export const presenceRef        = (pid: string, uid: string) => ref(db, `projects/${pid}/presence/${uid}`);
export const presenceListRef    = (pid: string)           => ref(db, `projects/${pid}/presence`);
