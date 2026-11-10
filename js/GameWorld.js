// GameWorld.js — объекты лобби и этапов по маркерам карты (Maps.js, правятся в редакторе): тренировочные платы с мишенями
// (train-N), пьедесталы с руками-витринами (pedestal-N), WIN-платы с кубком (win-N, bonus-N), вывески этапов (sign-N),
// порталы на этапы (portal-N), будки магазина / перерождения / подарка (shop, rebirth, daily), доски рекордов (board-N)
// и стрелки-подсказки к цели. Вид и зоны; решения (опыт, победы) принимает Game.

/** @satisfies {Record<string, any>} */
const GameWorld = {
    FONT: '"Nunito", "Arial Black", sans-serif',
    /** px от камеры до надписи: ближе первого — надпись скрыта, дальше второго — видна целиком. */
    LABEL_FADE: [220, 520],
    /** Иконки на табличках мира (картинки UI игры). */
    ICONS: { trophy: 'assets/ui/trophy.webp', lock: 'assets/ui/lock.webp', shop: 'assets/ui/shop.webp', rebirth: 'assets/ui/rebirth.webp', gift: 'assets/ui/daily.webp', check: 'assets/ui/check.webp', teleport: 'assets/ui/portal.webp', grip: 'assets/ui/grip.webp', play: 'assets/ui/play.webp' },
    /** @type {Record<string, HTMLImageElement>} */ _img: {},
    /** Общие материалы реквизита: ключ имя|цвет|свечение|прозрачность. */
    /** @type {Record<string, any>} */ _mats: {},
    /** @type {any[]} */ _matList: [],
    /** Неподвижные детали до слияния: по материалу — список мешей (одна пачка = один draw call). */
    /** @type {Record<string, any[]>} */ _stat: {},
    /** @type {any} */ app: null,
    /** @type {any} */ view: null,
    /** @type {any[]} */ pads: [],
    /** @type {any[]} */ pedestals: [],
    /** @type {any[]} */ wins: [],
    /** @type {any[]} */ portals: [],
    /** @type {any[]} */ booths: [],
    /** @type {any[]} */ boards: [],
    /** @type {any[]} */ signs: [],
    /** @type {any[]} */ stages: [],
    /** @type {any[]} */ labels: [],
    /** @type {any[]} */ spin: [],
    /** @type {any[]} */ meshes: [],
    /** @type {any} */ arrows: null,
    route: /** @type {any[]} */ ([]),
    t: 0,

    // ---------------------------------------------------------------------------------------------
    // Постройка
    // ---------------------------------------------------------------------------------------------

    build(app) {
        this.app = app; this.view = app.location.view;
        this.clear();
        const loc = app.location;
        const M = (name) => loc.markers(name) || [];
        const num = (d) => { const m = /-(\d+)$/.exec(String(d.name)); return m ? Number(m[1]) : 0; };
        const byNum = (prefix) => (loc.map.objects || []).filter(d => d.kind === 'marker' && new RegExp('^' + prefix + '-\\d+$').test(String(d.name))).sort((a, b) => num(a) - num(b));
        const P = (d) => ({ x: Number(d.x) || 0, y: Number(d.h) || 0, z: Number(d.y) || 0, yaw: (Array.isArray(d.rot) ? Number(d.rot[1]) || 0 : 0) * Math.PI / 180, r: (Array.isArray(d.scale) ? Number(d.scale[0]) || 1 : 1) * 100, d });
        this.stages = byNum('stage').map(d => Object.assign(P(d), { n: num(d) }));
        this.route = byNum('route').map(P);
        byNum('train').forEach((d, i) => this._pad(P(d), i));
        byNum('pedestal').forEach((d, i) => this._pedestal(P(d), i));
        byNum('win').forEach(d => this._win(P(d), num(d), false));
        byNum('bonus').forEach(d => this._win(P(d), num(d), true));
        byNum('sign').forEach(d => this._sign(P(d), num(d)));
        byNum('portal').forEach(d => this._portal(P(d), num(d)));
        byNum('board').forEach(d => this._board(P(d), num(d)));
        for (const kind of ['shop', 'rebirth', 'daily']) for (const d of M(kind)) this._booth(P(d), kind);
        this._flushStatic();
        this._arrows();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.redrawLabels()).catch(() => {});
        for (const k of Object.keys(this.ICONS)) {
            if (this._img[k]) continue;
            const im = new Image();
            im.onload = () => this.redrawLabels();
            im.src = this.ICONS[k];
            this._img[k] = im;
        }
    },

    clear() {
        for (const p of this.pedestals) { if (p.arms) p.arms.dispose(); }
        for (const m of this.meshes) { try { World3D.removeObject(this.view, m); } catch (e) { /* */ } m.dispose(); }
        for (const l of this.labels) { if (l.tex) l.tex.dispose(); if (l.mat) l.mat.dispose(); }
        for (const list of Object.values(this._stat)) for (const m of list) m.dispose();
        for (const m of this._matList) { try { m.dispose(); } catch (e) { /* */ } }
        this.pads = []; this.pedestals = []; this.wins = []; this.portals = []; this.booths = []; this.boards = []; this.signs = []; this.labels = []; this.spin = []; this.meshes = [];
        this._mats = {}; this._matList = []; this._stat = {};
        this.arrows = null;
    },

    // Материал реквизита. Одинаковые (имя, цвет, свечение, прозрачность) — один общий материал; unique — свой
    // (его потом меняют у одного объекта: текстура мишени, прозрачность диска портала).
    _mat(name, hex, emissive, alpha, unique) {
        const key = name + '|' + (hex >>> 0) + '|' + (emissive || 0) + '|' + (alpha == null ? '' : alpha);
        if (!unique && this._mats[key]) return this._mats[key];
        const m = new BABYLON.StandardMaterial('gw-' + name, this.view.scene);
        m.diffuseColor = BABYLON.Color3.FromHexString(this._hex(hex));
        m.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
        if (emissive) m.emissiveColor = m.diffuseColor.scale(emissive);
        if (alpha != null) { m.alpha = alpha; m.metadata = { toon: false }; }
        if (!unique) this._mats[key] = m;
        this._matList.push(m);
        return m;
    },
    _hex(h) { return '#' + (h >>> 0 & 0xffffff).toString(16).padStart(6, '0'); },
    _add(mesh, kind) { mesh.isPickable = false; World3D.addObject(this.view, mesh, kind || 'prop'); this.meshes.push(mesh); return mesh; },

    // Неподвижная деталь: копится по материалу и сливается в один меш в _flushStatic (материал — общий из _mat).
    _static(mesh) {
        mesh.isPickable = false;
        const k = String(mesh.material ? mesh.material.uniqueId : 0);
        (this._stat[k] || (this._stat[k] = [])).push(mesh);
        return mesh;
    },

    _flushStatic() {
        for (const list of Object.values(this._stat)) {
            let m = list[0];
            if (list.length > 1) { try { m = BABYLON.Mesh.MergeMeshes(list, true, true) || null; } catch (e) { m = null; } }
            if (!m) { for (const q of list) { q.freezeWorldMatrix(); this._add(q); } continue; }
            m.freezeWorldMatrix();
            this._add(m);
        }
        this._stat = {};
    },

    /**
     * Надпись на плоскости: lines = [{ text, size, color, stroke? }], w × h px мира, billboard — поворачивается к камере по Y.
     * Возвращает { mesh, draw(lines) } — перерисовать с новым текстом.
     */
    label(lines, w, h, opts) {
        const o = opts || {};
        const scene = this.view.scene;
        const res = o.res || 512, aspect = w / h;
        const tw = aspect >= 1 ? res : Math.round(res * aspect), th = aspect >= 1 ? Math.round(res / aspect) : res;
        const tex = new BABYLON.DynamicTexture('gw-label', { width: tw, height: th }, scene, true);
        tex.hasAlpha = true;
        const mat = new BABYLON.StandardMaterial('gw-label-m', scene);
        mat.diffuseColor = new BABYLON.Color3(0, 0, 0); mat.specularColor = new BABYLON.Color3(0, 0, 0);
        mat.emissiveColor = new BABYLON.Color3(0, 0, 0);
        mat.emissiveTexture = tex; mat.opacityTexture = tex; mat.disableLighting = true; mat.backFaceCulling = false;
        mat.metadata = { toon: false };
        const plane = BABYLON.MeshBuilder.CreatePlane('gw-label-p', { width: w, height: h }, scene);
        plane.material = mat;
        if (o.billboard) plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
        plane.isPickable = false;
        this.meshes.push(plane);
        // show — по расстоянию до героя (near), alpha — по расстоянию до камеры (вблизи камеры надпись тает)
        const rec = { mesh: plane, tex, mat, lines, tw, th, w, h, billboard: !!o.billboard, near: 0, show: true, on: true, alpha: 1, draw: (ls) => { rec.lines = ls || rec.lines; this._drawLabel(rec); } };
        this._drawLabel(rec);
        this.labels.push(rec);
        return rec;
    },

    _drawLabel(rec) {
        const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (rec.tex.getContext()));
        if (!ctx) return;
        const W = rec.tw, H = rec.th;
        ctx.clearRect(0, 0, W, H);
        const lines = rec.lines || [];
        const total = lines.reduce((s, l) => s + (l.size || 0.3) * H * 1.08, 0);
        let y = (H - total) / 2;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
        const avail = W * 0.94;
        for (const l of lines) {
            const slot = (l.size || 0.3) * H;
            const font = (f) => `${l.italic ? 'italic ' : ''}900 ${Math.round(f)}px ${this.FONT}`;
            const text = String(l.text == null ? '' : l.text);
            const im = l.icon ? this._img[l.icon] : null, hasIcon = !!(im && im.complete && im.naturalWidth);
            // ширина строки целиком: текст + иконка + зазор + поля плашки (всё растёт с кеглем)
            const width = (f, s) => (s ? ctx.measureText(s).width : 0) + (hasIcon ? f * 1.1 + (s ? f * 0.18 : 0) : 0) + (l.bg ? f * 0.8 : 0) + Math.max(3, f * 0.16);
            // не влезает — кегль уменьшается пропорционально (до 45 % от слота), и только потом — многоточие
            let fs = slot, s = text;
            ctx.font = font(fs);
            for (let k = 0; k < 4; k++) {
                const w = width(fs, s);
                if (w <= avail || fs <= slot * 0.45) break;
                fs = Math.max(slot * 0.45, fs * avail / w * 0.99);
                ctx.font = font(fs);
            }
            if (s && width(fs, s) > avail) { while (s.length > 1 && width(fs, s + '…') > avail) s = s.slice(0, -1); s = s.trimEnd() + '…'; }
            const iw = hasIcon ? fs * 1.1 : 0;
            const tw = s ? ctx.measureText(s).width : 0, gap = iw && s ? fs * 0.18 : 0;
            const cx = W / 2 + (iw + gap) / 2, ty = y + (slot - fs) / 2;
            if (l.bg) { const bw = tw + iw + gap + fs * 0.8; ctx.fillStyle = l.bg; this._round(ctx, (W - bw) / 2, ty - fs * 0.06, bw, fs * 1.12, fs * 0.3); ctx.fill(); }
            if (iw) ctx.drawImage(im, cx - tw / 2 - gap - iw, ty - fs * 0.05, iw, iw);
            if (s) {
                ctx.lineWidth = Math.max(3, fs * 0.16);
                ctx.strokeStyle = l.stroke || '#1b1530';
                ctx.strokeText(s, cx, ty);
                ctx.fillStyle = l.color || '#ffffff';
                ctx.fillText(s, cx, ty);
            }
            y += slot * 1.08;
        }
        rec.tex.update(true);
    },

    _round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); },

    redrawLabels() { for (const l of this.labels) this._drawLabel(l); },

    // ----- тренировочная плата: платформа с множителем и мишень впереди -----
    _pad(p, i) {
        const info = TRAIN_PADS[i] || TRAIN_PADS[TRAIN_PADS.length - 1];
        const sc = this.view.scene, col = info.color;
        const base = BABYLON.MeshBuilder.CreateCylinder('gw-pad', { diameter: 230, height: 14, tessellation: 32 }, sc);
        base.position.set(p.x, p.y + 7, p.z);
        base.material = this._mat('pad', 0x262a3a);
        this._static(base);
        const ring = BABYLON.MeshBuilder.CreateTorus('gw-pad-ring', { diameter: 200, thickness: 14, tessellation: 40 }, sc);
        ring.position.set(p.x, p.y + 16, p.z);
        ring.material = this._mat('pad-ring', col, 0.8);
        this._static(ring);
        const glow = BABYLON.MeshBuilder.CreateDisc('gw-pad-glow', { radius: 92, tessellation: 32 }, sc);
        glow.rotation.x = Math.PI / 2; glow.position.set(p.x, p.y + 15, p.z);
        glow.material = this._mat('pad-glow', col, 0.9, 0.55);
        this._static(glow);
        // мишень: рама на двух стойках и круг «яблочко», лицом к плате (удары SpiderBody._train — внутри круга)
        const fx = Math.cos(p.yaw), fz = Math.sin(p.yaw);
        const bx = p.x + fx * 250, bz = p.z + fz * 250;
        const frame = new BABYLON.TransformNode('gw-board', sc);
        frame.position.set(bx, p.y, bz); frame.rotation.y = -p.yaw;
        const post = (z) => { const m = BABYLON.MeshBuilder.CreateBox('gw-post', { width: 22, height: 330, depth: 22 }, sc); m.position.set(0, 165, z); m.parent = frame; m.material = this._mat('post', 0x3a3f52); return this._static(m); };
        post(-150); post(150);
        const top = BABYLON.MeshBuilder.CreateBox('gw-top', { width: 30, height: 30, depth: 340 }, sc); top.position.set(0, 330, 0); top.parent = frame; top.material = this._mat('post-top', col, 0.3); this._static(top);
        const plate = BABYLON.MeshBuilder.CreateCylinder('gw-target', { diameter: 250, height: 18, tessellation: 40 }, sc);
        plate.rotation.z = Math.PI / 2; plate.position.set(0, 175, 0); plate.parent = frame;
        const tex = new BABYLON.DynamicTexture('gw-target-t', 256, sc, true);
        const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (tex.getContext()));
        const cs = ['#ffffff', this._hex(col), '#ffffff', this._hex(col), '#ffd84a'];
        for (let k = 0; k < 5; k++) { ctx.fillStyle = cs[k]; ctx.beginPath(); ctx.arc(128, 128, 128 - k * 25, 0, 7); ctx.fill(); }
        tex.update(true);
        const pm = this._mat('target', 0xffffff, 0, null, true); pm.diffuseTexture = tex; plate.material = pm;
        this._add(plate);
        const label = this.label([{ text: 'x' + info.mult, size: 0.62, color: this._hex(col) }, { text: info.rebirths ? Lang.t('gw.rebirths', { n: info.rebirths }) : Lang.t('gw.train'), icon: info.rebirths ? 'lock' : '', size: 0.26, color: '#ffffff' }], 300, 170, { billboard: true });
        label.mesh.position.set(bx, p.y + 470, bz);
        label.near = 3200;
        this.pads.push({ x: p.x, y: p.y, z: p.z, r: Math.max(110, p.r * 0.9), yaw: p.yaw, i, info, board: { x: bx - fx * 14, y: p.y + 175, z: bz - fz * 14, nx: -fx, nz: -fz }, plate, label, hit: 0 });
    },

    /** Перерисовать замки плат по числу перерождений игрока. */
    updatePads(rebirths) {
        for (const pad of this.pads) {
            const locked = pad.info.rebirths > rebirths;
            pad.label.draw([{ text: 'x' + pad.info.mult, size: 0.62, color: this._hex(pad.info.color) }, { text: locked ? Lang.t('gw.rebirths', { n: pad.info.rebirths }) : Lang.t('gw.train'), icon: locked ? 'lock' : '', size: 0.26, color: locked ? '#ff8a8a' : '#ffffff' }]);
        }
    },

    /** Удар по мишени платы: качнуть. */
    hitPad(pad) { pad.hit = 1; },

    // ----- пьедестал с руками-витриной -----
    _pedestal(p, i) {
        // витрины — руки из PEDESTAL_ARMS (и за Победы, и за рекламу); нет такого списка — любые руки магазина
        const shown = (typeof PEDESTAL_ARMS !== 'undefined' ? PEDESTAL_ARMS : []).map(id => shopItem(id)).filter(Boolean);
        const items = shown.length ? shown : SHOP_ITEMS.filter(it => it.tab === 'arms' && !it.exclusive);
        const item = items[i % items.length];
        const sc = this.view.scene;
        const base = BABYLON.MeshBuilder.CreateBox('gw-ped', { width: 240, height: 60, depth: 240 }, sc);
        base.position.set(p.x, p.y + 30, p.z);
        base.material = this._mat('ped', 0xf2f4fb);
        this._static(base);
        const glow = BABYLON.MeshBuilder.CreateBox('gw-ped-glow', { width: 250, height: 10, depth: 250 }, sc);
        glow.position.set(p.x, p.y + 64, p.z);
        glow.material = this._mat('ped-glow', parseInt(RARITY[item.rarity].color.slice(1), 16), 0.7);
        this._static(glow);
        // «паук-витрина»: тело без человечка стоит на руках на пьедестале
        const body = new SpiderBody({ arms: 4, collide: false, reach: 260 });
        body.c = Object.assign({}, body.c, { hover: 150 });
        const arms = new SpiderArmsView(this.view, item.arm, { scale: 0.85, maxArms: 4 });
        const label = this.label(this._pedLines(item), 270, 110, { billboard: true });
        label.mesh.position.set(p.x, p.y + 430, p.z);
        label.near = 1600;
        this.pedestals.push({ x: p.x, y: p.y + 64, z: p.z, yaw: p.yaw, item, body, arms, label, placed: false, r: 180, vis: true });
    },

    /**
     * Строки подписи пьедестала: имя (цвет редкости) и состояние — надето / куплено / «За рекламу N» (иконка play; с прогрессом «За рекламу 2/5»,
     * когда уже есть просмотры) / цена в Победах (иконка trophy).
     * @param {any} it предмет-рука @param {(id: string) => boolean} [owns] @param {string | null} [equipped] id надетой руки @param {(id: string) => number} [progress] просмотров рекламы засчитано
     */
    _pedLines(it, owns, equipped, progress) {
        const lang = Lang.code === 'ru' ? 'ru' : 'en', need = (it.price && it.price.ads) || 0;
        let text, icon, color = '#ffe066';
        if (equipped === it.id) { text = Lang.t('gw.equipped'); icon = 'check'; color = '#7dff9a'; }
        else if (owns && owns(it.id)) { text = Lang.t('gw.owned'); icon = 'check'; }
        else if (need) { const done = progress ? progress(it.id) : 0; text = Lang.t(done > 0 ? 'gw.adsP' : 'gw.ads', { n: need, a: done }); icon = 'play'; color = '#9fe8ff'; }
        else { text = String((it.price && it.price.coins) || 0); icon = 'trophy'; }
        return [{ text: it.name[lang], size: 0.34, color: RARITY[it.rarity].color }, { text, icon, size: 0.3, color }];
    },

    /** Подписи пьедесталов: куплено / надето / цена или «За рекламу N». */
    updatePedestals(owns, equipped, progress) {
        for (const ped of this.pedestals) ped.label.draw(this._pedLines(ped.item, owns, equipped, progress));
    },

    // ----- WIN-плата с кубком -----
    _win(p, n, bonus) {
        const sc = this.view.scene;
        const st = STAGES[n - 1] || STAGES[0];
        const amount = bonus ? st.bonus : st.wins;
        const col = bonus ? 0xb35cff : 0xffd21a;
        const pad = BABYLON.MeshBuilder.CreateCylinder('gw-win', { diameter: p.r * 2, height: 16, tessellation: 40 }, sc);
        pad.position.set(p.x, p.y + 8, p.z);
        pad.material = this._mat('win', col, 0.45);
        this._static(pad);
        const ring = BABYLON.MeshBuilder.CreateTorus('gw-win-ring', { diameter: p.r * 2 - 10, thickness: 12, tessellation: 48 }, sc);
        ring.position.set(p.x, p.y + 18, p.z); ring.material = this._mat('win-ring', 0xffffff, 0.9); this._static(ring);
        const cup = this._trophy(col);
        cup.position.set(p.x, p.y + 140, p.z);
        this.spin.push(cup);
        const label = this.label([{ text: (bonus ? '+' + amount + ' ' : '') + Lang.t(bonus ? 'gw.bonus' : 'gw.win'), size: 0.5, color: bonus ? '#d9a8ff' : '#ffe066' }, { text: '+' + amount, icon: 'trophy', size: 0.34, color: '#ffffff' }], 360, 170, { billboard: true });
        label.mesh.position.set(p.x, p.y + 330, p.z);
        this.wins.push({ x: p.x, y: p.y, z: p.z, r: p.r, n, bonus, amount, cup, cd: 0 });
    },

    // Кубок — один меш (5 деталей слиты): вращается и покачивается целиком. Блик — metadata.gsShine (GameStyle
    // возвращает его после World3D.applyMaterialConstants, иначе кубок матовый, как группа 'actor').
    _trophy(col) {
        const sc = this.view.scene;
        const m = this._mat('trophy', col, 0.35); m.specularColor = new BABYLON.Color3(0.8, 0.8, 0.6); m.specularPower = 24;
        m.metadata = Object.assign({}, m.metadata, { gsShine: [0.8, 0.8, 0.6, 24] });
        const parts = [
            BABYLON.MeshBuilder.CreateCylinder('t1', { diameterTop: 70, diameterBottom: 30, height: 60, tessellation: 20 }, sc),
            BABYLON.MeshBuilder.CreateCylinder('t2', { diameter: 12, height: 26, tessellation: 10 }, sc),
            BABYLON.MeshBuilder.CreateBox('t3', { width: 50, height: 12, depth: 50 }, sc),
            BABYLON.MeshBuilder.CreateTorus('t4', { diameter: 34, thickness: 7, tessellation: 16 }, sc),
            BABYLON.MeshBuilder.CreateTorus('t5', { diameter: 34, thickness: 7, tessellation: 16 }, sc),
        ];
        parts[0].position.y = 30; parts[1].position.y = -13; parts[2].position.y = -30;
        parts[3].rotation.x = Math.PI / 2; parts[3].position.set(0, 34, -36);
        parts[4].rotation.x = Math.PI / 2; parts[4].position.set(0, 34, 36);
        for (const q of parts) q.material = m;
        let cup = null;
        try { cup = BABYLON.Mesh.MergeMeshes(parts, true, true); } catch (e) { cup = null; }
        if (!cup) {
            const node = new BABYLON.TransformNode('gw-trophy', sc);
            for (const q of parts) { q.parent = node; this._add(q, 'actor'); }
            return node;
        }
        cup.material = m;
        return this._add(cup, 'actor');
    },

    // ----- вывеска этапа -----
    // Маркер sign-N — центр надписи на лицевой стороне щита у дороги (щит и стойки — детали карты, gen-world.mjs);
    // rot — куда смотрит лицо. Требования этапа — двумя строками, чтобы ни одна не обрезалась.
    _sign(p, n) {
        const st = STAGES[n - 1];
        if (!st) return;
        const rec = Progress.recLevel(st.need);
        const lab = this.label([
            { text: Lang.t('gw.stage', { n }), size: 0.3, color: '#ffffff', italic: true },
            { text: st.name[Lang.code === 'ru' ? 'ru' : 'en'], size: 0.21, color: st.color },
            { text: Lang.t('gw.recLevel', { n: rec }), size: 0.15, color: '#ffe8a0' },
            { text: Lang.t('gw.needGrip', { g: st.need }), icon: 'grip', size: 0.15, color: '#ffe8a0' },
        ], 1000, 420, { res: 768 });
        lab.mesh.position.set(p.x, p.y, p.z);
        lab.mesh.rotation.y = -p.yaw + Math.PI / 2;
        this.signs.push({ n, mesh: lab.mesh, lab });
    },

    // ----- портал на этап -----
    _portal(p, n) {
        const sc = this.view.scene;
        const st = STAGES[n - 1] || STAGES[0];
        const col = parseInt(st.color.slice(1), 16);
        const ring = BABYLON.MeshBuilder.CreateTorus('gw-portal', { diameter: 230, thickness: 26, tessellation: 40 }, sc);
        ring.rotation.x = Math.PI / 2; ring.rotation.z = 0;
        ring.position.set(p.x, p.y + 150, p.z);
        ring.rotation.y = -p.yaw;
        ring.material = this._mat('portal', col, 0.6);
        this._add(ring);
        // диск портала — двусторонний: в правосторонней сцене лицо плоскости смотрит на экран за порталом, а
        // подходят к нему из лобби (с отсечением задних граней диск было не видно)
        const disc = BABYLON.MeshBuilder.CreateDisc('gw-portal-d', { radius: 104, tessellation: 40 }, sc);
        disc.position.set(p.x, p.y + 150, p.z); disc.rotation.y = -p.yaw + Math.PI / 2;
        const dm = this._mat('portal-d', col, 1, 0.6, true); dm.backFaceCulling = false; disc.material = dm; this._add(disc);
        const base = BABYLON.MeshBuilder.CreateCylinder('gw-portal-b', { diameter: 200, height: 16, tessellation: 32 }, sc);
        base.position.set(p.x, p.y + 8, p.z); base.material = this._mat('portal-b', 0x2b2f42); this._static(base);
        const label = this.label([{ text: Lang.t('gw.stage', { n }), size: 0.42, color: st.color }, { text: st.name[Lang.code === 'ru' ? 'ru' : 'en'], size: 0.26, color: '#ffffff' }], 340, 150, { billboard: true });
        label.mesh.position.set(p.x, p.y + 340, p.z);
        this.portals.push({ x: p.x, y: p.y, z: p.z, r: Math.max(100, p.r), n, ring, disc, label, locked: true });
    },

    updatePortals(unlocked) {
        for (const pt of this.portals) {
            pt.locked = !(unlocked >= pt.n);
            const st = STAGES[pt.n - 1] || STAGES[0];
            pt.disc.material.alpha = pt.locked ? 0.18 : 0.6;
            pt.label.draw([{ text: Lang.t('gw.stage', { n: pt.n }), icon: pt.locked ? 'lock' : 'teleport', size: 0.42, color: pt.locked ? '#9aa4b8' : st.color }, { text: st.name[Lang.code === 'ru' ? 'ru' : 'en'], size: 0.26, color: '#ffffff' }]);
        }
    },

    // ----- будка: магазин, перерождение, подарок -----
    _booth(p, kind) {
        const sc = this.view.scene;
        const col = kind === 'shop' ? 0xff4f8b : kind === 'rebirth' ? 0x3da5ff : 0xffb02e;
        const ring = BABYLON.MeshBuilder.CreateTorus('gw-booth', { diameter: p.r * 2, thickness: 12, tessellation: 48 }, sc);
        ring.position.set(p.x, p.y + 10, p.z); ring.material = this._mat('booth', col, 0.8); this._static(ring);
        const disc = BABYLON.MeshBuilder.CreateDisc('gw-booth-d', { radius: p.r - 6, tessellation: 40 }, sc);
        disc.rotation.x = Math.PI / 2; disc.position.set(p.x, p.y + 6, p.z); disc.material = this._mat('booth-d', col, 0.8, 0.3); this._static(disc);
        const icon = kind === 'shop' ? 'shop' : kind === 'rebirth' ? 'rebirth' : 'gift';
        const label = this.label([{ text: '', icon, size: 0.5 }, { text: Lang.t('gw.' + kind), size: 0.32, color: this._hex(col) }], 360, 220, { billboard: true });
        label.mesh.position.set(p.x, p.y + 330, p.z);
        this.booths.push({ x: p.x, y: p.y, z: p.z, r: p.r, kind, label, inside: false });
    },

    // ----- доска рекордов -----
    // Цветной щит — только вид; твёрдость (герой не проходит насквозь, камера не уходит за щит) даёт деталь карты
    // внутри щита (gen-world.mjs: 'lobby boards').
    _board(p, n) {
        const lab = this.label([{ text: Lang.t(n === 1 ? 'gw.mostWins' : 'gw.mostRebirths'), size: 0.12, color: '#ffe066' }], 600, 420, { res: 512 });
        lab.mesh.position.set(p.x, p.y + 330, p.z);
        lab.mesh.rotation.y = -p.yaw + Math.PI / 2;
        const back = BABYLON.MeshBuilder.CreateBox('gw-board-b', { width: 640, height: 460, depth: 20 }, this.view.scene);
        back.position.set(p.x - Math.cos(p.yaw) * 12, p.y + 330, p.z - Math.sin(p.yaw) * 12); back.rotation.y = -p.yaw + Math.PI / 2;
        back.material = this._mat('board', n === 1 ? 0xffb02e : 0xff4fb4, 0.25); this._static(back);
        this.boards.push({ n, lab });
    },

    /** rows = [{ name, value, me }] — первые 8. */
    updateBoard(n, rows) {
        const b = this.boards.find(q => q.n === n);
        if (!b) return;
        const lines = [{ text: Lang.t(n === 1 ? 'gw.mostWins' : 'gw.mostRebirths'), size: 0.12, color: '#ffe066' }];
        rows.slice(0, 8).forEach((r, i) => lines.push({ text: `${i + 1}. ${r.name} — ${r.value}`, size: 0.085, color: r.me ? '#7dff9a' : '#ffffff' }));
        b.lab.draw(lines);
    },

    // ----- стрелки к цели (белые шевроны на земле, как в обучении) -----
    // Шеврон «>» острием по локальной +X: _updateArrows кладёт +X вдоль пути к цели. Поворот Babylon RotationY(a)
    // ведёт +X в (cos a, −sin a) по (x, z): брус с a = −0.75 в (8, 0, −15) тянется от (−8.8, −30.7) к (24.8, 0.7),
    // брус с a = +0.75 в (8, 0, 15) — от (−8.8, 30.7) к (24.8, −0.7): концы сходятся на x ≈ +25, хвосты — на x ≈ −9.
    _arrows() {
        const sc = this.view.scene;
        const shape = BABYLON.MeshBuilder.CreateBox('gw-arrow', { width: 46, height: 6, depth: 14 }, sc);
        const b2 = BABYLON.MeshBuilder.CreateBox('gw-arrow2', { width: 46, height: 6, depth: 14 }, sc);
        shape.rotation.y = -0.75; shape.position.set(8, 0, -15);
        b2.rotation.y = 0.75; b2.position.set(8, 0, 15);
        const m = BABYLON.Mesh.MergeMeshes([shape, b2], true, true);
        m.material = this._mat('arrow', 0xffffff, 0.85);
        m.alwaysSelectAsActiveMesh = true;
        const cap = 40, buf = new Float32Array(cap * 16);
        m.thinInstanceSetBuffer('matrix', buf, 16, false);
        m.thinInstanceCount = 0;
        this._add(m, 'actor');
        this.arrows = { mesh: m, buf, cap, target: null, t: 0 };
    },

    /** Цель стрелок: { x, y, z } (мир) или null. */
    setGuide(target) { if (this.arrows) this.arrows.target = target; },

    _updateArrows(dt, hero) {
        const A = this.arrows;
        if (!A) return;
        A.t += dt;
        let n = 0;
        if (A.target && hero) {
            // путь: от героя по точкам маршрута к цели (если цель дальше по трассе), иначе прямо
            const pts = [{ x: hero.x, y: hero.feetY(), z: hero.z }];
            const tgt = A.target;
            if (this.route.length && tgt.x - hero.x > 800) {
                for (const r of this.route) if (r.x > hero.x + 150 && r.x < tgt.x - 100 && pts.length < 12) pts.push({ x: r.x, y: r.y, z: r.z });
            }
            pts.push({ x: tgt.x, y: tgt.y, z: tgt.z });
            const step = 95;
            let off = (A.t * 160) % step;
            for (let s = 0; s < pts.length - 1 && n < A.cap; s++) {
                const a = pts[s], b = pts[s + 1];
                const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz);
                if (L < 1) continue;
                const yaw = Math.atan2(dz, dx), ca = Math.cos(yaw), sa = Math.sin(yaw);
                const pitch = Math.atan2(dy, Math.hypot(dx, dz));
                for (let d = off + (s === 0 ? 120 : 0); d < L && n < A.cap; d += step) {
                    const x = a.x + dx * d / L, y = a.y + dy * d / L + 12 + Math.sin(A.t * 6 - d / 60) * 4, z = a.z + dz * d / L;
                    const o = n * 16, B = A.buf, cp = Math.cos(pitch), sp = Math.sin(pitch);
                    const sc = 1 + 0.12 * Math.sin(A.t * 8 - d / 50);
                    B[o] = ca * cp * sc; B[o + 1] = sp * sc; B[o + 2] = sa * cp * sc; B[o + 3] = 0;
                    B[o + 4] = -ca * sp; B[o + 5] = cp; B[o + 6] = -sa * sp; B[o + 7] = 0;
                    B[o + 8] = -sa * sc; B[o + 9] = 0; B[o + 10] = ca * sc; B[o + 11] = 0;
                    B[o + 12] = x; B[o + 13] = y; B[o + 14] = z; B[o + 15] = 1;
                    n++;
                }
                off = (off + step - (L % step)) % step;
            }
        }
        A.mesh.thinInstanceCount = n;
        if (n) A.mesh.thinInstanceBufferUpdated('matrix');
        // без цели шаблон не рисуется (иначе шеврон стоит в начале координат)
        if (A.mesh.isEnabled() !== n > 0) A.mesh.setEnabled(n > 0);
    },

    // ---------------------------------------------------------------------------------------------
    // Кадр
    // ---------------------------------------------------------------------------------------------

    update(dt, hero) {
        this.t += dt;
        for (const c of this.spin) { c.rotation.y += dt * 1.6; c.position.y += Math.sin(this.t * 2.4) * 0.35; }
        for (const pad of this.pads) {
            if (pad.hit > 0) { pad.hit = Math.max(0, pad.hit - dt * 6); pad.plate.scaling.setAll(1 + pad.hit * 0.08); }
        }
        for (const pt of this.portals) pt.ring.rotation.y += dt * (pt.locked ? 0.2 : 1.4);
        for (const w of this.wins) if (w.cd > 0) w.cd -= dt;
        // витрины рисуются и оживают только ближайшие к герою (у каждой ~8 мешей с тенями): не дальше
        // PED_NEAR и не больше PED_MAX штук
        const PED_NEAR = 2400, PED_MAX = 6;
        const order = hero ? this.pedestals.map(q => ({ q, d: Math.hypot(q.x - hero.x, q.z - hero.z) })).sort((a, b) => a.d - b.d) : this.pedestals.map(q => ({ q, d: 0 }));
        order.forEach((o, k) => { o.q.want = o.d < PED_NEAR && k < PED_MAX; });
        for (const ped of this.pedestals) {
            const near = !!ped.want;
            if (near !== ped.vis) { ped.vis = near; ped.arms.setVisible(near); }
            if (!near) continue;
            const b = ped.body;
            if (!ped.placed) { b.x = ped.x; b.z = ped.z; b.y = ped.y + 150; b.yaw = ped.yaw; b._roots(); for (const a of b.arms) { a.tip = [ped.x + Math.cos(ped.yaw + a.theta) * 95, ped.y, ped.z + Math.sin(ped.yaw + a.theta) * 95]; a.n = [0, 1, 0]; a.state = 'plant'; a.grip = 1; a.fresh = true; } ped.placed = true; }
            b.t += dt;
            b.y = ped.y + 150 + Math.sin(this.t * 2 + ped.x) * 10;
            b.yaw = ped.yaw + Math.sin(this.t * 0.6 + ped.z) * 0.25;
            b._roots();
            for (const a of b.arms) b._chain(a, Math.min(dt, 1 / 30), b.c);
            ped.arms.update(b, dt);
        }
        this._updateArrows(dt, hero);
        // подписи «вблизи» (пьедесталы, платы) — только рядом с героем, иначе каша из текста
        if (hero && (this._lt = (this._lt || 0) - dt) <= 0) {
            this._lt = 0.25;
            for (const l of this.labels) l.show = !l.near || Math.hypot(l.mesh.position.x - hero.x, l.mesh.position.z - hero.z) < l.near;
        }
        // у самой камеры надпись тает: камера не пролетает сквозь огромные буквы вывесок и табличек
        const cam = this.view.scene && this.view.scene.activeCamera;
        const cp = cam ? (cam.globalPosition || cam.position) : null;
        for (const l of this.labels) {
            const a = cp ? Math.max(0, Math.min(1, (this._camDist(l, cp) - this.LABEL_FADE[0]) / (this.LABEL_FADE[1] - this.LABEL_FADE[0]))) : 1;
            const on = l.show && a > 0.02;
            if (on !== l.on) { l.on = on; l.mesh.setEnabled(on); }
            if (on && Math.abs(a - l.alpha) > 0.02) { l.alpha = a; l.mat.alpha = a; }
            else if (on && a === 1 && l.alpha !== 1) { l.alpha = 1; l.mat.alpha = 1; }
        }
    },

    // Расстояние от точки P до прямоугольника надписи (w × h). Плоскость: нормаль — локальная Z после rotation.y,
    // вдоль — локальная X; у надписи-«билборда» плоскость всегда лицом к камере — считается только высота.
    _camDist(l, P) {
        const C = l.mesh.position, dx = P.x - C.x, dy = P.y - C.y, dz = P.z - C.z;
        const ey = Math.max(0, Math.abs(dy) - l.h / 2);
        if (l.billboard) return Math.hypot(Math.hypot(dx, dz), ey);
        const t = l.mesh.rotation.y, s = Math.sin(t), c = Math.cos(t);
        const dn = dx * s + dz * c, du = dx * c - dz * s;
        return Math.hypot(dn, Math.max(0, Math.abs(du) - l.w / 2), ey);
    },

    // ---------------------------------------------------------------------------------------------
    // Зоны
    // ---------------------------------------------------------------------------------------------

    /** Плата под героем (на полу рядом с центром) или null. */
    padAt(x, y, z) { for (const p of this.pads) if (Math.hypot(x - p.x, z - p.z) < p.r && Math.abs(y - p.y) < 160) return p; return null; },
    winAt(x, y, z) { for (const w of this.wins) if (Math.hypot(x - w.x, z - w.z) < w.r && y - w.y > -60 && y - w.y < 260) return w; return null; },
    portalAt(x, y, z) { for (const p of this.portals) if (Math.hypot(x - p.x, z - p.z) < p.r && Math.abs(y - p.y) < 220) return p; return null; },
    /** Пьедестал с руками-витриной под героем (встал на него — магазин открывается на этих руках). */
    pedestalAt(x, y, z) { for (const p of this.pedestals) if (Math.hypot(x - p.x, z - p.z) < 135 && Math.abs(y - p.y) < 260) return p; return null; },
    boothAt(x, y, z) { for (const b of this.booths) if (Math.hypot(x - b.x, z - b.z) < b.r && Math.abs(y - b.y) < 220) return b; return null; },
    /** Номер этапа по x (0 — лобби). */
    stageAt(x) { let n = 0; for (const s of this.stages) if (x >= s.x - 50) n = Math.max(n, s.n); return n; },
    stageMarker(n) { return this.stages.find(s => s.n === n) || null; },
    winPad(n) { return this.wins.find(w => w.n === n && !w.bonus) || null; },
};

