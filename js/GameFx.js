// GameFx.js — эффекты Spider Arm Master на ParticleFX движка (app.fx): пыль под кончиком руки, искры хватки, удар о
// землю, удар по мишени, победа, новый уровень и новая рука, телепорт, «нет хватки», следы на кончиках, аура у головы.
// Рецепты регистрируются один раз; эффекты по событию — play(имя, позиция); косметика магазина:
//   trails(style, tips)  — след на кончиках рук: style = { fx, color, color2, power } (предмет «Следы») или стиль руки (arm.fx / fxColor / fxColor2)
//   aura(style, getPos)  — частицы вокруг головы у редких шапок и скинов: style = { fx, color, color2, power }, getPos() → { x, y, z }
//   setWin(style) / win(x, y, z) — победный эффект на WIN-плате: style = { burst, colors, star, power } (предмет «Победные эффекты»), null — исходный
// Пыль шагов (sam-plant, десятки раз в секунду) не создаёт систем: несколько постоянных систем по кругу, выброс —
// manualEmitCount. Звёзды победы и уровня — текстуры assets/fx/ (нет файла — круглая частица ParticleFX). Формы сердца, листа,
// пузыря, монеты и конфетти рисуются на лету (DynamicTexture 64×64, белые — красятся цветом частицы); нет Canvas — круглая частица.

