import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth, initializeAuth, indexedDBLocalPersistence, GoogleAuthProvider, signInWithPopup,
  signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut as fbSignOut, onAuthStateChanged, type Auth, type User,
} from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, type Firestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { t } from './i18n';

const env = import.meta.env;
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = !!(cfg.apiKey && cfg.projectId && cfg.appId);
export const isNative = Capacitor.isNativePlatform();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseEnabled) {
  app = initializeApp(cfg);
  // Dans l'APK (WebView), getAuth() par défaut tente les popups : on initialise sans.
  auth = isNative ? initializeAuth(app, { persistence: indexedDBLocalPersistence }) : getAuth(app);
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache(), ignoreUndefinedProperties: true });
  } catch {
    db = getFirestore(app);
  }
}

export { auth, db };

export function watchUser(cb: (u: User | null) => void) {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

export async function signInGoogle() {
  if (!auth) throw new Error('Firebase non configuré');
  if (isNative) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const res = await FirebaseAuthentication.signInWithGoogle();
    const idToken = res.credential?.idToken;
    if (!idToken) throw new Error(t('Connexion Google annulée'));
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  } else {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }
}

export async function signInEmail(email: string, pw: string, create: boolean) {
  if (!auth) throw new Error('Firebase non configuré');
  if (create) await createUserWithEmailAndPassword(auth, email, pw);
  else await signInWithEmailAndPassword(auth, email, pw);
}

export async function resetPassword(email: string) {
  if (!auth) throw new Error('Firebase non configuré');
  await sendPasswordResetEmail(auth, email);
}

export async function signOut() {
  if (isNative) {
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut();
    } catch { /* ignore */ }
  }
  if (auth) await fbSignOut(auth);
}

export function authErrorFr(e: any): string {
  const code: string = e?.code || '';
  const map: Record<string, string> = {
    'auth/invalid-credential': t('Courriel ou mot de passe invalide.'),
    'auth/wrong-password': t('Mot de passe invalide.'),
    'auth/user-not-found': t('Aucun compte avec ce courriel.'),
    'auth/email-already-in-use': t('Ce courriel a déjà un compte.'),
    'auth/weak-password': t('Mot de passe trop court (6 caractères min.).'),
    'auth/invalid-email': t('Courriel invalide.'),
    'auth/popup-closed-by-user': t('Fenêtre fermée avant la fin.'),
    'auth/unauthorized-domain': t("Ce domaine n'est pas autorisé dans Firebase (Authentication > Paramètres > Domaines autorisés)."),
    'auth/network-request-failed': t('Pas de connexion réseau.'),
  };
  return map[code] || e?.message || t('Erreur inconnue');
}
