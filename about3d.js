/* About-tab Easter egg: a small 3D character of the author who hops in and dances.
   Loaded on demand (with three.js from a CDN) the first time the About tab opens.

   The character is a rigged GLB when one is configured, otherwise the built-in cartoon.
   - MODEL_DEFAULT: path of the model published with the site (empty = cartoon only).
   - ?model=models/local-test.glb in the URL tries another same-site file, for local testing.
   A GLB that carries animation clips plays them; one with only a skeleton is danced by code. */
const MODEL_DEFAULT = 'models/pondd.glb';
const asked = new URLSearchParams(location.search).get('model') || '';
const MODEL = /^[\w\-.]+(\/[\w\-.]+)*\.glb$/.test(asked) && !asked.includes('..') ? asked : MODEL_DEFAULT;
const LINES = ['Hi! Thanks for using Screenshot Studio 👋', 'Tap me to change the dance!', 'ขอบคุณที่แวะมาครับ 🙏', 'Nice screenshots you got there 😎', 'Like it? Try my apps on the App Store ♥', 'One more spin!'];

let api;
export async function show(host) {
  api ||= await build(host);
  api.enter();
}

/* ---------- dance: joint angles shared by the cartoon and by rigged models ---------- */
const sin = Math.sin, PI = Math.PI;
const REST = { hx: 0, hrz: 0, hry: 0, trx: 0, try: 0, trz: 0, dx: 0, dy: 0, dz: 0, aLx: 0, aLz: 0.22, eL: -0.15, aRx: 0, aRz: -0.22, eR: -0.15, lL: 0, kL: 0, lR: 0, kR: 0 };
const MOVES = [
  b => { const s = sin(b * PI), p = sin(b * 2 * PI); return { hx: s * 0.13, hrz: s * 0.09, trz: -s * 0.1, dz: s * 0.13, aLz: 0.45, aLx: -0.55 - p * 0.35, eL: -1.5, aRz: -0.45, aRx: -0.55 + p * 0.35, eR: -1.5, kL: Math.max(0, s) * 0.55, kR: Math.max(0, -s) * 0.55 }; },
  b => { const up = Math.floor(b / 2) % 2 ? 1 : -1, s = sin(b * PI); return { hrz: up * 0.13, hx: up * 0.1, try: -up * 0.35, trz: up * 0.08, dy: -up * 0.3, dx: -0.12, aLz: up > 0 ? 2.45 : 0.75, eL: up > 0 ? -0.1 : -1.9, aRz: up > 0 ? -0.75 : -2.45, eR: up > 0 ? -1.9 : -0.1, kL: 0.2 + s * 0.15, kR: 0.2 - s * 0.15 }; },
  b => { const s = sin(b * PI); return { hx: -s * 0.12, hrz: -s * 0.1, trz: s * 0.16, dz: s * 0.1, dx: -0.15, aLz: 2.65 + s * 0.3, eL: -0.25, aRz: -2.65 + s * 0.3, eR: -0.25, kL: Math.max(0, s) * 0.4, kR: Math.max(0, -s) * 0.4 }; },
  b => { const p = sin(b * 2 * PI); return { hry: -p * 0.3, try: p * 0.55, dy: -p * 0.2, aLz: 1.25, aLx: -0.2 + p * 0.3, eL: -1.6, aRz: -1.25, aRx: -0.2 - p * 0.3, eR: -1.6, kL: 0.35, kR: 0.35, lL: -0.18, lR: -0.18 }; },
];
const WAVE = t => ({ aRz: -2.7 + sin(t * 11) * 0.28, eR: -0.35, aLz: 0.3, dz: 0.12, trz: 0.05 });

