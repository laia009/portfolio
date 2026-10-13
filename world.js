/* Mundo 3D estilo madbox: planeta-océano con una isla por sección */
const World = (() => {
  const T = THREE, PI = Math.PI, D2R = PI / 180, R = 75, LAT0 = 20;
  const clock = new T.Clock(), tick = [], isles = {}, markers = {};
  const st = { rot: 0, vel: 0, tilt: 0, target: null, zoom: 0, zoomTo: 0, focus: null, side: 0, intro: 1, started: false, drag: false };
  const base = { pos: new T.Vector3(), look: new T.Vector3() };
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer, scene, camera, planet, stage, canvas, W = 1, H = 1, cb = {}, hoverId = null, photoMesh = null;

  // Islas de las secciones. x / y = posición en el "mapa" (unidades, este / norte) alrededor del centro de la vista
  const SECTIONS = [
    { id: 'about',    x: 0,     y: 0,    r: 3.3, top: '#ffb3d1', seed: 3 },
    { id: 'projects', x: -12.5, y: -1.5, r: 2.7, top: '#9be7c4', seed: 8 },
    { id: 'contact',  x: 12.5,  y: -1.5, r: 2.7, top: '#8fd47f', seed: 5 },
    { id: 'resume',   x: -8.5,  y: 9.5,  r: 2.5, top: '#8fd47f', seed: 11 },
    { id: 'certs',    x: 3,     y: 12,   r: 2.4, top: '#c9b6ff', seed: 2 },
    { id: 'hhep',     x: 11,    y: 9.5,  r: 2.5, top: '#ffe08a', seed: 7 }
  ];
  // Islas decorativas: cerca de la vista inicial (x / y) y repartidas por todo el planeta (lat / lon)
  const DECOR = [
    { x: 6,    y: -5,   r: 1.3, seed: 21, kind: 'palm' },
    { x: -21,  y: 13,   r: 2.1, seed: 22, kind: 'ice', sand: '#dff3ff', top: '#ffffff' },
    { x: 22,   y: 13,   r: 2.0, seed: 23, kind: 'pine' },
    { x: 23,   y: -3,   r: 1.5, seed: 24, kind: 'palm' },
    { x: -23,  y: -2,   r: 1.6, seed: 25, kind: 'rocks' },
    { x: -5,   y: 19,   r: 1.5, seed: 34, kind: 'flowers', top: '#ffb3d1' },
    { x: 9,    y: 22,   r: 2.2, seed: 38, kind: 'orange', top: '#ffd0a8' },
    { x: -15,  y: 26,   r: 2.4, seed: 39, kind: 'pine' },
    { x: 24,   y: 28,   r: 2.6, seed: 40, kind: 'ice', sand: '#dff3ff', top: '#ffffff' },
    { x: 1,    y: 31,   r: 2.2, seed: 41, kind: 'flowers', top: '#c9b6ff' },
    { lat: 26, lon: 32,   r: 2.8, seed: 26, kind: 'orange', top: '#ffd0a8' },
    { lat: 14, lon: 55,   r: 2.4, seed: 27, kind: 'pine' },
    { lat: 32, lon: 80,   r: 2.6, seed: 28, kind: 'flowers', top: '#c9b6ff' },
    { lat: 18, lon: 108,  r: 2.2, seed: 29, kind: 'palm' },
    { lat: 36, lon: 135,  r: 2.4, seed: 30, kind: 'ice', sand: '#dff3ff', top: '#ffffff' },
    { lat: 20, lon: 160,  r: 1.9, seed: 31, kind: 'smx', top: '#ffb3d1' },
    { lat: 30, lon: -170, r: 2.2, seed: 32, kind: 'rocks' },
    { lat: 22, lon: -140, r: 2.4, seed: 33, kind: 'orange', top: '#ffe08a' },
    { lat: 14, lon: -112, r: 1.6, seed: 35, kind: 'palm' },
    { lat: 34, lon: -88,  r: 2.2, seed: 36, kind: 'pine' },
    { lat: 18, lon: -60,  r: 2.0, seed: 37, kind: 'orange', top: '#ffb3d1' },
    { lat: 30, lon: -34,  r: 2.0, seed: 42, kind: 'palm' }
  ];

  /* ---------- utilidades ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = a => ((a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function normalAt(lat, lon) {
    const a = lat * D2R, b = lon * D2R;
    return new T.Vector3(Math.sin(b) * Math.cos(a), Math.sin(a), Math.cos(b) * Math.cos(a));
  }
  // Convierte coordenadas de mapa (x, y) a latitud / longitud
  function geo(o) {
    if (o.x === undefined) return o;
    const lat = LAT0 + o.y / R / D2R;
    return { lat, lon: o.x / (R * Math.cos(lat * D2R)) / D2R };
  }
  // Cámara: por encima y "al sur" del centro del mapa
  const F0 = normalAt(LAT0, 0), NORTH = new T.Vector3(0, Math.cos(LAT0 * D2R), -Math.sin(LAT0 * D2R));
  const CAM0 = F0.clone().multiplyScalar(R + 17).addScaledVector(NORTH, -20);
  // Coloca un objeto sobre el planeta mirando hacia la cámara (o hacia "fwd")
  function orient(obj, n, lift = 0, fwd = null) {
    obj.position.copy(n).multiplyScalar(R + lift);
    const f = fwd ? fwd.clone() : CAM0.clone().sub(obj.position);
    f.sub(n.clone().multiplyScalar(f.dot(n))).normalize();
    const r = new T.Vector3().crossVectors(n, f).normalize();
    obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(r, n, f));
  }
  function put(g, o, x, y, z, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; }
  // Reparte objetos por la isla evitando las zonas ocupadas
  function scatter(isl, n, make, avoid = [], spread = .7) {
    for (let i = 0, tries = 0; i < n && tries < 60; tries++) {
      const [x, z] = P.spot(isl, spread);
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      put(isl, make(i), x, isl.userData.top, z, isl.userData.rng() * 6); i++;
    }
  }

  /* ---------- monumentos de cada sección (devuelven la altura del icono) ---------- */
  const BUILD = {
    about(g, u) {
      put(g, P.desk(), -1, u.top, .35, .25);
      const fr = put(g, P.frame(null), 1.25, u.top, -.45, -.3); photoMesh = fr.children[3]; fr.scale.setScalar(.82);
      const cs = ['#ff7eb6', '#ffd43b', '#ff9ec7', '#ffb26b', '#c9b6ff'];
      scatter(g, 6, i => P.roundTree(cs[i % 5], .8 + u.rng() * .35), [[-1, .35, 1.4], [1.25, -.45, 1]]);
      put(g, P.flowers(7, u.rng), .4, u.top, 1.3);
      return u.top + 3.1;
    },
    projects(g, u) {
      put(g, P.rocket(), 0, u.top, 0, .4);
      scatter(g, 3, () => P.palm(.9 + u.rng() * .3), [[0, 0, 1.7]]);
      scatter(g, 2, () => P.rock(.25), [[0, 0, 1.6]]);
      return u.top + 3.3;
    },
    contact(g, u) {
      put(g, P.lighthouse(), -.3, u.top, -.2, -.5);
      scatter(g, 3, () => P.palm(.85 + u.rng() * .3), [[-.3, -.2, 1.2], [.8, .3, .7]]);
      put(g, P.flowers(5, u.rng), .9, u.top, -1);
      return u.top + 3.7;
    },
    resume(g, u) {
      put(g, P.school(), 0, u.top, 0);
      scatter(g, 5, () => P.pine(.75 + u.rng() * .35), [[0, 0, 1.75], [-1.6, .6, .5]], .78);
      return u.top + 2.6;
    },
    certs(g, u) {
      put(g, P.trophy(), 0, u.top, 0);
      const cs = ['#c9b6ff', '#ffd43b', '#ff9ec7'];
      scatter(g, 4, i => P.roundTree(cs[i % 3], .75), [[0, 0, 1.6]], .8);
      return u.top + 2.5;
    },
    hhep(g, u) {
      put(g, P.ziggurat(), 0, u.top, 0, .3);
      const cs = ['#ffb26b', '#ffd43b', '#ff7eb6'];
      scatter(g, 4, i => P.roundTree(cs[i % 3], .75), [[0, 0, 1.65]], .8);
      return u.top + 3.1;
    }
  };
  const DECO = {
    palm: (g, u) => { scatter(g, 2, () => P.palm(.85 + u.rng() * .3), [], .45); put(g, P.rock(.2), .4, u.top, .3); },
    pine: (g, u) => { scatter(g, 7, () => P.pine(.7 + u.rng() * .4), [], .7); put(g, P.rock(.28), 0, u.top, 0); },
    rocks: (g, u) => { [[0, 0, .45], [.6, .3, .3], [-.5, .2, .28]].forEach(([x, z, s]) => put(g, P.rock(s), x, u.top, z)); put(g, P.bush(), .2, u.top, -.5); },
    orange: (g, u) => { const cs = ['#ffb26b', '#ffd43b', '#ff7eb6']; scatter(g, 7, i => P.roundTree(cs[i % 3], .7 + u.rng() * .4), [], .72); },
    flowers: (g, u) => { scatter(g, 4, i => P.roundTree(i % 2 ? '#ff9ec7' : '#b197fc', .8), [], .7); put(g, P.flowers(9, u.rng), 0, u.top, 0); },
    smx: (g, u) => { put(g, P.router(), 0, u.top, 0, .3); put(g, P.box(.5, .9, .5, '#3a3550'), -.7, u.top + .45, -.2); put(g, P.palm(.8), .7, u.top, -.3); },
    ice: (g, u) => {
      [[-.5, -.3, 1.1], [.4, -.5, .8], [0, .1, .6]].forEach(([x, z, s]) => {
        const peak = new T.Mesh(new T.ConeGeometry(.6 * s, 1.3 * s, 6), P.mat('#f2fbff', { flatShading: true }));
        peak.castShadow = peak.receiveShadow = true; put(g, peak, x, u.top + .65 * s, z);
      });
      [[.6, .6], [.9, .2], [.2, .8]].forEach(([x, z], i) => put(g, P.penguin(), x, u.top, z, i - .5));
    }
  };

  /* ---------- construcción de la escena ---------- */
  function build(progress) {
    scene = new T.Scene();
    scene.fog = new T.Fog('#c4f0ff', 42, 118);
    camera = new T.PerspectiveCamera(40, 1, .1, 400);
    scene.add(new T.HemisphereLight('#eaf8ff', '#ffd9a8', .58));
    const sun = new T.DirectionalLight('#fff6e8', .62), F = F0.clone().multiplyScalar(R);
    sun.position.copy(F).add(new T.Vector3(14, 30, 24)); sun.target.position.copy(F);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140 });
    sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;
    scene.add(sun, sun.target);

    planet = new T.Group(); scene.add(planet);
    const sea = new T.Mesh(new T.SphereGeometry(R, 240, 160), new T.MeshStandardMaterial({ color: '#22b4ef', roughness: .4, metalness: 0, emissive: '#0b84cc', emissiveIntensity: .24 }));
    sea.receiveShadow = true; planet.add(sea);
    progress(.25);

    const all = [];
    SECTIONS.forEach(s => {
      const g = P.island({ r: s.r, seed: s.seed, top: s.top });
      g.userData.sec = s.id;
      const anchorY = BUILD[s.id](g, g.userData);
      const anchor = new T.Object3D(); anchor.position.y = anchorY; g.add(anchor);
      const foam = P.foam(g.userData.pts, R); g.add(foam);
      const p = geo(s), n = normalAt(p.lat, p.lon); orient(g, n); planet.add(g);
      isles[s.id] = { group: g, anchor, foam, lon: p.lon, lat: p.lat };
      all.push({ n, r: s.r });
    });
    progress(.55);
    DECOR.forEach(d => {
      const g = P.island({ r: d.r, seed: d.seed, sand: d.sand, top: d.top });
      DECO[d.kind](g, g.userData);
      const foam = P.foam(g.userData.pts, R); g.add(foam);
      const p = geo(d), n = normalAt(p.lat, p.lon); orient(g, n); planet.add(g);
      tick.push((t) => { foam.material.opacity = .62 + .2 * Math.sin(t * 1.4 + d.seed); });
      all.push({ n, r: d.r });
    });
    progress(.75);

    // Olas: pequeños arcos blancos sobre el agua
    const wm = [0, 1, 2].map(() => new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7, depthWrite: false }));
    const wg = new T.TorusGeometry(.42, .05, 4, 14, PI * .55); wg.rotateX(PI / 2);
    const rnd = P.RNG(99), dummy = new T.Object3D(), WAVES = 1100;
    const inst = wm.map(m => { const im = new T.InstancedMesh(wg, m, WAVES); im.count = 0; im.frustumCulled = false; planet.add(im); return im; });
    for (let i = 0, k = 0; i < WAVES && k < 5000; k++) {
      const n = normalAt(6 + rnd() * 46, rnd() * 360);
      if (all.some(o => n.angleTo(o.n) * R < o.r * 1.5)) continue;
      orient(dummy, n, .05); dummy.rotateY(rnd() * 6.3); dummy.scale.setScalar(.7 + rnd() * .9); dummy.updateMatrix();
      const im = inst[i % 3]; im.setMatrixAt(im.count++, dummy.matrix); i++;
    }
    inst.forEach(im => { im.instanceMatrix.needsUpdate = true; });
    tick.push(t => wm.forEach((m, i) => { m.opacity = .45 + .4 * Math.sin(t * 1.3 + i * 2.1); }));

    // Globo aerostático, barco y nubes
    const bal = P.balloon(); bal.scale.setScalar(1.3); planet.add(bal);
    bal.traverse(m => { m.castShadow = false; });
    const pb = geo({ x: 6, y: 4.5 }), nb = normalAt(pb.lat, pb.lon);
    tick.push(t => { orient(bal, nb, 4.6 + Math.sin(t * .9) * .35); bal.rotateY(t * .15); });
    const boat = P.boat(); planet.add(boat);
    tick.push(t => { const lon = -180 + (t * 2.4) % 360, n = normalAt(13.6, lon), b = lon * D2R; orient(boat, n, .02, new T.Vector3(Math.cos(b), 0, -Math.sin(b))); boat.rotateY(PI / 2); boat.rotateX(Math.sin(t * 2) * .06); });
    for (let i = 0; i < 12; i++) {
      const c = P.cloud(1.3 + rnd()), lat = 47 + rnd() * 10, lon0 = rnd() * 360, sp = (rnd() - .5) * 1.4;
      planet.add(c); tick.push(t => orient(c, normalAt(lat, lon0 + t * sp), 9));
    }
    // Nubes del cielo (la intro baja a través de ellas)
    [[-28, 45, 46, 3], [22, 44, 44, 3.2], [4, 53, 38, 2.4], [40, 47, 42, 2.6], [-46, 46, 44, 2.8], [-10, 62, 32, 3], [15, 70, 28, 2.6]].forEach(([yaw, pitch, dist, s]) => {
      const a = yaw * D2R, b = pitch * D2R, c = P.cloud(s);
      const x = CAM0.x + Math.sin(a) * Math.cos(b) * dist;
      c.position.set(x, CAM0.y + Math.sin(b) * dist, CAM0.z - Math.cos(a) * Math.cos(b) * dist); scene.add(c);
      tick.push(t => { c.position.x = x + Math.sin(t * .1 + s) * 1.5; });
    });

    // Animaciones de los monumentos
    Object.entries(isles).forEach(([id, o], i) => {
      tick.push((t, dt) => {
        o.foam.material.opacity = .62 + .2 * Math.sin(t * 1.4 + i);
        const s = 1 + .012 * Math.sin(t * 1.1 + i); o.foam.scale.set(s, 1, s);
        const k = o.group.scale.x + ((hoverId === id ? 1.06 : 1) - o.group.scale.x) * Math.min(1, dt * 10);
        o.group.scale.setScalar(k);
      });
      o.group.traverse(m => {
        if (m.userData.flame) tick.push(t => { m.userData.flame.scale.set(1, .8 + Math.random() * .45, 1); });
        if (m.userData.beam) tick.push(t => { m.userData.beam.rotation.y = t * 1.2; });
        if (m.userData.flag) tick.push(t => { m.userData.flag.rotation.y = Math.sin(t * 3 + i) * .25; });
      });
    });

    // Foto real en el marco (solo funciona servido por http/https)
    if (/^https?:/.test(location.protocol)) {
      new T.TextureLoader().load('foto.jpg', tex => { photoMesh.material = new T.MeshBasicMaterial({ map: tex, toneMapped: false }); });
    }
    progress(1);
  }

  /* ---------- cámara ---------- */
  function basePose() {
    const a = W / H, vfov = a >= 1.25 ? 40 : Math.min(64, 40 * 1.25 / a);
    const pos = CAM0.clone();
    if (a < 1) pos.addScaledVector(CAM0.clone().sub(F0.clone().multiplyScalar(R)), (1 / a - 1) * .5); // móvil: más lejos
    const horizon = Math.asin(R / pos.length()) - Math.atan2(pos.y, pos.z);
    const sky = a >= 1 ? .14 : .24;                 // parte de cielo visible arriba
    const pitch = horizon - vfov * D2R * (.5 - sky);
    base.pos.copy(pos);
    base.look.set(0, pos.y + Math.sin(pitch) * 30, pos.z - Math.cos(pitch) * 30);
    camera.fov = vfov; camera.aspect = a; camera.updateProjectionMatrix();
  }
  const cp = new T.Vector3(), cl = new T.Vector3(), fp = new T.Vector3();
  function updateCamera() {
    cp.copy(base.pos); cl.copy(base.look);
    if (st.zoom > .001 && st.focus) {
      isles[st.focus].group.getWorldPosition(fp);
      const n = fp.clone().normalize(), f = base.pos.clone().sub(fp);
      f.sub(n.clone().multiplyScalar(f.dot(n))).normalize();
      const shift = new T.Vector3(st.side, 0, 0), z = ease(st.zoom);
      cp.lerp(fp.clone().addScaledVector(n, 9.5).addScaledVector(f, 11.5).add(shift), z);
      cl.lerp(fp.clone().addScaledVector(n, 1.3).add(shift), z);
    }
    if (st.intro > 0) {
      const e = ease(st.intro);
      cp.y += 14 * e; cp.z += 4 * e;
      cl.lerp(cp.clone().add(new T.Vector3(0, 1.4, -1).multiplyScalar(30)), e);
    }
    camera.position.copy(cp); camera.lookAt(cl);
  }

  /* ---------- iconos HTML sobre las islas ---------- */
  const v = new T.Vector3(), toCam = new T.Vector3();
  function updateMarkers() {
    for (const id in markers) {
      const el = markers[id];
      isles[id].anchor.getWorldPosition(v);
      toCam.copy(camera.position).sub(v).normalize();
      const facing = v.clone().normalize().dot(toCam);
      v.project(camera);
      const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
      el.style.zIndex = String(2000 - Math.round(v.z * 1000));
      el.classList.toggle('hide', facing < .08 || v.z > 1 || st.intro > .35 || (st.focus === id && st.zoom > .4));
    }
  }

  /* ---------- interacción: arrastrar, rueda, clic en islas ---------- */
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function pick(cx, cy) {
    const b = stage.getBoundingClientRect();
    ndc.set((cx - b.left) / W * 2 - 1, -(cy - b.top) / H * 2 + 1); ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(Object.values(isles).map(o => o.group), true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.sec) o = o.parent; if (o) return o.userData.sec; }
    return null;
  }
  function bindInput() {
    let px = 0, py = 0, moved = 0;
    canvas.addEventListener('pointerdown', e => {
      st.drag = true; moved = 0; px = e.clientX; py = e.clientY; st.target = null;
      canvas.setPointerCapture(e.pointerId); canvas.classList.add('drag'); cb.onInteract && cb.onInteract();
    });
    canvas.addEventListener('pointermove', e => {
      if (!st.drag) {
        if (e.pointerType === 'mouse') { hoverId = pick(e.clientX, e.clientY); canvas.style.cursor = hoverId ? 'pointer' : ''; }
        return;
      }
      const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      st.vel = dx * .0042; st.rot += st.vel; st.tilt = clamp(st.tilt + dy * .0016, -.16, .16);
    });
    const up = e => {
      if (!st.drag) return; st.drag = false; canvas.classList.remove('drag');
      if (moved < 6) { st.vel = 0; const id = pick(e.clientX, e.clientY); if (id && cb.onSelect) cb.onSelect(id); }
    };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => { hoverId = null; });
    canvas.addEventListener('wheel', e => { st.target = null; st.vel += clamp(e.deltaY + e.deltaX, -120, 120) * -.00035; cb.onInteract && cb.onInteract(); }, { passive: true });
    addEventListener('keydown', e => { if (e.target.closest && e.target.closest('input,textarea')) return; if (e.key === 'ArrowLeft') st.vel -= .02; if (e.key === 'ArrowRight') st.vel += .02; });
  }

  /* ---------- bucle principal ---------- */
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false); basePose();
  }
  function loop() {
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    if (!st.drag) {
      if (st.target !== null) { st.rot += wrap(st.target - st.rot) * Math.min(1, dt * 3.5); st.vel = 0; }
      else { st.rot += st.vel; st.vel *= Math.pow(.93, dt * 60); }
      st.tilt += -st.tilt * Math.min(1, dt * 2.5);
    }
    planet.rotation.set(st.tilt, st.rot, 0);
    st.zoom += (st.zoomTo - st.zoom) * Math.min(1, dt * 2.6);
    if (st.started && st.intro > 0) st.intro = Math.max(0, st.intro - dt / 3);
    if (!still) tick.forEach(f => f(t, dt));
    updateCamera(); updateMarkers();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  return {
    sections: SECTIONS.map(s => s.id),
    init(opts) {
      cb = opts; canvas = opts.canvas; stage = canvas.parentElement; Object.assign(markers, opts.markers);
      renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      build(opts.onProgress || (() => {}));
      if (still) st.intro = 0;
      resize(); addEventListener('resize', resize); bindInput();
      if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
      Object.keys(markers).forEach(id => {
        markers[id].addEventListener('mouseenter', () => { hoverId = id; });
        markers[id].addEventListener('mouseleave', () => { hoverId = null; });
      });
      updateCamera(); renderer.render(scene, camera); requestAnimationFrame(loop);
    },
    start() { st.started = true; },
    focus(id, side = 0) { if (!isles[id]) return; st.focus = id; st.side = side; st.target = -isles[id].lon * D2R; st.zoomTo = 1; st.intro = 0; },
    unfocus() { st.zoomTo = 0; st.target = null; },
    spin(d) { st.target = null; st.vel += d; }
  };
})();
