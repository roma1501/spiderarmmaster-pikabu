// GameStyle.js — материалы мира Spider Arm Master поверх вида трассы ObbyCourseView (движок не правится): свои цвета
// деталей (имя файла детали <тип>_<цвет>.glb) с текстурами верха и боков — кирпич с окнами, стекло небоскрёбов,
// песчаник, лёд, кора, магма, конфеты, мрамор… Текстуры рисуются на холсте при постройке вида (нет холста — цвет).
// GameStyle.install() — до постройки трассы (на загрузке скрипта).

/** @satisfies {Record<string, any>} */
const GameStyle = {
    /** Свои цвета деталей: [тон верха светлый, тёмный] — как ObbyCourse.COLORS. */
    COLORS: {
        tile: [0xeceefc, 0xd5d9f2], stud: [0x6fd14a, 0x58b83a], bound: [0x5cc43c, 0x48a52e],
        brick: [0x9aa0a8, 0x7d838c], townhouse: [0x6b6f78, 0x585c64], concrete: [0xc3c7cd, 0xa9aeb5],
        glass: [0x8a96a8, 0x6f7b8e], office: [0xd7dbe2, 0xbfc4cc],
        sand: [0xf3d58f, 0xe2bf72], sandstone: [0xe8c27a, 0xd1a85e],
        snow: [0xf6fbff, 0xdbe9f5], frost: [0xc9efff, 0x9fdcf5],
        bark: [0x8a5a32, 0x6e4526], leaf: [0x46b83c, 0x2f9a2c], moss: [0x7f9a6a, 0x66805a],
        basalt: [0x3d3a42, 0x2c2a30], magma: [0x3a2a28, 0x2a1e1c], metal: [0x9aa3ad, 0x7c858f],
        candy: [0xff8fc8, 0xffffff], choco: [0x7a4a2a, 0x5e371e], frosting: [0xffb3d9, 0xff8fc8],
        marble: [0xf4f2ee, 0xdedbd4], gold: [0xffd24a, 0xe6b52e], cloud: [0xffffff, 0xeef4ff],
    },
    /** Скользкие для лазания (хватка тратится быстрее) — так их видит SpiderBody. */
    SLIPPERY: ['frost', 'ice'],

    install() {
        if (this._installed || typeof ObbyCourseView === 'undefined') return;
        this._installed = true;
        Object.assign(ObbyCourse.COLORS, this.COLORS);
        const V = /** @type {any} */ (ObbyCourseView);
        const baseMaterials = V._makeMaterials, baseGeometry = V._geometry;
        const own = this.COLORS;
        V._makeMaterials = function (scene) {
            // встроенные материалы — только для встроенных цветов (свои рисует GameStyle)
            const all = ObbyCourse.COLORS;
            /** @type {any} */
            const base = {};
            for (const k of Object.keys(all)) if (!own[k]) base[k] = all[k];
            ObbyCourse.COLORS = base;
            try { baseMaterials.call(this, scene); } finally { ObbyCourse.COLORS = all; }
            GameStyle._materials(this, scene);
        };
        V._geometry = function (b, p) {
            if (!own[p.color] || !['box', 'cyl', 'ramp', 'arch', 'pillar'].includes(p.type)) return baseGeometry.call(this, b, p);
            const S = this._tile(), hx = p.sx / 2, hz = p.sz / 2, top = 'top:' + p.color, side = 'side:' + p.color;
            if (p.type === 'box') this._box(b, hx, -p.sy, 0, hz, top, side, S);
            else if (p.type === 'pillar') this._box(b, hx, 0, p.sy, hz, top, side, S);
            else if (p.type === 'cyl') GameStyle._cylTiled(b, hx, hz, -p.sy, 0, top, side, S);
            else if (p.type === 'ramp') this._wedge(b, hx, p.sy, hz, top, side, S);
            else this._arch(b, hx, p.sy, hz, 28, top, side, S);
        };
        // Блик своих материалов (стекло, лёд, золото, металл, кубки): World3D.addObject и смена графики переписывают
        // specular по группе материала (WORLD3D_PROP_SPECULAR) — metadata.gsShine = [r, g, b, сила] возвращает свой.
        if (typeof World3D !== 'undefined') {
            const W = /** @type {any} */ (World3D), apply = W.applyMaterialConstants;
            W.applyMaterialConstants = function (m, c) {
                apply.call(this, m, c);
                const s = m && m.metadata && m.metadata.gsShine;
                if (s && m.specularColor) { m.specularColor = new BABYLON.Color3(s[0], s[1], s[2]); m.specularPower = s[3]; }
            };
        }
    },

    // Цилиндр своего цвета: бок покрыт текстурой плиткой, как у бруса (шаг S по окружности и по высоте), а не одной
    // растянутой картинкой. По окружности — целое число повторов (шва нет), граней — по длине окружности (28…72).
    // Крышки — как у движка (uv = (x + r) / S).
    _cylTiled(b, rx, rz, y0, y1, topKey, sideKey, S) {
        const per = Math.PI * (rx + rz);
        const seg = Math.max(28, Math.min(72, Math.round(per / 90)));
        const reps = Math.max(1, Math.round(per / S));
        const ring = [];
        for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2; ring.push([Math.cos(a), Math.sin(a)]); }
        const uv = (x, z) => [(x + rx) / S, (z + rz) / S];
        b.poly(topKey, ring.map(([c, s]) => [c * rx, y1, s * rz]).reverse(), [0, 1, 0], ring.map(([c, s]) => uv(c * rx, s * rz)).reverse());
        b.poly(sideKey, ring.map(([c, s]) => [c * rx, y0, s * rz]), [0, -1, 0], ring.map(([c, s]) => uv(c * rx, s * rz)));
        const nrm = (c, s) => { const nx = c / rx, nz = s / rz, l = Math.hypot(nx, nz) || 1; return [nx / l, 0, nz / l]; };
        for (let i = 0; i < seg; i++) {
            const [c0, s0] = ring[i], [c1, s1] = ring[(i + 1) % seg];
            const n0 = nrm(c0, s0), n1 = nrm(c1, s1), u0 = i / seg * reps, u1 = (i + 1) / seg * reps;
            b.poly(sideKey, [[c0 * rx, y0, s0 * rz], [c0 * rx, y1, s0 * rz], [c1 * rx, y1, s1 * rz], [c1 * rx, y0, s1 * rz]],
                [n0, n0, n1, n1], [[u0, y0 / S], [u0, y1 / S], [u1, y1 / S], [u1, y0 / S]]);
        }
    },

    // ---------------------------------------------------------------------------------------------
    // Текстуры
    // ---------------------------------------------------------------------------------------------

    _materials(V, scene) {
        const make = (name, size, draw) => {
            try {
                const t = new BABYLON.DynamicTexture('gs-' + name, { width: size, height: size }, scene, true);
                const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (t.getContext()));
                if (!ctx) { t.dispose(); return null; }
                draw(ctx, size);
                t.update(true);
                t.wrapU = t.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
                t.anisotropicFilteringLevel = 8;
                return t;
            } catch (e) { return null; }
        };
        const mat = (key, hex, draw, size) => {
            const m = new BABYLON.StandardMaterial('course-' + key, scene);
            m.diffuseColor = BABYLON.Color3.FromHexString(this._hex(hex));
            m.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06);
            m.backFaceCulling = false;
            const t = draw ? make(key, size || 256, draw) : null;
            if (t) { m.diffuseTexture = t; m.diffuseColor = new BABYLON.Color3(1, 1, 1); }
            V.mats[key] = m;
            return m;
        };
        const D = this._draw;
        for (const name of Object.keys(this.COLORS)) {
            const [a, b] = this.COLORS[name];
            const d = D[name] || {};
            mat('top:' + name, a, d.top ? (ctx, n) => d.top(ctx, n, a, b, this) : (ctx, n) => this._plates(ctx, n, a, b));
            mat('side:' + name, b, d.side ? (ctx, n) => d.side(ctx, n, a, b, this) : (ctx, n) => this._plates(ctx, n, b, a));
        }
        // светящиеся трещины магмы и стекло небоскрёбов с бликом
        const mg = V.mats['side:magma'], mt = V.mats['top:magma'];
        for (const m of [mg, mt]) if (m) {
            const glow = make('magma-glow', 256, (ctx, n) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, n, n); this._cracks(ctx, n, '#ff7a1a', 5, 11); this._cracks(ctx, n, '#ffd04a', 2, 11); });
            if (glow) { m.emissiveTexture = glow; m.emissiveColor = new BABYLON.Color3(0, 0, 0); }
        }
        // блик: metadata.gsShine переживает World3D.addObject (см. install); лёд движка (top:ice) — тоже
        const shine = (k, s) => { const m = V.mats[k]; if (!m) return; m.metadata = Object.assign({}, m.metadata, { gsShine: s }); m.specularColor = new BABYLON.Color3(s[0], s[1], s[2]); m.specularPower = s[3]; };
        for (const k of ['side:glass', 'side:frost', 'top:frost', 'side:gold', 'top:gold', 'side:metal']) shine(k, [0.45, 0.45, 0.5, 36]);
        shine('top:ice', [0.7, 0.8, 0.9, 48]);
    },

    _hex(h) { return '#' + (h >>> 0 & 0xffffff).toString(16).padStart(6, '0'); },
    _rgb(h, k) { const r = (h >> 16) & 255, g = (h >> 8) & 255, b = h & 255; k = k == null ? 1 : k; return `rgb(${Math.min(255, Math.round(r * k))},${Math.min(255, Math.round(g * k))},${Math.min(255, Math.round(b * k))})`; },
    _rnd(seed) { let s = seed | 0 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; },

    // Зерно и шум поверх заливки.
    _grain(ctx, n, count, alpha, seed) {
        const r = this._rnd(seed || 7);
        for (let i = 0; i < count; i++) {
            const x = r() * n, y = r() * n, s = 0.6 + r() * 1.8;
            ctx.fillStyle = r() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
            ctx.fillRect(x, y, s, s);
        }
    },

    // Плиты 2×2 со швами — запасной рисунок.
    _plates(ctx, n, a, b) {
        const h = n / 2;
        for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { ctx.fillStyle = this._rgb((x + y) % 2 ? b : a); ctx.fillRect(x * h, y * h, h, h); }
        this._grain(ctx, n, 1600, 0.06, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        for (const k of [0, h]) { ctx.fillRect(k, 0, 3, n); ctx.fillRect(0, k, n, 3); }
    },

    // Трещины (магма, лёд): ломаные от случайных точек.
    _cracks(ctx, n, color, width, count) {
        const r = this._rnd(width * 31 + count);
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
        for (let i = 0; i < count; i++) {
            let x = r() * n, y = r() * n;
            ctx.beginPath(); ctx.moveTo(x, y);
            for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; ctx.lineTo(x, y); }
            ctx.stroke();
        }
    },

    // Кирпичная кладка (ряды со сдвигом).
    _bricks(ctx, x0, y0, w, h, rows, cols, color, mortar, seed) {
        const r = this._rnd(seed || 5);
        ctx.fillStyle = mortar; ctx.fillRect(x0, y0, w, h);
        const bh = h / rows, bw = w / cols;
        for (let y = 0; y < rows; y++) for (let x = -1; x < cols + 1; x++) {
            const ox = (y % 2) * bw / 2;
            const k = 0.85 + r() * 0.3;
            ctx.fillStyle = this._rgb(color, k);
            const bx = x0 + x * bw + ox + 2, by = y0 + y * bh + 2;
            ctx.fillRect(Math.max(x0, bx), by, Math.min(bw - 4, x0 + w - Math.max(x0, bx)), bh - 4);
        }
    },

    // Окно: рама, стекло с бликом, подоконник.
    _window(ctx, x, y, w, h, frame, glass) {
        ctx.fillStyle = frame; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
        const g = ctx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, glass); g.addColorStop(0.55, '#bfe6ff'); g.addColorStop(1, glass);
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = frame; ctx.fillRect(x + w / 2 - 2, y, 4, h); ctx.fillRect(x, y + h / 2 - 2, w, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x + 4, y + 4, w * 0.22, h * 0.3);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 6, y + h + 4, w + 12, 6);
    },

    // Рисунки по цветам: top(ctx, n, светлый, тёмный), side(...). Сторона: v растёт вниз по стене от верха детали.
    _draw: {
        tile: {
            top(ctx, n, a, b, G) {
                ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n);
                ctx.strokeStyle = 'rgba(120,110,190,0.22)'; ctx.lineWidth = 3;
                for (let i = -n; i < n * 2; i += n / 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + n, n); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i, n); ctx.lineTo(i + n, 0); ctx.stroke(); }
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                for (let y = n / 16; y < n; y += n / 8) for (let x = n / 16; x < n; x += n / 8) ctx.fillRect(x - 2, y - 2, 4, 4);
                ctx.fillStyle = 'rgba(90,80,160,0.25)'; ctx.fillRect(0, 0, n, 4); ctx.fillRect(0, 0, 4, n);
            },
            side(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(b); ctx.fillRect(0, 0, n, n); ctx.fillStyle = 'rgba(80,70,150,0.3)'; ctx.fillRect(0, 0, n, n * 0.1); G._grain(ctx, n, 800, 0.05, 2); },
        },
        stud: {
            top(ctx, n, a, b, G) {
                ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n);
                G._grain(ctx, n, 1200, 0.06, 9);
                const s = n / 8;
                for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
                    const cx = x * s + s / 2, cy = y * s + s / 2;
                    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.arc(cx + 2, cy + 2, s * 0.3, 0, 7); ctx.fill();
                    ctx.fillStyle = G._rgb(a, 1.1); ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, 0, 7); ctx.fill();
                }
            },
            side(ctx, n, a, b, G) { G._draw.bound.side(ctx, n, a, b, G); },
        },
        bound: {
            top(ctx, n, a, b, G) { G._draw.stud.top(ctx, n, a, b, G); },
            side(ctx, n, a, b, G) {
                ctx.fillStyle = G._rgb(b); ctx.fillRect(0, 0, n, n);
                const s = n / 8;
                for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
                    const cx = x * s + s / 2, cy = y * s + s / 2;
                    ctx.fillStyle = (x + y) % 2 ? G._rgb(b, 1.12) : G._rgb(b, 0.92);
                    ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.42); ctx.lineTo(cx + s * 0.42, cy); ctx.lineTo(cx, cy + s * 0.42); ctx.lineTo(cx - s * 0.42, cy); ctx.fill();
                }
                G._grain(ctx, n, 900, 0.05, 4);
            },
        },
        brick: {
            top(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n); G._grain(ctx, n, 4000, 0.12, 11); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, n, 10); ctx.fillRect(0, 0, 10, n); },
            side(ctx, n, a, b, G) { G._bricks(ctx, 0, 0, n, n, 12, 4, 0xb4452f, '#e7d9c6', 21); },
        },
        townhouse: {
            top(ctx, n, a, b, G) { G._draw.brick.top(ctx, n, a, b, G); },
            side(ctx, n, a, b, G) {
                G._bricks(ctx, 0, 0, n, n, 12, 4, 0xa5482f, '#e9dcc8', 13);
                for (let wy = 0; wy < 2; wy++) for (let wx = 0; wx < 2; wx++) G._window(ctx, wx * n / 2 + n * 0.12, wy * n / 2 + n * 0.12, n * 0.26, n * 0.28, '#f4efe6', '#3f7fd1');
                ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(0, 0, n, 6);
            },
        },
        concrete: {
            top(ctx, n, a, b, G) { G._plates(ctx, n, a, b); },
            side(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(b); ctx.fillRect(0, 0, n, n); G._grain(ctx, n, 2500, 0.07, 6); ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (const k of [0, n / 2]) { ctx.fillRect(0, k, n, 3); ctx.fillRect(k, 0, 3, n); } },
        },
        glass: {
            top(ctx, n, a, b, G) { G._plates(ctx, n, a, b); ctx.strokeStyle = 'rgba(255,214,74,0.9)'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, n - 20, n - 20); },
            side(ctx, n, a, b, G) {
                const g = ctx.createLinearGradient(0, 0, n, n);
                g.addColorStop(0, '#2f6fd8'); g.addColorStop(0.5, '#78c2ff'); g.addColorStop(1, '#2f6fd8');
                ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
                ctx.fillStyle = '#e9eef5';
                for (let x = 0; x < 4; x++) ctx.fillRect(x * n / 4, 0, 7, n);
                ctx.fillStyle = 'rgba(20,40,80,0.35)';
                for (let y = 0; y < 4; y++) ctx.fillRect(0, y * n / 4, n, 4);
                ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(n * 0.55, 0, n * 0.08, n);
            },
        },
        office: {
            top(ctx, n, a, b, G) { G._plates(ctx, n, a, b); },
            side(ctx, n, a, b, G) {
                ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n);
                for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
                    const g = ctx.createLinearGradient(0, y * n / 4, 0, (y + 1) * n / 4);
                    g.addColorStop(0, '#1d3d72'); g.addColorStop(1, '#4b86c9');
                    ctx.fillStyle = g; ctx.fillRect(x * n / 4 + 8, y * n / 4 + 10, n / 4 - 16, n / 4 - 22);
                }
                ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < 4; y++) ctx.fillRect(0, (y + 1) * n / 4 - 6, n, 4);
            },
        },
        sand: {
            top(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n); G._grain(ctx, n, 6000, 0.08, 31); ctx.strokeStyle = 'rgba(180,130,60,0.25)'; ctx.lineWidth = 3; for (let y = 20; y < n; y += 40) { ctx.beginPath(); for (let x = 0; x <= n; x += 16) ctx.lineTo(x, y + Math.sin(x / 30 + y) * 6); ctx.stroke(); } },
            side(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(b); ctx.fillRect(0, 0, n, n); G._grain(ctx, n, 5000, 0.09, 33); },
        },
        sandstone: {
            top(ctx, n, a, b, G) { G._plates(ctx, n, a, b); },
            side(ctx, n, a, b, G) {
                const r = G._rnd(41);
                ctx.fillStyle = '#b98d4c'; ctx.fillRect(0, 0, n, n);
                for (let y = 0; y < 4; y++) for (let x = -1; x < 3; x++) { const ox = (y % 2) * n / 4; ctx.fillStyle = G._rgb(a, 0.88 + r() * 0.2); ctx.fillRect(x * n / 2 + ox + 3, y * n / 4 + 3, n / 2 - 6, n / 4 - 6); }
                G._grain(ctx, n, 3000, 0.07, 43);
                ctx.strokeStyle = 'rgba(120,80,30,0.35)'; ctx.lineWidth = 3; ctx.strokeRect(n * 0.3, n * 0.32, n * 0.4, n * 0.1);
            },
        },
        snow: {
            top(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n); G._grain(ctx, n, 2500, 0.05, 51); ctx.fillStyle = 'rgba(160,200,240,0.2)'; for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.ellipse((i * 97) % n, (i * 61) % n, 30, 12, 0, 0, 7); ctx.fill(); } },
            side(ctx, n, a, b, G) { ctx.fillStyle = '#8c97a6'; ctx.fillRect(0, 0, n, n); G._grain(ctx, n, 3000, 0.1, 53); ctx.fillStyle = G._rgb(a); ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= n; x += 16) ctx.lineTo(x, 22 + Math.sin(x / 13) * 10); ctx.lineTo(n, 0); ctx.fill(); },
        },
        frost: {
            top(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n); G._cracks(ctx, n, 'rgba(255,255,255,0.7)', 2, 9); },
            side(ctx, n, a, b, G) { const g = ctx.createLinearGradient(0, 0, n, n); g.addColorStop(0, '#9fe3ff'); g.addColorStop(1, '#5fb9e6'); ctx.fillStyle = g; ctx.fillRect(0, 0, n, n); G._cracks(ctx, n, 'rgba(255,255,255,0.75)', 2, 12); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(n * 0.2, 0, n * 0.1, n); },
        },
        bark: {
            top(ctx, n, a, b, G) { ctx.fillStyle = '#c69a62'; ctx.fillRect(0, 0, n, n); ctx.strokeStyle = 'rgba(110,70,30,0.6)'; ctx.lineWidth = 4; for (let r = 12; r < n; r += 22) { ctx.beginPath(); ctx.arc(n / 2, n / 2, r, 0, 7); ctx.stroke(); } },
            side(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n); const r = G._rnd(61); for (let i = 0; i < 26; i++) { const x = r() * n; ctx.fillStyle = `rgba(40,20,5,${0.25 + r() * 0.3})`; ctx.fillRect(x, 0, 4 + r() * 6, n); } G._grain(ctx, n, 2000, 0.08, 63); },
        },
        leaf: {
            top(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(b); ctx.fillRect(0, 0, n, n); const r = G._rnd(71); for (let i = 0; i < 90; i++) { ctx.fillStyle = G._rgb(a, 0.8 + r() * 0.45); ctx.beginPath(); ctx.ellipse(r() * n, r() * n, 10 + r() * 14, 6 + r() * 8, r() * 3, 0, 7); ctx.fill(); } },
            side(ctx, n, a, b, G) { G._draw.leaf.top(ctx, n, a, b, G); },
        },
        moss: {
            top(ctx, n, a, b, G) { ctx.fillStyle = '#5a9a3c'; ctx.fillRect(0, 0, n, n); G._grain(ctx, n, 3000, 0.1, 81); },
            side(ctx, n, a, b, G) { const r = G._rnd(83); ctx.fillStyle = '#4c5248'; ctx.fillRect(0, 0, n, n); for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) { ctx.fillStyle = G._rgb(0x8a8f86, 0.85 + r() * 0.25); ctx.fillRect(x * n / 3 + (y % 2) * 20 + 3, y * n / 4 + 3, n / 3 - 6, n / 4 - 6); } ctx.fillStyle = 'rgba(80,160,50,0.55)'; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.ellipse(r() * n, r() * n * 0.4, 14, 7, 0, 0, 7); ctx.fill(); } },
        },
        basalt: {
            top(ctx, n, a, b, G) { G._draw.basalt.side(ctx, n, a, b, G); },
            side(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(b); ctx.fillRect(0, 0, n, n); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 3; for (let x = 0; x < n; x += n / 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 6, n); ctx.stroke(); } G._grain(ctx, n, 2500, 0.08, 91); },
        },
        magma: {
            top(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n); G._cracks(ctx, n, '#ff7a1a', 5, 11); G._cracks(ctx, n, '#ffd04a', 2, 11); },
            side(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(b); ctx.fillRect(0, 0, n, n); G._grain(ctx, n, 2000, 0.1, 93); G._cracks(ctx, n, '#ff7a1a', 5, 11); G._cracks(ctx, n, '#ffd04a', 2, 11); },
        },
        metal: {
            top(ctx, n, a, b, G) { G._draw.metal.side(ctx, n, a, b, G); },
            side(ctx, n, a, b, G) {
                const g = ctx.createLinearGradient(0, 0, n, n); g.addColorStop(0, G._rgb(a)); g.addColorStop(1, G._rgb(b)); ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
                ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (const k of [0, n / 2]) { ctx.fillRect(k, 0, 4, n); ctx.fillRect(0, k, n, 4); }
                ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (const x of [14, n / 2 - 14, n / 2 + 14, n - 14]) for (const y of [14, n / 2 - 14, n / 2 + 14, n - 14]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
            },
        },
        candy: {
            top(ctx, n, a, b, G) { G._draw.candy.side(ctx, n, a, b, G); },
            side(ctx, n, a, b, G) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, n, n); ctx.fillStyle = '#ff4fa3'; for (let i = -n; i < n * 2; i += n / 4) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + n / 8, 0); ctx.lineTo(i + n / 8 + n, n); ctx.lineTo(i + n, n); ctx.fill(); } ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, n * 0.1, n, n * 0.06); },
        },
        choco: {
            top(ctx, n, a, b, G) { G._draw.choco.side(ctx, n, a, b, G); },
            side(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(b); ctx.fillRect(0, 0, n, n); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { ctx.fillStyle = G._rgb(a); ctx.fillRect(x * n / 2 + 10, y * n / 2 + 10, n / 2 - 20, n / 2 - 20); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x * n / 2 + 10, y * n / 2 + 10, n / 2 - 20, 8); } },
        },
        frosting: {
            top(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n); const r = G._rnd(101); const cs = ['#ffe14f', '#4fd2ff', '#ffffff', '#7aff7a', '#ff4f4f']; for (let i = 0; i < 70; i++) { ctx.save(); ctx.translate(r() * n, r() * n); ctx.rotate(r() * 3); ctx.fillStyle = cs[i % cs.length]; ctx.fillRect(-6, -2, 12, 4); ctx.restore(); } },
            side(ctx, n, a, b, G) { ctx.fillStyle = '#7a4a2a'; ctx.fillRect(0, 0, n, n); ctx.fillStyle = G._rgb(a); ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= n; x += n / 8) { ctx.lineTo(x, n * 0.25); ctx.arc(x + n / 16, n * 0.25, n / 16, Math.PI, 0, true); } ctx.lineTo(n, 0); ctx.fill(); },
        },
        marble: {
            top(ctx, n, a, b, G) { G._draw.marble.side(ctx, n, a, b, G); },
            side(ctx, n, a, b, G) { ctx.fillStyle = G._rgb(a); ctx.fillRect(0, 0, n, n); G._cracks(ctx, n, 'rgba(150,140,130,0.35)', 2, 8); ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (const k of [0, n / 2]) { ctx.fillRect(0, k, n, 3); ctx.fillRect(k, 0, 3, n); } },
        },
        gold: {
            top(ctx, n, a, b, G) { G._draw.gold.side(ctx, n, a, b, G); },
            side(ctx, n, a, b, G) { const g = ctx.createLinearGradient(0, 0, n, n); g.addColorStop(0, '#fff1a8'); g.addColorStop(0.4, '#ffd24a'); g.addColorStop(1, '#c8901e'); ctx.fillStyle = g; ctx.fillRect(0, 0, n, n); ctx.strokeStyle = 'rgba(140,90,10,0.5)'; ctx.lineWidth = 4; ctx.strokeRect(8, 8, n / 2 - 16, n / 2 - 16); ctx.strokeRect(n / 2 + 8, n / 2 + 8, n / 2 - 16, n / 2 - 16); },
        },
        cloud: {
            top(ctx, n, a, b, G) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, n, n); ctx.fillStyle = 'rgba(200,220,255,0.35)'; const r = G._rnd(111); for (let i = 0; i < 30; i++) { ctx.beginPath(); ctx.arc(r() * n, r() * n, 14 + r() * 24, 0, 7); ctx.fill(); } },
            side(ctx, n, a, b, G) { G._draw.cloud.top(ctx, n, a, b, G); },
        },
    },
};

GameStyle.install();