async function build(host) {
  const T = await import('three');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  host.prepend(renderer.domElement);
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 2.15, 9.0); camera.lookAt(0, 1.85, 0);
  const hemi = new T.HemisphereLight(0xffffff, 0x3a3558, 1.25); scene.add(hemi);
  const key = new T.DirectionalLight(0xffffff, 1.7); key.position.set(2.5, 5, 4); scene.add(key);
  const rim = new T.DirectionalLight(0xff8fd0, 1.1); rim.position.set(-3, 3, -4); scene.add(rim);

  const root = new T.Group(); scene.add(root);
  let actor = null;
  if (MODEL) try { actor = await loadModel(T, MODEL, renderer, scene); hemi.intensity = 0.5; key.intensity = 1.5; } catch (err) { console.warn('3D model not used, showing the cartoon instead:', err); }
  actor ||= buildCartoon(T);
  root.add(actor.object);

  const tex = draw => { const c = document.createElement('canvas'); draw(c); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
  const shadow = new T.Mesh(new T.CircleGeometry(1, 32), new T.MeshBasicMaterial({
    transparent: true, depthWrite: false,
    map: tex(c => { c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }),
  }));
  shadow.rotation.x = -PI / 2; shadow.position.y = 0.01; scene.add(shadow);

  const cur = { ...REST };
  let move = 0, moveAt = 0, spin = 0, spinTo = 0, enterAt = -1, last = 0, raf = 0, t0 = performance.now();
  const bubble = host.querySelector('.bubble');
  const say = n => { if (bubble) bubble.textContent = LINES[n % LINES.length]; };

  function tick(now) {
    raf = 0;
    if (!host.offsetParent) return;                       // tab hidden: stop until show() is called again
    const t = (now - t0) / 1000, dt = Math.min(0.05, t - last); last = t;
    const b = t * 118 / 60, since = t - enterAt, coded = !actor.clips;
    if (!calm && coded && b - moveAt > 8) { move = (move + 1) % MOVES.length; moveAt = b; if (move === 3) spinTo += PI * 2; }
    spin += (spinTo - spin) * Math.min(1, dt * 5);
    const e = Math.min(1, since / 0.9), back = 1 + 2.7 * Math.pow(e - 1, 3) + 1.7 * Math.pow(e - 1, 2);   // easeOutBack
    const hop = calm || !coded ? 0 : Math.abs(sin(b * PI)) * 0.13;
    root.position.y = (back - 1) * 4.2 + hop;
    root.rotation.y = spin + (1 - e) * PI * 2;
    root.scale.y = calm || !coded ? 1 : 1 - 0.035 * Math.cos(b * 2 * PI);
    if (coded) {
      const target = { ...REST, ...(since < 2.2 ? WAVE(t) : calm ? { dz: sin(t) * 0.05 } : MOVES[move](b)) };
      const k = Math.min(1, dt * 11);
      for (const key in target) cur[key] += (target[key] - cur[key]) * k;
      actor.pose(cur);
    } else actor.update(calm ? 0 : dt);
    const sh = Math.max(0.2, 1 - root.position.y * 0.9); shadow.scale.setScalar(0.95 * sh); shadow.material.opacity = sh; shadow.position.x = coded ? cur.hx : 0;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  const size = () => { const w = host.clientWidth || 300, h = host.clientHeight || 260; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(host); size();
  let taps = 0;
  host.addEventListener('click', () => {
    spinTo += PI * 2; say(++taps);
    if (actor.clips) actor.next(); else { move = (move + 1) % MOVES.length; moveAt = (performance.now() - t0) / 1000 * 118 / 60; }
  });
  host.classList.add('ready');
  return {
    enter() { enterAt = (performance.now() - t0) / 1000; last = enterAt; say(0); if (!raf) raf = requestAnimationFrame(tick); },
  };
}

/* ---------- a rigged GLB ---------- */
async function loadModel(T, url, renderer, scene) {
  const [{ GLTFLoader }, { RoomEnvironment }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/environments/RoomEnvironment.js')]);
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene, object = new T.Group(), sway = new T.Group(), face = new T.Group();
  object.add(sway); sway.add(face); face.add(model);
  model.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  const measure = () => {                                  // bones must be evaluated before a skinned mesh can be measured
    object.updateMatrixWorld(true);                        // also refreshes each skinned mesh's bind inverse
    model.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); } });
    return new T.Box3().setFromObject(model);
  };
  measure();
  // turn it to face the camera: the toes point forward
  const named = re => { let hit = null; model.traverse(o => { if (!hit && o.isBone && re.test(o.name)) hit = o; }); return hit; };
  const foot = named(/foot/i), toe = named(/toe|ball/i);
  if (foot && toe) { const d = toe.getWorldPosition(new T.Vector3()).sub(foot.getWorldPosition(new T.Vector3())); if (Math.hypot(d.x, d.z) > 1e-4) face.rotation.y = -Math.atan2(d.x, d.z); }
  // stand it on the floor, centred, at the same height as the cartoon
  const box = measure(), dim = box.getSize(new T.Vector3()), mid = box.getCenter(new T.Vector3()), k = 3.4 / dim.y;
  model.scale.multiplyScalar(k); face.position.set(-mid.x * k, -box.min.y * k, -mid.z * k);
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  scene.environment = new T.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

  if (gltf.animations.length) {                            // the file brings its own dance
    const mixer = new T.AnimationMixer(model), actions = gltf.animations.map(c => mixer.clipAction(c));
    let i = Math.max(0, gltf.animations.findIndex(c => /danc/i.test(c.name)));
    actions[i].play();
    return { object, clips: true, update: dt => mixer.update(dt), next() { const from = actions[i]; i = (i + 1) % actions.length; if (actions[i] !== from) { actions[i].reset().play(); from.crossFadeTo(actions[i], 0.4, false); } } };
  }

  // no clips: drive the skeleton with the coded dance. Bones are matched by the usual naming schemes.
  object.updateWorldMatrix(true, true);
  const bones = []; model.traverse(o => { if (o.isBone) bones.push(o); });
  const depth = o => { let d = 0; while ((o = o.parent)) d++; return d; };
  const clean = n => n.toLowerCase().replace(/^.*[:|]/, '');
  const find = re => bones.filter(b => re.test(clean(b.name))).sort((a, b) => depth(a) - depth(b));
  const wpos = b => b.getWorldPosition(new T.Vector3());
  const pair = re => { const [a, b] = find(re); return a && b ? (wpos(a).x > wpos(b).x ? [a, b] : [b, a]) : []; };   // [+x side, -x side]
  const [armL, armR] = pair(/^(upperarm_[lr]|(left|right)(upper)?arm|upper_?arm[._]?[lr]|[lr]_upper_?arm)$/);
  const [foreL, foreR] = pair(/^(lowerarm_[lr]|(left|right)(forearm|lowerarm)|fore_?arm[._]?[lr]|[lr]_fore_?arm)$/);
  const [legL, legR] = pair(/^(thigh_[lr]|(left|right)(upleg|upperleg)|thigh[._]?[lr]|[lr]_thigh)$/);
  const [calfL, calfR] = pair(/^(calf_[lr]|(left|right)(leg|lowerleg)|(shin|calf)[._]?[lr]|[lr]_(calf|shin))$/);
  const hips = find(/^(pelvis|hips?)$/)[0], torso = find(/^spine(_?0?1)?$/)[0] || find(/spine|chest/)[0], head = find(/^head$/)[0];
  if (!armL || !foreL || !hips || !torso) throw new Error('skeleton not recognised');

  const E = (x, y, z) => new T.Quaternion().setFromEuler(new T.Euler(x, y, z));
  const hang = (a, f) => { const d = wpos(f).sub(wpos(a)); return Math.atan2(d.x, -d.y); };     // how far the arm is from hanging straight down
  const rig = (bone, restAngle = 0) => bone && { bone, R: bone.getWorldQuaternion(new T.Quaternion()), Ci: E(0, 0, restAngle).invert() };
  const aL = hang(armL, foreL), aR = hang(armR, foreR);
  const J = { hips: rig(hips), torso: rig(torso), head: rig(head), armL: rig(armL, aL), armR: rig(armR, aR), foreL: rig(foreL, aL), foreR: rig(foreR, aR), legL: rig(legL), legR: rig(legR), calfL: rig(calfL), calfR: rig(calfR) };
  const rootQ = new T.Quaternion(), pq = new T.Quaternion();
  const set = (j, D) => {                                  // D: where the joint should point, in the character's own space
    if (!j) return;
    j.bone.parent.updateWorldMatrix(true, false);
    j.bone.parent.getWorldQuaternion(pq).premultiply(rootQ);
    j.bone.quaternion.copy(pq.invert()).multiply(D).multiply(j.Ci).multiply(j.R);
  };
  return {
    object,
    pose(c) {
      sway.position.x = c.hx;
      rootQ.copy(object.getWorldQuaternion(new T.Quaternion()).invert());
      const Dh = E(0, c.hry, c.hrz), Dt = Dh.clone().multiply(E(c.trx, c.try, c.trz));
      set(J.hips, Dh); set(J.torso, Dt); set(J.head, Dt.clone().multiply(E(c.dx, c.dy, c.dz)));
      for (const [arm, fore, ax, az, el] of [[J.armL, J.foreL, c.aLx, c.aLz, c.eL], [J.armR, J.foreR, c.aRx, c.aRz, c.eR]]) {
        const Da = Dt.clone().multiply(E(ax, 0, az)); set(arm, Da); set(fore, Da.multiply(E(el, 0, 0)));
      }
      for (const [leg, calf, lx, kn] of [[J.legL, J.calfL, c.lL, c.kL], [J.legR, J.calfR, c.lR, c.kR]]) {
        const Dl = Dh.clone().multiply(E(lx - kn / 2, 0, -c.hrz)); set(leg, Dl); set(calf, Dl.multiply(E(kn, 0, 0)));
      }
    },
  };
}

