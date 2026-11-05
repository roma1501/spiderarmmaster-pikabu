// GameBots.js — боты-«игроки» Spider Arm Master: у каждого своё тело на руках (SpiderBody), скин и руки из каталога,
// уровень, ник и чат. Цели: тренироваться на плате лобби, лезть на посильный этап по маршруту route-N (сами хватаются
// за стену, когда точка маршрута выше), бродить. Иногда берут этап не по силам — кончается хватка, падают, ругаются
// в чате и идут качаться. Дальше BOT_SIM_DIST от героя бот спит; долго спит — тихо переезжает к герою (старт его
// этапа или лобби), без «вышел/зашёл». Заходят и выходят редко и только рядом с героем (life бота — минуты).
// Бот не телепортируется вверх по стене: застрял под стеной — назад на прошлую точку, дважды — сдаётся и идёт качаться.
// Ники и реплики — ObbyBots.NAMES / ObbyChat (+ свои строки про руки и хватку), таблички — ObbyNameTags.

/** @satisfies {Record<string, any>} */
const GameBots = {
    /** @type {any[]} */ list: [],
    /** @type {any} */ app: null,
    /** @type {any} */ tags: null,
    /** @type {any} */ opts: {},
    count: 0,
    _id: 0,
    _chatT: 6,
    /** @type {Set<string>} */ _used: new Set(),
    t: 0,

    cfg() {
        const U = 'undefined', mobile = typeof IS_MOBILE !== U && IS_MOBILE;
        let n = mobile ? (typeof SPIDER_BOTS_MOBILE !== U ? SPIDER_BOTS_MOBILE : 3) : (typeof SPIDER_BOTS !== U ? SPIDER_BOTS : 6);
        if (typeof Quality !== U && Quality.level === 0) n = Math.min(n, 2);
        return { count: n, sim: typeof SPIDER_BOT_SIM_DIST !== U ? SPIDER_BOT_SIM_DIST : 7000, chat: typeof SPIDER_BOT_CHAT_SEC !== U ? SPIDER_BOT_CHAT_SEC : 9 };
    },

    /** opts: { app, tags (ObbyNameTags), onChat(bot, text), onEvent(type, bot, data), hero: () => SpiderBody } */
    init(opts) {
        this.clear();
        this.opts = opts || {};
        this.app = this.opts.app;
        this.tags = this.opts.tags;
        const ru = Lang.code === 'ru';
        ObbyChat.add(ru ? 'ru' : 'en', 'grip', ru
            ? ['хватка кончилась((', 'ну почти долез!', 'мне нужно больше хватки', 'пойду качаться', 'стена слишком высокая', 'руки устали', 'ещё пару уровней и залезу', 'аааа падаю']
            : ['out of grip again', 'so close!!', 'need more grip', 'going to train', 'this wall is too tall', 'my arms are tired', 'two more levels and i got it', 'aaaa falling']);
        ObbyChat.add(ru ? 'ru' : 'en', 'climbTalk', ru
            ? ['у кого сколько рук?', 'у меня уже 5 рук', 'кто на каком этапе?', 'на x10 качаться топ', 'какие руки лучше?', 'хочу руки Повелителя бездны', 'перерождение того стоит', 'лезу в небоскрёбы', 'ледяной пик скользкий', 'го наперегонки до кубка', 'кто купил Призму?', 'тренируйтесь на мишенях']
            : ['how many arms u got?', 'i have 5 arms now', 'what stage r u on?', 'x10 pad is the best', 'which arms are best?', 'i want the Void Lord arms', 'rebirth is worth it', 'climbing the skyscrapers', 'frozen peak is slippery', 'race to the trophy?', 'who bought Prism?', 'train on the targets']);
        ObbyChat.add(ru ? 'ru' : 'en', 'winTop', ru
            ? ['есть кубок!', 'залез!!', 'изи победа', 'ураа победа', 'гг', 'кубок мой', 'следующий этап!']
            : ['got the trophy!', 'made it!!', 'ez win', 'yay win', 'gg', 'trophy is mine', 'next stage!']);
        ObbyChat.add(ru ? 'ru' : 'en', 'trainTalk', ru
            ? ['качаюсь', 'бью мишень', 'ещё уровень', 'скоро новая рука', 'тренировка = сила']
            : ['training', 'punching the target', 'one more level', 'new arm soon', 'training = power']);
    },

    clear() {
        for (const b of this.list) this._dispose(b);
        this.list = []; this._used.clear(); this.count = 0;
    },

    build() {
        this.count = this.cfg().count;
        for (let i = 0; i < this.count; i++) this._spawn(true);
    },

    setCount(n) {
        this.count = n;
        while (this.list.length > n) this._leave(this.list[this.list.length - 1], true);
    },

    _rnd() { return Math.random(); },
    _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

    _name() {
        const names = ObbyBots.NAMES[Lang.code === 'ru' ? 'ru' : 'en'];
        for (let k = 0; k < 20; k++) { const n = this._pick(names); if (!this._used.has(n)) { this._used.add(n); return n; } }
        return this._pick(names) + (10 + Math.floor(Math.random() * 89));
    },

    // Новый бот рядом с героем: на старте этапа героя (уровень — по силам этому этапу) или в лобби у спавна —
    // всегда в радиусе BOT_SIM_DIST, иначе он с первого кадра спит.
    _spawn(initial) {
        const hero = this.opts.hero && this.opts.hero();
        const heroStage = hero ? GameWorld.stageAt(hero.x) : 0;
        let level = Math.max(1, Math.round(1 + Math.pow(Math.random(), 1.6) * 26));
        if (heroStage > 0) level = this._stageLevel(level, heroStage);
        const skins = SHOP_ITEMS.filter(i => i.tab === 'skins' && !i.exclusive), arms = SHOP_ITEMS.filter(i => i.tab === 'arms' && !i.exclusive);
        const armItem = arms[Math.min(arms.length - 1, Math.floor(Math.random() * Math.min(arms.length, 2 + level / 2.2)))];
        const skin = this._pick(skins);
        const view = this.app.location.view;
        const body = new SpiderBody({ arms: Progress.arms(level), collide: true, armCollide: false });
        body.gripMax = body.grip = Progress.grip(level);
        const b = {
            id: ++this._id, name: this._name(), level, rebirths: Math.floor(level / 9), wins: Math.floor(level * level * 0.7 + Math.random() * 30),
            body, avatar: SpiderAvatar.create(view, skin.look), arms: new SpiderArmsView(view, armItem.arm, { maxArms: 8 }),
            goal: null, route: 0, routeT: 0, best: Infinity, fails: 0, stuck: 0, lastX: 0, lastY: 0, lastZ: 0, far: 0, life: this._life(), cheer: 0, sleep: false, chatCd: 3,
        };
        this._placeNear(b, heroStage);
        this.tags && this.tags.add(b.id, b.name);
        this.list.push(b);
        this._newGoal(b);
        if (!initial && this.opts.onEvent) this.opts.onEvent('join', b);
        return b;
    },

    /** Сколько секунд бот «в игре», прежде чем может выйти (6–18 мин): заходы и выходы — редкие. */
    _life() { return 360 + Math.random() * 720; },

    /** Уровень бота на этапе stage: не ниже рекомендуемого − 1 (иначе он там только падает). */
    _stageLevel(level, stage) {
        const st = STAGES[stage - 1];
        return st ? Math.max(level, Progress.recLevel(st.need) - 1 + Math.floor(Math.random() * 6)) : level;
    },

    // Поставить бота рядом с героем: старт этапа stage (маркер stage-N) или лобби у спавна. В лобби из нескольких
    // случайных мест берётся самое далёкое от героя (но в радиусе BOT_SIM_DIST) — бот не возникает у него перед носом.
    _placeNear(b, stage) {
        const st = stage > 0 ? GameWorld.stageMarker(stage) : null;
        let where;
        if (st) where = { x: st.x, y: st.y, z: st.z };
        else {
            const spawn = this.app.location.marker('spawn');
            const sx = spawn ? spawn.x : 600, sz = spawn ? spawn.y : 3000, sy = spawn ? spawn.h : 0;
            const hero = this.opts.hero && this.opts.hero(), sim = this.cfg().sim - 500;
            let best = -1;
            for (let k = 0; k < 4; k++) {
                const w = { x: sx + 300 + Math.random() * 2500, y: sy, z: sz + (Math.random() - 0.5) * 1600 };
                const d = hero ? Math.hypot(w.x - hero.x, w.z - hero.z) : 0;
                if (!where || (d > best && d < sim)) { where = w; best = d; }
            }
        }
        b.body.place(where.x + (Math.random() - 0.5) * 300, where.y + 300, where.z + (Math.random() - 0.5) * 300, Math.random() * 6.28);
    },

    // Бот долго спал вдали от героя — тихо переезжает к нему (имя, скин и победы те же; на этапе героя — уровень по силам).
    _relocate(b, stage) {
        if (stage > 0) {
            const L = this._stageLevel(b.level, stage);
            if (L !== b.level) { b.level = L; b.body.setArms(Progress.arms(L)); b.body.gripMax = Progress.grip(L); b.rebirths = Math.max(b.rebirths, Math.floor(L / 9)); }
        }
        b.body.grip = b.body.gripMax;
        b.cheer = 0; b.far = 0;
        this._placeNear(b, stage);
        this._newGoal(b);
    },

    /** Последний этап, который бот проходит: уровень не ниже рекомендуемого (хватка ≥ 1.1 · need — как Progress.recLevel). */
    _feasibleStage(b) {
        let s = 0;
        for (const st of STAGES) if (b.level >= Progress.recLevel(st.need)) s = st.id;
        return s;
    },

    _newGoal(b) {
        const body = b.body;
        const stage = GameWorld.stageAt(body.x);
        const feasible = this._feasibleStage(b);
        const r = Math.random();
        if (stage > 0) {
            // на трассе: лезть дальше (иногда — на этап сложнее)
            const target = Math.max(stage, Math.min(STAGES.length, feasible + (Math.random() < 0.25 ? 1 : 0)));
            b.goal = { kind: 'climb', stage: target };
        } else if (r < 0.45 && GameWorld.pads.length) {
            const ok = GameWorld.pads.filter(p => p.info.rebirths <= b.rebirths);
            const pad = ok.length ? ok[Math.min(ok.length - 1, Math.floor(Math.pow(Math.random(), 0.5) * ok.length))] : GameWorld.pads[0];
            b.goal = { kind: 'train', pad, time: 8 + Math.random() * 18 };
        } else if (r < 0.8 && feasible > 0) {
            b.goal = { kind: 'climb', stage: 1 + Math.floor(Math.random() * feasible) };
            // из лобби на этап выше первого — порталом, как игрок (иначе шёл бы через все этапы)
            if (b.goal.stage > 1) { const st = GameWorld.stageMarker(b.goal.stage); if (st) body.place(st.x, st.y + 260, st.z, st.yaw); }
        } else {
            const spawn = this.app.location.marker('spawn');
            b.goal = { kind: 'wander', x: (spawn ? spawn.x : 600) + Math.random() * 5000, z: (spawn ? spawn.y : 3000) + (Math.random() - 0.5) * 2200, time: 6 + Math.random() * 8 };
        }
        b.route = this._routeIndex(body.x);
        b.stuck = 0; b.routeT = 0; b.best = Infinity; b.fails = 0;
    },

    _routeIndex(x) {
        const R = GameWorld.route;
        for (let i = 0; i < R.length; i++) if (R[i].x > x + 60) return i;
        return R.length - 1;
    },

    _leave(b, silent) {
        if (!silent && this.opts.onEvent) this.opts.onEvent('leave', b);
        this._dispose(b);
        this._used.delete(b.name);
        this.list = this.list.filter(q => q !== b);
    },

    _dispose(b) {
        try { b.avatar.dispose(); } catch (e) { /* */ }
        try { b.arms.dispose(); } catch (e) { /* */ }
        if (this.tags) this.tags.remove(b.id);
    },

    _say(b, cat, vars) {
        if (b.chatCd > 0) return;
        const text = ObbyChat.pick(Lang.code, cat, Math.random, vars);
        if (!text) return;
        b.chatCd = 6 + Math.random() * 6;
        if (this.tags) this.tags.say(b.id, text, 3.5);
        if (this.opts.onChat) this.opts.onChat(b, text);
    },

    // ---------------------------------------------------------------------------------------------
    // Кадр
    // ---------------------------------------------------------------------------------------------

    update(dt) {
        this.t += dt;
        const cfg = this.cfg();
        const hero = this.opts.hero && this.opts.hero();
        // фоновая болтовня
        this._chatT -= dt;
        if (this._chatT <= 0 && this.list.length) {
            this._chatT = cfg.chat * (0.6 + Math.random() * 0.9);
            const b = this._pick(this.list);
            if (!b.sleep) this._say(b, b.goal && b.goal.kind === 'train' ? (Math.random() < 0.5 ? 'trainTalk' : 'climbTalk') : (Math.random() < 0.6 ? 'climbTalk' : 'talk'));
        }
        const heroStage = hero ? GameWorld.stageAt(hero.x) : 0;
        for (const b of this.list.slice()) {
            b.chatCd -= dt; b.life -= dt;
            const d = hero ? Math.hypot(b.body.x - hero.x, b.body.z - hero.z) : 0;
            const sleep = d > cfg.sim;
            if (sleep !== b.sleep) { b.sleep = sleep; b.avatar.root.setEnabled(!sleep); b.arms.setVisible(!sleep); if (sleep && this.tags) this.tags.hide(b.id); }
            b.far = sleep ? b.far + dt : 0;
            // долго вдали — не «выход», а тихий переезд к герою (без чата и без нового ника)
            if (b.far > 12) { this._relocate(b, heroStage); continue; }
            // выход — только рядом с героем (его видно в чате), редко
            if (b.life < 0 && !sleep && Math.random() < dt * 0.1) { this._leave(b, false); continue; }
            if (sleep) continue;
            this._think(b, dt);
            this._view(b, dt);
        }
        while (this.list.length < this.count) this._spawn(false);
    },

    _think(b, dt) {
        const body = b.body, g = b.goal;
        const cmd = { mx: 0, mz: 0, climb: false, speedMul: 0.85 + (b.id % 5) * 0.04 };
        if (b.cheer > 0) {
            b.cheer -= dt;
            body.step(dt, cmd);
            if (b.cheer <= 0) {
                // после кубка — как у игрока: телепорт в лобби (дальше бот идёт качаться или порталом на свой этап)
                this._teleportLobby(b);
            }
            return;
        }
        if (!g) { this._newGoal(b); return; }
        let tx = 0, ty = 0, tz = 0, arrive = 120;
        if (g.kind === 'train') {
            tx = g.pad.x; ty = g.pad.y; tz = g.pad.z; arrive = 70;
            if (body.mode === 'train') {
                body.step(dt, cmd);
                g.time -= dt;
                if (g.time <= 0) { body.stopTrain(); this._newGoal(b); }
                return;
            }
        } else if (g.kind === 'wander') {
            tx = g.x; ty = body.y; tz = g.z; g.time -= dt;
            if (g.time <= 0) { this._newGoal(b); return; }
        } else {
            const R = GameWorld.route, win = GameWorld.winPad(g.stage);
            if (!win) { this._newGoal(b); return; }
            let p = R[b.route];
            while (p && p.x > win.x + 40) p = null;
            if (!p) { tx = win.x; ty = win.y; tz = win.z; arrive = 60; }
            else { tx = p.x; ty = p.y; tz = p.z; }
            const dxz = Math.hypot(tx - body.x, tz - body.z), feet = body.feetY();
            if (p && dxz < 150 && feet > ty - 140) { b.route++; b.stuck = 0; b.routeT = 0; b.best = Infinity; b.fails = 0; }
            else if (p) {
                // таймер — по прогрессу, а не по часам: пока остаток пути (по полу + вверх) убывает, бот в деле
                // (стены этапов 5–8 лезут 15–25 с)
                const left = dxz + Math.max(0, ty - feet);
                if (left < b.best - 40) { b.best = left; b.routeT = 0; }
                else b.routeT += dt;
                if (b.routeT > 14) {
                    b.routeT = 0; b.best = Infinity;
                    if (ty - feet > 150) {
                        // точка выше — на стену не телепортируем: назад на прошлую точку; второй раз — сдаётся
                        b.fails = (b.fails || 0) + 1;
                        if (b.fails >= 2) { this._say(b, 'grip'); this._teleportLobby(b); return; }
                        const q = R[Math.max(0, b.route - 1)];
                        if (q) body.place(q.x, q.y + 250, q.z, body.yaw);
                    } else { body.place(p.x, p.y + 260, p.z, body.yaw); b.route++; }   // по полу — «переподключение» на точку
                }
            }
            if (GameWorld.winAt(body.x, feet, body.z) === win) { this._win(b, win); return; }
            // точка выше — хватаемся за стену
            // хвататься, только если цель выше (иначе бот, сошедший с уступа, залезал бы обратно бесконечно)
            const higher = ty - feet > 150;
            if (higher || (body.mode === 'climb' && ty - feet > -60)) cmd.climb = true;
            // упал без хватки на этап не по силам (уровень ниже рекомендуемого) — сдаётся
            if (body.mode === 'air' && body.grip <= 0 && b.level < Progress.recLevel((STAGES[g.stage - 1] || STAGES[0]).need)) g.giveUp = true;
            if (g.giveUp && body.mode === 'walk') { this._say(b, 'grip'); this._teleportLobby(b); return; }
        }
        const dx = tx - body.x, dz = tz - body.z, l = Math.hypot(dx, dz);
        if (l > arrive) { cmd.mx = dx / l; cmd.mz = dz / l; }
        else if (g.kind === 'train') {
            const pad = g.pad;
            if (pad.info.rebirths <= b.rebirths) body.startTrain(pad.board.x, pad.board.y, pad.board.z, pad.board.nx, pad.board.nz);
            else this._newGoal(b);
        } else if (g.kind === 'wander') this._newGoal(b);
        body.step(dt, cmd);
        // застрял: ни вперёд, ни вверх 7 с — «переподключился» на точку маршрута
        const moved = Math.hypot(body.x - b.lastX, body.z - b.lastZ) + Math.abs(body.y - b.lastY);
        if (moved > 40) { b.stuck = 0; b.lastX = body.x; b.lastY = body.y; b.lastZ = body.z; }
        else b.stuck += dt;
        if (b.stuck > 7) {
            b.stuck = 0;
            if (g.kind === 'climb') { const p = GameWorld.route[Math.max(0, b.route - 1)] || GameWorld.stageMarker(g.stage); if (p) body.place(p.x, p.y + 250, p.z, body.yaw); b.routeT = 0; b.best = Infinity; }
            else this._newGoal(b);
        }
        if (body.y < ObbyCourse.killY + 200 || ObbyCourse.killCause(body.x, body.feetY(), body.z, 30, 160)) {
            const st = GameWorld.stageMarker(Math.max(1, GameWorld.stageAt(body.x)));
            if (st) body.place(st.x, st.y + 250, st.z, 0);
            if (this.opts.onEvent) this.opts.onEvent('fall', b);
        }
        if (body.mode === 'air' && body.grip <= 0 && Math.random() < dt * 0.5) this._say(b, 'grip');
    },

    _win(b, win) {
        b.wins += win.amount;
        b.cheer = 2.2;
        this._say(b, 'winTop');
        if (this.opts.onEvent) this.opts.onEvent('win', b, { stage: win.n, amount: win.amount });
    },

    _teleportLobby(b) {
        const spawn = this.app.location.marker('spawn');
        const x = (spawn ? spawn.x : 600) + 200 + Math.random() * 2400, z = (spawn ? spawn.y : 3000) + (Math.random() - 0.5) * 1400;
        b.body.place(x, (spawn ? spawn.h : 0) + 300, z, Math.random() * 6.28);
        this._newGoal(b);
        // иногда растёт уровень — бот «качается» вне экрана
        if (Math.random() < 0.5) { b.level++; b.body.setArms(Progress.arms(b.level)); b.body.gripMax = Progress.grip(b.level); }
        b.body.grip = b.body.gripMax;
    },

    _view(b, dt) {
        const body = b.body, av = b.avatar;
        av.root.position.set(body.x, body.feetY(), body.z);
        av.root.rotation.y = -body.yaw;
        SpiderAvatar.pose(av, dt, { mode: b.cheer > 0 ? 'cheer' : body.mode, ax: body.ax, az: body.az, speed: body.speed, punch: Math.sin(body.t * 12) * 0.5 + 0.5 });
        b.arms.update(body, dt);
        if (this.tags) this.tags.place(b.id, body.x, body.feetY() + 230, body.z, true);
    },

    /** Лучшие по победам — для доски рекордов. */
    top(field) { return this.list.map(b => ({ name: b.name, value: field === 'rebirths' ? b.rebirths : b.wins })); },
};
