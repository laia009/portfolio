const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const kw = s => s.replace(/\*\*(.+?)\*\*/g, '<mark class="kw">$1</mark>');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SECS = ['about', 'resume', 'certs', 'projects', 'hhep', 'contact'];
const ICONS = {
  about: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  resume: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  certs: '<circle cx="12" cy="15" r="5"/><path d="M9 3 7.5 10.5M15 3l1.5 7.5M12 13v4"/>',
  projects: '<path d="M12 2c3 2.5 4.5 6 4.5 10L14 15h-4l-2.5-3C7.5 8 9 4.5 12 2z"/><circle cx="12" cy="9" r="1.6"/><path d="M10 15l-1.5 5L12 18l3.5 2L14 15"/>',
  hhep: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  contact: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
};
let lang = 'es';
try { lang = localStorage.getItem('lang') || (navigator.language || 'es').slice(0, 2); } catch (e) {}
if (!I18N[lang]) lang = 'es';

/* ---------- iconos del mundo ---------- */
const markers = {};
SECS.forEach(id => {
  const b = document.createElement('button');
  b.className = 'marker hide'; b.dataset.sec = id;
  b.innerHTML = `<span class="lbl"></span><span class="ic"><svg viewBox="0 0 24 24">${ICONS[id]}</svg></span><span class="stem"></span><span class="base"></span>`;
  b.onclick = () => { location.hash = id; };
  $('#markers').appendChild(b); markers[id] = b;
});

/* ---------- textos (ES / EN) ---------- */
function render() {
  const L = I18N[lang];
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(el => { el.innerHTML = kw(L[el.dataset.i18n] || ''); });
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  SECS.forEach(id => { markers[id].querySelector('.lbl').textContent = L['nav_' + id]; markers[id].setAttribute('aria-label', L['nav_' + id]); });

  $('#hardBars').innerHTML = L.hard.map(([n, v]) =>
    `<div class="bar"><div class="bh"><span>${esc(n)}</span><b>${v}%</b></div><div class="t"><i data-w="${v}"></i></div></div>`).join('');
  $('#softTags').innerHTML = L.soft.map(s => `<span class="tag">${esc(s)}</span>`).join('');
  drawParadigm(L);
  if (current === 'about') animateBars();
}

