// GameSfx.js — звуки и музыка Spider Arm Master: единая точка входа для игры.
//
//   Sfx.play(name, opts?)   разовый эффект; варианты (step, grab, land, punch, xp) — Sound.play([…литералы…]);
//                           возвращает { url, stop(), fade(с) } или null (звук выключен / пауза / до жеста / нет имени);
//                           не бросает. opts: { volume, rate, detune } — множители к таблице SFX_DEFS; duck: false — не глушить музыку
//   Sfx.loop(name, opts?)   цикл Sound.loop для 'climb' (сервоприводы на подъёме) и 'whoosh' (ветер падения): handle с set(громкость, скорость),
//                           fade(с), stop(). НЕ бросает и никогда не null: при сбое — безвредная заглушка. h.set принимает абсолютную
//                           громкость (как Sound.loop): масштабируйте от Sfx.level(name) — например h.set(Sfx.level('whoosh') * v, 0.8 + v * 0.6)
//   Sfx.music(which)        'lobby' | 'climb' | null (стоп): плавная смена дорожки (кроссфейд Sound.music), повтор того же — ничего
//   Sfx.level(name)         базовая громкость имени из таблицы (для h.set у циклов)
//   Sfx.preload(names?)     декодировать заранее (по умолчанию все эффекты; зовётся само через ~0.8 с после загрузки скрипта)
//
// Музыка — собственная, синтезирована кодом (tools/compose-music.mjs), эффекты — Kenney (CC0) из Sound Pack: см. assets/sounds/SOUNDS.md.
// Пути ассетов — ТОЛЬКО строковыми литералами в кавычках, от корня игры (иначе сборщик не увидит файл и вырежет его из архива).
// Громкости ниже — относительные (к SOUND_VOLUME / MUSIC_VOLUME из Constants.js); выровнены по замеренной громкости исходных файлов.

/**
 * Каталог эффектов. files — один путь или варианты (случайный, без повтора подряд); vol/rate — множители; gap — мин. пауза
 * между одноимёнными звуками, мс (защита от «пулемёта» при частых ударах); layers — доп. слои (delay, мс); duck — приглушение музыки
 * на время фанфары: [уровень, вход с, держать с, выход с].
 */
