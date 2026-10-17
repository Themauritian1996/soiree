import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useStore } from '../lib/store';
import { firebaseEnabled, signInGoogle, signInEmail, resetPassword, authErrorFr } from '../lib/firebase';
import { useToast, Spinner } from '../components/ui';
import { t, LangSwitch } from '../lib/i18n';

const G = () => (
  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
);

export default function Login() {
  const { useLocal } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [create, setCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast(authErrorFr(e), true); } finally { setBusy(false); }
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%', maxWidth: 440, margin: '0 auto', paddingBottom: 40 }}>
      <div className="login-bg">
        <i style={{ width: 300, height: 300, background: 'var(--c-game)', top: -80, left: -100 }} />
        <i style={{ width: 280, height: 280, background: 'var(--c-movie)', top: '35%', right: -120, animationDelay: '-4s' }} />
        <i style={{ width: 240, height: 240, background: 'var(--c-series)', bottom: -60, left: '20%', animationDelay: '-8s' }} />
      </div>
      <div style={{ position: 'absolute', top: 'calc(var(--safe-t) + 16px)', right: 16 }}><LangSwitch compact /></div>
      <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 18 }}>🎲🍿</div>
      <h1 style={{ fontSize: 44 }}>Soirée</h1>
      <p className="muted mt8" style={{ fontSize: 16, maxWidth: 330 }}>
        {t('Ta collection de jeux, films et séries — et le bon choix pour ce soir, selon qui est là.')}
      </p>

      <div className="col mt28" style={{ gap: 12 }}>
        {firebaseEnabled ? (
          <>
            <button className="btn primary block" disabled={busy} onClick={() => run(signInGoogle)}>
              {busy ? <Spinner /> : <G />} {t('Continuer avec Google')}
            </button>
            {!emailMode ? (
              <button className="btn block" onClick={() => setEmailMode(true)}><Mail size={18} /> {t('Courriel et mot de passe')}</button>
            ) : (
              <div className="card col">
                <input className="input" type="email" placeholder={t('Courriel')} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                <input className="input" type="password" placeholder={t('Mot de passe')} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={create ? 'new-password' : 'current-password'} />
                <button className="btn primary" disabled={busy || !email || pw.length < 6} onClick={() => run(() => signInEmail(email, pw, create))}>
                  {create ? t('Créer mon compte') : t('Se connecter')}
                </button>
                <div className="row between small">
                  <button className="muted" onClick={() => setCreate(!create)}>{create ? t('J’ai déjà un compte') : t('Créer un compte')}</button>
                  {!create && <button className="muted" onClick={() => run(async () => { await resetPassword(email); toast(t('Courriel de réinitialisation envoyé')); })} disabled={!email}>{t('Mot de passe oublié')}</button>}
                </div>
              </div>
            )}
            <button className="btn ghost block small muted" onClick={useLocal}>{t('Essayer sans compte (sur cet appareil)')}</button>
          </>
        ) : (
          <>
            <button className="btn primary block" onClick={useLocal}>{t('Commencer')}</button>
            <p className="tiny dim center">{t('Mode local : tes données restent sur cet appareil. Ajoute la configuration Firebase pour les comptes Google et la synchro.')}</p>
          </>
        )}
      </div>
    </div>
  );
}
