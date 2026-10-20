import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Sheet, Spinner } from '../components/ui';
import { useStore } from '../lib/store';
import { fetchDeals, fmtPrice, type DealsFile } from '../lib/deals';
import { openUrl } from '../lib/meta';
import { getLang, t } from '../lib/i18n';

export default function Deals({ onClose }: { onClose: () => void }) {
  const { household } = useStore();
  const [data, setData] = useState<DealsFile | null>(null);

  useEffect(() => {
    let alive = true;
    fetchDeals(household?.id).then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, [household?.id]);

  const checked = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleDateString(getLang() === 'en' ? 'en-CA' : 'fr-CA', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <Sheet title={`🔥 ${t('Aubaines')}`} onClose={onClose}>
      {!data ? (
        <div className="center" style={{ padding: 40 }}>
          <Spinner size={26} />
          <p className="muted small mt12">{t('Chargement…')}</p>
        </div>
      ) : data.deals.length === 0 ? (
        <div className="center" style={{ padding: '36px 20px' }}>
          <div style={{ fontSize: 56, opacity: .35 }}>🔥</div>
          <h3 className="mt12">{t('Aucune aubaine pour le moment')}</h3>
          <p className="muted small mt8">{t('La veille vérifie les prix tous les 3 jours')}</p>
        </div>
      ) : (
        <div className="col gap8">
          {data.deals.map((d) => (
            <div key={d.id} className="card" style={{ textAlign: 'left' }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <b className="ellipsis">{d.title}</b>
                  <div className="small muted">{d.store}</div>
                </div>
                {d.dropPct != null && d.dropPct > 0 && (
                  <span className="chip" style={{ background: 'var(--c-game)', color: '#fff', fontWeight: 800 }}>-{d.dropPct} %</span>
                )}
              </div>
              <div className="row mt8" style={{ alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{fmtPrice(d.price)}</span>
                {d.regularPrice != null && d.regularPrice > d.price && (
                  <span className="muted" style={{ textDecoration: 'line-through' }}>{fmtPrice(d.regularPrice)}</span>
                )}
              </div>
              <button className="btn primary block mt12" onClick={() => openUrl(d.url)}>
                <ExternalLink size={16} /> {t('Voir l’offre')}
              </button>
            </div>
          ))}
          {checked && <p className="tiny dim center mt8">{t('Dernière vérification : {d}', { d: checked })}</p>}
        </div>
      )}
    </Sheet>
  );
}
