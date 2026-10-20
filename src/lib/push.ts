// Notifications push Firebase (FCM) — enregistrement du token, plateforme native uniquement.
// Le serveur envoie les notifications avec un payload `notification` (titre + texte) :
// Android les affiche automatiquement, aucun traitement à la réception n'est requis ici.
// Tout est silencieux : cette fonction ne lève jamais.
import { Capacitor } from '@capacitor/core';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/** Enregistre le token FCM de l'appareil dans Firestore (users/{uid}). Ne lève jamais. */
export function initPush(uid: string): void {
  try {
    if (!uid || !Capacitor.isNativePlatform() || !db) return;
    const fdb = db;
    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;
        await PushNotifications.addListener('registration', async (token) => {
          try {
            if (token?.value) {
              await setDoc(doc(fdb, 'users', uid), { fcmToken: token.value, fcmUpdatedAt: Date.now() }, { merge: true });
            }
          } catch { /* silencieux */ }
        });
        await PushNotifications.addListener('registrationError', (err) => {
          console.warn('[push] registrationError', err?.error);
        });
        await PushNotifications.register();
      } catch { /* silencieux : push non disponible */ }
    })();
  } catch { /* silencieux */ }
}
