// SpiderArms.js — вид рук-щупалец: звенья (шайбы, бусины, кубики, кольца, шипы, позвонки) по цепочке точек SpiderBody,
// трос-сердцевина, суставы, кисть (клешня, ладонь, крюк, бур, звезда, лапа, лезвия) и ядро-рюкзак на спине.
// Всё — thin instances: на одного героя ~7 draw calls при любом числе рук. Рамка звеньев переносится вдоль руки
// (rotation-minimizing frame), поэтому звенья не «крутятся» при движении. Стиль — item.arm из GameData.
//
//   const view = new SpiderArmsView(app.location.view, style, { scale: 1 });
//   view.update(body, dt);   // каждый кадр после body.step
//   view.setStyle(style); view.setVisible(on); view.dispose();
//   view.setCore({ color, glow, pulse, ring, halo, shape, spin } | null);   // ядро-рюкзак из предмета «Ядра»; null — штатное из стиля руки (style.core)

const SPIDER_CLAWS = {
    pincer: { n: 3, segs: [22, 17], w: 7, d: 7, open: 0.8, close: 0.02, bend: 0.85, palm: 13 },
    hand: { n: 4, segs: [17, 14], w: 6, d: 6, open: 0.6, close: 0.1, bend: 0.9, palm: 14 },
    hook: { n: 1, segs: [22, 19, 15], w: 9, d: 7, open: 0.35, close: 0.12, bend: 0.85, palm: 12 },
    star: { n: 5, segs: [19], w: 8, d: 6, open: 1.35, close: 1.05, bend: 0, palm: 13 },
    paw: { n: 3, segs: [13], w: 10, d: 9, open: 0.65, close: 0.3, bend: 0, palm: 17 },
    blade: { n: 2, segs: [38], w: 3, d: 13, open: 0.5, close: 0.1, bend: 0, palm: 12 },
    drill: { n: 0, segs: [], w: 0, d: 0, open: 0, close: 0, bend: 0, palm: 13, drill: true },
};

class SpiderArmsView {
    /** @param {any} view View3D @param {any} style item.arm @param {{ scale?: number, maxArms?: number }} [opts] */
    constructor(view, style, opts) {
        const o = opts || {};
        this.view = view;
        this.scene = view.scene;
        this.scale = o.scale || 1;
        this.maxArms = o.maxArms || 8;
        this.visible = true;
        /** @type {any[]} */ this.meshes = [];
        /** @type {any[]} */ this.mats = [];
        this.spin = 0;
        this.tips = [];        // позиции кончиков (для частиц)
        /** @type {any[]} */ this.coreMeshes = [];   // меши ядра-рюкзака (пластина, обод, шар, ореол, кольцо) и их материалы: ядро меняется отдельно от руки
        /** @type {any[]} */ this.coreMats = [];
        /** @type {any} */ this.coreOv = null;       // стиль ядра из предмета «Ядра» (null — штатное)
        this._corePulse = 5; this._coreGlow = 1; this._coreSpin = 0;
        /** @type {number[] | null} */ this._camPos = null;   // камера рядом с героем: детали ближе _near1 сжимаются (см. _put)
        this._near0 = 70 * this.scale; this._near1 = 150 * this.scale;
        this.setStyle(style);
    }

    _mat(name, hex, emissive, list) {
        const m = new BABYLON.StandardMaterial('arm-' + name, this.scene);
        const c = BABYLON.Color3.FromHexString('#' + (hex >>> 0 & 0xffffff).toString(16).padStart(6, '0'));
        m.diffuseColor = c;
        m.specularColor = new BABYLON.Color3(0.35, 0.35, 0.35);
        m.specularPower = 40;
        m.metadata = Object.assign({}, m.metadata, { gsShine: [0.35, 0.35, 0.35, 40] });   // блеск металла: World3D.addObject иначе обнулит его
        if (emissive != null && emissive >= 0) m.emissiveColor = BABYLON.Color3.FromHexString('#' + (emissive >>> 0 & 0xffffff).toString(16).padStart(6, '0')).scale(0.55);
        (list || this.mats).push(m);
        return m;
    }

