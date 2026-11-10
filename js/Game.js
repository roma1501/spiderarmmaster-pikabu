// Game.js — Spider Arm Master: герой ходит на механических руках-щупальцах и лезет по стенам (зажать «Лезть»), хватка
// тратится за высоту и восстанавливается на земле. Опыт — за каждый шаг руки и за удары по мишени на тренировочных
// платах лобби; уровень даёт хватку, новые руки — скорость. Наверху каждого из 8 этапов — WIN-плата: победы (кубки) —
// валюта магазина рук и скинов. Перерождение сбрасывает уровень и даёт множитель опыта и новые платы.
//
// Модули: SpiderBody (физика тела и рук) · SpiderArmsView (вид рук) · SpiderAvatar (человечек) · GameWorld (объекты по
// маркерам карты) · GameBots (боты) · GameFx (частицы) · GameStyle (материалы мира) · GameHud (интерфейс) · Sfx (звук).
// Мир — одна карта 'world' (Maps.js, правится в редакторе): детали трассы — ObbyCourse, точки — маркеры.
// Сохранение — один объект Platform.save: уровень, опыт, перерождения, этапы, магазин, подарок дня, колесо, усиление опыта, обучение, где стоял.
// Реклама за награды (rewarded, не ставит игру на паузу): «x2 победы» после WIN-платы, «Опыт x2 на 3 минуты», «Хватка 100%» при падении —
// Game.offerWinX2 / startBoost / offerGrip; магазин, подарок дня и колесо ведут Shop / DailyGift / Wheel сами.

// Детали трассы не строит Location3D: копия карты отдаёт их в map.obbyKit (до main.js).
ObbyCourse.hookMaps();

Object.assign(LANG_STRINGS.ru, {
    'g.climb': 'Лезть', 'g.holdClimb': 'Держи {key} — лезть', 'g.outGrip': 'НЕТ ХВАТКИ!', 'g.outGripSub': 'Встань на твёрдую землю — хватка восстановится',
    'g.win': '+{n} ПОБЕДА', 'g.wins.few': '+{n} ПОБЕДЫ', 'g.wins.many': '+{n} ПОБЕД', 'g.stage': 'ЭТАП {n}', 'g.rec': 'Рекомендуемый уровень {n}', 'g.lobby': 'ЛОББИ',
    'g.padLocked': 'Нужно перерождений: {n}', 'g.portalLocked': 'Сначала пройди этап {n}', 'g.teleport': 'Телепорт: {name}',
    'g.newArm': '+1 РУКА!', 'g.rebirthDone': 'ПЕРЕРОЖДЕНИЕ!', 'g.rebirthSub': 'Опыт x{m}', 'g.joined': '{name} зашёл в игру', 'g.left': '{name} вышел',
    'g.botWin': '{name} забрал кубок этапа {n}!', 'g.respawn': 'Возвращаемся…',
    'g.tut.climb.t': 'Залезь на стену!', 'g.tut.climb.k': 'Подойди к большому дому и держи {keys}', 'g.tut.climb.m': 'Подойди к большому дому и держи правую кнопку мыши или кнопку «Лезть»', 'g.tut.climb.h': 'Подойди к большому дому и держи кнопку «Лезть»', 'g.tut.climb.p': 'Подойди к дому и держи {keys}',
    'g.tut.win.t': 'Забери победу!', 'g.tut.win.h': 'Наверху встань на золотую плату WIN',
    'g.tut.train.t': 'Тренируйся!', 'g.tut.train.h': 'После кубка ты снова в лобби: встань на тренировочную плату — руки будут бить мишень', 'g.toLobby': 'Телепорт в лобби',
    'g.tut.shop.t': 'Новые руки!', 'g.tut.shop.h': 'Открой магазин и посмотри руки и скины за победы',
});
Object.assign(LANG_STRINGS.en, {
    'g.climb': 'Climb', 'g.holdClimb': 'Hold {key} to climb', 'g.outGrip': 'OUT OF GRIP!', 'g.outGripSub': 'Stand on solid ground to refill your grip',
    'g.win': '+{n} WIN', 'g.wins.few': '+{n} WINS', 'g.wins.many': '+{n} WINS', 'g.stage': 'STAGE {n}', 'g.rec': 'Recommended level {n}', 'g.lobby': 'LOBBY',
    'g.padLocked': 'Needs {n} rebirths', 'g.portalLocked': 'Beat stage {n} first', 'g.teleport': 'Teleport: {name}',
    'g.newArm': '+1 ARM!', 'g.rebirthDone': 'REBIRTH!', 'g.rebirthSub': 'XP x{m}', 'g.joined': '{name} joined', 'g.left': '{name} left',
    'g.botWin': '{name} grabbed the stage {n} trophy!', 'g.respawn': 'Respawning…',
    'g.tut.climb.t': 'Climb the wall!', 'g.tut.climb.k': 'Walk to the big house and hold {keys}', 'g.tut.climb.m': 'Walk to the big house and hold the right mouse button or the Climb button', 'g.tut.climb.h': 'Walk to the big house and hold the Climb button', 'g.tut.climb.p': 'Walk to the house and hold {keys}',
    'g.tut.win.t': 'Grab your win!', 'g.tut.win.h': 'Step on the golden WIN pad at the top',
    'g.tut.train.t': 'Train!', 'g.tut.train.h': "After the trophy you are back in the lobby: stand on a training pad — your arms punch the target", 'g.toLobby': 'Teleport to the lobby',
    'g.tut.shop.t': 'New arms!', 'g.tut.shop.h': 'Open the shop and check arms and skins for wins',
});
Object.assign(LANG_STRINGS.ru, {
    'g.offer.winx2.t': 'x2 победы', 'g.offer.winx2.s': 'За рекламу: ещё +{n}',
    'g.offer.boost.t': 'Опыт x{m} на {min} мин', 'g.offer.boost.s': 'За рекламу',
    'g.offer.grip.t': 'Хватка 100%', 'g.offer.grip.s': 'За рекламу — и снова вверх',
    'g.winX2': 'x2! +{n}', 'g.boostOn': 'Опыт x{m}!', 'g.boostOnSub': 'на {min} мин', 'g.boostEnd': 'Усиление опыта закончилось',
    'g.gripFull': 'Хватка 100%!', 'g.adOff': 'Реклама сейчас недоступна',
});
Object.assign(LANG_STRINGS.en, {
    'g.offer.winx2.t': 'x2 wins', 'g.offer.winx2.s': 'Watch an ad: +{n} more',
    'g.offer.boost.t': 'XP x{m} for {min} min', 'g.offer.boost.s': 'Watch an ad',
    'g.offer.grip.t': 'Full grip', 'g.offer.grip.s': 'Watch an ad and climb again',
    'g.winX2': 'x2! +{n}', 'g.boostOn': 'XP x{m}!', 'g.boostOnSub': 'for {min} min', 'g.boostEnd': 'XP boost is over',
    'g.gripFull': 'Full grip!', 'g.adOff': 'No ad right now',
});

