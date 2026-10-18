import { useRef, useState } from 'react';
import { Eye, EyeOff, Download, Upload, ExternalLink, FlaskConical, Moon, Sun, Monitor } from 'lucide-react';
import { useStore } from '../lib/store';
import { Seg, Sheet, Spinner, useToast } from '../components/ui';
import { MODEL_OPTIONS, DEFAULT_MODEL, testKey, lastModelUsed } from '../lib/gemini';
import { demoItems, demoProfiles } from '../lib/demo';
import { firebaseEnabled } from '../lib/firebase';
import { openUrl } from '../lib/meta';
import { t, useUi, type Theme } from '../lib/i18n';
import type { Lang } from '../lib/types';

export default function Settings({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings, profiles, items, importData, mode } = useStore();
  const { lang, setLang, theme, setTheme } = useUi();
  const toast = useToast();
  const [gk, setGk] = useState(settings.geminiKey || '');
  const [tk, setTk] = useState(settings.tmdbKey || '');
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    await updateSettings({ geminiKey: gk.trim() || undefined, tmdbKey: tk.trim() || undefined });
    toast(t('Réglages enregistrés'));
  };

  const test = async () => {
    setTesting(true);
    try { await testKey({ ...settings, geminiKey: gk.trim() }); toast(`${t('Clé Gemini fonctionnelle ✅')} (${lastModelUsed})`); await save(); }
    catch (e: any) { toast(e.message, true); } finally { setTesting(false); }
  };

  const exportJson = async () => {
    const blob = new Blob([JSON.stringify({ app: 'soiree', version: 1, exportedAt: new Date().toISOString(), profiles, items }, null, 1)], { type: 'application/json' });
    // Sur Android (APK), le partage natif remplace le téléchargement
    const file = new File([blob], `soiree-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: t('Sauvegarde Soirée') }); return; } } catch { /* annulé */ }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
  };

  const importJson = async (f?: File) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      await importData({ profiles: d.profiles, items: d.items });
      toast(t('{n} titres importés', { n: d.items?.length || 0 }));
    } catch { toast(t('Fichier invalide'), true); }
  };

  return (
    <Sheet title={t('Réglages')} onClose={onClose} accent="var(--c-suggest)">
      <div className="col gap20">
        <div className="card col">
          <h3>🌐 {t('Langue et affichage')}</h3>
          <Seg value={lang} onChange={(l: Lang) => setLang(l)} options={[{ v: 'fr', label: '🇨🇦 Français' }, { v: 'en', label: '🇨🇦 English' }]} />
          <Seg value={theme} onChange={(v: Theme) => setTheme(v)} options={[
            { v: 'dark', label: <><Moon size={15} /> {t('Sombre')}</> },
            { v: 'light', label: <><Sun size={15} /> {t('Clair')}</> },
            { v: 'system', label: <><Monitor size={15} /> {t('Système')}</> },
          ]} />
          <p className="tiny dim">{t('La langue et le thème sont propres à cet appareil. Les fiches, quiz et réponses de l’IA suivent la langue choisie.')}</p>
        </div>

        <div className="card col">
          <h3>🔑 Gemini (Google AI)</h3>
          <p className="small muted">{t('Sert à reconnaître les titres sur tes photos, générer les fiches, les règles, les fun facts, les quiz et les suggestions. Clé gratuite sur Google AI Studio.')}</p>
          <button className="small row gap4" style={{ color: 'var(--c-series)' }} onClick={() => openUrl('https://aistudio.google.com/apikey')}>{t('Obtenir une clé')} <ExternalLink size={13} /></button>
          <div className="row">
            <input className="input grow" type={show ? 'text' : 'password'} placeholder="AIza…" value={gk} onChange={(e) => setGk(e.target.value)} autoComplete="off" />
            <button className="icon-btn" onClick={() => setShow(!show)} aria-label={t('Afficher')}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          <select className="input" value={settings.geminiModel || DEFAULT_MODEL} onChange={(e) => updateSettings({ geminiModel: e.target.value })}>
            {MODEL_OPTIONS().map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <button className="btn" onClick={test} disabled={!gk.trim() || testing}>{testing ? <Spinner size={16} /> : <FlaskConical size={16} />} {t('Tester et enregistrer')}</button>
        </div>

        <div className="card col">
          <h3>🆓 {t('Infos gratuites sans clé')}</h3>
          <p className="small muted">{t('Affiches et infos des séries (TVmaze) et des films/jeux (Wikipédia) sont ajoutées automatiquement, sans clé. TMDB est optionnel pour les notes et la distribution exactes.')}</p>
        </div>

        <div className="card col">
          <h3>🎬 TMDB ({t('optionnel')})</h3>
          <p className="small muted">{t('Ajoute les vraies affiches, la distribution exacte et la note des films et séries. Clé gratuite sur themoviedb.org (Paramètres → API).')}</p>
          <button className="small row gap4" style={{ color: 'var(--c-series)' }} onClick={() => openUrl('https://www.themoviedb.org/settings/api')}>{t('Obtenir une clé')} <ExternalLink size={13} /></button>
          <input className="input" type={show ? 'text' : 'password'} placeholder={t('Clé API v3 ou jeton v4')} value={tk} onChange={(e) => setTk(e.target.value)} autoComplete="off" />
        </div>

        <button className="btn primary block" onClick={save}>{t('Enregistrer')}</button>
        {mode === 'cloud' && <p className="tiny dim">{t('Les clés sont enregistrées dans ton foyer (Firestore protégé) et partagées avec ses membres.')}</p>}

        <div className="card col">
          <h3>💾 {t('Données')}</h3>
          <div className="grid2">
            <button className="btn sm" onClick={exportJson}><Download size={15} /> {t('Exporter')}</button>
            <button className="btn sm" onClick={() => fileRef.current?.click()}><Upload size={15} /> {t('Importer')}</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
          <button className="btn sm" onClick={async () => { await importData({ items: demoItems(), profiles: profiles.length ? undefined : demoProfiles() }); toast(t('Démo ajoutée')); }}>{t('Ajouter la collection de démo')}</button>
          <p className="tiny dim">{items.length} {t('titres')} · {profiles.length} {t('profils')} · {mode === 'cloud' ? t('synchronisé avec Firebase') : firebaseEnabled ? t('local (non connecté)') : t('local (Firebase non configuré)')}</p>
        </div>
        <p className="tiny dim center">Soirée v1.6</p>
      </div>
    </Sheet>
  );
}