    // Меш-шаблон для thin instances: начало координат у основания (Y от 0 до 1) или по центру.
    _thin(mesh, mat, cap, colors) {
        mesh.material = mat;
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = true;
        const buf = new Float32Array(cap * 16);
        mesh.thinInstanceSetBuffer('matrix', buf, 16, false);
        let cbuf = null;
        if (colors) { cbuf = new Float32Array(cap * 4).fill(1); mesh.thinInstanceSetBuffer('color', cbuf, 4, false); }
        mesh.thinInstanceCount = 0;
        World3D.addObject(this.view, mesh, 'actor');
        this.meshes.push(mesh);
        return { mesh, buf, cbuf, n: 0, cap };
    }

    clear() {
        for (const m of this.meshes) { try { World3D.removeObject(this.view, m); } catch (e) { /* снят */ } m.dispose(); }
        for (const m of this.mats) m.dispose();
        this._disposeCore();
        this.meshes = []; this.mats = [];
    }

    _disposeCore() {
        for (const m of this.coreMeshes) { try { World3D.removeObject(this.view, m); } catch (e) { /* снят */ } m.dispose(); }
        for (const m of this.coreMats) m.dispose();
        if (this.coreNode) this.coreNode.dispose();
        this.coreMeshes = []; this.coreMats = []; this.coreNode = null; this.orb = null; this.coreRing = null; this.coreHalo = null;
    }