/** @satisfies {Record<string, any>} */
const Game = {
    /** @type {LoryApp | null} */ app: null,
    /** @type {any} */ save: null,
    /** @type {'menu' | 'play'} */ state: 'menu',
    /** @type {any} */ hero: null,
    /** @type {any} */ avatar: null,
    /** @type {any} */ armsView: null,
    /** @type {any} */ tags: null,
    cam: { x: 0, y: 0, h: 0, frameHeight: 760, frameWidth: 760 },
    area: -1,
    dirty: false, saveT: 0, boardT: 0, stepSnd: 0, floatCd: 0, grabSnd: 0,
    lookT: 9, cheer: 0, deadT: 0, tumble: 0, winHome: 0,
    menuPaused: false,   // открыто меню паузы (окна — GameHud.isOpen): игра стоит, музыка приглушена, но не обрывается
    /** @type {any} */ inPed: null,
    xpFrac: 0, gripSpent: false,
    /** Реклама за награды: один запрос за раз (adBusy); игра на время ролика не на паузе, поэтому герой «замирает» (adHold): не падает и не теряет хватку. */
    adBusy: false, adHold: false, adHoldT: 0, adHoldGrip: 0, gripOffered: false,
    /** Усиление опыта: тик раз в секунду (boostT), последнее показанное HUD значение (boostShown), таймер напоминания (boostOfferT). */
    boostT: 0, boostShown: -1, boostOfferT: 0,
    /** @type {any} */ climbLoop: null,
    /** @type {any} */ whoosh: null,
    /** @type {any} */ camSave: null,
    /** @type {any} */ lastPad: null,
    /** @type {any} */ inBooth: null,
    /** @type {any} */ inPortal: null,
    /** Что сейчас надето на виде: ключи предметов (чтобы не пересобирать то, что не менялось). @type {any} */ look: { arms: '', avatar: '', core: '', trail: '', aura: '', win: '' },

    // -------------------------------------------------------------------------------------------
    // Запуск
    // -------------------------------------------------------------------------------------------

    async init(app) {
        this.app = app;
        const saved = (await Platform.load()) || {};
        this.save = Object.assign({ level: 1, xp: 0, rebirths: 0, stageMax: 1, area: 0, totalWins: 0, tutorialDone: false, shop: null, daily: null, wheel: null, boostUntil: 0 }, saved);
        // усиление опыта — момент окончания по настенным часам; часы ушли назад — не дольше самого усиления
        const nowMs = Date.now(), maxBoostMs = (typeof BOOST_XP_SEC !== 'undefined' ? BOOST_XP_SEC : 180) * 1000;
        this.save.boostUntil = Math.min(Math.max(0, Number(this.save.boostUntil) || 0), nowMs + maxBoostMs);
        if (this.save.boostUntil <= nowMs) this.save.boostUntil = 0;
        const firstRemind = typeof OFFER_BOOST_FIRST_SEC !== 'undefined' ? OFFER_BOOST_FIRST_SEC : 150;
        this.boostOfferT = firstRemind > 0 ? firstRemind : 1e9;
        const persist = () => this.persist();
        Shop.init({ tabs: SHOP_TABS, items: SHOP_ITEMS, state: this.save.shop, persist });
        this.save.shop = Shop.state;
        DailyGift.init({ rewards: DAILY_REWARDS, exclusive: DAILY_EXCLUSIVE, rewardsSink: Shop, state: this.save.daily, persist });
        this.save.daily = DailyGift.state;
        Wheel.init({ sectors: WHEEL_SECTORS, rewardsSink: Shop, state: this.save.wheel, persist });
        this.save.wheel = Wheel.state;
        Shop.on((e) => {
            if (e.type === 'equip' || e.type === 'unequip' || e.type === 'preview' || e.type === 'grant') this.applyLook();
            if (e.type === 'ad') this.refreshPedestals();
            if (e.type === 'coins') this.hud('setWins', Shop.coins, e.delta > 0 && e.reason !== 'buy' ? e.delta : 0);
        });
        HudLayout.init({ app });
        // Playables: игра проходится одной мышью (мышь как палец) — «лезть» ещё и правой кнопкой мыши, камера — средней
        const oneMouse = Platform.name === 'playables';
        Input.init({ app, mouse: 'drag', actions: Object.assign({}, Input.DEFAULTS, {
            shop: { keys: ['KeyB'] }, jump: { keys: oneMouse ? ['Space', 'Mouse2'] : ['Space'], pad: [0] },
        }) });
        // камера крутится правой ИЛИ средней кнопкой мыши (средняя не включает автопрокрутку браузера); в Playables правая — «лезть»
        Input._isDragButton = (b) => b === 1 || (!oneMouse && b === 2);
        Input._dragHeld = () => Input._mouseHeld.has(1) || (!oneMouse && Input._mouseHeld.has(2));
        this.uiAds();
        window.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); }, { passive: false });
        this.hudInit();
        GameFx.init(app);
        // дальняя плоскость камеры: этапы уходят на сотни метров вверх
        const cam3 = app.location.view.camera;
        if (cam3) { cam3.maxZ = 60000; cam3.minZ = 10; }
        Object.assign(app.camera.c, { collide: 1, fade: 1 });
        if (app.camera.sight) app.camera.sight.query = (from, to) => {
            const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z, l = Math.hypot(dx, dy, dz);
            if (l < 1) return null;
            const h = ObbyCourse.ray(from.x, from.y, from.z, dx / l, dy / l, dz / l, l);
            return h ? h.t : null;
        };
        await this.prepare(app);
        Tutorial.init({
            app, state: () => this.save, field: 'tutorialDone', persist,
            steps: [
                Tutorial.preset('move'),
                { id: 'climb', title: 'g.tut.climb.t', hint: { keyboard: 'g.tut.climb.k', mouse: 'g.tut.climb.m', touch: 'g.tut.climb.h', pad: 'g.tut.climb.p' }, keys: { keyboard: ['jump'], pad: ['jump'] }, target: { touch: '@context' }, world: () => this.tutTarget('climb') },
                { id: 'win', title: 'g.tut.win.t', hint: 'g.tut.win.h', world: () => this.tutTarget('win') },
                // со ступени этапа до лобби далеко: подсвечиваем кнопку «Телепорт» (в низком раскладе у неё нет подписи), в лобби — плата в мире
                { id: 'train', title: 'g.tut.train.t', hint: 'g.tut.train.h', target: () => (this.hero && GameWorld.stageAt(this.hero.x) > 0 ? '#sam-menu [data-act=teleport]' : null), world: () => this.tutTarget('train') },
                { id: 'shop', title: 'g.tut.shop.t', hint: 'g.tut.shop.h', world: () => this.tutTarget('shop') },
            ],
            // abort — обучение перезапускают («Как играть»): подарок дня поверх перезапуска не нужен
            onFinish: (why) => { GameWorld.setGuide(null); this.hud('setBoostEnabled', true); if (why !== 'abort') this.offerDaily(); },
        });
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;   // удержание P мигало бы паузой
            // Esc игра не занимает (Playgama 1.5.2: браузер держит его для выхода из полного экрана); пауза — P и шестерёнка
            if (e.code === 'KeyP') { if (this.hud('isOpen')) this.closeWindows(); else this.togglePause(); }
        });
        // игру прячут (вкладка, окно, пауза площадки): накопленное сохраняем сразу, иначе до 4 с опыта и смена этапа пропадают
        Pause.onChange((active, reason, on) => { if (on && this.dirty) this.persist(); });
        // примерка в магазине: игра на паузе (update не идёт), камеру ведёт кадровый хук
        app.onFrame((dt) => this.shopFrame(dt));
        if (typeof Quality !== 'undefined') Quality.onChange(() => GameBots.setCount(GameBots.cfg().count));
        this.toMenu();
    },

    async ready() { Platform.gameplay(false); },

    /**
     * Playables (просьба пользователя): межстраничная реклама по каждому клику на кнопку интерфейса, но не во время
     * игрового процесса — только когда открыт титульный экран, пауза или окно (магазин, подарок, перерождение, телепорт).
     * Управление героем (кнопка «Лезть», стик) и кнопки HUD во время игры рекламу не вызывают. Частоту режет сама площадка.
     */
    uiAds() {
        // ТОЛЬКО Playables (правило пользователя): в Яндексе и Playgama — обычное правило двух побед движка (переход-телепорт)
        if (Platform.name !== 'playables' || !Platform.interstitialSupported()) return;
        document.addEventListener('click', (e) => {
            const t = /** @type {HTMLElement} */ (e.target);
            const btn = t && t.closest ? t.closest('button, [role="button"]') : null;
            if (!btn || btn.closest('.lory-ctx, .lory-stick')) return;
            const menuOpen = this.state !== 'play' || this.menuPaused || !!this.hud('overlayOpen');
            if (!menuOpen || Platform.adActive) return;
            Platform.interstitial();
        }, true);
    },

    /** Вызов интерфейса, если он есть (интерфейс собирается отдельно; без него игра идёт). */
    hud(name, ...args) {
        try { const f = typeof GameHud !== 'undefined' ? /** @type {any} */ (GameHud)[name] : null; return typeof f === 'function' ? f.apply(GameHud, args) : undefined; }
        catch (e) { console.warn('GameHud.' + name + ':', e); return undefined; }
    },

    hudInit() {
        this.hud('init', {
            onPlay: () => this.play(),
            onHowTo: () => this.howTo(),
            onSound: () => this.hud('setSound', !Sound.toggleMuted()),
            onQuality: (lv) => { if (typeof Quality !== 'undefined') Quality.set(lv); },
            onPause: () => this.togglePause(),
            onResume: () => this.togglePause(),
            onLobby: () => { this.closeWindows(); this.teleport(0); },
            onTeleport: (n) => { this.closeWindows(); this.teleport(n); },
            onRebirth: () => this.rebirth(),
            onButton: (name) => {
                if (name === 'rebirth') this.hud('openRebirth', this.rebirthInfo());
                else if (name === 'teleport') this.hud('openTeleport', STAGES.map(st => ({ n: st.id, name: st.name, unlocked: st.id <= this.save.stageMax })));
            },
            onShopOpen: (open, kind) => { this.windowOpen(open, kind || 'shop'); if (open && (kind || 'shop') === 'shop') Tutorial.complete('shop'); if (!open) Shop.clearPreview(); },
            onPreview: (id) => { if (id) Shop.preview(id); else Shop.clearPreview(); },
            onEquip: () => { this.sfx('equip'); this.applyLook(); },
            onBuy: () => { this.sfx('buy'); this.applyLook(); this.persist(); },
            onDaily: () => { this.sfx('daily'); this.applyLook(); this.persist(); this.hud('setDailyBadge', false); },
            // колесо: приз уже выдан Wheel (монеты или предмет магазина) — звук, вид, сохранение и красная точка
            onWheel: (result) => { this.sfx('daily'); this.applyLook(); this.persist(); this.refreshBadges(); },
            // кнопка «Опыт x2 за рекламу» в интерфейсе: rewarded внутри, true — усиление включено
            onBoost: () => this.startBoost(),
            onWheelTick: () => this.sfx('click'),   // щелчок стрелки колеса о штырь
        });
        this.hud('setSound', !Sound.muted);
    },

    /** Мир, герой, боты — под экраном загрузки. */
    async prepare(app) {
        const loc = app.location, view = loc.view;
        ObbyCourse.build(loc.map, { waterAt: (x, z) => loc.waterAt(x, z) });
        ObbyCourseView.build(app, ObbyCourse, { markers: false });
        GameWorld.build(app);
        // герой
        const L = this.save.level;
        this.hero = new SpiderBody({ arms: Progress.arms(L), collide: true, armCollide: true });
        this.hero.gripMax = this.hero.grip = Progress.grip(L);
        this.bindHero();
        const worn = this.resolveLook();
        this.avatar = SpiderAvatar.create(view, this.avatarLook(worn.skin, worn.hat));
        this.armsView = new SpiderArmsView(view, worn.arm.arm, { maxArms: 8 });
        this.look = { arms: worn.arm.id, avatar: worn.skin.id + '|' + worn.hat.id, core: '', trail: '', aura: '', win: '' };
        const start = this.spawnPoint(this.save.area | 0);
        this.hero.place(start.x, start.y + 300, start.z, start.yaw);
        this.syncView(0);
        app.camera.follow(this.cam);
        app.camera.azimuth = start.yaw;
        this.syncCam(1);
        if (app.camera.snap) app.camera.snap();
        this.tags = new ObbyNameTags(view);
        GameBots.init({
            app, tags: this.tags, hero: () => this.hero,
            onChat: (bot, text) => this.hud('chat', bot.name, text, '#' + ((bot.avatar && bot.avatar.look ? bot.avatar.look.shirt : 0xffffff) >>> 0).toString(16).padStart(6, '0')),
            onEvent: (type, bot, data) => this.botEvent(type, bot, data),
        });
        GameBots.build();
        app.onUpdate((dt) => this.tags.update(dt));
        GameWorld.updatePads(this.save.rebirths);
        GameWorld.updatePortals(this.save.stageMax);
        this.refreshPedestals();
        this.refreshHud();
        this.applyLook();   // ядро, след, аура и победный эффект надетых предметов (скин, шапка и руки уже собраны выше)
    },

    bindHero() {
        const h = this.hero;
        h.on = {
            plant: (arm, p) => this.onPlant(arm, p),
            grab: (n, inAir) => { this.sfx('grab'); GameFx.play('sam-grab', h.x - n[0] * h.wall, h.y, h.z - n[2] * h.wall); if (inAir) this.app.camera.shake(120, 0.006); },
            mantle: () => { this.sfx('grab'); },
            land: (speed) => this.onLand(speed),
            outOfGrip: () => this.onOutOfGrip(),
            punch: (arm, p) => this.onPunch(arm, p),
            release: () => { this.sfx('release'); },
        };
    },

    /** Точка появления: этап n (маркер stage-n) или лобби (spawn). */
    spawnPoint(n) {
        const st = n > 0 ? GameWorld.stageMarker(n) : null;
        if (st) return { x: st.x, y: st.y, z: st.z, yaw: st.yaw };
        const sp = this.app.location.marker('spawn');
        return sp ? { x: sp.x, y: sp.h, z: sp.y, yaw: (sp.rot ? sp.rot[1] : 0) * Math.PI / 180 } : { x: 600, y: 0, z: 3000, yaw: 0 };
    },

    // -------------------------------------------------------------------------------------------
    // Внешний вид
    // -------------------------------------------------------------------------------------------

    /** Предметы всех шести слотов (надетое, поверх него примерка магазина); пустой слот — бесплатный предмет по умолчанию. */
    resolveLook() {
        const look = Shop.look();
        const get = (slot, def) => shopItem(look[slot]) || shopItem(def);
        return { arm: get('arms', 'arm-scrapper'), skin: get('skin', 'skin-rookie'), hat: get('hats', 'hat-none'), trail: get('trails', 'trail-none'), core: get('cores', 'core-stock'), win: get('winfx', 'winfx-classic') };
    },

    /** Вид человечка: скин, поверх него надетая шапка (шапка по умолчанию 'none' оставляет шапку скина). */
    avatarLook(skin, hat) {
        const lk = Object.assign({}, skin.look);
        const h = hat && !hat.default && hat.hat && hat.hat.type !== 'none' ? hat.hat : null;
        if (h) { lk.hat = h.type; lk.hatColor = h.color; lk.hatColor2 = h.color2 != null ? h.color2 : -1; }
        return lk;
    },

    /** След на кончиках: надетый предмет «Следы»; по умолчанию — след самой руки (arm.fx, fxColor, fxColor2). */
    trailStyle(L) {
        if (!L.trail.default) return L.trail.trail;
        const a = L.arm.arm;
        return { fx: a.fx || 'none', color: a.fxColor, color2: a.fxColor2, power: 1 };
    },

    applyLook() {
        if (!this.avatar) return;
        const L = this.resolveLook(), lk = this.look;
        const avKey = L.skin.id + '|' + L.hat.id;
        if (avKey !== lk.avatar) { this.avatar.setLook(this.avatarLook(L.skin, L.hat)); lk.avatar = avKey; }
        if (L.arm.id !== lk.arms) { this.armsView.setStyle(L.arm.arm); lk.arms = L.arm.id; }
        // ядро: свой предмет перекрывает ядро руки (по умолчанию — ядро из стиля руки)
        const coreKey = L.core.default ? '' : L.core.id;
        if (coreKey !== lk.core) { this.armsView.setCore(L.core.default ? null : L.core.core); lk.core = coreKey; }
        const ts = this.trailStyle(L), trKey = JSON.stringify(ts);
        if (trKey !== lk.trail) { GameFx.trails(ts, () => this.armsView.tips); lk.trail = trKey; }
        // аура у головы: у надетой шапки, иначе у скина
        const aura = (!L.hat.default && L.hat.aura) || L.skin.aura || null, auKey = JSON.stringify(aura);
        if (auKey !== lk.aura) { GameFx.aura(aura, () => this.auraPos()); lk.aura = auKey; }
        const wnKey = L.win.default ? '' : L.win.id;
        if (wnKey !== lk.win) { GameFx.setWin(L.win.default ? null : L.win.winfx); lk.win = wnKey; }
        this.refreshPedestals();
        this.syncView(0);
    },

    /** Точка над головой героя (центр ауры). */
    auraPos() {
        const hd = this.avatar && this.avatar.head;
        if (!hd) return null;
        const p = hd.getAbsolutePosition();
        return { x: p.x, y: p.y + 30, z: p.z };
    },

    /** Подписи пьедесталов лобби: надето / куплено / «За рекламу N» (с прогрессом) / цена. */
    refreshPedestals() { GameWorld.updatePedestals((id) => Shop.owns(id), Shop.equippedId('arms'), (id) => Shop.progress(id)); },

    syncView(dt) {
        const h = this.hero, av = this.avatar;
        av.root.position.set(h.x, h.feetY(), h.z);
        av.root.rotation.y = -h.yaw;
        const mode = this.cheer > 0 ? 'cheer' : h.mode === 'mantle' ? 'climb' : h.mode;
        // быстрое падение — тело заваливается назад, руки-щупальца болтаются над ним
        const tumble = h.mode === 'air' ? Math.max(0, Math.min(0.9, (-h.vy - 900) / 1800)) : 0;
        this.tumble = (this.tumble || 0) + (tumble - (this.tumble || 0)) * SpiderMath.damp(5, dt || 0);
        SpiderAvatar.pose(av, dt, { mode, ax: h.ax, az: h.az, speed: h.speed, punch: Math.sin(h.t * 12) * 0.5 + 0.5, tumble: this.tumble });
        this.armsView.update(h, dt);
    },

    // -------------------------------------------------------------------------------------------
    // Состояния
    // -------------------------------------------------------------------------------------------

    toMenu() {
        this.state = 'menu';
        this.hud('menu', true);
        Input.clearContext();
        Input.configure({ controls: false });
        Platform.gameplay(false);
        this.music();
    },

    /** howTo — «Как играть» с титульного экрана: игра начинается сразу с обучения (один запуск, без подарка дня поверх). */
    play(howTo) {
        if (this.state === 'play') return;
        this.state = 'play';
        this.hud('menu', false);
        // камера встаёт за спину героя: меню крутило азимут, и первое «вперёд» уводило бы от этапов
        const cam = /** @type {LoryApp} */ (this.app).camera;
        cam.azimuth = this.hero.yaw;
        this.syncCam(1);
        if (cam.snap) cam.snap();
        Input.configure({ controls: true });
        Input.setContext({ id: 'climb', label: Lang.t('g.climb'), icon: 'assets/ui/climb.webp', action: 'jump' }, 1);
        this.hud('setBoostEnabled', !!this.save.tutorialDone && !howTo);   // в обучении кнопки «Опыт x2 за рекламу» нет
        Platform.gameplay(true);
        if (typeof Telemetry !== 'undefined') Telemetry.progress('started', 'world');
        if (howTo) Tutorial.start({ replay: !!this.save.tutorialDone });
        else if (!this.save.tutorialDone) Tutorial.autoStart();
        else this.offerDaily();
        this.area = -1;
        this.music();
    },

    howTo() {
        if (this.menuPaused) this.togglePause();
        if (this.state === 'menu') { this.play(true); return; }
        // не прошедший обучение получает перезапуск «по-настоящему» (отметка в сохранении при завершении), прошедший — повтор
        Tutorial.start({ replay: !!this.save.tutorialDone });
    },

    togglePause() {
        if (this.state !== 'play' && !this.menuPaused) return;
        const on = !this.menuPaused;
        if (on) this.hideOffers();
        this.menuPaused = on;
        this.hud('pause', on);
        this.menuFreeze();
    },

    /**
     * Меню паузы и окна останавливают игру сами (Game.update стоит), а не движковой паузой: та глушит весь звук, и музыка
     * обрывалась при каждом открытии меню (замечание модерации Playgama). Здесь музыка мягко приглушается и возвращается.
     */
    menuFreeze() {
        const frozen = this.menuPaused || !!this.hud('isOpen');
        if (frozen === !!this._frozen) return;
        this._frozen = frozen;
        try { if (frozen) Sound.duck(0.35, 0.3, Infinity); else Sound.unduck(0.5); } catch (e) { /* без звука */ }
        if (this.state === 'play') Platform.gameplay(!frozen);
    },

    windowOpen(open, kind) {
        if (open) this.hideOffers();
        this.menuFreeze();
        Input.configure({ controls: !open && this.state === 'play' });
        // примерка: камера подъезжает к герою спереди и держит его в свободной от окна части экрана (shopFrame), после — обратно
        const cam = /** @type {LoryApp} */ (this.app).camera;
        if (open && kind === 'shop' && !this.camSave) { this.camSave = { az: cam.azimuth, pitch: cam.pitch }; cam.azimuth = this.hero.yaw + Math.PI * 0.82; cam.pitch = 0.22; this.cam.frameHeight = this.cam.frameWidth = 560; this.shopFrame(0); }
        else if (!open && this.camSave) { cam.azimuth = this.camSave.az; cam.pitch = this.camSave.pitch; this.camSave = null; }
        this.syncView(0);
    },

    /**
     * Примерка в магазине. Игра на паузе (update не идёт), поэтому камеру ведёт кадровый хук app.onFrame: герой встаёт в центр самой
     * большой свободной полосы холста рядом с окном (слева, справа, сверху или снизу) и вписывается в неё по размеру. Окно занимает
     * весь экран (телефон) — полос нет, герой остаётся по центру, как был.
     */
    shopFrame(dt) {
        const h = this.hero;
        if (!this.camSave || !h) return;
        const cam = /** @type {LoryApp} */ (this.app).camera, c = this.cam;
        const cv = document.getElementById('world3d'), cr = cv ? cv.getBoundingClientRect() : null;
        const W = (cr && cr.width) || window.innerWidth, H = (cr && cr.height) || window.innerHeight;
        let fw = W, fh = H, ox = 0, oy = 0;   // свободная часть холста и сдвиг её центра от центра холста, px экрана
        const r = this.hud('windowRect');
        if (r && r.w > 0 && r.h > 0) {
            const x0 = r.x - (cr ? cr.left : 0), y0 = r.y - (cr ? cr.top : 0), x1 = x0 + r.w, y1 = y0 + r.h;
            let best = null, area = 0;
            for (const q of [[0, 0, x0, H], [x1, 0, W - x1, H], [0, 0, W, y0], [0, y1, W, H - y1]]) {
                const a = q[2] > 0 && q[3] > 0 ? q[2] * q[3] : 0;
                if (a > area) { area = a; best = q; }
            }
            if (best && Math.min(best[2], best[3]) >= 110) { fw = best[2]; fh = best[3]; ox = best[0] + fw / 2 - W / 2; oy = best[1] + fh / 2 - H / 2; }
        }
        // 560 px мира (герой с руками) умещаются в свободную часть; размеры кадра плавно, чтобы окно с анимацией не дёргало зум
        const s = Math.max(0.2, Math.min(fw, fh) / 560), k = dt > 0 ? SpiderMath.damp(6, dt) : 0;
        c.frameHeight += (H / s - c.frameHeight) * k;
        c.frameWidth += (W / s - c.frameWidth) * k;
        // цель камеры сдвигается против нужного экранного сдвига героя: вправо на экране — (−sin az, cos az), вверх — (sin p·cos az, cos p, sin p·sin az)
        const wp = cam.worldPerScreenPx(), ca = Math.cos(cam.azimuth), sa = Math.sin(cam.azimuth), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
        c.x = h.x + (sa * ox + sp * ca * oy) * wp;
        c.y = h.z + (-ca * ox + sp * sa * oy) * wp;
        c.h = h.y + 30 + cp * oy * wp;
    },

    closeWindows() { this.hud('closeShop'); if (this.menuPaused) { this.menuPaused = false; this.hud('pause', false); } this.menuFreeze(); Input.configure({ controls: this.state === 'play' }); },

    offerDaily() {
        Tutorial.whenIdle(() => {
            this.refreshBadges();
            if (this.state === 'play' && DailyGift.shouldOffer()) { this.hud('openDaily'); DailyGift.markOffered(); }
        });
    },

    /** Красные точки: подарок дня можно забрать, бесплатное вращение колеса готово. */
    refreshBadges() {
        this.hud('setBoostEnabled', this.state === 'play' && !Tutorial.active);
        this.hud('setDailyBadge', DailyGift.canClaim());
        this.hud('setWheelBadge', !!Wheel.status().canSpinFree);
    },

    persist() { try { Platform.save(this.save); } catch (e) { console.warn('Platform.save:', e); } this.dirty = false; this.saveT = 0; },

    refreshHud() {
        const s = this.save;
        this.hud('setWins', Shop.coins, 0);
        this.hud('setLevel', s.level, s.xp, Progress.need(s.level));
        this.hud('setArms', Progress.arms(s.level), Progress.nextArmLevel(s.level));
        this.hud('setRebirths', s.rebirths, Progress.xpMult(s.rebirths));
        this.hud('setGrip', this.hero ? this.hero.grip : 0, this.hero ? this.hero.gripMax : 100, false);
        this.hud('setBoostInfo', { mult: typeof BOOST_XP_MULT !== 'undefined' ? BOOST_XP_MULT : 2, minutes: Math.round((typeof BOOST_XP_SEC !== 'undefined' ? BOOST_XP_SEC : 180) / 60) });
        this.tickBoost(true);
    },

    // -------------------------------------------------------------------------------------------
    // Прогресс
    // -------------------------------------------------------------------------------------------

    addXp(n, at) {
        const s = this.save;
        // дробная часть множителя копится (x1.5 за шаг руки: 1, 2, 1, 2…), а не округляется вверх каждый раз
        const boost = this.boostActive() ? (typeof BOOST_XP_MULT !== 'undefined' ? BOOST_XP_MULT : 2) : 1;   // усиление за рекламу удваивает и опыт перерождений
        const raw = n * Progress.xpMult(s.rebirths) * boost + this.xpFrac;
        const add = Math.max(1, Math.floor(raw + 1e-9));
        this.xpFrac = Math.max(0, raw - add);
        s.xp += add;
        this.dirty = true;
        if (at && this.floatCd <= 0) { this.float(at, '+' + add, '#ffffff'); this.floatCd = 0.05; }
        let need = Progress.need(s.level);
        const from = s.level, armsFrom = Progress.arms(s.level), gripFrom = Progress.grip(s.level);
        while (s.xp >= need) { s.xp -= need; s.level++; need = Progress.need(s.level); }
        if (s.level !== from) this.levelUp(from, armsFrom, gripFrom);
        this.hud('setLevel', s.level, s.xp, need);
    },

    levelUp(from, armsFrom, gripFrom) {
        const s = this.save, h = this.hero;
        const arms = Progress.arms(s.level), grip = Progress.grip(s.level);
        h.gripMax = grip; h.grip = Math.min(grip, h.grip + (grip - gripFrom));
        this.hud('levelUp', { from, to: s.level, armsFrom, armsTo: arms, gripFrom, gripTo: grip });
        this.hud('setArms', arms, Progress.nextArmLevel(s.level));
        GameFx.play('sam-levelup', h.x, h.feetY(), h.z);
        if (arms > armsFrom) {
            h.setArms(arms);
            GameFx.play('sam-newarm', h.x, h.y + 40, h.z);
            this.sfx('newarm');
            this.app.camera.shake(220, 0.01);
        } else this.sfx('levelup');
        this.persist();
    },

    rebirth() {
        const s = this.save;
        if (s.level < Progress.rebirthLevel(s.rebirths)) { this.sfx('error'); return; }
        s.rebirths++; s.level = 1; s.xp = 0;
        const h = this.hero;
        h.setArms(Progress.arms(1)); h.gripMax = h.grip = Progress.grip(1);
        GameWorld.updatePads(s.rebirths);
        this.hud('closeShop');
        this.closeWindows();
        this.hud('banner', Lang.t('g.rebirthDone'), Lang.t('g.rebirthSub', { m: Progress.xpMult(s.rebirths) }), 'info');
        GameFx.play('sam-newarm', h.x, h.y, h.z);
        this.sfx('levelup');
        this.refreshHud();
        this.persist();
    },

    rebirthInfo() {
        const s = this.save, need = Progress.rebirthLevel(s.rebirths);
        return { level: s.level, needLevel: need, rebirths: s.rebirths, multNow: Progress.xpMult(s.rebirths), multNext: Progress.xpMult(s.rebirths + 1), canRebirth: s.level >= need };
    },

    // -------------------------------------------------------------------------------------------
    // События тела
    // -------------------------------------------------------------------------------------------

    onPlant(arm, p) {
        const h = this.hero;
        if (this.state !== 'play' || h.mode === 'train') return;
        GameFx.play('sam-plant', p[0], p[1], p[2]);
        this.stepSnd -= 1;
        if (this.stepSnd <= 0) { this.sfx('step'); this.stepSnd = h.mode === 'climb' ? 1 : 2; }
        this.addXp(1, p);
    },

    onPunch(arm, p) {
        const pad = this.lastPad;
        GameFx.play('sam-punch', p[0], p[1], p[2]);
        this.sfx('punch');
        if (pad) { GameWorld.hitPad(pad); this.addXp(pad.info.mult * (typeof PUNCH_XP !== 'undefined' ? PUNCH_XP : 2), p); }
        Tutorial.complete('train');
    },

    onLand(speed) {
        const h = this.hero;
        if (speed > 700) {
            GameFx.play('sam-land', h.x, h.groundY + 4, h.z);
            this.app.camera.shake(Math.min(360, speed * 0.12), Math.min(0.02, speed / 120000));
            this.sfx('land', Math.min(1, speed / 2000));
        }
        if (this.whoosh) { this.whoosh.fade(0.25); this.whoosh = null; }
        this.hud('hideOffer', 'grip-refill');   // приземлился — предлагать хватку поздно
    },

    onOutOfGrip() {
        const h = this.hero;
        this.gripSpent = true;   // «Лезть» не берётся, пока хватка не вернётся (stepHero)
        this.offerGrip();
        this.hud('banner', Lang.t('g.outGrip'), Lang.t('g.outGripSub'), 'outgrip');
        GameFx.play('sam-outgrip', h.x, h.y, h.z);
        this.sfx('outgrip');
        this.app.camera.shake(160, 0.008);
    },

    botEvent(type, bot, data) {
        if (type === 'join') this.hud('chat', '', Lang.t('g.joined', { name: bot.name }), '#9fb4c8');
        else if (type === 'leave') this.hud('chat', '', Lang.t('g.left', { name: bot.name }), '#9fb4c8');
        else if (type === 'win' && Math.random() < 0.5) this.hud('chat', '', Lang.t('g.botWin', { name: bot.name, n: data.stage }), '#ffd23f');
    },

    // -------------------------------------------------------------------------------------------
    // Телепорт и возрождение
    // -------------------------------------------------------------------------------------------

    teleport(n) {
        if (n > 0 && n > this.save.stageMax) { this.hud('toast', Lang.t('g.portalLocked', { n: n - 1 }), 1800); this.sfx('error'); return; }
        // телепорт — переход между этапами: заработанная межстраничная реклама (правило двух побед движка) — перед ним
        Platform.ads.next(() => this.doTeleport(n));
    },

    doTeleport(n) {
        const h = this.hero;
        GameFx.play('sam-teleport', h.x, h.feetY(), h.z);
        const p = this.spawnPoint(n);
        h.place(p.x, p.y + 300, p.z, p.yaw);
        for (const w of GameWorld.wins) w.armed = false;   // телепорт — не подъём: WIN-платы взводятся заново только после подъёма на своём этапе
        h.grip = h.gripMax;
        this.app.camera.azimuth = p.yaw;
        this.syncCam(1);
        if (this.app.camera.snap) this.app.camera.snap();
        GameFx.play('sam-teleport', h.x, h.feetY(), h.z);
        this.sfx('teleport');
        this.inPortal = GameWorld.portalAt(h.x, h.feetY(), h.z);
        this.inBooth = GameWorld.boothAt(h.x, h.feetY(), h.z);
    },

    respawn() {
        const n = Math.max(0, GameWorld.stageAt(this.hero.x));
        const p = this.spawnPoint(n);
        this.hero.place(p.x, p.y + 300, p.z, p.yaw);
        GameFx.play('sam-respawn', this.hero.x, this.hero.feetY(), this.hero.z);
        this.sfx('respawn');
        this.syncCam(1);
        if (this.app.camera.snap) this.app.camera.snap();
    },

    // -------------------------------------------------------------------------------------------
    // Кадр
    // -------------------------------------------------------------------------------------------

    update(dt) {
        const app = /** @type {LoryApp} */ (this.app), cam = app.camera, h = this.hero;
        // меню паузы или окно: мир стоит (камеру примерки ведёт shopFrame в кадровом хуке), звук не обрывается
        this.menuFreeze();   // сверка каждый кадр: окно могло закрыться само (замена окна, закрытие по фону)
        if (this.state === 'play' && (this.menuPaused || this.hud('isOpen'))) { Input.consumeLook(); this.syncView(0); return; }
        ObbyCourse.update(dt);
        this.floatCd -= dt;
        // камера всегда следит за героем (панорама движка средней кнопкой или пальцем сбрасывает слежение)
        if (!cam.isFollowing()) cam.follow(this.cam);
        const look = Input.consumeLook();
        if (Math.abs(look.dx) + Math.abs(look.dy) > 0) this.lookT = 0; else this.lookT += dt;
        if (this.state === 'menu') cam.azimuth += dt * 0.15;
        else {
            cam.azimuth += look.dx * 0.0045;
            cam.pitch = Math.max(0.08, Math.min(1.3, cam.pitch + look.dy * 0.0035));
            // на стене камера сама встаёт за спину (лицом к стене), пока игрок не крутит её
            if (h.mode === 'climb' && this.lookT > 1.2) {
                let d = Math.atan2(-h.n[2], -h.n[0]) - cam.azimuth;
                while (d > Math.PI) d -= Math.PI * 2;
                while (d < -Math.PI) d += Math.PI * 2;
                cam.azimuth += d * SpiderMath.damp(2.2, dt);
            }
        }
        if (this.state === 'play' && !this.hud('isOpen')) this.stepHero(dt);
        else h.step(dt, {});
        if (this.adHold) this.guardHero(dt);
        this.stepBoost(dt);
        if (this.cheer > 0) this.cheer -= dt;
        if (this.winHome > 0 && this.state === 'play' && !this.hud('isOpen')) {
            this.winHome -= dt;
            if (this.winHome <= 0) { this.winHome = 0; this.hud('toast', Lang.t('g.toLobby'), 1500); this.teleport(0); }
        }
        this.syncView(dt);
        this.syncCam(dt);
        GameBots.update(dt);
        GameWorld.update(dt, h);
        ObbyCourseView.update(dt, { x: h.x, z: h.z });
        this.climbSound(dt);
        // сохранение не чаще раза в 4 с
        this.saveT += dt;
        // опыт копится постоянно — пишем не чаще раза в 20 с (победы, уровни, покупки сохраняются сразу)
        if (this.dirty && this.saveT > 20) this.persist();
        this.boardT -= dt;
        if (this.boardT <= 0) {
            this.boardT = 5; this.updateBoards();
            // сутки сменились без перезагрузки: красные точки на «Подарке» и «Колесе» (сами окна не всплывают)
            if (this.state === 'play' && !Tutorial.active) this.refreshBadges();
        }
    },

    stepHero(dt) {
        const app = /** @type {LoryApp} */ (this.app), cam = app.camera, h = this.hero, s = this.save;
        const m = Input.move();
        const fx = Math.cos(cam.azimuth), fz = Math.sin(cam.azimuth);
        const mx = fx * m.y - fz * m.x, mz = fz * m.y + fx * m.x;
        if (Input.pressed('shop')) { this.hud('openShop'); }
        const want = Input.down('jump');
        // выбился из сил: «Лезть» не берётся, пока клавишу не отпустили или хватка не вернулась (иначе круг «схватился — нет хватки — упал» раз в полсекунды)
        if (this.gripSpent && (!want || h.grip >= h.gripMax * (typeof GRIP_RETRY !== 'undefined' ? GRIP_RETRY : 0.3))) this.gripSpent = false;
        const climb = want && !this.gripSpent;
        // тренировка: стоим на открытой плате — руки бьют мишень
        const pad = GameWorld.padAt(h.x, h.feetY() - 60, h.z);
        if (pad && h.mode === 'walk' && Math.hypot(m.x, m.y) < 0.2) {
            if (pad.info.rebirths <= s.rebirths) { h.startTrain(pad.board.x, pad.board.y, pad.board.z, pad.board.nx, pad.board.nz); this.lastPad = pad; }
            else if (this.lastPad !== pad) { this.hud('toast', Lang.t('g.padLocked', { n: pad.info.rebirths }), 1600); this.lastPad = pad; }
        }
        if (!pad && this.lastPad && h.mode !== 'train') this.lastPad = null;
        h.step(dt, { mx, mz, climb });
        // подсказка «держи Пробел» у стены: клавиша — «кеп» (HUD рисует […] клавишей), на касании и в режиме «мышь как палец» — экранная кнопка
        const nearWall = h.mode === 'walk' && !want && this.wallAhead();
        let hint = null;
        if (nearWall) {
            const jk = Input.device === 'touch' || Input.mouseTouch ? '' : Input.labelOf('jump');
            hint = Lang.t('g.holdClimb', { key: jk ? '[' + jk + ']' : '«' + Lang.t('g.climb') + '»' });
        }
        this.hud('hint', hint);
        if (h.mode === 'climb' && h.climbedPx > 260) Tutorial.complete('climb');
        this.hud('setGrip', h.grip, h.gripMax, h.mode === 'climb' || h.mode === 'mantle' || h.grip < h.gripMax - 0.5);
        // опасности и падение в пустоту
        const hit = ObbyCourse.hazardAt(h.x, h.feetY(), h.z, 34, 170);
        if (hit) {
            if (hit.cause === 'trap') { h._toAir(); h.vx = (hit.n ? hit.n[0] : 0) * 900; h.vz = (hit.n ? hit.n[2] : 0) * 900; h.vy = 700; h.noGrab = 1; this.sfx('land'); app.camera.shake(200, 0.012); }
            else { this.hud('banner', Lang.t('g.respawn'), '', 'info'); this.respawn(); return; }
        }
        if (h.y < ObbyCourse.killY) { this.respawn(); return; }
        if (h.mode === 'air' && h.vy < -900 && !this.whoosh) this.whoosh = this.sfxLoop('whoosh');
        if (h.mode !== 'air' && this.whoosh) { this.whoosh.fade(0.2); this.whoosh = null; }
        // этап
        const area = GameWorld.stageAt(h.x);
        if (area !== this.area) this.enterArea(area);
        if (h.mode === 'climb') this.gripOffered = false;   // новая попытка лезть: «Хватка 100%» можно предложить ещё раз
        // WIN-плата платит раз за настоящий подъём: взводится, когда герой на её этапе был ≥ WIN_ARM_DROP ниже платы (телепорт на следующий
        // этап и прогулка назад по крыше, стойка и AFK на плате её не взводят); выплата снимает взвод
        const fy = h.feetY();
        for (const w of GameWorld.wins) if (!w.armed && area === w.n && fy < w.y - (typeof WIN_ARM_DROP !== 'undefined' ? WIN_ARM_DROP : 500)) w.armed = true;
        const win = h.mode === 'walk' ? GameWorld.winAt(h.x, fy, h.z) : null;
        if (win && win.armed && win.cd <= 0) this.takeWin(win);
        // будки и порталы — по входу в круг
        const booth = h.mode === 'walk' ? GameWorld.boothAt(h.x, h.feetY(), h.z) : null;
        if (booth && booth !== this.inBooth) {
            if (booth.kind === 'shop') this.hud('openShop');
            else if (booth.kind === 'rebirth') this.hud('openRebirth', this.rebirthInfo());
            else this.hud('openDaily');
            this.sfx('open');
        }
        this.inBooth = booth;
        // пьедестал с руками: встал на него — магазин на этих руках (кнопка «За рекламу N/M» или «Купить»), рука примерена на герое
        const ped = h.mode === 'walk' ? GameWorld.pedestalAt(h.x, h.feetY(), h.z) : null;
        if (ped && ped !== this.inPed && !booth) { this.hud('openShop', 'arms', ped.item.id); this.sfx('open'); }
        this.inPed = ped;
        const portal = h.mode === 'walk' ? GameWorld.portalAt(h.x, h.feetY(), h.z) : null;
        if (portal && portal !== this.inPortal) { this.inPortal = portal; this.teleport(portal.n); }   // inPortal до телепорта: закрытый портал не зовёт его каждый кадр (тост и звук раз за вход)
        else this.inPortal = portal;
        // стрелки обучения
        if (Tutorial.active) { const t = this.tutTarget(String(Tutorial.step || '')); GameWorld.setGuide(t ? { x: t.x, y: t.h - 40, z: t.y } : null); }
    },

    wallAhead() {
        const h = this.hero, f = [Math.cos(h.yaw), 0, Math.sin(h.yaw)];
        const r = ObbyCourse.ray(h.x, h.y + 40, h.z, f[0], 0, f[2], h.c.wallDist + 160);
        return !!(r && Math.abs(r.n[1]) < 0.5 && spiderGrabbable(r.col) && ObbyCourse.ray(h.x, h.y + 200, h.z, f[0], 0, f[2], h.c.wallDist + 200));
    },

    enterArea(area) {
        const prev = this.area;
        this.area = area;
        if (area > 0) {
            const st = STAGES[area - 1];
            this.hud('setArea', { kind: 'stage', n: area, name: st.name[Lang.code === 'ru' ? 'ru' : 'en'], need: st.need, rec: Progress.recLevel(st.need) });
            if (prev >= 0 && area > prev) {
                this.hud('banner', Lang.t('g.stage', { n: area }), Lang.t('g.rec', { n: Progress.recLevel(st.need) }), 'stage');
                if (area > this.save.stageMax) { this.save.stageMax = area; GameWorld.updatePortals(area); }
            }
        } else this.hud('setArea', { kind: 'lobby' });
        this.save.area = area;
        this.dirty = true;
        this.music();
    },

    takeWin(win) {
        const h = this.hero, s = this.save;
        win.cd = 20; win.armed = false;
        Shop.addCoins(win.amount, { reason: 'win' });
        s.totalWins += win.amount;
        if (!win.bonus && win.n + 1 > s.stageMax && win.n < STAGES.length) { s.stageMax = win.n + 1; GameWorld.updatePortals(s.stageMax); }
        const pl = this.hud('_plural', win.amount) || (win.amount === 1 ? 'one' : 'many');   // ru: победа / победы / побед
        this.hud('banner', Lang.t(pl === 'one' ? 'g.win' : 'g.wins.' + pl, { n: win.amount }), '', 'win');
        GameFx.win(win.x, win.y + 60, win.z);   // победный эффект надетого предмета (по умолчанию — исходный)
        this.sfx('win');
        this.cheer = 1.6;
        this.app.camera.shake(160, 0.006);
        Tutorial.complete('win');
        if (Tutorial.roundCounts()) Platform.ads.roundEnded(true);
        if (typeof Telemetry !== 'undefined') Telemetry.progress('completed', 'stage_' + win.n);
        Platform.submitScore(s.totalWins);
        this.persist();
        this.offerWinX2(win.amount);
        // как в оригинале: кубок взят — через пару секунд праздника телепорт в самое начало (лобби); этапы выше — порталами
        this.winHome = 2.2;
    },

    tutTarget(id) {
        const h = this.hero;
        if (id === 'climb') {
            // основание стены большого дома: последняя точка маршрута перед первой, что поднята на 800+ px над полом этапа 1 (грузовик и ступени ниже — не цель)
            const st = GameWorld.signs.find(q => q.n === 1), sm = GameWorld.stageMarker(1), R = GameWorld.route;
            const i = R.findIndex(p => (!sm || p.x >= sm.x) && p.y >= (sm ? sm.y : 0) + 800);
            const p = i > 0 ? R[i - 1] : sm;
            return p ? { x: p.x, y: p.z, h: p.y + 200 } : st ? { x: st.mesh.position.x, y: st.mesh.position.z, h: st.mesh.position.y } : null;
        }
        if (id === 'win') { const w = GameWorld.winPad(Math.max(1, GameWorld.stageAt(h.x))); return w ? { x: w.x, y: w.z, h: w.y + 220 } : null; }
        if (id === 'train') {
            if (GameWorld.stageAt(h.x) > 0) return null;
            let best = null, bd = 1e9;
            for (const p of GameWorld.pads) { if (p.info.rebirths > this.save.rebirths) continue; const d = Math.hypot(p.x - h.x, p.z - h.z); if (d < bd) { bd = d; best = p; } }
            return best ? { x: best.x, y: best.z, h: best.y + 200 } : null;
        }
        if (id === 'shop') { const b = GameWorld.booths.find(q => q.kind === 'shop'); return b && GameWorld.stageAt(h.x) === 0 ? { x: b.x, y: b.z, h: b.y + 200 } : null; }
        return null;
    },

    syncCam(dt) {
        const h = this.hero, c = this.cam;
        c.x = h.x; c.y = h.z; c.h = h.y + 30;
        const climbing = h.mode === 'climb' || h.mode === 'mantle' || h.mode === 'air';
        const target = climbing ? 1050 : 820;
        c.frameHeight += (target - c.frameHeight) * SpiderMath.damp(2.5, dt || 1);
        c.frameWidth = c.frameHeight;
    },

    updateBoards() {
        const s = this.save;
        const me = { name: Lang.code === 'ru' ? 'Ты' : 'You', me: true };
        const wins = GameBots.top('wins').concat([Object.assign({ value: s.totalWins }, me)]).sort((a, b) => b.value - a.value);
        const reb = GameBots.top('rebirths').concat([Object.assign({ value: s.rebirths }, me)]).sort((a, b) => b.value - a.value);
        GameWorld.updateBoard(1, wins);
        GameWorld.updateBoard(2, reb);
    },

    float(p, text, color) {
        const pr = this.app.location.view.projectToScreen(p[0], p[2], p[1]);
        if (!pr || !pr.visible || pr.behind) return;
        this.hud('float', pr.x, pr.y, text, color);
    },

    // -------------------------------------------------------------------------------------------
    // Реклама за награды (rewarded): x2 победы, усиление опыта, хватка 100%
    // -------------------------------------------------------------------------------------------

    /** Площадка умеет rewarded (иначе предложения «за рекламу» не показываем). */
    adOk() { try { return Platform.rewardedSupported(); } catch (e) { return false; } },

    /** Предложение можно показать сейчас: идёт игра — ни обучения, ни окна, ни паузы, ни другой рекламы. */
    canOffer() {
        return this.state === 'play' && !Tutorial.active && !this.hud('isOpen') && !this.menuPaused && this.adOk() && !this.adBusy && !Platform.adActive;
    },

    /** Спрятать все временные предложения (открыто окно или пауза). */
    hideOffers() { for (const id of ['win-x2', 'grip-refill', 'xp-boost']) this.hud('hideOffer', id); },

    /**
     * Rewarded за награду игры. true — ТОЛЬКО по подтверждению площадки; один запрос за раз. Игра на время ролика не на паузе, поэтому
     * герой «замирает» (adHold, guardHero): не падает и не теряет хватку, пока висит на стене.
     */
    async rewardedOnce(id) {
        if (this.adBusy || !this.adOk()) return false;
        this.adBusy = true;
        this.adHold = true; this.adHoldT = 0; this.adHoldGrip = this.hero ? this.hero.grip : 0;
        let ok = false;
        try { ok = (await Platform.rewarded(id)) === true; } catch (e) { ok = false; }
        this.adHold = false; this.adBusy = false;
        if (ok) { try { Platform.analytics('ad_reward', { id }); } catch (e) { /* аналитика не обязательна */ } }
        return ok;
    },

    /** Герой на время ролика: в воздухе висит на месте, хватка не тратится (ролик дольше 90 с — страховка снимает защиту). */
    guardHero(dt) {
        const h = this.hero;
        this.adHoldT += dt;
        if (this.adHoldT > 90) { this.adHold = false; return; }
        if (h.mode === 'air') { h.vx = 0; h.vy = 0; h.vz = 0; }
        if (h.grip < this.adHoldGrip) h.grip = this.adHoldGrip;
    },

    /** «x2 победы»: после WIN-платы несколько секунд можно за рекламу получить столько же ещё раз (id награды 'win-x2'). */
    offerWinX2(amount) {
        const ms = Math.round((typeof OFFER_WIN_X2_SEC !== 'undefined' ? OFFER_WIN_X2_SEC : 6) * 1000);
        if (!this.canOffer() || Platform.rewardedCooldownLeft() * 1000 > ms) return;   // пауза между rewarded длиннее предложения — не показываем
        let done = false;
        this.hud('offer', {
            id: 'win-x2', icon: 'trophy', title: Lang.t('g.offer.winx2.t'), sub: Lang.t('g.offer.winx2.s', { n: amount }), ms,
            onAccept: async () => {
                if (done) return false;
                if (!(await this.rewardedOnce('win-x2'))) return false;
                done = true;   // награда один раз
                this.grantWinX2(amount);
                return true;
            },
        });
    },

    grantWinX2(amount) {
        const s = this.save, h = this.hero;
        Shop.addCoins(amount, { reason: 'win-x2', save: false });
        s.totalWins += amount;
        this.hud('banner', Lang.t('g.winX2', { n: amount }), '', 'win');
        GameFx.win(h.x, h.feetY() + 60, h.z);
        this.sfx('win');
        Platform.submitScore(s.totalWins);
        this.persist();
    },

    boostActive() { return (this.save.boostUntil || 0) > Date.now(); },
    boostLeft() { return Math.max(0, Math.ceil(((this.save.boostUntil || 0) - Date.now()) / 1000)); },

    /** «Опыт x2 на 3 минуты за рекламу» (кнопка в интерфейсе и напоминание, id награды 'xp-boost'). true — усиление включено; пока идёт — нельзя. */
    async startBoost() {
        if (this.boostActive()) return false;
        if (!(await this.rewardedOnce('xp-boost'))) {
            if (this.adOk() && Platform.rewardedCooldownLeft() <= 0) this.hud('toast', Lang.t('g.adOff'), 1800);
            return false;
        }
        const sec = typeof BOOST_XP_SEC !== 'undefined' ? BOOST_XP_SEC : 180, mult = typeof BOOST_XP_MULT !== 'undefined' ? BOOST_XP_MULT : 2;
        this.save.boostUntil = Date.now() + sec * 1000;
        this.tickBoost(true);
        this.hud('hideOffer', 'xp-boost');
        this.hud('banner', Lang.t('g.boostOn', { m: mult }), Lang.t('g.boostOnSub', { min: Math.round(sec / 60) }), 'info');
        this.sfx('daily');
        this.persist();
        return true;
    },

    /** Раз в секунду: сколько секунд усиления осталось → интерфейс (0 прячет значок); конец усиления — подсказка. force — показать сразу. */
    tickBoost(force) {
        const left = this.boostLeft();
        if (!force && left === this.boostShown) return;
        const was = this.boostShown;
        this.boostShown = left;
        this.hud('setBoost', left);
        if (was > 0 && left === 0) this.hud('toast', Lang.t('g.boostEnd'), 2200);
    },

    /** Раз в секунду: тик усиления и редкое напоминание о нём (кнопка в интерфейсе есть всегда). Таймер напоминания идёт только в настоящей игре
     *  (не в обучении, окне и паузе), а само предложение появляется, когда герой стоит или ходит, — не на стене и не в воздухе. */
    stepBoost(dt) {
        this.boostT -= dt;
        if (this.boostT > 0) return;
        this.boostT = 1;
        this.tickBoost(false);
        if (this.state !== 'play' || this.boostActive() || !this.hero || !this.canOffer()) return;
        this.boostOfferT -= 1;
        if (this.boostOfferT > 0 || this.hero.mode !== 'walk') return;
        const every = typeof OFFER_BOOST_EVERY_SEC !== 'undefined' ? OFFER_BOOST_EVERY_SEC : 420;
        if (this.offerBoost()) this.boostOfferT = every > 0 ? every : 1e9;
    },

    /** Напоминание «Опыт x2 на 3 мин за рекламу» (12 с); false — не показано (идёт пауза между rewarded). */
    offerBoost() {
        const sec = typeof BOOST_XP_SEC !== 'undefined' ? BOOST_XP_SEC : 180, mult = typeof BOOST_XP_MULT !== 'undefined' ? BOOST_XP_MULT : 2;
        const ms = 12000;
        if (Platform.rewardedCooldownLeft() * 1000 > ms) return false;
        this.hud('offer', { id: 'xp-boost', icon: 'bolt', title: Lang.t('g.offer.boost.t', { m: mult, min: Math.round(sec / 60) }), sub: Lang.t('g.offer.boost.s'), ms, onAccept: () => this.startBoost() });
        return true;
    },

    /** «Хватка 100%»: выбился из сил и падает — несколько секунд можно за рекламу вернуть всю хватку (раз за попытку лезть, id награды 'grip-refill'). */
    offerGrip() {
        const ms = Math.round((typeof OFFER_GRIP_SEC !== 'undefined' ? OFFER_GRIP_SEC : 3) * 1000);
        if (this.gripOffered || !this.canOffer() || Platform.rewardedCooldownLeft() * 1000 > ms) return;
        this.gripOffered = true;
        this.hud('offer', { id: 'grip-refill', icon: 'fist', title: Lang.t('g.offer.grip.t'), sub: Lang.t('g.offer.grip.s'), ms, onAccept: () => this.refillGrip() });
    },

    async refillGrip() {
        if (!(await this.rewardedOnce('grip-refill'))) return false;
        const h = this.hero;
        h.grip = h.gripMax; h.noGrab = 0; h.spent = false;   // снова можно хвататься
        this.gripSpent = false;
        this.hud('setGrip', h.grip, h.gripMax, true);
        this.hud('banner', Lang.t('g.gripFull'), '', 'info');
        GameFx.play('sam-levelup', h.x, h.y, h.z);
        this.sfx('levelup');
        return true;
    },

    // -------------------------------------------------------------------------------------------
    // Звук
    // -------------------------------------------------------------------------------------------

    sfx(name, volume) {
        try { if (typeof Sfx !== 'undefined') Sfx.play(name, volume != null ? { volume } : undefined); } catch (e) { /* без звука игра идёт */ }
    },

    sfxLoop(name) {
        try { return typeof Sfx !== 'undefined' ? Sfx.loop(name) : null; } catch (e) { return null; }
    },

    climbSound(dt) {
        const on = this.state === 'play' && this.hero.mode === 'climb' && Math.abs(this.hero.vy) > 20;
        if (on && !this.climbLoop) this.climbLoop = this.sfxLoop('climb');
        else if (!on && this.climbLoop) { try { this.climbLoop.fade(0.2); } catch (e) { /* */ } this.climbLoop = null; }
    },

    music() {
        try { if (typeof Sfx !== 'undefined') Sfx.music(this.state === 'play' && this.area > 0 ? 'climb' : 'lobby'); } catch (e) { /* */ }
    },
};
