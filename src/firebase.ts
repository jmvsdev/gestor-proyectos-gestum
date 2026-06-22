import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, ref } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBz4G_FS1UnsoE0hClXS88YjjqsGeGg4EA',
  authDomain: 'gestor-proyectos-gestum.firebaseapp.com',
  databaseURL: 'https://gestor-proyectos-gestum-default-rtdb.firebaseio.com',
  projectId: 'gestor-proyectos-gestum',
  storageBucket: 'gestor-proyectos-gestum.appspot.com',
  messagingSenderId: '460432855718',
  appId: '1:460432855718:web:a17acfc7424cbfad80da67',
  measurementId: 'G-WW0QEQCTWD',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// Path: /users/{uid}/store → JSON-stringified ProjectStore
export const userStoreRef = (uid: string) => ref(db, `users/${uid}/store`);