    setStyle(style) {
        this.clear();
        const S = Object.assign({ seg: 'disc', colors: [0x8a5a3c, 0xc9a24a], joint: 0x3a3f4b, claw: 'pincer', clawColor: 0x2d2f36, core: 0xffc93c, glow: -1, thick: 1, fx: 'none' }, style || {});
        this.style = S;
        this.claw = SPIDER_CLAWS[S.claw] || SPIDER_CLAWS.pincer;
        const sc = this.scene, A = this.maxArms;
        this.rad = 14 * (S.thick || 1) * this.scale;
        this.spacing = (S.seg === 'ball' ? 15 : S.seg === 'cube' ? 16 : S.seg === 'ring' ? 12 : S.seg === 'spike' ? 17 : S.seg === 'bone' ? 15 : 12) * (S.thick || 1) * this.scale;
        // звено
        let seg;
        if (S.seg === 'ball') seg = BABYLON.MeshBuilder.CreateSphere('arm-seg', { diameter: 1, segments: 8 }, sc);
        else if (S.seg === 'cube') seg = BABYLON.MeshBuilder.CreateBox('arm-seg', { size: 1 }, sc);
        else if (S.seg === 'ring') seg = BABYLON.MeshBuilder.CreateTorus('arm-seg', { diameter: 1, thickness: 0.32, tessellation: 16 }, sc);
        else if (S.seg === 'spike') { seg = BABYLON.MeshBuilder.CreateCylinder('arm-seg', { diameterTop: 0.15, diameterBottom: 1, height: 1, tessellation: 6 }, sc); }
        else if (S.seg === 'bone') {
            const a = BABYLON.MeshBuilder.CreateBox('b1', { width: 0.62, height: 1, depth: 0.62 }, sc);
            const b = BABYLON.MeshBuilder.CreateBox('b2', { width: 1.25, height: 0.32, depth: 0.42 }, sc);
            const c = BABYLON.MeshBuilder.CreateBox('b3', { width: 0.42, height: 0.32, depth: 1.25 }, sc);
            seg = BABYLON.Mesh.MergeMeshes([a, b, c], true, true);
        } else seg = BABYLON.MeshBuilder.CreateCylinder('arm-seg', { diameter: 1, height: 1, tessellation: 14 }, sc);
        const segMat = this._mat('seg', 0xffffff, S.glow >= 0 && S.seg === 'ring' ? S.glow : -1);
        this.seg = this._thin(seg, segMat, A * 48, true);
        // трос-сердцевина
        const cable = BABYLON.MeshBuilder.CreateCylinder('arm-cable', { diameter: 1, height: 1, tessellation: 8 }, sc);
        this.cable = this._thin(cable, this._mat('cable', 0x262a33), A * 24, false);
        // суставы
        this.joint = S.joint >= 0 ? this._thin(BABYLON.MeshBuilder.CreateSphere('arm-joint', { diameter: 1, segments: 8 }, sc), this._mat('joint', S.joint, S.glow), A * 14, false) : null;
        // кисть
        const clawMat = this._mat('claw', S.clawColor, S.glow >= 0 ? S.glow : -1);
        if (S.glow >= 0) clawMat.emissiveColor = clawMat.emissiveColor.scale(0.45);
        this.palm = this._thin(BABYLON.MeshBuilder.CreateSphere('arm-palm', { diameter: 1, segments: 10 }, sc), clawMat, A, false);
        if (this.claw.n) {
            const f = BABYLON.MeshBuilder.CreateBox('arm-finger', { size: 1 }, sc);
            f.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 0.5, 0));
            this.finger = this._thin(f, clawMat, A * 16, false);
        } else this.finger = null;
        if (this.claw.drill) {
            const d = BABYLON.MeshBuilder.CreateCylinder('arm-drill', { diameterTop: 0, diameterBottom: 1, height: 1, tessellation: 8 }, sc);
            d.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 0.5, 0));
            this.drill = this._thin(d, clawMat, A, false);
        } else this.drill = null;
        // ядро-рюкзак: пластина, обод и светящийся шар (свой стиль ядра переживает смену руки)
        this._buildCore();
        this.setVisible(this.visible);
    }

    /**
     * Ядро-рюкзак из предмета «Ядра»: { color, glow (яркость, 1 — обычная; >1.2 — ещё и ореол), pulse (рад/с), ring (цвет вращающегося
     * кольца, −1 нет), halo (цвет ореола, −1 — как у ядра), shape ('orb' | 'cube' | 'gem' | 'crystal' | 'dodeca' | 'ico'), spin }.
     * null — штатное ядро стиля руки (style.core).
     */
    setCore(core) {
        this.coreOv = core ? Object.assign({}, core) : null;
        this._buildCore();
        this.setVisible(this.visible);
    }

    _hex3(hex) { return BABYLON.Color3.FromHexString('#' + (hex >>> 0 & 0xffffff).toString(16).padStart(6, '0')); }

    _coreShape(shape, sc) {
        const poly = (type, size) => BABYLON.MeshBuilder.CreatePolyhedron('arm-orb', { type, size }, sc);
        switch (shape) {
            case 'cube': return BABYLON.MeshBuilder.CreateBox('arm-orb', { size: 18 }, sc);
            case 'gem': return poly(1, 14);       // октаэдр
            case 'crystal': return poly(12, 11);  // вытянутая квадратная бипирамида
            case 'dodeca': return poly(2, 13);
            case 'ico': return poly(3, 13);
            default: return BABYLON.MeshBuilder.CreateSphere('arm-orb', { diameter: 24, segments: 12 }, sc);
        }
    }

    _buildCore() {
        this._disposeCore();
        const S = this.style, sc = this.scene, ov = this.coreOv, mats = this.coreMats;
        const col = ov ? ov.color : S.core;
        this._corePulse = ov && ov.pulse > 0 ? ov.pulse : 5;
        this._coreGlow = ov && ov.glow > 0 ? ov.glow : 1;
        this._coreSpin = ov && ov.shape && ov.shape !== 'orb' ? (ov.spin || 0) : 0;
        const node = new BABYLON.TransformNode('arm-core', sc);
        const plate = BABYLON.MeshBuilder.CreateBox('arm-plate', { width: 12, height: 50, depth: 46 }, sc);
        plate.material = this._mat('plate', 0x30343e, undefined, mats);
        const rim = BABYLON.MeshBuilder.CreateCylinder('arm-rim', { diameter: 34, height: 9, tessellation: 20 }, sc);
        rim.rotation.z = Math.PI / 2; rim.position.x = -6;
        rim.material = this._mat('rim', S.joint >= 0 ? S.joint : 0x555b66, undefined, mats);
        const orb = this._coreShape(ov ? ov.shape : 'orb', sc);
        orb.position.x = -10;
        const om = this._mat('orb', col, col, mats);
        om.emissiveColor = om.diffuseColor.scale(0.9 * this._coreGlow);
        om.metadata = Object.assign({}, om.metadata, { toon: false });
        orb.material = om;
        const list = [plate, rim, orb];
        // ореол: яркое ядро (glow > 1.2) или своё цвет-свечение (halo) — полупрозрачный шар вокруг, пульсирует вместе с ядром
        if (ov && (ov.glow >= 1.2 || ov.halo >= 0)) {
            const halo = BABYLON.MeshBuilder.CreateSphere('arm-halo', { diameter: 42, segments: 10 }, sc);
            halo.position.x = -10;
            const hm = this._mat('halo', 0x000000, undefined, mats);
            hm.emissiveColor = this._hex3(ov.halo >= 0 ? ov.halo : col).scale(0.85);
            hm.specularColor = new BABYLON.Color3(0, 0, 0);
            hm.alpha = Math.min(0.34, 0.14 + 0.08 * (this._coreGlow - 1));
            hm.disableLighting = true; hm.backFaceCulling = false;
            hm.metadata = { toon: false };
            halo.material = hm;
            list.push(halo);
            this.coreHalo = halo;
        }
        // кольцо: наклонённый тор вращается вокруг ядра
        if (ov && ov.ring >= 0) {
            const ring = BABYLON.MeshBuilder.CreateTorus('arm-ring', { diameter: 38, thickness: 2.8, tessellation: 28 }, sc);
            ring.position.x = -10; ring.rotation.x = 1.0;
            const rm = this._mat('ring', 0x000000, undefined, mats);
            rm.emissiveColor = this._hex3(ov.ring).scale(0.95);
            rm.specularColor = new BABYLON.Color3(0, 0, 0);
            rm.disableLighting = true;
            rm.metadata = { toon: false };
            ring.material = rm;
            list.push(ring);
            this.coreRing = ring;
        }
        // ореол и кольцо — световые эффекты: без теней, чернильных рёбер и обводки
        const glowOnly = { castShadow: false, receiveShadows: false, ink: false, outline: false };
        for (const m of list) { m.parent = node; m.isPickable = false; World3D.addObject(this.view, m, 'actor', m === this.coreHalo || m === this.coreRing ? glowOnly : undefined); this.coreMeshes.push(m); }
        node.scaling.setAll(this.scale);
        this.coreNode = node;
        this.orb = orb;
    }

    setVisible(on) {
        this.visible = !!on;
        for (const m of this.meshes) m.setEnabled(this.visible);
        for (const m of this.coreMeshes) m.setEnabled(this.visible);
    }

    // Записать матрицу с осями X = a·sx, Y = b·sy, Z = c·sz и переносом p.
    // Деталь рядом с камерой (её вплотную подтянула проверка стен камеры) сжимается до нуля: иначе шайбы руки закрывают весь кадр.
    _put(T, a, b, c, sx, sy, sz, px, py, pz) {
        if (T.n >= T.cap) return -1;
        const cp = this._camPos;
        if (cp) {
            const dx = px - cp[0], dy = py - cp[1], dz = pz - cp[2], d2 = dx * dx + dy * dy + dz * dz, n1 = this._near1;
            if (d2 < n1 * n1) {
                const f = SpiderMath.smooth((Math.sqrt(d2) - this._near0) / (n1 - this._near0));
                if (f < 0.02) return -1;
                sx *= f; sy *= f; sz *= f;
            }
        }
        const o = T.n * 16, m = T.buf;
        m[o] = a[0] * sx; m[o + 1] = a[1] * sx; m[o + 2] = a[2] * sx; m[o + 3] = 0;
        m[o + 4] = b[0] * sy; m[o + 5] = b[1] * sy; m[o + 6] = b[2] * sy; m[o + 7] = 0;
        m[o + 8] = c[0] * sz; m[o + 9] = c[1] * sz; m[o + 10] = c[2] * sz; m[o + 11] = 0;
        m[o + 12] = px; m[o + 13] = py; m[o + 14] = pz; m[o + 15] = 1;
        return T.n++;
    }

    _flush(T) {
        if (!T) return;
        T.mesh.thinInstanceCount = T.n;
        T.mesh.thinInstanceBufferUpdated('matrix');
        if (T.cbuf) T.mesh.thinInstanceBufferUpdated('color');
        if (T.n) T.mesh.thinInstanceRefreshBoundingInfo(false);
    }

    /** Перерисовать руки по телу (SpiderBody). */
    update(body, dt) {
        if (!this.visible) return;
        this.spin += (dt || 0) * 18;
        const S = this.style, cols = S.colors && S.colors.length ? S.colors : [0xffffff];
        for (const T of [this.seg, this.cable, this.joint, this.palm, this.finger, this.drill]) if (T) T.n = 0;
        const rgb = cols.map(h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]);
        const K = body.c.segs;
        const a = [1, 0, 0], b = [0, 1, 0], c = [0, 0, 1];
        this.tips.length = 0;
        // камера рядом с героем — детали руки у самой камеры сжимаются (см. _put)
        const cam = this.view.camera || this.scene.activeCamera, cpos = cam && (cam.globalPosition || cam.position);
        if (cpos && Math.hypot(cpos.x - body.x, cpos.y - body.y, cpos.z - body.z) < 1000 * this.scale) this._camPos = [cpos.x, cpos.y, cpos.z];
        else this._camPos = null;
        for (const arm of body.arms) {
            const P = arm.pts;
            // длины по цепочке
            let total = 0;
            const cum = this._cum || (this._cum = new Float32Array(64));
            cum[0] = 0;
            for (let j = 1; j < K; j++) { total += Math.hypot(P[j * 3] - P[j * 3 - 3], P[j * 3 + 1] - P[j * 3 - 2], P[j * 3 + 2] - P[j * 3 - 1]); cum[j] = total; }
            // руку рисуем короче на вылет пальцев: кончик цепочки — точка на поверхности, а пальцы кисти уходят от запястья
            // вперёд, поэтому кисть садится на `end`, и кончики пальцев ложатся на поверхность, а не в неё
            const end = total - Math.min(this._reach(arm), total * 0.3);
            // начальная рамка (одна и та же для троса и звеньев)
            this._rootFrame(P, body, arm, a, b, c);
            // трос
            for (let j = 0; j < K - 1 && cum[j] < end; j++) {
                const i0 = j * 3, i1 = i0 + 3;
                const f = cum[j + 1] > end ? (end - cum[j]) / ((cum[j + 1] - cum[j]) || 1) : 1;   // последнее звено обрезано по `end`
                const dx = (P[i1] - P[i0]) * f, dy = (P[i1 + 1] - P[i0 + 1]) * f, dz = (P[i1 + 2] - P[i0 + 2]) * f, l = Math.hypot(dx, dy, dz) || 1;
                const tb = [dx / l, dy / l, dz / l];
                this._transport(a, tb); b[0] = tb[0]; b[1] = tb[1]; b[2] = tb[2]; SpiderMath.cross(a, b, c);
                const r = this.rad * 0.55 * (1 - 0.3 * j / K);
                this._put(this.cable, a, b, c, r, l * 1.05, r, P[i0] + dx / 2, P[i0 + 1] + dy / 2, P[i0 + 2] + dz / 2);
            }
            // звенья по длине
            this._rootFrame(P, body, arm, a, b, c);
            const nSeg = Math.max(4, Math.min(46, Math.floor(end / this.spacing)));
            let j = 0;
            for (let s = 0; s < nSeg; s++) {
                const d = (s + 0.5) / nSeg * end;
                while (j < K - 2 && cum[j + 1] < d) j++;
                const seg = cum[j + 1] - cum[j] || 1, k = (d - cum[j]) / seg;
                const i0 = j * 3, i1 = i0 + 3;
                const px = P[i0] + (P[i1] - P[i0]) * k, py = P[i0 + 1] + (P[i1 + 1] - P[i0 + 1]) * k, pz = P[i0 + 2] + (P[i1 + 2] - P[i0 + 2]) * k;
                const tb = [P[i1] - P[i0], P[i1 + 1] - P[i0 + 1], P[i1 + 2] - P[i0 + 2]];
                SpiderMath.norm(tb);
                this._transport(a, tb); b[0] = tb[0]; b[1] = tb[1]; b[2] = tb[2]; SpiderMath.cross(a, b, c);
                const taper = 1 - 0.32 * s / nSeg, r = this.rad * taper;
                let sx = r * 2, sy = this.spacing * 0.62, sz = r * 2;
                if (S.seg === 'ball') { sx = sz = r * 2.05; sy = this.spacing * 1.05; }
                else if (S.seg === 'cube') { sx = sz = r * 1.75; sy = this.spacing * 0.72; }
                else if (S.seg === 'ring') { sx = sz = r * 2.35; sy = r * 2.35; }
                else if (S.seg === 'spike') { sx = sz = r * 2.3; sy = this.spacing * 0.95; }
                else if (S.seg === 'bone') { sx = sz = r * 1.7; sy = this.spacing * 0.8; }
                const id = this._put(this.seg, a, b, c, sx, sy, sz, px, py, pz);
                if (id >= 0) {
                    const col = rgb[s % rgb.length], o = id * 4;
                    this.seg.cbuf[o] = col[0]; this.seg.cbuf[o + 1] = col[1]; this.seg.cbuf[o + 2] = col[2]; this.seg.cbuf[o + 3] = 1;
                }
                if (this.joint && s % 4 === 2) this._put(this.joint, a, b, c, r * 2.5, r * 2.5, r * 2.5, px, py, pz);
            }
            // кисть: в конце укороченной руки, ось — направление звена в этой точке (к поверхности)
            const e = (K - 1) * 3;
            let wj = 0;
            while (wj < K - 2 && cum[wj + 1] < end) wj++;
            const w0 = wj * 3, w1 = w0 + 3, wk = Math.max(0, Math.min(1, (end - cum[wj]) / ((cum[wj + 1] - cum[wj]) || 1)));
            const t = [P[w1] - P[w0], P[w1 + 1] - P[w0 + 1], P[w1 + 2] - P[w0 + 2]];
            SpiderMath.norm(t);
            this._transport(a, t); SpiderMath.cross(a, t, c);
            this._claw(arm, P[w0] + (P[w1] - P[w0]) * wk, P[w0 + 1] + (P[w1 + 1] - P[w0 + 1]) * wk, P[w0 + 2] + (P[w1 + 2] - P[w0 + 2]) * wk, t, a, c);
            this.tips.push([P[e], P[e + 1], P[e + 2]]);
        }
        for (const T of [this.seg, this.cable, this.joint, this.palm, this.finger, this.drill]) this._flush(T);
        // ядро на спине
        const f = [Math.cos(body.yaw), 0, Math.sin(body.yaw)];
        this.coreNode.position.set(body.x - f[0] * 22, body.y + 30, body.z - f[2] * 22);
        this.coreNode.rotation.y = -body.yaw;
        const wave = Math.sin(body.t * this._corePulse);
        const om = /** @type {any} */ (this.orb.material);
        om.emissiveColor = om.diffuseColor.scale((0.82 + wave * 0.18) * this._coreGlow);
        if (this._coreSpin) this.orb.rotation.y = body.t * this._coreSpin;
        if (this.coreRing) this.coreRing.rotation.y = body.t * 2.4;
        if (this.coreHalo) this.coreHalo.scaling.setAll(1 + wave * 0.1);
    }

    // Начальная рамка руки у плеча. X — горизонтальная нормаль вертикальной плоскости самой руки (плечо смотрит на свою
    // «домашнюю» сторону θ), снятая с касательной b. Опора берётся от тела, а не от мировой вертикали, поэтому рамка не
    // перескакивает на 180°, когда касательная плеча проходит почти вертикаль (передние руки стартуют как раз у неё).
    _rootFrame(P, body, arm, a, b, c) {
        this._tan(P, 0, b);
        const hs = arm.side || 1, ha = body.yaw + (arm.theta || 0);
        const nx = -Math.sin(ha) * hs, nz = Math.cos(ha) * hs, nd = nx * b[0] + nz * b[2];
        a[0] = nx - nd * b[0]; a[1] = -nd * b[1]; a[2] = nz - nd * b[2];
        if (Math.hypot(a[0], a[1], a[2]) < 1e-3) SpiderMath.cross(b, [0, 1, 0], a);   // касательная вдоль нормали — любая перпендикулярная
        SpiderMath.norm(a);
        SpiderMath.cross(a, b, c);
    }

    // Насколько кончики пальцев кисти выступают вперёд вдоль оси руки при текущей хватке (px): на столько рука рисуется короче.
    _reach(arm) {
        const C = this.claw;
        if (!C.n) return 0;
        const k = this.scale * (this.style.thick || 1), g = Math.max(0, Math.min(1, arm.grip));
        let ang = C.open + (C.close - C.open) * g, d = 0, dm = 0;
        for (const L of C.segs) { d += L * k * Math.cos(ang); dm = Math.max(dm, d); ang -= C.bend; }
        return dm;
    }

    // Касательная в точке j цепочки.
    _tan(P, j, out) {
        const i0 = j * 3, i1 = i0 + 3;
        out[0] = P[i1] - P[i0]; out[1] = P[i1 + 1] - P[i0 + 1]; out[2] = P[i1 + 2] - P[i0 + 2];
        return SpiderMath.norm(out);
    }

    // Перенос оси a на плоскость, перпендикулярную новой касательной t (рамка без закрутки).
    _transport(a, t) {
        const d = a[0] * t[0] + a[1] * t[1] + a[2] * t[2];
        a[0] -= t[0] * d; a[1] -= t[1] * d; a[2] -= t[2] * d;
        const l = Math.hypot(a[0], a[1], a[2]);
        if (l < 1e-4) { const ref = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; SpiderMath.norm(SpiderMath.cross(t, ref, a)); }
        else { a[0] /= l; a[1] /= l; a[2] /= l; }
    }

    _claw(arm, x, y, z, t, a, c) {
        const C = this.claw, k = this.scale * (this.style.thick || 1);
        const pr = C.palm * k;
        this._put(this.palm, a, t, c, pr * 2, pr * 1.7, pr * 2, x - t[0] * pr * 0.5, y - t[1] * pr * 0.5, z - t[2] * pr * 0.5);
        if (C.drill && this.drill) {
            const ang = this.spin * (arm.state === 'plant' ? 0.3 : 1);
            const ca = Math.cos(ang), sa = Math.sin(ang);
            const a2 = [a[0] * ca + c[0] * sa, a[1] * ca + c[1] * sa, a[2] * ca + c[2] * sa], c2 = SpiderMath.cross(a2, t);
            this._put(this.drill, a2, t, c2, 22 * k, 34 * k, 22 * k, x, y, z);
            return;
        }
        if (!this.finger) return;
        const g = Math.max(0, Math.min(1, arm.grip));
        const open = C.open + (C.close - C.open) * g;
        for (let i = 0; i < C.n; i++) {
            const phi = i / C.n * Math.PI * 2 + (C.n === 2 ? Math.PI / 2 : 0);
            const u = [a[0] * Math.cos(phi) + c[0] * Math.sin(phi), a[1] * Math.cos(phi) + c[1] * Math.sin(phi), a[2] * Math.cos(phi) + c[2] * Math.sin(phi)];
            let bx = x + u[0] * pr * 0.7, by = y + u[1] * pr * 0.7, bz = z + u[2] * pr * 0.7;
            let ang = open;
            for (let s = 0; s < C.segs.length; s++) {
                const len = C.segs[s] * k;
                const ca = Math.cos(ang), sa = Math.sin(ang);
                const dir = [t[0] * ca + u[0] * sa, t[1] * ca + u[1] * sa, t[2] * ca + u[2] * sa];
                const side = SpiderMath.norm(SpiderMath.cross(dir, u));
                const ax = SpiderMath.cross(dir, side);
                this._put(this.finger, ax, dir, side, C.w * k, len, C.d * k, bx, by, bz);
                bx += dir[0] * len; by += dir[1] * len; bz += dir[2] * len;
                ang -= C.bend;
            }
        }
    }

    dispose() { this.clear(); }
}