/* ---------- mapa de imprescindibles ---------- */
const COLS = ['#ff5fa2', '#a855f7', '#2f80ed', '#22c1c3', '#10b981', '#ffb347', '#ff5e62', '#6366f1', '#0ea5e9', '#f97316'];
function drawParadigm(L) {
  const cx = 300, cy = 300, R = 215, n = L.paradigms.length;
  const pts = L.paradigms.map((p, i) => { const a = i / n * Math.PI * 2 - Math.PI / 2; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  let s = `<svg viewBox="-30 -20 660 670"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4f9a"/><stop offset="1" stop-color="#ff9a3c"/></linearGradient></defs>`;
  pts.forEach(([x, y], i) => { const [nx, ny] = pts[(i + 1) % n]; s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/><line x1="${x}" y1="${y}" x2="${nx}" y2="${ny}" opacity=".6"/>`; });
  s += `<g class="core"><circle cx="${cx}" cy="${cy}" r="70" fill="url(#cg)" stroke="#fff" stroke-width="6"/><text x="${cx}" y="${cy + 9}">${esc(L.core)}</text></g>`;
  pts.forEach(([x, y], i) => {
    s += `<g class="pn" data-i="${i}" tabindex="0"><circle cx="${x}" cy="${y}" r="38" fill="${COLS[i % COLS.length]}"/>` +
      `<text x="${x}" y="${y + 9}" style="font-size:26px">${i + 1}</text>` +
      `<text x="${x}" y="${y + 66}" style="fill:#1f1b3a;font-size:19px">${esc(L.paradigms[i][0])}</text></g>`;
  });
  $('#paradigm').innerHTML = s + '</svg>';
  $('#paradigmList').innerHTML = L.paradigms.map(([t, d], i) =>
    `<div class="pi" data-i="${i}"><b style="color:${COLS[i % COLS.length]}">${i + 1}. ${esc(t)}</b>${esc(d)}</div>`).join('');
  const sel = i => $$('.pn,.pi').forEach(e => e.classList.toggle('on', e.dataset.i == i));
  $$('.pn,.pi').forEach(e => {
    e.onmouseenter = e.onfocus = () => sel(e.dataset.i);
    e.onclick = () => { sel(e.dataset.i); const li = $(`.pi[data-i="${e.dataset.i}"]`); if (e.classList.contains('pn')) li.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
  });
}
function animateBars() {
  $$('.bar i').forEach(i => { i.style.transition = 'none'; i.style.width = '0'; });
  requestAnimationFrame(() => setTimeout(() => $$('.bar i').forEach(i => { i.style.transition = ''; i.style.width = i.dataset.w + '%'; }), 250));
}

/* ---------- panel y navegación ---------- */
let current = null, has3d = false;
const panel = $('#panel'), scrim = $('#scrim');
function openPanel(id) {
  current = id;
  $$('.sheet').forEach(s => s.classList.toggle('show', s.dataset.sec === id));
  panel.classList.add('on'); panel.classList.toggle('short', id !== 'about');
  panel.setAttribute('aria-hidden', 'false'); panel.scrollTop = 0;
  scrim.classList.add('on');
  $$('#menu a').forEach(a => a.classList.toggle('on', a.dataset.sec === id));
  $('#menu').classList.remove('open');
  hideIntro(); $('#hint').classList.add('gone');
  if (has3d) World.focus(id, innerWidth > 900 ? 3.6 : 0);
  if (id === 'about') animateBars();
  setTimeout(() => $('#close').focus({ preventScroll: true }), 300);
}
function closePanel() {
  current = null;
  panel.classList.remove('on'); panel.setAttribute('aria-hidden', 'true'); scrim.classList.remove('on');
  $$('#menu a').forEach(a => a.classList.remove('on'));
  if (has3d) World.unfocus();
}
function goHome() { history.pushState('', document.title, location.pathname + location.search); route(); }
function route() {
  const id = location.hash.slice(1);
  if (SECS.includes(id)) openPanel(id); else closePanel();
}
addEventListener('hashchange', route);
$('#close').onclick = goHome; scrim.onclick = goHome;
addEventListener('keydown', e => { if (e.key === 'Escape' && current) goHome(); });
$('.logo').onclick = e => { e.preventDefault(); goHome(); };
$('#burger').onclick = () => { const m = $('#menu'); m.classList.toggle('open'); $('#burger').setAttribute('aria-expanded', m.classList.contains('open')); };
$$('.lang button').forEach(b => b.onclick = () => { lang = b.dataset.lang; try { localStorage.setItem('lang', lang); } catch (e) {} render(); });

/* ---------- intro y pistas ---------- */
let introShown = false;
function hideIntro() { $('#intro').classList.add('gone'); }
function showIntro() {
  if (introShown || current) return; introShown = true;
  $('#intro').classList.remove('gone');
}
$('#explore').onclick = () => { hideIntro(); $('#hint').classList.remove('gone'); };
$('#intro').classList.add('gone'); $('#hint').classList.add('gone');

/* ---------- arranque ---------- */
render();
try {
  if (!window.THREE) throw new Error('Three.js no cargó');
  World.init({
    canvas: $('#world'), markers,
    onSelect: id => { location.hash = id; },
    onInteract: () => { hideIntro(); $('#hint').classList.add('gone'); introShown = true; },
    onProgress: p => { $('#loadbar').style.width = Math.round(p * 90) + '%'; }
  });
  has3d = true;
} catch (e) { console.error(e); document.body.classList.add('no3d'); }
setTimeout(() => { $('#loadbar').style.width = '100%'; }, 100);
setTimeout(() => {
  $('#loader').classList.add('gone');
  if (has3d) World.start();
  if (location.hash) route(); else setTimeout(showIntro, has3d ? 2900 : 0);
}, 750);
