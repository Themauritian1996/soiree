// Le clavier ne doit jamais cacher le champ en cours de saisie.
// - APK : plugin Keyboard (hauteur exacte), car Android 15 « bord à bord » ne redimensionne plus la vue.
// - Web : visualViewport.
// On expose --kb (hauteur du clavier) et la classe body.kb-open, puis on recentre le champ actif.
const setKb = (h: number) => {
  const px = Math.max(0, Math.round(h));
  document.documentElement.style.setProperty('--kb', `${px}px`);
  document.body.classList.toggle('kb-open', px > 80);
  if (px > 80) revealFocused();
};

function revealFocused() {
  const el = document.activeElement as HTMLElement | null;
  if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
  setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
}

export async function initKeyboard() {
  document.addEventListener('focusin', () => { if (document.body.classList.contains('kb-open')) revealFocused(); else setTimeout(revealFocused, 350); });
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
      try { await Keyboard.setResizeMode({ mode: KeyboardResize.None }); } catch { /* */ }
      Keyboard.addListener('keyboardWillShow', (i) => setKb(i.keyboardHeight));
      Keyboard.addListener('keyboardDidShow', (i) => setKb(i.keyboardHeight));
      Keyboard.addListener('keyboardWillHide', () => setKb(0));
      return;
    }
  } catch { /* web */ }
  const vv = window.visualViewport;
  if (vv) {
    const upd = () => setKb(window.innerHeight - vv.height - vv.offsetTop);
    vv.addEventListener('resize', upd);
    vv.addEventListener('scroll', upd);
  }
}
