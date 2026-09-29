const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const kw = s => s.replace(/\*\*(.+?)\*\*/g, '<mark class="kw">$1</mark>');
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
let lang = 'es';
try { lang = localStorage.getItem('lang') || (navigator.language || 'es').slice(0, 2); } catch (e) {}
if (!I18N[lang]) lang = 'es';

/* ---------- render ---------- */
function render() {
  const L = I18N[lang];
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(el => el.innerHTML = kw(L[el.dataset.i18n] || ''));
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));

  $('#hardBars').innerHTML = L.hard.map(([n, v]) =>
    `<div class="bar"><div class="h"><span>${esc(n)}</span><b>${v}%</b></div><div class="t"><i data-w="${v}"></i></div></div>`).join('');
  $('#softTags').innerHTML = L.soft.map(s => `<span class="tag">${esc(s)}</span>`).join('');
  drawParadigm(L);
  bindTilt();
  animateBars();
}

/* ---------- paradigm map ---------- */
function drawParadigm(L) {
  const cx = 300, cy = 300, R = 215, n = L.paradigms.length;
  let svg = `<svg viewBox="0 0 600 600"><defs><radialGradient id="cg"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#8b5cf6"/></radialGradient></defs>`;
  const pts = L.paradigms.map((p, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  });
  pts.forEach(([x, y]) => svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`);
  pts.forEach(([x, y], i) => {
    const nx = pts[(i + 1) % n];
    svg += `<line x1="${x}" y1="${y}" x2="${nx[0]}" y2="${nx[1]}" opacity=".5"/>`;
  });
  svg += `<g class="core"><circle cx="${cx}" cy="${cy}" r="62"/><text x="${cx}" y="${cy + 7}">${esc(L.core)}</text></g>`;
  pts.forEach(([x, y], i) => svg += `<g class="pn" data-i="${i}"><circle cx="${x}" cy="${y}" r="30"/><text x="${x}" y="${y + 4}">${esc(L.paradigms[i][0])}</text></g>`);
  $('#paradigm').innerHTML = svg + '</svg>';
  $('#paradigmList').innerHTML = L.paradigms.map(([t, d], i) => `<div class="pi" data-i="${i}"><b>${i + 1}. ${esc(t)}</b>${esc(d)}</div>`).join('');
  const sel = i => { $$('.pn,.pi').forEach(e => e.classList.toggle('on', e.dataset.i == i)); };
  $$('.pn,.pi').forEach(e => { e.onmouseenter = e.onclick = () => sel(e.dataset.i); });
}

/* ---------- skill bars ---------- */
function animateBars() {
  $$('.bar i').forEach(i => { i.style.width = '0'; });
  requestAnimationFrame(() => setTimeout(() => $$('.bar i').forEach(i => i.style.width = i.dataset.w + '%'), 120));
}

/* ---------- 3D tilt on cards ---------- */
function bindTilt() {
  $$('.tilt').forEach(el => {
    el.onmousemove = e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(8px)`;
    };
    el.onmouseleave = () => el.style.transform = '';
  });
}

/* ---------- router ---------- */
function route() {
  const id = (location.hash || '#about').slice(1);
  const page = $('#' + id) && $('#' + id).classList.contains('page') ? id : 'about';
  $$('.page').forEach(p => p.classList.toggle('show', p.id === page));
  $$('#menu a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + page));
  $('#menu').classList.remove('open');
  window.scrollTo({ top: 0 });
  if (page === 'about') animateBars();
  if (window.sceneKick) window.sceneKick();
}
window.addEventListener('hashchange', route);
$$('.lang button').forEach(b => b.onclick = () => {
  lang = b.dataset.lang; try { localStorage.setItem('lang', lang); } catch (e) {} render();
});
$('#burger').onclick = () => $('#menu').classList.toggle('open');

/* ---------- Three.js background ---------- */
(function scene() {
  if (typeof THREE === 'undefined') return;
  const canvas = $('#bg3d');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, 1, .1, 100);
  cam.position.z = 8;

  // particles
  const N = 1400, pos = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - .5) * 40;
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(pg, new THREE.PointsMaterial({ size: .05, color: 0x9fb4ff, transparent: true, opacity: .8 }));
  sc.add(stars);

  // hero objects
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.6, .45, 160, 20),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: .35 }));
  knot.position.set(4.2, 0, -3); sc.add(knot);
  const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: .45 }));
  ico.position.set(-5, -2, -4); sc.add(ico);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(.9, .25, 12, 40),
    new THREE.MeshBasicMaterial({ color: 0xf472b6, wireframe: true, transparent: true, opacity: .4 }));
  torus.position.set(-3, 3, -5); sc.add(torus);

  let mx = 0, my = 0, boost = 0;
  addEventListener('mousemove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  window.sceneKick = () => boost = 1;
  function size() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
  addEventListener('resize', size); size();

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  (function loop() {
    const t = performance.now() / 1000;
    boost *= .95;
    const s = still ? 0 : 1;
    knot.rotation.x = t * .25 * s + boost * 2; knot.rotation.y = t * .3 * s;
    ico.rotation.x = t * .2 * s; ico.rotation.y = -t * .35 * s - boost * 2;
    torus.rotation.x = t * .4 * s; torus.rotation.z = t * .2 * s;
    stars.rotation.y = t * .015 * s + scrollY * .0002;
    cam.position.x += (mx * 1.6 - cam.position.x) * .04;
    cam.position.y += (-my * 1.2 - cam.position.y) * .04;
    cam.lookAt(0, 0, 0);
    renderer.render(sc, cam);
    requestAnimationFrame(loop);
  })();
})();

render();
route();
