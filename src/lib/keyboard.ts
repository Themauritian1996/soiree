// Le clavier ne doit jamais cacher le champ en cours de saisie, sans laisser de vide.
// - APK : MainActivity (patch CI) réduit la WebView à la zone AU-DESSUS du clavier (insets IME),
//   comme une app native. Donc ici : aucun décalage CSS (--kb = 0), on masque la barre du bas
//   et on recentre le champ actif une fois la vue redimensionnée.
// - Web : viewport « interactive-widget=resizes-content » (Chrome) ; repli visualViewport (iOS).
const isField = (el: Element | null): el is HTMLElement => !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);

function revealFocused(delay = 60) {
  const el = document.activeElement;
  if (!isField(el)) return;
  setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), delay);
}

const setOpen = (open: boolean) => document.body.classList.toggle('kb-open', open);
const setKb = (px: number) => document.documentElement.style.setProperty('--kb', `${Math.max(0, Math.round(px))}px`);

export async function initKeyboard() {
  // Dès que la vue change de taille (clavier qui monte), on recentre le champ actif.
  window.addEventListener('resize', () => revealFocused(30));
  document.addEventListener('focusin', () => revealFocused(350));

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Keyboard } = await import('@capacitor/keyboard');
      setKb(0);
      Keyboard.addListener('keyboardWillShow', () => setOpen(true));
      Keyboard.addListener('keyboardDidShow', () => { setOpen(true); revealFocused(0); });
      Keyboard.addListener('keyboardWillHide', () => setOpen(false));
      Keyboard.addListener('keyboardDidHide', () => setOpen(false));
      return;
    }
  } catch { /* web */ }

  const vv = window.visualViewport;
  if (!vv) return;
  let base = window.innerHeight;
  const upd = () => {
    if (!isField(document.activeElement)) base = Math.max(base, window.innerHeight);
    // Partie de la page réellement recouverte (0 si le navigateur a déjà redimensionné la page)
    const covered = window.innerHeight - vv.height - vv.offsetTop;
    setKb(covered > 80 ? covered : 0);
    setOpen(isField(document.activeElement) && (covered > 80 || window.innerHeight < base * 0.8));
  };
  vv.addEventListener('resize', upd);
  vv.addEventListener('scroll', upd);
  document.addEventListener('focusout', () => setTimeout(upd, 100));
}