/** @satisfies {Record<string, any>} */
const GameFx = {
    /** @type {any} */ fx: null,
    /** @type {any[]} */ _trails: [],
    _style: '',
    /** @type {any} */ _aura: null,
    _auraKey: '',
    /** Стиль победного эффекта (null — исходный рецепт 'sam-win'). @type {any} */ _win: null,
    /** Процедурные текстуры частиц: имя формы → DynamicTexture (null — нарисовать не вышло). @type {Record<string, any>} */ _tex: {},
    /** Постоянные системы пыли шагов: [[handle, частиц на шаг], …] на каждую ячейку круга. */
    /** @type {any[][]} */ _dust: [],
    _dustI: 0,
    STAR: 'assets/fx/flash-star.webp',
    RAINBOW: 'assets/fx/rainbow-star.webp',

    init(app) {
        this.fx = app.fx;
        this._dust = []; this._dustI = 0; this._tex = {};
        this._trails = []; this._style = ''; this._aura = null; this._auraKey = '';
        const fx = this.fx;
        if (!fx) return;
        const STAR = this.STAR, RAINBOW = this.RAINBOW;
        // sam-plant — не рецепт, а постоянные системы (_plant)
        fx.register('sam-grab', [
            { burst: 14, capacity: 16, life: [0.15, 0.4], size: [3, 7], speed: [120, 320], color: '#ffd36b', gravity: [0, -600, 0] },
            { burst: 3, capacity: 4, life: [0.1, 0.18], size: [30, 46], speed: [0, 5], color: '#fff3c4', sizeGradient: [[0, 0.4], [0.4, 1], [1, 0]] },
        ]);
        fx.register('sam-land', [
            { burst: 26, capacity: 30, life: [0.4, 0.9], size: [22, 44], speed: [120, 300], direction: [[-1, 0.05, -1], [1, 0.25, 1]], color: '#d9d2c4', blend: 'standard', gravity: [0, -60, 0], sizeGradient: [[0, 0.4], [0.3, 1], [1, 0.3]] },
        ]);
        fx.register('sam-punch', [
            { burst: 12, capacity: 14, life: [0.12, 0.32], size: [4, 9], speed: [140, 340], color: '#ffe066', gravity: [0, -500, 0] },
            { burst: 2, capacity: 3, life: [0.08, 0.16], size: [50, 80], speed: [0, 4], color: '#ffffff', sizeGradient: [[0, 0.3], [0.5, 1], [1, 0]] },
        ]);
        fx.register('sam-win', [
            { burst: 120, capacity: 130, life: [0.8, 1.8], size: [6, 14], speed: [250, 650], direction: [[-0.6, 1, -0.6], [0.6, 1.4, 0.6]], color: '#ff4f8b', color2: '#4fd2ff', gravity: [0, -700, 0], blend: 'standard' },
            { burst: 40, capacity: 46, life: [0.5, 1.2], size: [18, 34], speed: [120, 360], color: '#ffd84a', gravity: [0, -200, 0], texture: STAR, spin: [-3, 3] },
            { burst: 16, capacity: 18, life: [0.9, 1.7], size: [26, 44], speed: [220, 520], direction: [[-0.5, 1, -0.5], [0.5, 1.3, 0.5]], color: '#ffffff', gravity: [0, -650, 0], blend: 'standard', texture: RAINBOW, spin: [-4, 4] },
            { burst: 4, capacity: 5, life: [0.25, 0.45], size: [200, 320], speed: [0, 5], color: '#fff2b0', sizeGradient: [[0, 0.3], [0.4, 1], [1, 0]], texture: STAR, spin: [-1, 1] },
        ]);
        fx.register('sam-levelup', [
            { burst: 46, capacity: 52, life: [0.8, 1.6], size: [16, 30], speed: [40, 120], box: [[-70, 0, -70], [70, 40, 70]], direction: [[-0.2, 1, -0.2], [0.2, 1, 0.2]], color: '#7dfcff', gravity: [0, 380, 0], texture: STAR, spin: [-2, 2] },
            { burst: 30, capacity: 34, life: [0.5, 1], size: [10, 20], speed: [200, 380], direction: [[-1, 0.1, -1], [1, 0.3, 1]], color: '#fff27a', gravity: [0, 0, 0] },
        ]);
        fx.register('sam-newarm', [
            { burst: 130, capacity: 140, life: [0.6, 1.6], size: [6, 16], speed: [300, 800], color: '#ffd84a', color2: '#ff7ad9', gravity: [0, -500, 0] },
            { burst: 20, capacity: 22, life: [0.8, 1.6], size: [30, 50], speed: [260, 620], color: '#ffffff', gravity: [0, -550, 0], blend: 'standard', texture: RAINBOW, spin: [-4, 4] },
            { burst: 6, capacity: 6, life: [0.3, 0.6], size: [240, 380], speed: [0, 5], color: '#fff6c8', sizeGradient: [[0, 0.2], [0.4, 1], [1, 0]], texture: STAR, spin: [-1, 1] },
        ]);
        fx.register('sam-teleport', [
            { burst: 90, capacity: 100, life: [0.5, 1.1], size: [6, 14], speed: [60, 180], box: [[-80, 0, -80], [80, 260, 80]], direction: [[-0.3, 1, -0.3], [0.3, 1, 0.3]], color: '#a87bff', color2: '#4fd2ff', gravity: [0, 300, 0] },
        ]);
        fx.register('sam-outgrip', [
            { burst: 26, capacity: 30, life: [0.2, 0.5], size: [4, 9], speed: [150, 380], color: '#ff5a4a', gravity: [0, -800, 0] },
            { burst: 10, capacity: 12, life: [0.4, 0.9], size: [20, 40], speed: [30, 80], color: '#8a8a8a', blend: 'standard', gravity: [0, 60, 0] },
        ]);
        fx.register('sam-respawn', [
            { burst: 50, capacity: 60, life: [0.4, 0.9], size: [8, 16], speed: [80, 220], color: '#7dff9a', gravity: [0, 200, 0] },
        ]);
    },

    play(name, x, y, z) {
        if (!this.fx) return null;
        if (name === 'sam-plant') return this._plant(x, y, z);
        try { return this.fx.play(name, [x, y, z]); } catch (e) { return null; }
    },

    /** Система ещё в сцене (fx.clear() при смене карты снимает все). */
    _alive(h) { return !!(h && h.system && this.fx && this.fx.scene && this.fx.scene.particleSystems.indexOf(h.system) >= 0); },

    _css(hex) { return '#' + ((Number(hex) >>> 0) & 0xffffff).toString(16).padStart(6, '0'); },

    // Пыль шага: следующая ячейка круга постоянных систем переезжает в точку и выбрасывает порцию частиц.
    // Слои — как у рецепта sam-plant (пыль 7 + искры 4); ячеек 4 — шаги одного кадра не делят систему.
    _plant(x, y, z) {
        const fx = this.fx;
        if (!this._dust.length || !this._alive(this._dust[0][0][0])) {
            this._dust = [];
            const layers = [
                [{ rate: 0, capacity: 24, life: [0.25, 0.55], size: [10, 22], speed: [40, 110], direction: [[-1, 0.2, -1], [1, 0.8, 1]], color: '#e9e4da', blend: 'standard', gravity: [0, -120, 0], sizeGradient: [[0, 0.5], [0.3, 1], [1, 0.2]] }, 7],
                [{ rate: 0, capacity: 10, life: [0.1, 0.25], size: [3, 6], speed: [80, 200], color: '#ffe7a3', gravity: [0, -400, 0] }, 4],
            ];
            for (let i = 0; i < 4; i++) {
                const cell = [];
                for (const [o, n] of layers) { const h = fx.create(Object.assign({ name: 'sam-dust' }, o)); if (h) cell.push([h, n]); }
                if (cell.length) this._dust.push(cell);
            }
            if (!this._dust.length) return null;
        }
        const q = fx.cfg ? fx.cfg().quality : 1;
        const cell = this._dust[this._dustI++ % this._dust.length];
        for (const [h, n] of cell) {
            h.setPosition([x, y, z]);
            h.system.manualEmitCount = Math.max(0, h.system.manualEmitCount) + Math.max(1, Math.ceil(n * q));
        }
        return null;
    },

    // ---------------------------------------------------------------------------------------------
    // Формы частиц (процедурные белые текстуры) и создание систем
    // ---------------------------------------------------------------------------------------------

    /** Белая форма 64×64 для частиц: 'heart' | 'leaf' | 'bubble' | 'coin' | 'confetti'. null — нет Canvas / не вышло: частица остаётся круглой. */
    _shape(name) {
        const fx = this.fx;
        if (!name || !fx || !fx.scene) return null;
        if (this._tex[name] !== undefined) return this._tex[name];
        let tex = null;
        try {
            tex = new BABYLON.DynamicTexture('gfx-' + name, 64, fx.scene, true);
            const g = /** @type {any} */ (tex.getContext());
            g.clearRect(0, 0, 64, 64);
            g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff';
            if (name === 'heart') {
                g.beginPath(); g.moveTo(32, 57); g.bezierCurveTo(2, 36, 6, 8, 24, 9); g.bezierCurveTo(30, 9, 32, 14, 32, 19);
                g.bezierCurveTo(32, 14, 34, 9, 40, 9); g.bezierCurveTo(58, 8, 62, 36, 32, 57); g.fill();
            } else if (name === 'leaf') {
                g.beginPath(); g.moveTo(7, 57); g.bezierCurveTo(6, 20, 30, 5, 58, 7); g.bezierCurveTo(60, 36, 36, 60, 7, 57); g.fill();
                g.globalCompositeOperation = 'destination-out'; g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 3;
                g.beginPath(); g.moveTo(9, 55); g.lineTo(46, 18); g.stroke();
            } else if (name === 'bubble') {
                g.lineWidth = 5; g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.stroke();
                g.globalAlpha = 0.22; g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fill();
                g.globalAlpha = 1; g.beginPath(); g.arc(22, 21, 6, 0, Math.PI * 2); g.fill();
            } else if (name === 'coin') {
                g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
                g.globalCompositeOperation = 'destination-out'; g.strokeStyle = 'rgba(0,0,0,0.38)'; g.lineWidth = 4;
                g.beginPath(); g.arc(32, 32, 19, 0, Math.PI * 2); g.stroke();
            } else if (name === 'confetti') {
                g.fillRect(10, 22, 44, 20);
            }
            tex.hasAlpha = true;
            tex.update();
        } catch (e) { tex = null; }
        this._tex[name] = tex;
        return tex;
    },

    /** Система частиц с формой (L.shape), позиция pos; L.off не используется здесь. null — бюджет частиц исчерпан. */
    _make(L, pos) {
        const fx = this.fx;
        if (!fx) return null;
        const o = Object.assign({}, L, { position: pos });
        delete o.shape; delete o.off;
        /** @type {any} */ let h = null;
        try { h = fx.create(o); } catch (e) { h = null; }
        if (h && L.shape) {
            const t = this._shape(L.shape);
            if (t) h.system.particleTexture = t;
        }
        return h;
    },

    /** Виды частиц следов и аур (rate — частиц/с на эмиттер). Цвета по умолчанию заменяются color / color2 предмета. */
    _kinds() {
        const STAR = this.STAR;
        return {
            sparks: { rate: 26, life: [0.15, 0.4], size: [3, 7], speed: [40, 140], color: '#9fe3ff', gravity: [0, -300, 0] },
            flame: { rate: 40, life: [0.25, 0.6], size: [12, 26], speed: [10, 50], color: '#ff6a1a', color2: '#ffd04a', gravity: [0, 220, 0], sizeGradient: [[0, 0.6], [0.4, 1], [1, 0]] },
            electric: { rate: 30, life: [0.08, 0.2], size: [6, 14], speed: [80, 260], color: '#7fe8ff', gravity: [0, 0, 0] },
            hearts: { rate: 10, life: [0.6, 1.2], size: [10, 18], speed: [20, 60], color: '#ff6fb5', gravity: [0, 120, 0], shape: 'heart', blend: 'standard', spin: [-1.5, 1.5] },
            frost: { rate: 22, life: [0.5, 1.1], size: [5, 11], speed: [10, 50], color: '#dff8ff', gravity: [0, -60, 0] },
            rainbow: { rate: 36, life: [0.4, 0.9], size: [7, 14], speed: [10, 60], color: '#ff4f4f', color2: '#4fc8ff', gravity: [0, 60, 0] },
            void: { rate: 30, life: [0.4, 0.9], size: [10, 22], speed: [10, 40], color: '#b04dff', color2: '#1a0b2e', gravity: [0, 40, 0], sizeGradient: [[0, 1], [1, 0]] },
            gold: { rate: 24, life: [0.4, 0.9], size: [5, 11], speed: [10, 50], color: '#ffd84a', gravity: [0, 80, 0] },
            bubbles: { rate: 12, life: [0.8, 1.5], size: [8, 16], speed: [10, 40], color: '#bdeaff', color2: '#7fd0ff', gravity: [0, 110, 0], shape: 'bubble', blend: 'standard' },
            leaves: { rate: 12, life: [0.9, 1.7], size: [9, 16], speed: [20, 70], color: '#6fcf4a', color2: '#c6e84a', gravity: [0, -70, 0], shape: 'leaf', blend: 'standard', spin: [-5, 5] },
            stars: { rate: 12, life: [0.5, 1.1], size: [12, 22], speed: [15, 60], color: '#ffd84a', gravity: [0, 40, 0], texture: STAR, spin: [-3, 3] },
            smoke: { rate: 20, life: [0.6, 1.3], size: [14, 26], speed: [10, 40], color: '#a0a0a8', color2: '#4a4a52', gravity: [0, 70, 0], blend: 'standard', sizeGradient: [[0, 0.4], [0.5, 1], [1, 1.5]] },
        };
    },

    /** Рецепт вида kind с цветами предмета (−1 / undefined — по умолчанию вида) и густотой power. null — такого вида нет. */
    _recipe(kind, color, color2, power) {
        const base = this._kinds()[kind];
        if (!base) return null;
        const R = Object.assign({}, base);
        if (color != null && color >= 0) {
            R.color = this._css(color);
            R.color2 = color2 != null && color2 >= 0 ? this._css(color2) : (base.color2 || R.color);
        } else if (color2 != null && color2 >= 0) R.color2 = this._css(color2);
        const p = power > 0 ? power : 1;
        if (p !== 1) { R.rate = base.rate * p; R.size = [base.size[0] * Math.sqrt(p), base.size[1] * Math.sqrt(p)]; }
        return R;
    },

    /** Приводит стиль предмета «Следы» ({ fx, color, color2, power }) или стиль руки ({ fx, fxColor, fxColor2 }) к одному виду. */
    _norm(style) {
        const s = style || {};
        return { fx: s.fx || 'none', color: s.color != null ? s.color : s.fxColor, color2: s.color2 != null ? s.color2 : s.fxColor2, power: s.power || 1 };
    },

    // ---------------------------------------------------------------------------------------------
    // Следы на кончиках рук
    // ---------------------------------------------------------------------------------------------

    /** След на кончиках: style — предмет «Следы» { fx, color, color2, power } или стиль руки (fx, fxColor, fxColor2); tips() → массив позиций кончиков. */
    trails(style, tips) {
        const fx = this.fx;
        const S = this._norm(style);
        const key = [S.fx, S.color, S.color2, S.power].join('|');
        if (this._style === key && (S.fx === 'none' || (this._trails.length && this._alive(this._trails[0])))) return;
        this.stopTrails();
        this._style = key;
        if (!fx || S.fx === 'none') return;
        const R = this._recipe(S.fx, S.color, S.color2, S.power);
        if (!R) return;
        // 8 систем (рук бывает до 8); у отсутствующей руки поток выключен (rate 0), эмиттер стоит на месте
        for (let i = 0; i < 8; i++) {
            /** @type {any} */ let h = null;
            let on = true;
            h = this._make(Object.assign({ capacity: 60, follow: () => {
                const p = tips()[i];
                if (h && !!p !== on) { on = !!p; h.setRate(on ? R.rate : 0); }
                return p || null;
            } }, R), [0, 0, 0]);
            if (h) this._trails.push(h);
        }
    },

    stopTrails() { for (const h of this._trails) { try { h.dispose(); } catch (e) { /* */ } } this._trails = []; this._style = ''; },

    // ---------------------------------------------------------------------------------------------
    // Аура у головы (редкие шапки и скины)
    // ---------------------------------------------------------------------------------------------

    /** Частицы вокруг головы: style { fx, color, color2, power } (null / fx 'none' — выключить), getPos() → { x, y, z } центра над головой. */
    aura(style, getPos) {
        const fx = this.fx;
        const S = this._norm(style);
        const key = S.fx === 'none' ? '' : [S.fx, S.color, S.color2, S.power].join('|');
        if (key === this._auraKey && (!key || this._alive(this._aura))) return;
        this.stopAura();
        this._auraKey = key;
        if (!fx || !key) return;
        const R = this._recipe(S.fx, S.color, S.color2, S.power);
        if (!R) return;
        this._aura = this._make(Object.assign({}, R, { capacity: 50, rate: R.rate * 0.7, box: [[-17, -12, -17], [17, 16, 17]], follow: getPos }), [0, 0, 0]);
    },

    stopAura() { if (this._aura) { try { this._aura.dispose(); } catch (e) { /* */ } } this._aura = null; this._auraKey = ''; },

    // ---------------------------------------------------------------------------------------------
    // Победный эффект
    // ---------------------------------------------------------------------------------------------

    /** Победный эффект предмета { burst, colors, star, power }; null — исходный (рецепт 'sam-win'). */
    setWin(style) { this._win = style && style.burst ? style : null; },

    /** Вспышка победы в точке WIN-платы по надетому эффекту. */
    win(x, y, z) {
        const st = this._win;
        if (!st) { this.play('sam-win', x, y, z); return; }
        for (const L of this._winLayers(st)) {
            const off = L.off || [0, 0, 0];
            this._make(L, [x + off[0], y + off[1], z + off[2]]);
        }
    },

    /** Слои эффекта: confetti (разноцветные бумажки) | stars (звёзды) | coins (монетный дождь) | fireworks (три залпа). Звезда star — вспышка в центре. */
    _winLayers(st) {
        const cols = (st.colors && st.colors.length ? st.colors : [0xffd84a]).map((h) => this._css(h));
        const n = cols.length, p = st.power > 0 ? st.power : 1;
        const starUrl = st.star === 'rainbow' ? this.RAINBOW : this.STAR;
        const pairs = Math.max(1, Math.min(3, Math.ceil(n / 2)));
        const pair = (i) => [cols[(2 * i) % n], cols[(2 * i + 1) % n]];
        const B = (k) => { const b = Math.max(2, Math.round(k)); return { burst: b, capacity: b + 6 }; };
        /** @type {any[]} */ const L = [];
        if (st.burst === 'stars') {
            for (let i = 0; i < pairs; i++) {
                const [c1, c2] = pair(i);
                L.push(Object.assign(B(26 * p / pairs * 1.6), { life: [0.7, 1.6], size: [20, 40], speed: [200, 540], direction: [[-1, 0.2, -1], [1, 1.3, 1]], color: c1, color2: c2, gravity: [0, -320, 0], texture: starUrl, spin: [-4, 4] }));
            }
            L.push(Object.assign(B(60 * p), { life: [0.5, 1.2], size: [3, 7], speed: [150, 480], color: cols[0], color2: cols[n - 1], gravity: [0, -300, 0] }));
        } else if (st.burst === 'coins') {
            for (let i = 0; i < pairs; i++) {
                const [c1, c2] = pair(i);
                L.push(Object.assign(B(40 * p / pairs * 1.4), { life: [1, 2], size: [14, 22], speed: [300, 700], direction: [[-0.5, 1.2, -0.5], [0.5, 1.6, 0.5]], color: c1, color2: c2, gravity: [0, -900, 0], blend: 'standard', shape: 'coin', spin: [-8, 8] }));
            }
            L.push(Object.assign(B(34 * p), { life: [0.3, 0.8], size: [4, 9], speed: [100, 420], color: cols[0], gravity: [0, -300, 0] }));
        } else if (st.burst === 'fireworks') {
            const shots = [[[0, 300, 0], 0], [[-190, 230, 110], 0.28], [[200, 260, -120], 0.5]];
            shots.forEach(([off, delay], i) => {
                L.push(Object.assign(B(64 * p), { life: [0.9, 1.6], size: [6, 12], speed: [200, 380], direction: [[-1, -1, -1], [1, 1, 1]], color: cols[i % n], color2: cols[(i + 1) % n], gravity: [0, -240, 0], sizeGradient: [[0, 1], [1, 0.3]], delay, off }));
            });
            L.push(Object.assign(B(2), { life: [0.2, 0.34], size: [120, 190], speed: [0, 2], color: cols[0], sizeGradient: [[0, 0.3], [0.5, 1], [1, 0]], off: [0, 300, 0] }));
        } else {   // confetti
            for (let i = 0; i < pairs; i++) {
                const [c1, c2] = pair(i);
                L.push(Object.assign(B(120 * p / pairs), { life: [0.8, 1.8], size: [6, 14], speed: [250, 650], direction: [[-0.6, 1, -0.6], [0.6, 1.4, 0.6]], color: c1, color2: c2, gravity: [0, -700, 0], blend: 'standard', shape: 'confetti', spin: [-6, 6] }));
            }
            L.push(Object.assign(B(30 * p), { life: [0.3, 0.7], size: [3, 6], speed: [150, 480], color: cols[0], color2: cols[n - 1], gravity: [0, -300, 0] }));   // искры поверх конфетти
        }
        if (st.star) {
            L.push(Object.assign(B(24 * p), { life: [0.5, 1.2], size: [18, 34], speed: [120, 360], color: st.star === 'rainbow' ? '#ffffff' : cols[0], gravity: [0, -200, 0], texture: starUrl, spin: [-3, 3] }));
            L.push(Object.assign(B(4), { life: [0.25, 0.45], size: [200, 320], speed: [0, 5], color: st.star === 'rainbow' ? '#ffffff' : '#fff2b0', sizeGradient: [[0, 0.3], [0.4, 1], [1, 0]], texture: starUrl, spin: [-1, 1] }));
        }
        return L;
    },
};