const SFX_DEFS = {
    // --- движение: механические руки-щупальца ---
    step:    { files: ['assets/sounds/step-1.ogg', 'assets/sounds/step-2.ogg', 'assets/sounds/step-3.ogg', 'assets/sounds/step-4.ogg'], vol: 0.33, rate: 1, gap: 70 },
    grab:    { files: ['assets/sounds/grab-1.ogg', 'assets/sounds/grab-2.ogg', 'assets/sounds/grab-3.ogg'], vol: 0.8, rate: 1, gap: 45 },
    release: { files: ['assets/sounds/release.ogg'], vol: 1.6, rate: 1.1, gap: 45 },
    land:    { files: ['assets/sounds/land-1.ogg', 'assets/sounds/land-2.ogg'], vol: 0.8, rate: 0.95, gap: 120,
               layers: [{ files: ['assets/sounds/land-metal.ogg'], vol: 0.5, rate: 0.85, delay: 0 }] },
    whoosh:  { files: ['assets/sounds/whoosh.ogg'], vol: 0.5, rate: 1 },
    climb:   { files: ['assets/sounds/climb.ogg'], vol: 0.15, rate: 1 },
    outgrip: { files: ['assets/sounds/outgrip.ogg'], vol: 0.35, rate: 1,
               layers: [{ files: ['assets/sounds/land-metal.ogg'], vol: 0.6, rate: 1.2, delay: 60 }], duck: [0.4, 0.05, 0.7, 0.6] },

    // --- тренировка, опыт, награды ---
    punch:   { files: ['assets/sounds/punch-1.ogg', 'assets/sounds/punch-2.ogg', 'assets/sounds/punch-3.ogg'], vol: 0.7, rate: 1.05, gap: 35,
               layers: [{ files: ['assets/sounds/punch-metal.ogg'], vol: 0.4, rate: 1.1, delay: 0 }] },
    xp:      { files: ['assets/sounds/xp-1.ogg', 'assets/sounds/xp-2.ogg'], vol: 0.25, rate: 1.1, gap: 30 },
    levelup: { files: ['assets/sounds/levelup.ogg'], vol: 0.7, rate: 1,
               layers: [{ files: ['assets/sounds/levelup-sparkle.ogg'], vol: 0.25, rate: 1, delay: 120 }], duck: [0.4, 0.08, 1, 0.6] },
    newarm:  { files: ['assets/sounds/newarm-servo.ogg'], vol: 0.9, rate: 1,
               layers: [{ files: ['assets/sounds/grab-1.ogg'], vol: 0.9, rate: 0.9, delay: 0 },
                        { files: ['assets/sounds/newarm-sparkle.ogg'], vol: 0.4, rate: 1, delay: 220 }], duck: [0.45, 0.08, 1.1, 0.6] },
    win:     { files: ['assets/sounds/win.ogg'], vol: 0.8, rate: 1, duck: [0.25, 0.1, 2, 0.9] },
    daily:   { files: ['assets/sounds/daily.ogg'], vol: 0.6, rate: 1, duck: [0.45, 0.1, 1.2, 0.6] },

    // --- магазин и интерфейс ---
    buy:     { files: ['assets/sounds/buy.ogg'], vol: 1, rate: 1,
               layers: [{ files: ['assets/sounds/buy-coin.ogg'], vol: 0.6, rate: 1, delay: 90 }] },
    equip:   { files: ['assets/sounds/equip.ogg'], vol: 0.3, rate: 1,
               layers: [{ files: ['assets/sounds/equip-cloth.ogg'], vol: 1, rate: 1, delay: 0 }] },
    click:   { files: ['assets/sounds/click.ogg'], vol: 0.4, rate: 1, gap: 30 },
    open:    { files: ['assets/sounds/open.ogg'], vol: 0.5, rate: 1 },
    close:   { files: ['assets/sounds/close.ogg'], vol: 0.5, rate: 1 },
    error:   { files: ['assets/sounds/error.ogg'], vol: 0.5, rate: 1, gap: 80 },
    chat:    { files: ['assets/sounds/chat.ogg'], vol: 0.25, rate: 1.2, gap: 120 },

    // --- перемещения ---
    teleport: { files: ['assets/sounds/teleport-sweep.ogg'], vol: 0.6, rate: 1,
                layers: [{ files: ['assets/sounds/teleport-field.ogg'], vol: 0.25, rate: 1, delay: 40 }] },
    respawn:  { files: ['assets/sounds/respawn.ogg'], vol: 0.5, rate: 1 },
};

/** Музыка: собственные дорожки (tools/compose-music.mjs), бесшовные циклы. fade — секунды кроссфейда при смене. */
const SFX_MUSIC = {
    lobby: { file: 'assets/sounds/music-lobby.ogg', volume: 0.8, fade: 1.2 },
    climb: { file: 'assets/sounds/music-climb.ogg', volume: 0.8, fade: 1.2 },
};