Object.assign(LANG_STRINGS.ru, {
    'gw.train': 'Тренируйся!', 'gw.rebirths': '{n} перерожд.', 'gw.equipped': 'Надето', 'gw.owned': 'Куплено', 'gw.win': 'ПОБЕДА', 'gw.bonus': 'БОНУС',
    'gw.stage': 'ЭТАП {n}', 'gw.rec': 'Рекомендуемый уровень {n} • Нужно {g} хватки', 'gw.recLevel': 'Рекомендуемый уровень {n}', 'gw.needGrip': 'Нужно {g} хватки', 'gw.shop': 'Магазин', 'gw.rebirth': 'Перерождение', 'gw.daily': 'Подарок дня',
    'gw.mostWins': 'Больше всех побед', 'gw.mostRebirths': 'Больше всех перерождений',
    'gw.ads': 'За рекламу {n}', 'gw.adsP': 'За рекламу {a}/{n}',
});
Object.assign(LANG_STRINGS.en, {
    'gw.train': 'Train here!', 'gw.rebirths': '{n} rebirths', 'gw.equipped': 'Equipped', 'gw.owned': 'Owned', 'gw.win': 'WIN', 'gw.bonus': 'BONUS',
    'gw.stage': 'STAGE {n}', 'gw.rec': 'Recommended level {n} • Needs {g} grip', 'gw.recLevel': 'Recommended level {n}', 'gw.needGrip': 'Needs {g} grip', 'gw.shop': 'Shop', 'gw.rebirth': 'Rebirth', 'gw.daily': 'Daily gift',
    'gw.mostWins': 'Most Wins', 'gw.mostRebirths': 'Most Rebirths',
    'gw.ads': '{n} ads', 'gw.adsP': 'Ads {a}/{n}',
});
