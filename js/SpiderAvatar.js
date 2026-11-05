// SpiderAvatar.js — блочный человечек для Spider Arm Master: скины из GameData (item.look), голова с лицом, шапки, узоры
// одежды, ноги болтаются по инерции (маятник), когда героя несут руки-щупальца. Части — меши с цветами в вершинах
// (общий белый материал сцены), как в ObbyAvatar; корень — точка ног, нос вдоль +X, конечности качаются вокруг Z.
//
//   const av = SpiderAvatar.create(view, look);          // { root, body, head, torso, legL, legR, armL, armR, setLook, dispose }
//   Шапки (look.hat + hatColor, hatColor2 ≥ 0 — вторая деталь): cap beanie crown helmet headband tophat horns halo visor + propeller chef bunny antenna
//   av.root.position.set(x, yFeet, z); av.root.rotation.y = −yaw;
//   SpiderAvatar.pose(av, dt, { mode, ax, az, speed, punch, cheer, tumble });   // ax/az — ускорение в осях героя (вперёд/вправо)

/** @satisfies {Record<string, any>} */
const SpiderAvatar = {
    HEIGHT: 176,
    /** @type {WeakMap<any, any>} */ _mats: new WeakMap(),

    material(scene) {
        let m = this._mats.get(scene);
        if (m) return m;
        m = new BABYLON.StandardMaterial('spider-avatar', scene);
        m.diffuseColor = new BABYLON.Color3(1, 1, 1);
        m.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
        this._mats.set(scene, m);
        return m;
    },

    _c4(hex) { const c = BABYLON.Color3.FromHexString('#' + (Number(hex) >>> 0 & 0xffffff).toString(16).padStart(6, '0')); return new BABYLON.Color4(c.r, c.g, c.b, 1); },

    // Брус w × h × d с центром (cx, cy, cz), поворот rz вокруг Z (рад) и rx вокруг X.
    _box(scene, w, h, d, hex, cx, cy, cz, rz, rx, ry) {
        const col = this._c4(hex);
        const m = BABYLON.MeshBuilder.CreateBox('sa', { width: w, height: h, depth: d, faceColors: [col, col, col, col, col, col] }, scene);
        m.position.set(cx, cy, cz);
        if (rz) m.rotation.z = rz;
        if (rx) m.rotation.x = rx;
        if (ry) m.rotation.y = ry;
        return m;
    },

    _merge(list, name, scene) {
        const m = BABYLON.Mesh.MergeMeshes(list, true, true);
        if (!m) return new BABYLON.Mesh(name, scene);
        m.name = name;
        m.material = this.material(scene);
        m.isPickable = false;
        return m;
    },

    /** Голова: куб 44 + лицо + волосы + шапка (центр головы — 0,0,0; лицо смотрит в +X). */
    _head(scene, L) {
        const B = (w, h, d, c, x, y, z, rz, rx, ry) => this._box(scene, w, h, d, c, x, y, z, rz, rx, ry);
        const s = 44, f = s / 2 + 0.6;
        const parts = [B(s, s, s, L.skin, 0, 0, 0)];
        const dark = 0x1b1b24, white = 0xffffff;
        switch (L.face) {
            case 'grin':   // широкая улыбка с зубами — фирменное лицо новичка
                parts.push(B(2, 9, 7, dark, f, 6, -9), B(2, 9, 7, dark, f, 6, 9), B(2, 2, 3, white, f + 0.4, 8, -8), B(2, 2, 3, white, f + 0.4, 8, 10));
                parts.push(B(2, 5, 22, 0x5a1f2a, f, -8, 0), B(2, 3, 6, white, f + 0.5, -6.5, -3), B(2, 3, 6, white, f + 0.5, -6.5, 3));
                parts.push(B(2, 3, 4, 0x5a1f2a, f, -5, -12), B(2, 3, 4, 0x5a1f2a, f, -5, 12));
                break;
            case 'cool':
                parts.push(B(3, 8, 34, 0x111118, f + 0.5, 6, 0), B(3, 5, 10, 0x2a3550, f + 1, 6, -9), B(3, 5, 10, 0x2a3550, f + 1, 6, 9), B(2, 3, 14, 0x6b2f2f, f, -9, 3, 0.18));
                break;
            case 'angry':
                parts.push(B(2, 6, 7, dark, f, 4, -9), B(2, 6, 7, dark, f, 4, 9), B(2, 3, 10, dark, f, 11, -9, 0, 0.35), B(2, 3, 10, dark, f, 11, 9, 0, -0.35), B(2, 3, 14, 0x5a1f2a, f, -10, 0));
                break;
            case 'cute':
                parts.push(B(2, 11, 9, dark, f, 4, -9), B(2, 11, 9, dark, f, 4, 9), B(2, 4, 4, white, f + 0.5, 7, -8), B(2, 4, 4, white, f + 0.5, 7, 10));
                parts.push(B(2, 4, 7, 0xff8fb0, f, -4, -15), B(2, 4, 7, 0xff8fb0, f, -4, 15), B(2, 3, 8, 0x5a1f2a, f, -10, 0));
                break;
            case 'robot':
                parts.push(B(3, 12, 36, 0x0b1020, f + 0.5, 4, 0), B(3, 4, 8, L.accent != null ? L.accent : 0x38e1ff, f + 1, 4, -8), B(3, 4, 8, L.accent != null ? L.accent : 0x38e1ff, f + 1, 4, 8), B(2, 3, 20, 0x3a4458, f, -10, 0));
                break;
            case 'skull':
                parts.push(B(2, 10, 9, dark, f, 4, -9), B(2, 10, 9, dark, f, 4, 9), B(2, 4, 4, dark, f, -4, 0), B(2, 4, 18, dark, f, -11, 0));
                break;
            default:       // smile
                parts.push(B(2, 8, 6, dark, f, 5, -9), B(2, 8, 6, dark, f, 5, 9), B(2, 3, 14, 0x5a1f2a, f, -9, 0), B(2, 3, 3, 0x5a1f2a, f, -7, -8), B(2, 3, 3, 0x5a1f2a, f, -7, 8));
        }
        if (L.glasses && L.face !== 'cool') parts.push(B(3, 8, 12, 0x111118, f + 0.6, 5, -9), B(3, 8, 12, 0x111118, f + 0.6, 5, 9), B(3, 2, 8, 0x111118, f + 0.6, 7, 0));
        const hc = L.hairColor;
        if (L.hair === 'short') parts.push(B(48, 10, 48, hc, -1, 22, 0), B(8, 24, 48, hc, -21, 8, 0), B(10, 8, 48, hc, 17, 18, 0));
        else if (L.hair === 'spiky') for (const z of [-15, 0, 15]) parts.push(B(12, 18, 12, hc, 0, 28, z), B(12, 12, 12, hc, -15, 24, z), B(10, 10, 10, hc, 14, 25, z));
        else if (L.hair === 'long') parts.push(B(48, 9, 48, hc, 0, 22, 0), B(8, 44, 48, hc, -21, -2, 0), B(40, 26, 6, hc, -4, -6, -24), B(40, 26, 6, hc, -4, -6, 24));
        else if (L.hair === 'mohawk') parts.push(B(36, 16, 10, hc, -2, 29, 0), B(20, 10, 10, hc, 12, 32, 0));
        else if (L.hair === 'bun') parts.push(B(48, 9, 48, hc, 0, 22, 0), B(16, 16, 16, hc, -10, 32, 0));
        const t = L.hatColor;
        const t2 = L.hatColor2 != null && L.hatColor2 >= 0 ? L.hatColor2 : null;   // вторая деталь шапки (помпон, лента, внутренность уха…)
        switch (L.hat) {
            case 'cap': parts.push(B(50, 11, 50, t, 0, 25, 0), B(22, 4, 38, t2 != null ? t2 : t, 26, 21, 0)); break;
            case 'beanie': parts.push(B(50, 18, 50, t, 0, 26, 0), B(12, 8, 12, t2 != null ? t2 : 0xffffff, 0, 38, 0)); break;
            case 'crown': for (const [x, z] of [[-18, -18], [-18, 18], [18, -18], [18, 18], [0, -20], [0, 20], [-20, 0], [20, 0]]) parts.push(B(8, 14, 8, t, x, 30, z)); parts.push(B(48, 8, 48, t, 0, 25, 0), B(6, 6, 6, t2 != null ? t2 : 0xff3b5c, 24, 26, 0)); break;
            case 'helmet': parts.push(B(52, 16, 52, t, -2, 22, 0), B(10, 34, 52, t, -24, 4, 0), B(4, 4, 46, t2 != null ? t2 : 0x2a2f45, 25, 13, 0)); break;
            case 'headband': parts.push(B(46, 7, 46, t, 0, 12, 0), B(4, 12, 6, t, -24, 6, 6, 0.4)); break;
            case 'tophat': parts.push(B(56, 4, 56, t, 0, 23, 0), B(36, 30, 36, t, 0, 40, 0), B(37, 6, 37, t2 != null ? t2 : (L.accent != null ? L.accent : 0xc62828), 0, 30, 0)); break;
            case 'horns': parts.push(B(8, 16, 8, t, 4, 28, -14, 0, -0.3), B(8, 16, 8, t, 4, 28, 14, 0, 0.3), B(6, 8, 6, t, 6, 37, -17, 0, -0.5), B(6, 8, 6, t, 6, 37, 17, 0, 0.5)); break;
            case 'halo': parts.push(B(36, 3, 4, t, 0, 38, -16), B(36, 3, 4, t, 0, 38, 16), B(4, 3, 28, t, -16, 38, 0), B(4, 3, 28, t, 16, 38, 0)); break;
            case 'visor': parts.push(B(48, 6, 48, t2 != null ? t2 : 0x4a5568, 0, 23, 0), B(4, 10, 40, t, 23, 5, 0)); break;
            case 'propeller': {   // кепка с пропеллером: помпон-кнопка, ножка и две скрещённые лопасти
                const b = t2 != null ? t2 : 0xffeb3b;
                parts.push(B(50, 12, 50, t, 0, 25, 0), B(22, 4, 38, t, 26, 21, 0), B(8, 4, 8, b, 0, 33, 0), B(3, 9, 3, 0x424242, 0, 38, 0), B(44, 2, 9, b, 0, 43, 0, 0, 0, 0.6), B(44, 2, 9, b, 0, 43.5, 0, 0, 0, -0.6));
                break;
            }
            case 'chef': parts.push(B(48, 8, 48, t2 != null ? t2 : 0xd9d9d9, 0, 23, 0), B(56, 20, 56, t, 0, 37, 0), B(44, 14, 44, t, 0, 52, 0), B(26, 8, 26, t, 0, 62, 0)); break;
            case 'bunny': {   // заячьи уши на ободке; внутри уха — вторая деталь
                const p = t2 != null ? t2 : 0xffa6c9;
                parts.push(B(46, 6, 46, t, 0, 22, 0), B(10, 42, 13, t, -3, 45, -13, 0, -0.14), B(10, 42, 13, t, -3, 45, 13, 0, 0.14), B(3, 30, 8, p, 1.5, 44, -13.6, 0, -0.14), B(3, 30, 8, p, 1.5, 44, 13.6, 0, 0.14));
                break;
            }
            case 'antenna': {   // две антенны-шарика на ободке
                const ball = t2 != null ? t2 : 0xff5252;
                parts.push(B(46, 6, 46, t, 0, 21.5, 0), B(3, 26, 3, t, 0, 35, -14, 0, -0.22), B(3, 26, 3, t, 0, 35, 14, 0, 0.22), B(10, 10, 10, ball, 0, 50, -17.5), B(10, 10, 10, ball, 0, 50, 17.5));
                break;
            }
        }
        return this._merge(parts, 'sa-head', scene);
    },

    /** Торс 32 × 66 × 60 с узором на груди (центр торса — 0,0,0; грудь в +X). */
    _torso(scene, L) {
        const B = (w, h, d, c, x, y, z, rz, rx) => this._box(scene, w, h, d, c, x, y, z, rz, rx);
        const a = L.accent != null ? L.accent : 0xffffff, f = 16.6;
        const parts = [B(32, 66, 60, L.shirt, 0, 0, 0)];
        switch (L.pattern) {
            case 'star':   // звезда-эмблема новичка
                parts.push(B(2, 24, 6, a, f, 6, 0), B(2, 6, 24, a, f, 6, 0), B(2, 18, 5, a, f, 6, 0, 0, 0.78), B(2, 18, 5, a, f, 6, 0, 0, -0.78), B(2.4, 7, 7, 0xffd84a, f + 0.3, 6, 0));
                break;
            case 'stripe': for (const y of [-14, 0, 14]) parts.push(B(2, 6, 61, a, f, y, 0)); break;
            case 'suit': parts.push(B(2, 40, 10, 0xffffff, f, 12, 0), B(2.5, 34, 5, a, f + 0.4, 8, 0), B(2, 30, 8, 0x111118, f + 0.2, 16, -12, 0, 0.35), B(2, 30, 8, 0x111118, f + 0.2, 16, 12, 0, -0.35)); break;
            case 'hoodie': parts.push(B(2, 14, 30, 0x000000 + (L.shirt & 0xfefefe) / 2, f, -18, 0), B(2, 18, 2, a, f, 18, -6), B(2, 18, 2, a, f, 18, 6), B(10, 18, 44, L.shirt, -19, 22, 0)); break;
            case 'armor': parts.push(B(4, 30, 50, a, f, 12, 0), B(3, 8, 62, 0x3a2a1a, f, -24, 0), B(3, 6, 8, 0xffd24a, f + 1, -24, 0)); break;
            case 'zip': parts.push(B(2, 64, 3, a, f, 0, 0), B(2, 6, 18, a, f, 28, -14), B(2, 6, 18, a, f, 28, 14)); break;
        }
        return this._merge(parts, 'sa-torso', scene);
    },

    /** Построить аватар. look — схема item.look (GameData). height — рост px. */
    create(view, look, height) {
        const scene = view.scene;
        const root = new BABYLON.Mesh('sa-root', scene);
        const body = new BABYLON.TransformNode('sa-body', scene);
        body.parent = root;
        const av = {
            root, body, view, look: null, head: null, torso: null, meshes: [],
            legL: null, legR: null, armL: null, armR: null,
            // маятники ног (рад) и их скорости — инерция болтающихся ног
            sw: { lz: 0, lx: 0, rz: 0, rx: 0, vlz: 0, vlx: 0, vrz: 0, vrx: 0 }, t: Math.random() * 10,
            setLook: (lk) => this._build(av, lk, height),
            dispose: () => { this._clear(av); try { World3D.removeObject(view, root); } catch (e) { /* снят */ } root.dispose(); },
        };
        this._build(av, look, height);
        World3D.addObject(view, root, 'actor');
        return av;
    },

    _clear(av) {
        for (const m of av.meshes) m.dispose();
        for (const n of [av.legL, av.legR, av.armL, av.armR]) if (n) n.dispose();
        av.meshes = [];
    },

    _build(av, look, height) {
        const scene = av.view.scene;
        const L = Object.assign({ skin: 0xf6b04a, shirt: 0x2ec4b6, pants: 0x6a4bc4, shoes: 0x3a2f5c, hair: 'none', hairColor: 0, face: 'grin', hat: 'none', hatColor: 0, pattern: 'plain', accent: 0xffffff, glasses: false, hatColor2: -1 }, look || {});
        this._clear(av);
        av.look = L;
        av.body.scaling.setAll((height || this.HEIGHT) / this.HEIGHT);
        const head = this._head(scene, L);
        head.parent = av.body; head.position.set(0, 66 + 66 + 24, 0);
        const torso = this._torso(scene, L);
        torso.parent = av.body; torso.position.set(0, 66 + 33, 0);
        const limb = (name, w, h, d, px, py, pz, parts) => {
            const pivot = new BABYLON.TransformNode(name, scene);
            pivot.parent = av.body; pivot.position.set(px, py, pz);
            const m = this._merge(parts, name + '-m', scene);
            m.parent = pivot;
            return { pivot, mesh: m };
        };
        const B = (w, h, d, c, x, y, z) => this._box(scene, w, h, d, c, x, y, z);
        const leg = (name, z) => limb(name, 26, 66, 26, 0, 66, z, [B(26, 54, 26, L.pants, 0, -27, 0), B(30, 13, 28, L.shoes, 2, -60, 0)]);
        const legL = leg('sa-legL', -15), legR = leg('sa-legR', 15);
        const arm = (name, z) => limb(name, 20, 62, 20, 0, 66 + 62, z, [B(21, 44, 21, L.shirt, 0, -22, 0), B(20, 18, 20, L.skin, 0, -53, 0)]);
        const armL = arm('sa-armL', -41), armR = arm('sa-armR', 41);
        av.head = head; av.torso = torso;
        av.legL = legL.pivot; av.legR = legR.pivot; av.armL = armL.pivot; av.armR = armR.pivot;
        av.meshes = [head, torso, legL.mesh, legR.mesh, armL.mesh, armR.mesh];
        for (const m of av.meshes) { m.isPickable = false; World3D.addObject(av.view, m, 'actor'); }
    },

    /**
     * Поза. s = { mode: 'walk'|'climb'|'air'|'mantle'|'train'|'cheer'|'idle', ax, az (ускорение вперёд/вправо, px/с²), speed, punch (0..1), tumble }.
     * Ноги — затухающие маятники: отстают при разгоне, болтаются в воздухе. Чистая анимация вида.
     */
    pose(av, dt, s) {
        const d = Math.min(0.05, dt || 0);
        av.t += d;
        const w = av.sw, t = av.t;
        const mode = s.mode || 'idle';
        // цель маятника ног: против ускорения + лёгкое «перебирание» при ходьбе на руках
        const k = 0.00035;
        let tz = -Math.max(-1.1, Math.min(1.1, (s.ax || 0) * k));
        let tx = Math.max(-0.7, Math.min(0.7, (s.az || 0) * k * 0.8));
        const walkSwing = mode === 'walk' ? Math.min(1, (s.speed || 0) / 400) * 0.32 : 0;
        let kick = Math.sin(t * 6.5) * walkSwing;
        if (mode === 'air') { kick = Math.sin(t * 13) * 0.55; tz += 0.25; }
        if (mode === 'climb') { kick = Math.sin(t * 4.2) * 0.18; tz += 0.18; }
        const spring = (cur, vel, target) => {
            const acc = (target - cur) * 70 - vel * 7;
            vel += acc * d;
            return [cur + vel * d, vel];
        };
        [w.lz, w.vlz] = spring(w.lz, w.vlz, tz + kick);
        [w.rz, w.vrz] = spring(w.rz, w.vrz, tz - kick);
        [w.lx, w.vlx] = spring(w.lx, w.vlx, tx - 0.06);
        [w.rx, w.vrx] = spring(w.rx, w.vrx, tx + 0.06);
        av.legL.rotation.z = w.lz; av.legR.rotation.z = w.rz;
        av.legL.rotation.x = w.lx; av.legR.rotation.x = w.rx;
        // руки человечка
        let la = 0.12 + Math.sin(t * 1.7) * 0.05, ra = la, lx = -0.12, rx = 0.12, bob = Math.sin(t * 2.4) * 1.5, tilt = 0;
        if (mode === 'walk') { la = 0.25 + Math.sin(t * 6.5) * 0.25 * Math.min(1, (s.speed || 0) / 400); ra = 0.25 - Math.sin(t * 6.5) * 0.25 * Math.min(1, (s.speed || 0) / 400); tilt = -Math.min(0.18, (s.speed || 0) / 3000); }
        else if (mode === 'climb' || mode === 'mantle') { la = 2.55 + Math.sin(t * 5) * 0.2; ra = 2.55 - Math.sin(t * 5) * 0.2; tilt = 0.12; }
        else if (mode === 'air') { la = 2.2 + Math.sin(t * 15) * 0.5; ra = 2.2 - Math.sin(t * 15) * 0.5; lx = -0.6; rx = 0.6; }
        else if (mode === 'train') { la = 0.9 + (s.punch || 0) * 0.6; ra = 0.9 + (1 - (s.punch || 0)) * 0.6; lx = -0.2; rx = 0.2; bob = Math.sin(t * 9) * 2; }
        else if (mode === 'cheer') { la = 2.8 + Math.sin(t * 11) * 0.3; ra = 2.8 - Math.sin(t * 11) * 0.3; bob = Math.abs(Math.sin(t * 6)) * 14; }
        av.armL.rotation.z = la; av.armR.rotation.z = ra; av.armL.rotation.x = lx; av.armR.rotation.x = rx;
        av.body.position.y = bob;
        av.body.rotation.z = tilt + (s.tumble || 0);
    },
};