/* ---------- the built-in cartoon ---------- */
function buildCartoon(T) {
  const tex = draw => { const c = document.createElement('canvas'); draw(c); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
  const stripes = tex(c => { // black shirt with thin white pinstripes
    c.width = 1024; c.height = 8; const x = c.getContext('2d');
    x.fillStyle = '#17171a'; x.fillRect(0, 0, 1024, 8); x.fillStyle = '#f2efe6';
    for (let i = 0; i < 32; i++) x.fillRect(i * 32 + 14, 0, 4, 8);
  });
  const std = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: 0.78, ...o });
  const skin = std(0xd29a6c), hair = std(0x18120f, { roughness: 0.95 }), pants = std(0x29292e), shoe = std(0x101012, { roughness: 0.5 });
  const shirt = std(0xffffff, { map: stripes }), dark = std(0x1a1210), frame = std(0x2a2a2e, { roughness: 0.35, metalness: 0.6 });
  const sleeveTex = stripes.clone(); sleeveTex.repeat.set(0.3, 1); sleeveTex.needsUpdate = true;
  const sleeve = std(0xffffff, { map: sleeveTex });

  const G = (p, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); p.add(g); return g; };
  const M = (p, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); p.add(m); return m; };
  const ball = new T.SphereGeometry(1, 32, 24), cap = (r, l) => new T.CapsuleGeometry(r, l, 8, 16);
  const object = new T.Group(), hips = G(object, 0, 1.33, 0);
  M(hips, ball, pants, 0, -0.05, 0, 0.58, 0.3, 0.5);
  const leg = s => {
    const hp = G(hips, s * 0.27, -0.02, 0); M(hp, cap(0.23, 0.4), pants, 0, -0.36, 0);
    const kn = G(hp, 0, -0.66, 0); M(kn, cap(0.2, 0.36), pants, 0, -0.3, 0);
    M(kn, ball, shoe, 0, -0.57, 0.1, 0.21, 0.13, 0.35); M(kn, new T.CylinderGeometry(0.2, 0.2, 0.05, 20), shoe, 0, -0.67, 0.1, 1, 1, 1.65);
    return { hp, kn };
  };
  const legL = leg(1), legR = leg(-1);
  const torso = G(hips, 0, 0.1, 0);
  // untucked T-shirt: a lathed profile from hem to neck, flattened front-to-back, with the belly pushed forward
  const prof = [[0, -0.3], [0.6, -0.3], [0.66, -0.12], [0.72, 0.12], [0.74, 0.34], [0.71, 0.6], [0.67, 0.82], [0.62, 0.98], [0.44, 1.09], [0.24, 1.15], [0, 1.15]];
  const shirtGeo = new T.LatheGeometry(prof.map(([r, y]) => new T.Vector2(r, y)), 48);
  {
    const p = shirtGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i); let z = p.getZ(i) * 0.8;
      if (z > 0) z *= 1 + 0.38 * Math.exp(-(((y - 0.18) / 0.36) ** 2));
      p.setZ(i, z);
    }
    shirtGeo.computeVertexNormals();
  }
  M(torso, shirtGeo, shirt);
  M(torso, new T.CylinderGeometry(0.2, 0.23, 0.26, 20), skin, 0, 1.2, 0);
  const collar = M(torso, new T.TorusGeometry(0.235, 0.028, 8, 28), std(0x17171a), 0, 1.135, 0.01, 1, 0.9, 1); collar.rotation.x = PI / 2;
  const arm = s => {
    const sh = G(torso, s * 0.62, 0.93, 0); M(sh, ball, sleeve, 0, 0, 0, 0.22); M(sh, cap(0.205, 0.24), sleeve, 0, -0.18, 0); M(sh, cap(0.145, 0.22), skin, 0, -0.44, 0);
    const el = G(sh, 0, -0.62, 0); M(el, cap(0.125, 0.32), skin, 0, -0.24, 0); M(el, ball, skin, 0, -0.52, 0, 0.15, 0.17, 0.13);
    return { sh, el };
  };
  const armL = arm(1), armR = arm(-1);

  const head = G(torso, 0, 1.2, 0), hy = 0.42; head.scale.setScalar(0.94);
  M(head, ball, skin, 0, hy, 0, 0.5, 0.52, 0.47);
  M(head, ball, skin, 0, hy - 0.2, 0.05, 0.47, 0.36, 0.43);                    // full cheeks and jaw
  // rectangular glasses frame: a rounded rectangle with a rounded hole
  const rr = (o, w, h, r) => { o.moveTo(-w / 2 + r, -h / 2); o.lineTo(w / 2 - r, -h / 2); o.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); o.lineTo(w / 2, h / 2 - r); o.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); o.lineTo(-w / 2 + r, h / 2); o.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); o.lineTo(-w / 2, -h / 2 + r); o.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return o; };
  const rim0 = rr(new T.Shape(), 0.3, 0.185, 0.05); rim0.holes.push(rr(new T.Path(), 0.262, 0.147, 0.035));
  const rimGeo = new T.ExtrudeGeometry(rim0, { depth: 0.02, bevelEnabled: false, curveSegments: 6 });
  const lensMat = new T.MeshStandardMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.14, roughness: 0.1 });
  for (const s of [1, -1]) {
    M(head, ball, skin, s * 0.5, hy - 0.02, -0.02, 0.07, 0.11, 0.08);           // ear
    M(head, ball, std(0xffffff, { roughness: 0.4 }), s * 0.17, hy + 0.045, 0.415, 0.062, 0.04, 0.03);   // eye white
    M(head, ball, dark, s * 0.17, hy + 0.045, 0.437, 0.03, 0.032, 0.02);        // pupil
    const g = G(head, s * 0.172, hy + 0.045, 0.468); g.rotation.y = s * 0.13;
    M(g, rimGeo, frame); M(g, new T.PlaneGeometry(0.262, 0.147), lensMat, 0, 0, 0.01);
    const temple = M(head, new T.BoxGeometry(0.018, 0.022, 0.5), frame, s * 0.42, hy + 0.09, 0.2); temple.rotation.y = s * 0.3;
    const brow = M(head, cap(0.022, 0.13), dark, s * 0.175, hy + 0.19, 0.44); brow.rotation.set(0, s * 0.2, PI / 2 - s * 0.12);
  }
  M(head, new T.BoxGeometry(0.06, 0.02, 0.02), frame, 0, hy + 0.075, 0.492);   // bridge
  M(head, ball, skin, 0, hy - 0.05, 0.46, 0.085, 0.065, 0.08);                 // broad nose
  const mouth = M(head, new T.TorusGeometry(0.08, 0.016, 6, 14, PI), std(0x5a2a22), 0, hy - 0.17, 0.455); mouth.rotation.z = PI;
  let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // beard: thin along the jaw from ear to ear, fuller and longer under the chin, made of small tufts
  for (let i = 0; i <= 26; i++) {
    const a = PI * (1 + i / 26), c = sin(a) ** 2, x = Math.cos(a) * 0.46, y = hy - 0.02 + sin(a) * 0.5;
    M(head, ball, hair, x, y, 0.1 + c * 0.24, 0.05 + c * 0.05 + rnd() * 0.015);
  }
  for (let i = 0; i < 26; i++) {
    const a = rnd() * 6.283, r = Math.sqrt(rnd());
    M(head, ball, hair, Math.cos(a) * r * 0.2, hy - 0.5 + sin(a) * r * 0.13 - 0.03, 0.3 + rnd() * 0.07, 0.07 + rnd() * 0.03);
  }
  // curly hair: a cloud of small spheres, taller on top and fuller at the sides, forehead left open
  for (let i = 0; i < 230; i++) {
    const y = 1 - 2 * (i + 0.5) / 230, r = Math.sqrt(1 - y * y), a = i * 2.39996, x = r * Math.cos(a), z = r * sin(a);
    if (y < -0.28 || (y < 0.12 && z > -0.3) || (z > 0.2 && y < 0.64)) continue;
    const top = Math.max(0, y) * 0.08, side = Math.abs(x) > 0.6 ? 0.05 : 0;
    M(head, ball, hair, x * (0.5 + side), hy + y * (0.52 + top), z * 0.47, 0.105 + rnd() * 0.06);
  }
  return {
    object,
    pose(c) {
      hips.position.x = c.hx; hips.rotation.set(0, c.hry, c.hrz);
      torso.rotation.set(c.trx, c.try, c.trz); head.rotation.set(c.dx, c.dy, c.dz);
      armL.sh.rotation.set(c.aLx, 0, c.aLz); armL.el.rotation.x = c.eL;
      armR.sh.rotation.set(c.aRx, 0, c.aRz); armR.el.rotation.x = c.eR;
      legL.hp.rotation.set(c.lL - c.kL / 2, 0, -c.hrz); legL.kn.rotation.x = c.kL;
      legR.hp.rotation.set(c.lR - c.kR / 2, 0, -c.hrz); legR.kn.rotation.x = c.kR;
    },
  };
}
