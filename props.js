/* Objetos 3D estilo "plastilina" para el mundo (Three.js r128) */
const P = (() => {
  const T = THREE, PI = Math.PI;
  const cache = {};
  const mat = (c, o = {}) => {
    const k = c + JSON.stringify(o);
    if (!cache[k]) cache[k] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .78, metalness: 0 }, o));
    return cache[k];
  };
  const mk = (geo, c, o) => {
    const m = new T.Mesh(geo, c.isMaterial ? c : mat(c, o));
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  const at = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); return m; };
  const box = (w, h, d, c, o) => mk(new T.BoxGeometry(w, h, d), c, o);
  const cyl = (rt, rb, h, c, s = 20, o) => mk(new T.CylinderGeometry(rt, rb, h, s), c, o);
  const sph = (r, c, o) => mk(new T.SphereGeometry(r, 20, 14), c, o);
  const cone = (r, h, c, s = 16, o) => mk(new T.ConeGeometry(r, h, s), c, o);
  const group = (...kids) => { const g = new T.Group(); kids.forEach(k => g.add(k)); return g; };

  function RNG(seed) { // mulberry32
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  /* ---------- islas ---------- */
  function blob(r, rng, sx, sz) {
    const ph = [rng() * 6.3, rng() * 6.3, rng() * 6.3], pts = [];
    for (let i = 0; i < 56; i++) {
      const a = i / 56 * PI * 2;
      const k = 1 + .2 * (Math.sin(a * 2 + ph[0]) * .5 + Math.sin(a * 3 + ph[1]) * .35 + Math.sin(a * 5 + ph[2]) * .15);
      pts.push(new T.Vector2(Math.cos(a) * r * k * sx, Math.sin(a) * r * k * sz));
    }
    return pts;
  }
  function slab(pts, s, depth, y, c, ox = 0, oz = 0) {
    const shape = new T.Shape(pts.map(p => new T.Vector2(p.x * s + ox, p.y * s + oz)));
    const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .14, bevelSize: .14, bevelSegments: 3, curveSegments: 4 });
    g.rotateX(-PI / 2); g.translate(0, y + .14, 0);
    return mk(g, c);
  }
  // Isla de capas: arena + césped (+ meseta opcional). userData.top = altura de la superficie
  function island({ r = 3, sx = 1, sz = .85, seed = 1, sand = '#f7d9a4', top = '#8fd47f', plateau = null }) {
    const rng = RNG(seed), pts = blob(r, rng, sx, sz), g = new T.Group();
    g.add(slab(pts, 1, .7, -.55, sand));
    g.add(slab(pts, .84, .32, .3, top, .05 * r, -.04 * r));
    let y = .9;
    if (plateau) { g.add(slab(pts, .42, .5, .82, plateau, .1 * r, -.08 * r)); }
    g.userData = { pts, r, top: y, rng, plat: plateau ? 1.55 : null, platOff: [.1 * r, .08 * r] };
    return g;
  }
  // Anillo de espuma que sigue la curvatura del planeta
  function foam(pts, R) {
    const outer = new T.Shape(pts.map(p => p.clone().multiplyScalar(1.16)));
    outer.holes.push(new T.Path(pts.map(p => p.clone().multiplyScalar(1.02)).reverse()));
    const g = new T.ShapeGeometry(outer, 2); g.rotateX(-PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sqrt(R * R - x * x - z * z) - R + .05); }
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .85, depthWrite: false }));
    return m;
  }
  // Punto aleatorio sobre la isla (en la capa de césped)
  function spot(isl, spread = .62) {
    const { r, rng } = isl.userData, a = rng() * PI * 2, d = Math.sqrt(rng()) * r * spread;
    return [Math.cos(a) * d + .05 * r, Math.sin(a) * d * .8 + .04 * r];
  }

  /* ---------- vegetación y detalles ---------- */
  function pine(s = 1) {
    const g = group(at(cyl(.07, .1, .35, '#a8754f', 8), 0, .17, 0));
    [[.42, .55, .5], [.33, .45, .78], [.22, .35, 1.02]].forEach(([r, h, y]) => g.add(at(cone(r, h, '#3fae6a', 10), 0, y, 0)));
    g.scale.setScalar(s); return g;
  }
  function roundTree(c = '#ff9ec7', s = 1) {
    const top = mk(new T.IcosahedronGeometry(.42, 1), c, { flatShading: true });
    const g = group(at(cyl(.06, .09, .55, '#a8754f', 8), 0, .27, 0), at(top, 0, .75, 0));
    g.scale.setScalar(s); return g;
  }
  function palm(s = 1) {
    const g = new T.Group(); let y = 0, x = 0;
    for (let i = 0; i < 6; i++) { const seg = at(cyl(.07, .09, .26, '#c8935f', 8), x, y + .13, 0); seg.rotation.z = -.08 * i; g.add(seg); y += .24; x += .03 * i; }
    for (let i = 0; i < 6; i++) {
      const leaf = mk(new T.SphereGeometry(.4, 10, 6), '#3fbf6f'); leaf.scale.set(1, .12, .32);
      const piv = at(new T.Group(), x, y + .05, 0); leaf.position.x = .32; leaf.rotation.z = -.35;
      piv.rotation.y = i / 6 * PI * 2; piv.add(leaf); g.add(piv);
    }
    g.add(at(sph(.08, '#8a5a35'), x + .06, y - .02, .05));
    g.scale.setScalar(s); return g;
  }
  const bush = (c = '#5cc276') => group(at(sph(.2, c), 0, .14, 0), at(sph(.15, c), .18, .1, .05), at(sph(.13, c), -.16, .09, -.04));
  function rock(s = .3) { const m = mk(new T.DodecahedronGeometry(s, 0), '#b9bfd0', { flatShading: true }); m.position.y = s * .5; m.rotation.set(Math.random(), Math.random(), 0); return m; }
  function flowers(n = 5, rng = Math.random) {
    const g = new T.Group(), cs = ['#ff6fa5', '#ffd43b', '#ffffff', '#b197fc'];
    for (let i = 0; i < n; i++) g.add(at(sph(.06, cs[i % 4]), (rng() - .5) * .8, .06, (rng() - .5) * .8));
    return g;
  }

  /* ---------- monumentos de cada sección ---------- */
  // Sobre mí: escritorio con ordenador (SMX) + marco con la foto
  function desk() {
    const scr = canvasTex(256, 160, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#a855f7'); gr.addColorStop(1, '#ff5fa2');
      x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'center';
      x.font = 'bold 54px Fredoka, Arial'; x.fillText('HI! ♥', w / 2, 78); x.font = 'bold 28px Fredoka, Arial'; x.fillText('LAIA · SMX', w / 2, 124);
    });
    const g = group(
      at(box(1.7, .1, .8, '#ffd29a'), 0, .75, 0),
      at(box(.1, .7, .1, '#f2b872'), -.75, .35, -.32), at(box(.1, .7, .1, '#f2b872'), .75, .35, -.32),
      at(box(.1, .7, .1, '#f2b872'), -.75, .35, .32), at(box(.1, .7, .1, '#f2b872'), .75, .35, .32),
      at(box(1.15, .78, .08, '#3a3550'), 0, 1.38, -.2), at(box(.12, .3, .08, '#3a3550'), 0, .92, -.2),
      at(box(.82, .04, .26, '#ffffff'), 0, .82, .15), at(cyl(.07, .07, .14, '#ff7eb6', 12), .62, .87, .2),
      at(box(.36, .72, .7, '#3a3550'), 1.15, .36, 0), at(box(.04, .5, .04, '#22d3ee', { emissive: '#22d3ee', emissiveIntensity: .9 }), 1.15, .38, .36)
    );
    const s = new T.Mesh(new T.PlaneGeometry(1.03, .66), new T.MeshBasicMaterial({ map: scr, toneMapped: false }));
    g.add(at(s, 0, 1.38, -.155)); return g;
  }
  function frame(photoTex) {
    const ph = new T.Mesh(new T.PlaneGeometry(1.25, 1.75), photoTex ? new T.MeshBasicMaterial({ map: photoTex, toneMapped: false }) : mat('#ffd6e8'));
    return group(
      at(cyl(.06, .06, 1.2, '#a8754f', 8), -.55, .6, 0), at(cyl(.06, .06, 1.2, '#a8754f', 8), .55, .6, 0),
      at(box(1.5, 2, .12, '#ffffff'), 0, 1.95, 0), at(ph, 0, 1.95, .065)
    );
  }
  // Currículum: escuela (Institut) + libros
  function school() {
    const g = group(at(box(2.3, 1.2, 1.4, '#fff4e3'), 0, .6, 0), at(box(.42, .6, .06, '#b07a4f'), 0, .3, .71));
    const rg = new T.CylinderGeometry(.92, .92, 2.5, 3); rg.rotateZ(PI / 2); rg.rotateX(-PI / 2); // prisma triangular
    const roof = mk(rg, '#ff7b7b'); roof.scale.y = .6; g.add(at(roof, 0, 1.2 + .92 * .5 * .6, 0));
    [-.75, .75].forEach(x => [.42, .88].forEach(y => g.add(at(box(.36, .3, .06, '#7fd3ff'), x, y, .71))));
    g.add(at(cyl(.025, .025, 1.3, '#9aa3b5', 6), 1.35, .65, .55));
    const flag = box(.46, .28, .02, '#22c1c3'); g.add(at(flag, 1.6, 1.15, .55)); g.userData.flag = flag;
    const books = group(at(box(.55, .12, .38, '#5aa9ff'), 0, .06, 0), at(box(.5, .12, .36, '#ffd43b'), .03, .18, 0), at(box(.52, .12, .37, '#ff6fa5'), -.02, .3, 0));
    books.children[1].rotation.y = .25; books.children[2].rotation.y = -.2;
    g.add(at(books, -1.6, 0, .6)); return g;
  }
  // Certificados: podio + trofeo + birrete
  function trophy() {
    const gold = { metalness: .55, roughness: .28 };
    const cupPts = [[0, 0], [.32, 0], [.32, .08], [.1, .16], [.07, .45], [.26, .58], [.36, .9], [.38, 1.02], [.33, 1.02], [.3, .92], [0, .9]].map(([x, y]) => new T.Vector2(x, y));
    const cup = mk(new T.LatheGeometry(cupPts, 28), '#ffc531', gold);
    const h1 = mk(new T.TorusGeometry(.17, .04, 8, 20), '#ffc531', gold), h2 = h1.clone();
    const cupG = group(cup, at(h1, -.4, .75, 0), at(h2, .4, .75, 0)); cupG.scale.setScalar(1.15);
    const cap = group(at(box(.8, .06, .8, '#3a3550'), 0, .22, 0), at(cyl(.24, .26, .2, '#3a3550'), 0, .1, 0), at(sph(.05, '#ffd43b'), .36, .2, .36));
    cap.children[0].rotation.y = PI / 4;
    return group(
      at(box(.9, .7, .9, '#c9b6ff'), 0, .35, 0), at(box(.85, .45, .85, '#ff9ec7'), -.9, .225, 0), at(box(.85, .3, .85, '#9be7c4'), .9, .15, 0),
      at(cupG, 0, .7, 0), at(cap, .9, .3, 0)
    );
  }
  // Proyectos: cohete en su plataforma + antena parabólica
  function rocket() {
    const body = [[0, 0], [.34, 0], [.42, .4], [.44, 1], [.4, 1.5], [.3, 1.8], [0, 1.8]].map(([x, y]) => new T.Vector2(x, y));
    const r = group(
      mk(new T.LatheGeometry(body, 28), '#ffffff'), at(cone(.31, .55, '#ff5d5d', 24), 0, 2.07, 0),
      at(mk(new T.TorusGeometry(.16, .045, 8, 20), '#ff5d5d'), 0, 1.15, .42), at(cyl(.15, .15, .05, '#7fd3ff', 20, { emissive: '#3aa0ff', emissiveIntensity: .25 }), 0, 1.15, .42)
    );
    r.children[3].rotation.x = PI / 2;
    for (let i = 0; i < 3; i++) { const f = box(.06, .55, .42, '#ff5d5d'); const p = new T.Group(); f.position.set(0, .3, .45); p.rotation.y = i / 3 * PI * 2; p.add(f); r.add(p); }
    const flame = cone(.22, .6, '#ffb020', 14, { emissive: '#ff7a00', emissiveIntensity: 1 });
    flame.rotation.x = PI; flame.position.y = -.25; r.add(flame); r.userData.flame = flame;
    r.position.y = .45;
    const dish = group(at(cyl(.05, .05, .5, '#9aa3b5', 8), 0, .25, 0));
    const d = mk(new T.SphereGeometry(.38, 18, 10, 0, PI * 2, 0, PI / 3), '#ffffff', { side: T.DoubleSide }); d.position.y = .7; d.rotation.x = -.9; dish.add(d);
    return group(at(cyl(.75, .85, .25, '#9aa3b5', 24), 0, .12, 0), at(box(.12, 2.2, .12, '#ffb26b'), -.95, 1.1, 0), r, at(dish, 1.3, 0, .3));
  }
  // 7HHEP: pirámide de 7 escalones (uno por hábito) con bandera
  function ziggurat() {
    const cs = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'], g = new T.Group();
    cs.forEach((c, i) => g.add(at(box(2.3 - i * .29, .24, 2.3 - i * .29, c), 0, .12 + i * .24, 0)));
    const flagT = canvasTex(128, 80, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#6366f1'; x.font = 'bold 64px Fredoka, Arial'; x.textAlign = 'center'; x.fillText('7', w / 2, 62); });
    const flag = new T.Mesh(new T.PlaneGeometry(.6, .38), new T.MeshStandardMaterial({ map: flagT, side: T.DoubleSide, roughness: .8 }));
    g.add(at(cyl(.03, .03, 1, '#9aa3b5', 6), 0, 2.1, 0), at(flag, .3, 2.42, 0)); g.userData.flag = flag; return g;
  }
  // Contacto: faro + buzón
  function lighthouse() {
    const g = new T.Group(); let y = 0;
    for (let i = 0; i < 5; i++) { const r0 = .55 - i * .04, r1 = .55 - (i + 1) * .04; g.add(at(cyl(r1, r0, .45, i % 2 ? '#ffffff' : '#ff5d5d'), 0, y + .225, 0)); y += .45; }
    g.add(at(cyl(.48, .48, .08, '#3a3550'), 0, y + .04, 0));
    g.add(at(cyl(.27, .27, .42, '#fff3a0', 16, { emissive: '#ffd43b', emissiveIntensity: .9 }), 0, y + .29, 0));
    g.add(at(cone(.38, .4, '#ff5d5d'), 0, y + .7, 0));
    const beam = new T.Mesh(new T.ConeGeometry(.5, 3, 16, 1, true), new T.MeshBasicMaterial({ color: '#fff6b0', transparent: true, opacity: .28, depthWrite: false, side: T.DoubleSide }));
    beam.rotation.z = PI / 2; beam.position.x = 1.5; const piv = at(new T.Group(), 0, y + .29, 0); piv.add(beam); g.add(piv); g.userData.beam = piv;
    const mail = group(at(cyl(.04, .04, .6, '#a8754f', 6), 0, .3, 0), at(box(.36, .26, .5, '#ff5d5d'), 0, .7, 0), at(box(.04, .22, .04, '#ffd43b'), .2, .85, .1));
    const top = cyl(.18, .18, .5, '#ff5d5d'); top.rotation.x = PI / 2; mail.add(at(top, 0, .83, 0));
    g.add(at(mail, 1.1, 0, .5)); return g;
  }

  /* ---------- cielo y mar ---------- */
  function balloon() {
    const t = canvasTex(512, 256, (x, w, h) => {
      const cs = ['#ff4f9a', '#ff9a3c', '#ffd43b', '#ff9a3c'];
      for (let i = 0; i < 16; i++) { x.fillStyle = cs[i % 4]; x.fillRect(i * w / 16, 0, w / 16 + 1, h); }
      [w * .25, w * .75].forEach(cx => { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, h * .5, 46, 0, 7); x.fill();
        x.fillStyle = '#ff4f9a'; x.font = 'bold 64px Fredoka, Arial'; x.textAlign = 'center'; x.fillText('L', cx, h * .5 + 23); });
    });
    const env = mk(new T.SphereGeometry(1, 32, 20), new T.MeshStandardMaterial({ map: t, roughness: .55 })); env.scale.set(1, 1.12, 1);
    const g = group(at(env, 0, 1.6, 0), at(mk(new T.CylinderGeometry(.42, .2, .45, 24, 1, true), new T.MeshStandardMaterial({ map: t, roughness: .6, side: T.DoubleSide })), 0, .55, 0),
      at(box(.42, .32, .42, '#b07a4f'), 0, -.05, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const r = cyl(.012, .012, .5, '#7a5a40', 4); r.position.set(a * .19, .3, b * .19); r.rotation.set(b * -.25, 0, a * .25); g.add(r); });
    return g;
  }
  function cloud(s = 1) {
    const m = mat('#ffffff', { roughness: 1, emissive: '#dff4ff', emissiveIntensity: .35, fog: false });
    const g = new T.Group();
    [[0, 0, 0, .7], [.7, -.1, .1, .5], [-.7, -.12, 0, .5], [.3, .35, -.1, .5], [-.3, .25, .1, .45]].forEach(([x, y, z, r]) => {
      const b = new T.Mesh(new T.SphereGeometry(r, 18, 12), m); b.position.set(x, y, z); g.add(b);
    });
    g.scale.setScalar(s); return g;
  }
  function boat() {
    const hull = box(1, .28, .42, '#ffffff'); hull.geometry.translate(0, 0, 0);
    const sail = new T.Shape([new T.Vector2(0, 0), new T.Vector2(.55, 0), new T.Vector2(0, .85)]);
    const s = mk(new T.ShapeGeometry(sail), '#ff6fa5', { side: T.DoubleSide });
    return group(at(hull, 0, .1, 0), at(box(1.02, .07, .44, '#4dabf7'), 0, .2, 0), at(cyl(.025, .025, 1, '#a8754f', 6), 0, .7, 0), at(s, .03, .3, 0));
  }
  function penguin() {
    const g = group(at(sph(.22, '#2d2a40'), 0, .3, 0), at(sph(.16, '#ffffff'), 0, .28, .1), at(cone(.05, .12, '#ff9a3c', 8), 0, .42, .22));
    g.children[0].scale.set(1, 1.35, 1); g.children[1].scale.set(1, 1.3, .7); g.children[2].rotation.x = PI / 2; return g;
  }
  function router() {
    const g = group(at(box(.8, .16, .5, '#3a3550'), 0, .08, 0), at(cyl(.025, .025, .5, '#3a3550', 6), -.3, .38, -.2), at(cyl(.025, .025, .5, '#3a3550', 6), .3, .38, -.2));
    [-.24, -.08, .08, .24].forEach((x, i) => g.add(at(sph(.03, i % 2 ? '#69db7c' : '#22d3ee', { emissive: i % 2 ? '#69db7c' : '#22d3ee', emissiveIntensity: 1 }), x, .12, .26)));
    return g;
  }

  return { RNG, canvasTex, island, foam, spot, pine, roundTree, palm, bush, rock, flowers, desk, frame, school, trophy, rocket, ziggurat, lighthouse, balloon, cloud, boat, penguin, router, mat, box, cyl, sph };
})();