/** @satisfies {Record<string, any>} */
const Sfx = {
    defs: SFX_DEFS,
    /** @type {Record<string, number>} */
    _last: {},          // имя -> время последнего запуска (для gap)

    _now() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); },

    has(name) { return Object.prototype.hasOwnProperty.call(SFX_DEFS, name); },

    /** Базовая громкость имени (для h.set у циклов). */
    level(name) { return this.has(name) ? SFX_DEFS[name].vol : 0; },

    /**
     * Разовый эффект.
     * @param {string} name ключ из SFX_DEFS
     * @param {{ volume?: number, rate?: number, detune?: number, duck?: boolean }} [opts]
     * @returns {{ url: string, stop: () => void, fade: (s?: number) => void } | null}
     */
    play(name, opts) {
        try {
            if (typeof Sound === 'undefined' || !this.has(name)) return null;
            const d = SFX_DEFS[name], o = opts || {};
            if (d.gap) {
                const now = this._now();
                if (now - (this._last[name] || -1e9) < d.gap) return null;
                this._last[name] = now;
            }
            const volume = d.vol * (o.volume == null ? 1 : o.volume);
            const rate = d.rate * (o.rate == null ? 1 : o.rate);
            /** @type {{ volume: number, rate: number, detune?: number }} */
            const so = { volume, rate };
            if (o.detune != null) so.detune = o.detune;
            const main = Sound.play(d.files.length > 1 ? d.files : d.files[0], so);
            if (d.duck && o.duck !== false) Sound.duck(d.duck[0], d.duck[1], d.duck[2], d.duck[3]);
            if (!d.layers || !main) return main || null;

            // слои: сразу или с задержкой; один handle останавливает всё
            const subs = [main], timers = [];
            for (const layer of d.layers) {
                const start = () => {
                    const h = Sound.play(layer.files.length > 1 ? layer.files : layer.files[0], { volume: layer.vol * (o.volume == null ? 1 : o.volume), rate: layer.rate * (o.rate == null ? 1 : o.rate) });
                    if (h) subs.push(h);
                };
                if (layer.delay > 0 && typeof setTimeout === 'function') timers.push(setTimeout(start, layer.delay));
                else start();
            }
            return {
                url: main.url,
                stop() { for (const t of timers) clearTimeout(t); for (const h of subs) h.stop(); },
                fade(s) { for (const t of timers) clearTimeout(t); for (const h of subs) h.fade(s); },
            };
        } catch (e) { return null; }
    },

    /**
     * Цикл ('climb', 'whoosh'). Громкость 0 в opts — цикл ждёт, пока её не поднимут через h.set.
     * @param {string} name
     * @param {{ volume?: number, rate?: number }} [opts]
     */
    loop(name, opts) {
        try {
            if (typeof Sound === 'undefined' || !this.has(name)) return this._noopLoop();
            const d = SFX_DEFS[name], o = opts || {};
            return Sound.loop(d.files.length > 1 ? d.files : d.files[0], {
                volume: d.vol * (o.volume == null ? 1 : o.volume),
                rate: d.rate * (o.rate == null ? 1 : o.rate),
            });
        } catch (e) { return this._noopLoop(); }
    },

    _noopLoop() { return { url: '', set() {}, fade() {}, stop() {} }; },

    /**
     * Музыка: 'lobby' | 'climb' | null. Смена дорожки — кроссфейд; то же имя повторно — ничего не делает.
     * @param {'lobby' | 'climb' | null} which
     */
    music(which) {
        try {
            if (typeof Sound === 'undefined') return;
            const m = which ? SFX_MUSIC[which] : null;
            if (which && !m) return;
            if (!m) Sound.music(null, { fade: 0.8 });
            else Sound.music(m.file, { volume: m.volume, fade: m.fade });
        } catch (e) { /* звук — не повод ронять игру */ }
    },

    /** Декодировать эффекты заранее (первый удар без задержки на загрузку). */
    preload(names) {
        try {
            if (typeof Sound === 'undefined') return;
            const keys = names || Object.keys(SFX_DEFS);
            const urls = [];
            for (const k of keys) {
                const d = SFX_DEFS[k];
                if (!d) continue;
                urls.push(...d.files);
                for (const l of d.layers || []) urls.push(...l.files);
            }
            Sound.preload([...new Set(urls)]);
        } catch (e) { /* без предзагрузки звуки грузятся при первом запуске */ }
    },
};

// Эффекты декодируются в фоне вскоре после загрузки (до жеста игрока OfflineAudioContext это позволяет); музыку грузит Sound.music.
if (typeof setTimeout === 'function') {
    const timer = /** @type {any} */ (setTimeout(() => Sfx.preload(), 800));
    if (timer && typeof timer.unref === 'function') timer.unref();   // в node (тесты) таймер не держит процесс
}
