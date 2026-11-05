// GameHudIcons.js — иконки интерфейса Spider Arm Master: встроенные SVG (глянцевые, с толстой тёмной обводкой) и
// рисование превью предметов магазина на canvas по данным: item.arm — щупальце, item.look — блочный персонаж,
// item.hat { type, color } — шапка на голове, item.trail { fx, color, color2 } — след на кончике руки,
// item.core { color, glow, pulse, ring } — светящееся ядро-рюкзак, item.winfx { colors, star, burst } — победный эффект.
// Иконки — WebP из assets/ui (происхождение — assets/ui/SOURCES.md), путь к каждой записан литералом в GameIcons.IMAGES.
// Имени нет в IMAGES (например quality) — рисуется встроенный SVG-символ из спрайта ниже: ссылок на несуществующие файлы нет.
//
//   GameIcons.mount()                    один раз: спрайт <symbol> в документе (GameHud.init зовёт сам)
//   GameIcons.html('trophy', 'cls')      HTML значка (SVG из спрайта или <img>)
//   GameIcons.paintItem(canvas, item)    превью предмета магазина (любой вкладки) на canvas; canPaint(item) — есть ли что рисовать
//   GameIcons.drawArm(canvas, arm) / drawSkin(canvas, look) / drawHat(canvas, hat) / drawTrail(canvas, trail) / drawCore(canvas, core) / drawWinFx(canvas, winfx)
//   GameIcons.image(name, onload)        загруженная картинка значка (для canvas), onload — когда догрузится
//   GameIcons.climbUrl                   data:-адрес стрелки «лезть» (фон контекстной кнопки)

const GAME_ICON_INK = '#14102f';

/** @satisfies {Record<string, any>} */
const GameIcons = {
    /** Имя значка -> картинка. Пути — только литералами (сборщик видит каждый); новая картинка = новая строка здесь. */
    IMAGES: /** @type {Record<string, string>} */ ({
        trophy: 'assets/ui/trophy.webp', shop: 'assets/ui/shop.webp', daily: 'assets/ui/daily.webp', gift: 'assets/ui/gift.webp', portal: 'assets/ui/portal.webp', podium: 'assets/ui/podium.webp',
        rebirth: 'assets/ui/rebirth.webp', teleport: 'assets/ui/teleport.webp', gear: 'assets/ui/gear.webp',
        fist: 'assets/ui/grip.webp', arm: 'assets/ui/arms.webp', skin: 'assets/ui/skins.webp', level: 'assets/ui/levelup.webp',
        bolt: 'assets/ui/xp.webp', lock: 'assets/ui/lock.webp', check: 'assets/ui/check.webp', close: 'assets/ui/close.webp',
        play: 'assets/ui/play.webp', pause: 'assets/ui/pause.webp', question: 'assets/ui/question.webp',
        sound: 'assets/ui/sound-on.webp', mute: 'assets/ui/sound-off.webp', home: 'assets/ui/home.webp',
        star: 'assets/ui/star.webp', sparkles: 'assets/ui/sparkles.webp',
        wheel: 'assets/ui/wheel.webp', hat: 'assets/ui/hat.webp', trail: 'assets/ui/trail.webp',
        flashStar: 'assets/fx/flash-star.webp', rainbowStar: 'assets/fx/rainbow-star.webp',
    }),
    /** Шапки, которые умеет рисовать превью (item.hat.type); неизвестный тип рисуется как кепка. */
    HATS: ['cap', 'beanie', 'crown', 'helmet', 'headband', 'tophat', 'horns', 'halo', 'visor', 'propeller', 'chef', 'bunny', 'antenna', 'wizard', 'party', 'cowboy', 'santa'],
    /** @type {Record<string, HTMLImageElement>} */
    _imgs: {},
    _mounted: false,
    climbUrl: '',

    /** Обводка и общие атрибуты контура. */
    S: 'stroke="' + GAME_ICON_INK + '" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"',

    /** Звезда-многоугольник: центр, внешний и внутренний радиусы. */
    starPts(cx, cy, ro, ri, n = 5) {
        const pts = [];
        for (let i = 0; i < n * 2; i++) {
            const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? ri : ro;
            pts.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1));
        }
        return pts.join(' ');
    },

    gearPath(cx, cy, ro, ri, teeth) {
        const pts = [];
        const step = Math.PI * 2 / teeth;
        for (let i = 0; i < teeth; i++) {
            const a = i * step;
            for (const [da, r] of [[-0.34, ri], [-0.2, ro], [0.2, ro], [0.34, ri]]) {
                const an = a + da * step * 1.5 - Math.PI / 2;
                pts.push((cx + Math.cos(an) * r).toFixed(1) + ' ' + (cy + Math.sin(an) * r).toFixed(1));
            }
        }
        return 'M' + pts.join('L') + 'Z';
    },

    /** Градиенты и символы. Все id с префиксом sam-. */
    sprite() {
        const S = this.S, K = GAME_ICON_INK;
        const grad = (id, a, b, c) => '<linearGradient id="sam-g-' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset=".5" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient>';
        const g = (id) => 'url(#sam-g-' + id + ')';
        const sym = (name, body) => '<symbol id="sam-ic-' + name + '" viewBox="0 0 64 64">' + body + '</symbol>';
        const shine = (d) => '<path d="' + d + '" fill="none" stroke="#fff" stroke-opacity=".62" stroke-width="3.2" stroke-linecap="round"/>';
        // фигуры кулака: слой обводки и слой заливки совпадают, поэтому контур получается цельным
        const fist = '<rect x="13" y="25" width="38" height="29" rx="11"/><circle cx="21" cy="26" r="7"/><circle cx="30" cy="23" r="7"/><circle cx="39" cy="23" r="7"/><circle cx="47" cy="26" r="7"/><rect x="9" y="36" width="24" height="13" rx="6.5"/>';
        const arm = 'M13 55C8 32 30 42 34 25S46 15 53 12';
        const cross = (w) => '<path d="M18 18 46 46M46 18 18 46" fill="none" stroke="' + K + '" stroke-width="' + (w + 6) + '" stroke-linecap="round"/><path d="M18 18 46 46M46 18 18 46" fill="none" stroke="#fff" stroke-width="' + w + '" stroke-linecap="round"/>';
        const sp = [
            sym('trophy',
                '<path d="M17 14H8c0 11 4 17 11 19M47 14h9c0 11-4 17-11 19" fill="none" stroke="' + K + '" stroke-width="10" stroke-linecap="round"/>' +
                '<path d="M17 14H8c0 11 4 17 11 19M47 14h9c0 11-4 17-11 19" fill="none" stroke="' + g('gold') + '" stroke-width="4.6" stroke-linecap="round"/>' +
                '<path d="M17 8h30v14c0 11-6 19-15 19S17 33 17 22z" fill="' + g('gold') + '" ' + S + '/>' +
                '<rect x="27.5" y="40" width="9" height="9" fill="' + g('gold') + '" ' + S + '/>' +
                '<path d="M19 50h26a3 3 0 0 1 3 3v4H16v-4a3 3 0 0 1 3-3z" fill="' + g('orange') + '" ' + S + '/>' +
                '<polygon points="' + this.starPts(32, 22, 8, 3.6) + '" fill="#fff7c9" stroke="#c9760b" stroke-width="1.6" stroke-linejoin="round"/>' +
                shine('M22 13c-1 7 1 13 4 17')),
            sym('shop',
                '<path d="M22 25v-7a10 10 0 0 1 20 0v7" fill="none" stroke="' + K + '" stroke-width="9" stroke-linecap="round"/>' +
                '<path d="M22 25v-7a10 10 0 0 1 20 0v7" fill="none" stroke="#ffe6a0" stroke-width="4" stroke-linecap="round"/>' +
                '<path d="M12 23h40l-3 31a4.5 4.5 0 0 1-4.5 4H19.500a4.500 4.500 0 0 1-4.500-4z" fill="' + g('red') + '" ' + S + '/>' +
                '<polygon points="' + this.starPts(32, 40, 10, 4.4) + '" fill="' + g('gold') + '" stroke="' + K + '" stroke-width="2.6" stroke-linejoin="round"/>' +
                shine('M18 29l-1.600 17')),
            sym('rebirth',
                '<g fill="none" stroke-linecap="round"><path d="M14 30A18 18 0 0 1 46 20M50 34A18 18 0 0 1 18 44" stroke="' + K + '" stroke-width="11"/>' +
                '<path d="M14 30A18 18 0 0 1 46 20M50 34A18 18 0 0 1 18 44" stroke="#ff7fc0" stroke-width="5.400"/></g>' +
                '<polygon points="51,26 41,24 51,16" fill="#ffd0e6" ' + S + '/><polygon points="13,38 23,40 13,48" fill="#ffd0e6" ' + S + '/>' +
                '<polygon points="' + this.starPts(32, 32, 9, 3.2, 4) + '" fill="' + g('gold') + '" stroke="' + K + '" stroke-width="2.800" stroke-linejoin="round"/>'),
            sym('daily',
                '<rect x="19" y="7" width="7" height="14" rx="3.500" fill="' + g('steel') + '" ' + S + '/><rect x="38" y="7" width="7" height="14" rx="3.500" fill="' + g('steel') + '" ' + S + '/>' +
                '<rect x="9" y="14" width="46" height="42" rx="8" fill="#fff" ' + S + '/>' +
                '<path d="M9 22a8 8 0 0 1 8-8h30a8 8 0 0 1 8 8v8H9z" fill="' + g('red') + '" ' + S + '/>' +
                '<polygon points="' + this.starPts(32, 43, 10, 4.400) + '" fill="' + g('gold') + '" stroke="' + K + '" stroke-width="2.600" stroke-linejoin="round"/>'),
            sym('teleport',
                '<ellipse cx="32" cy="34" rx="20" ry="26" fill="' + g('purple') + '" ' + S + '/>' +
                '<ellipse cx="32" cy="34" rx="13" ry="19" fill="' + g('cyan') + '" stroke="' + K + '" stroke-width="3" />' +
                '<ellipse cx="32" cy="35" rx="6.500" ry="11" fill="#fff" stroke="' + K + '" stroke-width="2.400"/>' +
                '<path d="M32 28l-5 6h3.500v6h3v-6H37z" fill="' + g('cyan') + '" stroke="' + K + '" stroke-width="1.800" stroke-linejoin="round"/>' +
                '<circle cx="54" cy="12" r="2.800" fill="#fff"/><circle cx="9" cy="48" r="2.200" fill="#fff"/>'),
            sym('gear',
                '<path d="' + this.gearPath(32, 32, 28, 21, 8) + '" fill="' + g('steel') + '" ' + S + '/>' +
                '<circle cx="32" cy="32" r="10" fill="#2a2468" ' + S + '/>' + shine('M18 22a17 17 0 0 1 8-8')),
            sym('fist',
                '<g fill="' + K + '" stroke="' + K + '" stroke-width="7" stroke-linejoin="round">' + fist + '</g>' +
                '<g fill="' + g('orange') + '">' + fist + '</g>' +
                '<path d="M25.500 20.500V30M34.500 17.500V30M43 18.500V30" stroke="#a3430a" stroke-width="2.600" stroke-linecap="round" fill="none"/>' +
                '<path d="M12 42h18" stroke="#a3430a" stroke-width="2.600" stroke-linecap="round"/>' + shine('M17 33v6')),
            sym('arm',
                '<path d="' + arm + '" fill="none" stroke="' + K + '" stroke-width="15" stroke-linecap="round"/>' +
                '<path d="' + arm + '" fill="none" stroke="' + g('blue') + '" stroke-width="9.500" stroke-dasharray="7 2.600" stroke-linecap="butt"/>' +
                '<path d="M52 18L47 6M52 18L60 8M54 21L62 17" fill="none" stroke="' + K + '" stroke-width="8" stroke-linecap="round"/>' +
                '<path d="M52 18L47 6M52 18L60 8M54 21L62 17" fill="none" stroke="#e8f4ff" stroke-width="3.600" stroke-linecap="round"/>' +
                '<circle cx="14" cy="54" r="6" fill="' + g('gold') + '" ' + S + '/>'),
            sym('level',
                '<rect x="7" y="7" width="50" height="50" rx="13" fill="' + g('green') + '" ' + S + '/>' +
                '<path d="M19 35 32 22 45 35M19 47 32 34 45 47" fill="none" stroke="' + K + '" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path d="M19 35 32 22 45 35M19 47 32 34 45 47" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'),
            sym('lock',
                '<path d="M21 30v-8a11 11 0 0 1 22 0v8" fill="none" stroke="' + K + '" stroke-width="10" stroke-linecap="round"/>' +
                '<path d="M21 30v-8a11 11 0 0 1 22 0v8" fill="none" stroke="' + g('steel') + '" stroke-width="4.400" stroke-linecap="round"/>' +
                '<rect x="12" y="28" width="40" height="29" rx="8" fill="' + g('gold') + '" ' + S + '/>' +
                '<circle cx="32" cy="40" r="4.600" fill="' + K + '"/><rect x="30" y="41" width="4" height="9" rx="2" fill="' + K + '"/>'),
            sym('check',
                '<circle cx="32" cy="32" r="26" fill="' + g('green') + '" ' + S + '/>' +
                '<path d="M19 33l9 9 18-20" fill="none" stroke="' + K + '" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path d="M19 33l9 9 18-20" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'),
            sym('close', cross(8.500)),
            sym('play', '<path d="M20 11 53 32 20 53z" fill="#fff" stroke="' + K + '" stroke-width="5" stroke-linejoin="round"/>'),
            sym('pause', '<rect x="14" y="12" width="13" height="40" rx="4" fill="#fff" ' + S + '/><rect x="37" y="12" width="13" height="40" rx="4" fill="#fff" ' + S + '/>'),
            sym('sound', '<path d="M10 25h10l13-11v36L20 39H10z" fill="#fff" ' + S + '/><path d="M41 24a12 12 0 0 1 0 16M47 17a21 21 0 0 1 0 30" fill="none" stroke="' + K + '" stroke-width="9" stroke-linecap="round"/><path d="M41 24a12 12 0 0 1 0 16M47 17a21 21 0 0 1 0 30" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'),
            sym('mute', '<path d="M8 25h10l13-11v36L18 39H8z" fill="#fff" ' + S + '/><g transform="translate(24 8) scale(.62 .62)">' + cross(11) + '</g>'),
            sym('question',
                '<path d="M22 24a10 10 0 1 1 15 9c-4 2.500-5 5-5 8" fill="none" stroke="' + K + '" stroke-width="13" stroke-linecap="round"/>' +
                '<path d="M22 24a10 10 0 1 1 15 9c-4 2.500-5 5-5 8" fill="none" stroke="#fff" stroke-width="6.500" stroke-linecap="round"/>' +
                '<circle cx="32" cy="52" r="6.500" fill="#fff" ' + S + '/>'),
            sym('home',
                '<path d="M9 32 32 11l23 21" fill="none" stroke="' + K + '" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path d="M9 32 32 11l23 21" fill="none" stroke="' + g('red') + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path d="M15 30v24h34V30L32 16z" fill="#fff" ' + S + '/><rect x="26" y="38" width="12" height="16" rx="3" fill="' + g('orange') + '" ' + S + '/>'),
            sym('gift',
                '<rect x="10" y="26" width="44" height="29" rx="5" fill="' + g('pink') + '" ' + S + '/><rect x="8" y="18" width="48" height="12" rx="4" fill="' + g('purple') + '" ' + S + '/>' +
                '<rect x="28" y="18" width="8" height="37" fill="' + g('gold') + '" stroke="' + K + '" stroke-width="2.800"/>' +
                '<path d="M32 18c-9-1-14-5-11-9s11 2 11 9c0-7 8-13 11-9s-2 8-11 9z" fill="' + g('gold') + '" ' + S + '/>'),
            sym('skin',
                '<path d="M10 58c0-13 9-19 22-19s22 6 22 19z" fill="' + g('blue') + '" ' + S + '/>' +
                '<rect x="18" y="8" width="28" height="28" rx="8" fill="' + g('gold') + '" ' + S + '/>' +
                '<rect x="25" y="19" width="4.500" height="7" rx="2" fill="' + K + '"/><rect x="35" y="19" width="4.500" height="7" rx="2" fill="' + K + '"/>' +
                '<path d="M26 30q6 4 12 0" fill="none" stroke="' + K + '" stroke-width="2.600" stroke-linecap="round"/>' + shine('M22 14h5')),
            sym('adplay', '<path d="M20 11 53 32 20 53z" fill="#fff" stroke="' + K + '" stroke-width="5" stroke-linejoin="round"/>'),
            sym('core',
                '<g transform="rotate(-24 32 33)"><path d="M5 33A27 9 0 0 1 59 33" fill="none" stroke="' + K + '" stroke-width="9" stroke-linecap="round"/><path d="M5 33A27 9 0 0 1 59 33" fill="none" stroke="#ffe07a" stroke-width="4" stroke-linecap="round"/></g>' +
                '<circle cx="32" cy="32" r="17" fill="' + g('cyan') + '" ' + S + '/><circle cx="32" cy="32" r="9" fill="#fff" fill-opacity=".55"/>' + shine('M22 25a11 11 0 0 1 7-7') +
                '<g transform="rotate(-24 32 33)"><path d="M5 33A27 9 0 0 0 59 33" fill="none" stroke="' + K + '" stroke-width="9" stroke-linecap="round"/><path d="M5 33A27 9 0 0 0 59 33" fill="none" stroke="#ffe07a" stroke-width="4" stroke-linecap="round"/></g>'),
            sym('star', '<polygon points="' + this.starPts(32, 33, 28, 12) + '" fill="' + g('gold') + '" ' + S + '/>' + shine('M20 24l5-9')),
            sym('bolt', '<path d="M36 6 14 36h14l-4 22 26-34H35z" fill="' + g('gold') + '" ' + S + '/>'),
            sym('quality', '<path d="M8 44a24 24 0 0 1 48 0" fill="none" stroke="' + K + '" stroke-width="11" stroke-linecap="round"/><path d="M8 44a24 24 0 0 1 48 0" fill="none" stroke="' + g('cyan') + '" stroke-width="5" stroke-linecap="round"/><path d="M32 44 44 26" stroke="' + K + '" stroke-width="9" stroke-linecap="round"/><path d="M32 44 44 26" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="44" r="5.500" fill="#fff" ' + S + '/>'),
        ];
        const defs = '<defs>' +
            grad('gold', '#fff3a6', '#ffd23a', '#ff9d1c') + grad('orange', '#ffc46b', '#ff8a1c', '#e0560e') +
            grad('green', '#9bffaa', '#2bd45c', '#139a3d') + grad('blue', '#9ad6ff', '#3b9bff', '#1d5fd6') +
            grad('red', '#ffa0ab', '#ff4a5c', '#c81a36') + grad('pink', '#ffb8e3', '#ff5db1', '#c9227f') +
            grad('purple', '#d2baff', '#8c5cff', '#5a2fc9') + grad('steel', '#f7f9ff', '#b3bed8', '#6c7aa0') +
            grad('cyan', '#c2f8ff', '#42e8ff', '#1aa6cc') + '</defs>';
        return '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">' + defs + sp.join('') + '</svg>';
    },

    /** Спрайт в документ (один раз) и адрес стрелки «лезть» для CSS. */
    mount() {
        if (this._mounted || typeof document === 'undefined' || !document.body) return;
        this._mounted = true;
        const wrap = document.createElement('div');
        wrap.id = 'sam-sprite';
        wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
        wrap.innerHTML = this.sprite();
        document.body.appendChild(wrap);
        // картинки грузим заранее: окна открываются без «вспышки» пустых иконок
        for (const name of Object.keys(this.IMAGES)) this.image(name);
    },

    /** Стрелка вверх в виде SVG-строки: фон контекстной кнопки «лезть» (data:-адрес, без файлов). */
    climbSvg() {
        const K = GAME_ICON_INK;
        const p = 'M32 6 55 31H41v25H23V31H9z';
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="' + p + '" fill="' + K + '" stroke="' + K + '" stroke-width="9" stroke-linejoin="round"/>' +
            '<path d="' + p + '" fill="#fff"/><path d="M26 36v15" stroke="#ffd9a1" stroke-width="4" stroke-linecap="round"/></svg>';
    },

    get climbDataUrl() { return 'url("data:image/svg+xml,' + encodeURIComponent(this.climbSvg()) + '")'; },

    /** Картинка значка для canvas (кэш). onload вызывается один раз, если она ещё не догрузилась. null — такого значка-файла нет. */
    image(name, onload) {
        const src = this.IMAGES[name];
        if (!src || typeof Image === 'undefined') return null;
        let im = this._imgs[name];
        if (!im) { im = new Image(); im.src = src; this._imgs[name] = im; }
        if (onload && !(im.complete && im.naturalWidth > 0)) im.addEventListener('load', onload, { once: true });
        return im;
    },

    /** HTML значка: картинка (если игра подключила IMAGES[name]) или символ спрайта. */
    html(name, cls) {
        const img = this.IMAGES[name];
        const c = 'sam-ic' + (cls ? ' ' + cls : '');
        if (img) return '<img class="' + c + '" src="' + img + '" alt="" draggable="false">';
        return '<svg class="' + c + '" viewBox="0 0 64 64" aria-hidden="true"><use href="#sam-ic-' + name + '"/></svg>';
    },

    // =============================================================================================
    // Цвет
    // =============================================================================================

    hex(n) { return '#' + (Number(n) & 0xffffff).toString(16).padStart(6, '0'); },

    /** Смешать два 0xRRGGBB: t 0..1 от a к b. */
    mix(a, b, t) {
        const ch = (v, s) => (v >> s) & 255;
        const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
        return (m(16) << 16) | (m(8) << 8) | m(0);
    },
    lighten(n, t) { return this.hex(this.mix(n, 0xffffff, t)); },
    darken(n, t) { return this.hex(this.mix(n, 0x000000, t)); },

    // =============================================================================================
    // Canvas: общее
    // =============================================================================================

    /** Подготовить canvas: очистить и вернуть контекст в виртуальных координатах 100×100. */
    _ctx(canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(canvas.width / 100, canvas.height / 100);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        return ctx;
    },

    _rr(ctx, x, y, w, h, r) {
        const k = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + k, y);
        ctx.arcTo(x + w, y, x + w, y + h, k);
        ctx.arcTo(x + w, y + h, x, y + h, k);
        ctx.arcTo(x, y + h, x, y, k);
        ctx.arcTo(x, y, x + w, y, k);
        ctx.closePath();
    },

    /** Залить текущий путь цветом и обвести тёмным контуром. */
    _paint(ctx, fill, lw = 2.4) {
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = lw;
        ctx.strokeStyle = GAME_ICON_INK;
        ctx.stroke();
    },

    /** Есть ли у предмета что рисовать: arm, look, hat, trail, core или winfx. */
    canPaint(item) { return !!(item && (item.arm || item.look || item.hat || item.trail || item.core || item.winfx)); },

    /** Превью предмета: arm — щупальце, look — персонаж, hat — шапка на голове, trail — след, core — ядро, winfx — победный эффект. */
    paintItem(canvas, item) {
        if (!canvas || !item) return;
        if (item.arm) this.drawArm(canvas, item.arm);
        else if (item.look) this.drawSkin(canvas, item.look);
        else if (item.hat) this.drawHat(canvas, item.hat);
        else if (item.trail) this.drawTrail(canvas, item.trail);
        else if (item.core) this.drawCore(canvas, item.core);
        else if (item.winfx) this.drawWinFx(canvas, item.winfx);
    },

    /** Цвет из данных предмета: число 0xRRGGBB, строка '#rrggbb' / 'rgb(…)' или запасной. Всегда число (для mix/lighten). */
    num(v, def) {
        if (typeof v === 'number' && isFinite(v) && v >= 0) return v & 0xffffff;
        if (typeof v === 'string') { const m = /^#?([0-9a-f]{6})$/i.exec(v.trim()); if (m) return parseInt(m[1], 16); }
        return def == null ? 0xffffff : def;
    },

    /** Детерминированный «случайный» 0..1 по номеру: превью не дрожит при перерисовке. */
    _rand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); },

    /** Четырёхлучевая искра (центр, радиус, цвет): блёстки следов и эффектов. */
    _sparkle(ctx, x, y, r, c, ink) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.32 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.closePath();
        if (ink) this._paint(ctx, c, Math.max(0.8, r * 0.18)); else { ctx.fillStyle = c; ctx.fill(); }
    },

    _heart(ctx, x, y, r, c) {
        ctx.beginPath();
        ctx.moveTo(x, y + r * 0.9);
        ctx.bezierCurveTo(x - r * 1.5, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.4);
        ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.5, y - r * 0.2, x, y + r * 0.9);
        ctx.closePath();
        this._paint(ctx, c, Math.max(0.8, r * 0.28));
    },

    // =============================================================================================
    // Canvas: шапка на голове крупным планом
    // =============================================================================================

    /** hat — { type, color } или строка-тип. Голова блочного человечка крупно, шапка по item.hat.type. */
    drawHat(canvas, hat) {
        const ctx = this._ctx(canvas);
        if (!ctx || !hat) return;
        const type = typeof hat === 'string' ? hat : String(hat.type || 'none');
        const colN = this.num(typeof hat === 'string' ? undefined : hat.color, 0xffd24a);
        const col2 = typeof hat === 'string' ? -1 : this.num(hat.color2, -1);
        const skin = 0xf6b04a;
        // мягкое свечение за головой
        const gl = ctx.createRadialGradient(50, 52, 4, 50, 52, 52);
        gl.addColorStop(0, 'rgba(255,255,255,.28)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(0, 0, 100, 100);
        ctx.beginPath(); ctx.ellipse(50, 95, 26, 3.600, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill();
        ctx.save();
        ctx.translate(50, 66); ctx.scale(1.75, 1.75); ctx.translate(-50, -26);
        // плечи и голова
        this._rr(ctx, 30, 40, 40, 14, 6); this._paint(ctx, this.hex(0x2ec4b6), 1.600);
        this._rr(ctx, 35, 11, 30, 29, 7); this._paint(ctx, this.hex(skin), 1.800);
        this._face(ctx, 'smile', skin);
        this._hat(ctx, type === 'none' || this.HATS.indexOf(type) >= 0 ? type : 'cap', this.hex(colN), { hatColor: colN, hatColor2: col2, accent: col2 >= 0 ? col2 : this.mix(colN, 0xffffff, 0.45) });
        ctx.restore();
    },

    // =============================================================================================
    // Canvas: след на кончике руки
    // =============================================================================================

    /** Цвета следа по виду частиц (если у предмета color / color2 не заданы: −1). */
    TRAIL_COLORS: {
        sparks: [0xffe27a, 0xffa31a], flame: [0xff7a1a, 0xffd21a], electric: [0x9ff2ff, 0xffffff], hearts: [0xff5db1, 0xffc2e0], frost: [0xe6fbff, 0x8fe3ff],
        rainbow: [0xff4f4f, 0x4fc8ff], void: [0xc04dff, 0x6b2bd9], gold: [0xfff1a8, 0xffc21a], bubbles: [0x7fe0ff, 0xe6fbff], leaves: [0x8bc34a, 0x2e7d32],
        stars: [0xffe14a, 0xffffff], smoke: [0x9a9aa8, 0x4a4a58],
    },

    /** trail — { fx, color, color2, power }: кончик руки справа вверху, за ним по дуге частицы цвета color -> color2 вида fx. */
    drawTrail(canvas, trail) {
        const ctx = this._ctx(canvas);
        if (!ctx || !trail) return;
        const fx = String(trail.fx || 'sparks').toLowerCase();
        const def = this.TRAIL_COLORS[fx] || [0xffd24a, 0xffffff];
        const c1 = this.num(trail.color, def[0]), c2 = this.num(trail.color2, def[1]);
        const dense = Math.max(0.6, Math.min(2, Number(trail.power) || 1));
        // кривая движения: от кончика (80, 26) назад вниз-влево волной
        const pt = (t) => [80 - 66 * t, 26 + 54 * t + Math.sin(t * 7) * 7 * (0.3 + t)];
        const glow = ctx.createRadialGradient(50, 52, 4, 50, 52, 54);
        glow.addColorStop(0, this.hex(c1) + '44'); glow.addColorStop(1, this.hex(c1) + '00');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, 100, 100);
        // мягкая лента следа: цепочка прозрачных кругов по кривой, сходит на нет
        for (let i = 0; i < 24; i++) {
            const t = i / 24, [x, y] = pt(t);
            ctx.beginPath(); ctx.arc(x, y, 7.500 * (1 - t * 0.85), 0, 7);
            ctx.fillStyle = this.hex(this.mix(c1, c2, t)) + (t < 0.15 ? '66' : '38'); ctx.fill();
        }
        const kind = fx === 'hearts' ? 'heart' : fx === 'sparks' || fx === 'gold' ? 'spark' : fx === 'stars' ? 'star' : fx === 'bubbles' ? 'ring' : fx === 'smoke' ? 'smoke'
            : fx === 'flame' ? 'drop' : fx === 'electric' ? 'bolt' : fx === 'frost' ? 'diamond' : fx === 'leaves' ? 'leaf' : 'dot';
        const rainbow = fx === 'rainbow';
        const N = Math.round(13 * Math.min(1.5, dense));
        for (let i = 0; i < N; i++) {
            const t = 0.1 + 0.88 * i / N, [bx, by] = pt(t);
            const x = bx + (this._rand(i + 3) - 0.5) * 14, y = by + (this._rand(i + 41) - 0.5) * 14;
            const r = (1 - t * 0.7) * (3 + this._rand(i + 9) * 2.600);
            const col = rainbow ? 'hsl(' + Math.round(t * 300) + ' 95% 60%)' : this.hex(this.mix(c1, c2, (t + this._rand(i + 17) * 0.3) % 1));
            ctx.save();
            switch (kind) {
                case 'heart': this._heart(ctx, x, y, r * 1.1, col); break;
                case 'spark': this._sparkle(ctx, x, y, r * 1.8, col, true); break;
                case 'star': ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.8 : r * 1.9; if (k) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); this._paint(ctx, col, 1.200); break;
                case 'ring': ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 7); ctx.lineWidth = 1.800; ctx.strokeStyle = GAME_ICON_INK; ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = col; ctx.stroke(); ctx.beginPath(); ctx.arc(x - r * 0.5, y - r * 0.5, r * 0.3, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill(); break;
                case 'smoke': ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.fillStyle = col + '99'; ctx.fill(); break;
                case 'leaf': ctx.translate(x, y); ctx.rotate(this._rand(i + 23) * 6.280); ctx.beginPath(); ctx.moveTo(-r * 1.700, 0); ctx.quadraticCurveTo(0, -r * 1.700, r * 1.700, 0); ctx.quadraticCurveTo(0, r * 1.700, -r * 1.700, 0); this._paint(ctx, col, 1.300); break;
                case 'drop': ctx.translate(x, y); ctx.rotate(-0.9); ctx.beginPath(); ctx.moveTo(r * 2.400, 0); ctx.quadraticCurveTo(0, -r * 1.500, -r, 0); ctx.quadraticCurveTo(0, r * 1.500, r * 2.400, 0); this._paint(ctx, col, 1.400); break;
                case 'bolt': ctx.beginPath(); ctx.moveTo(x - r, y - r * 1.800); ctx.lineTo(x + r * 0.2, y - r * 0.2); ctx.lineTo(x - r * 0.6, y + r * 0.2); ctx.lineTo(x + r, y + r * 1.800); ctx.lineWidth = 3.200; ctx.strokeStyle = GAME_ICON_INK; ctx.stroke(); ctx.lineWidth = 1.600; ctx.strokeStyle = col; ctx.stroke(); break;
                case 'diamond': ctx.beginPath(); ctx.moveTo(x, y - r * 1.600); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.600); ctx.lineTo(x - r, y); ctx.closePath(); this._paint(ctx, col, 1.400); break;
                default: ctx.beginPath(); ctx.arc(x, y, r, 0, 7); this._paint(ctx, col, 1.400);
            }
            ctx.restore();
        }
        // кончик щупальца: звено и клешня, смотрит вправо-вверх
        const [tx, ty] = pt(0);
        ctx.save();
        ctx.translate(tx, ty); ctx.rotate(-0.72);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-17, 2); ctx.lineTo(0, 0); ctx.lineWidth = 11; ctx.strokeStyle = GAME_ICON_INK; ctx.stroke(); ctx.lineWidth = 6.600; ctx.strokeStyle = '#8a93ad'; ctx.stroke();
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(1, s * 1.600); ctx.quadraticCurveTo(9, s * 8, 16, s * 3.400); ctx.lineWidth = 6.400; ctx.strokeStyle = GAME_ICON_INK; ctx.stroke(); ctx.lineWidth = 3.200; ctx.strokeStyle = '#e8f4ff'; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, 0, 4.800, 0, 7); this._paint(ctx, this.hex(c1), 2);
        ctx.restore();
    },

    // =============================================================================================
    // Canvas: светящееся ядро-рюкзак
    // =============================================================================================

    /**
     * core — { shape, color, glow, pulse, ring, halo, spin }: shape 'orb' | 'cube' | 'gem' | 'crystal' | 'dodeca' | 'ico'; glow — яркость свечения
     * (1 — обычная, больше 1,2 — ещё и ореол); ring / halo — цвет кольца и ореола (−1 — нет / как у ядра); pulse — скорость пульса.
     */
    drawCore(canvas, core) {
        const ctx = this._ctx(canvas);
        if (!ctx || !core) return;
        const col = this.num(core.color, 0x42e8ff);
        const gl = typeof core.glow === 'number' && core.glow >= 0 && core.glow < 50 ? core.glow : 1;
        const haloN = this.num(core.halo, col), ringN = core.ring >= 0 ? this.num(core.ring, -1) : -1;
        const cx = 50, cy = 52, K = GAME_ICON_INK;
        const halo = (r, a) => {
            const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, r);
            g.addColorStop(0, this.hex(haloN) + a); g.addColorStop(0.5, this.hex(haloN) + '33'); g.addColorStop(1, this.hex(haloN) + '00');
            ctx.fillStyle = g; ctx.fillRect(0, 0, 100, 100);
        };
        halo(52, gl > 1.2 ? 'cc' : gl >= 0.8 ? '99' : '55');
        if (core.pulse > 0) { ctx.beginPath(); ctx.arc(cx, cy, 36, 0, 7); ctx.lineWidth = 2; ctx.strokeStyle = this.hex(haloN) + '77'; ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 43, 0, 7); ctx.lineWidth = 1.200; ctx.strokeStyle = this.hex(haloN) + '44'; ctx.stroke(); }
        const ringArc = (front) => {
            ctx.save();
            ctx.translate(cx, cy); ctx.rotate(-0.42);
            ctx.beginPath(); ctx.ellipse(0, 0, 41, 12, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
            ctx.lineWidth = 6.400; ctx.strokeStyle = K; ctx.stroke();
            ctx.lineWidth = 3; ctx.strokeStyle = this.hex(ringN); ctx.stroke();
            ctx.restore();
        };
        if (ringN >= 0) ringArc(false);
        const lite = (n, t) => this.hex(this.mix(n, 0xffffff, t)), dark = (n, t) => this.hex(this.mix(n, 0x000000, t));
        const poly = (pts, fill, lw = 2.200) => { ctx.beginPath(); pts.forEach(([x, y], i) => { if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); this._paint(ctx, fill, lw); };
        const shape = String(core.shape || 'orb');
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(1.18, 1.18); ctx.translate(-cx, -cy);
        switch (shape) {
            case 'cube': {
                const T = [[50, 28], [72, 40], [50, 52], [28, 40]], L = [[28, 40], [50, 52], [50, 78], [28, 66]], Rr = [[72, 40], [72, 66], [50, 78], [50, 52]];
                poly(L, this.hex(col)); poly(Rr, dark(col, 0.4)); poly(T, lite(col, 0.5));
                ctx.beginPath(); ctx.moveTo(33, 45); ctx.lineTo(33, 58); ctx.lineWidth = 2.600; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
                break;
            }
            case 'gem': {
                poly([[36, 34], [64, 34], [78, 50], [50, 80], [22, 50]], this.hex(col), 2.600);
                poly([[36, 34], [64, 34], [58, 50], [42, 50]], lite(col, 0.55), 1.800);
                poly([[22, 50], [42, 50], [50, 80]], dark(col, 0.25), 1.800); poly([[78, 50], [58, 50], [50, 80]], dark(col, 0.4), 1.800);
                poly([[36, 34], [42, 50], [22, 50]], lite(col, 0.25), 1.800); poly([[64, 34], [78, 50], [58, 50]], lite(col, 0.2), 1.800);
                break;
            }
            case 'crystal': {
                poly([[50, 18], [64, 34], [64, 66], [50, 82], [36, 66], [36, 34]], this.hex(col), 2.600);
                poly([[50, 18], [64, 34], [50, 44], [36, 34]], lite(col, 0.5), 1.800); poly([[36, 34], [50, 44], [50, 82], [36, 66]], lite(col, 0.18), 1.800); poly([[64, 34], [64, 66], [50, 82], [50, 44]], dark(col, 0.38), 1.800);
                poly([[73, 52], [80, 60], [80, 74], [73, 80], [66, 74], [66, 60]], this.hex(col), 2);
                break;
            }
            case 'dodeca': {
                const pent = (r, off) => [0, 1, 2, 3, 4].map((i) => [cx + Math.cos(-Math.PI / 2 + off + i * Math.PI * 0.4) * r, cy + Math.sin(-Math.PI / 2 + off + i * Math.PI * 0.4) * r]);
                const out = pent(29, 0), inn = pent(14, Math.PI * 0.2);
                poly(out, this.hex(col), 2.600);
                for (let i = 0; i < 5; i++) poly([out[i], out[(i + 1) % 5], inn[(i + 1) % 5], inn[i]], i % 2 ? lite(col, 0.22) : dark(col, 0.28), 1.800);
                poly(inn, lite(col, 0.5), 1.800);
                break;
            }
            case 'ico': {
                const hexv = (r) => [0, 1, 2, 3, 4, 5].map((i) => [cx + Math.cos(-Math.PI / 2 + i * Math.PI / 3) * r, cy + Math.sin(-Math.PI / 2 + i * Math.PI / 3) * r]);
                const o = hexv(30);
                poly(o, this.hex(col), 2.600);
                for (let i = 0; i < 6; i++) poly([o[i], o[(i + 1) % 6], [cx, cy]], i % 3 === 0 ? lite(col, 0.45) : i % 3 === 1 ? dark(col, 0.1) : dark(col, 0.38), 1.800);
                break;
            }
            default: {   // orb
                const g = ctx.createRadialGradient(cx - 7, cy - 8, 2, cx, cy, 24);
                g.addColorStop(0, lite(col, 0.75)); g.addColorStop(0.35, this.hex(col)); g.addColorStop(1, dark(col, 0.45));
                ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fillStyle = g; ctx.fill();
                ctx.lineWidth = 2.800; ctx.strokeStyle = K; ctx.stroke();
                ctx.beginPath(); ctx.ellipse(cx - 8, cy - 10, 6.500, 4, -0.7, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 8, cy + 9, 2.400, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill();
            }
        }
        ctx.restore();
        if (ringN >= 0) ringArc(true);
        this._sparkle(ctx, 80, 22, 5.500, '#ffffff', false);
        this._sparkle(ctx, 20, 74, 4, lite(haloN, 0.7), false);
    },

    // =============================================================================================
    // Canvas: победный эффект (вспышка при взятии WIN-платы)
    // =============================================================================================

    /**
     * winfx — { burst: 'confetti' | 'stars' | 'coins' | 'fireworks', colors: [...], star: 'flash' | 'rainbow' | null, power }: в центре звезда-вспышка
     * (картинки assets/fx), вокруг разлетаются частицы вида burst цветов палитры.
     */
    drawWinFx(canvas, winfx) {
        const ctx = this._ctx(canvas);
        if (!ctx || !winfx) return;
        const colors = (Array.isArray(winfx.colors) && winfx.colors.length ? winfx.colors : [0xffd24a, 0xff5db1, 0x42e8ff]).map((c) => this.num(c, 0xffd24a));
        const kind = String(typeof winfx.burst === 'string' ? winfx.burst : 'confetti').toLowerCase();
        const power = Math.max(0.6, Math.min(2, Number(winfx.power) || 1));
        const N = Math.round(24 * Math.min(1.4, power));
        const cx = 50, cy = 52, K = GAME_ICON_INK;
        const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, 50);
        glow.addColorStop(0, this.hex(colors[0]) + '88'); glow.addColorStop(1, this.hex(colors[0]) + '00');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, 100, 100);
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(1.3, 1.3); ctx.translate(-cx, -cy);   // частицы крупнее: на карточке они мелкие
        if (kind === 'fireworks') {
            for (let i = 0; i < 16; i++) {
                const a = i * Math.PI * 2 / 16, c = this.hex(colors[i % colors.length]);
                ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17); ctx.lineTo(cx + Math.cos(a) * (36 + (i % 2) * 8), cy + Math.sin(a) * (36 + (i % 2) * 8));
                ctx.lineWidth = 4.600; ctx.strokeStyle = K; ctx.stroke(); ctx.lineWidth = 2.200; ctx.strokeStyle = c; ctx.stroke();
                this._sparkle(ctx, cx + Math.cos(a) * 44, cy + Math.sin(a) * 44, 3.200, c, false);
            }
        }
        for (let i = 0; i < N; i++) {
            const a = i * 2.39996 + this._rand(i) * 0.4, rr = 12 + ((i * 7) % 11) * 2.300 + this._rand(i + 5) * 3;
            const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.92;
            const c = this.hex(colors[i % colors.length]);
            if (kind === 'coins') {
                ctx.beginPath(); ctx.ellipse(x, y, 4.800, 4.200 + (i % 3) * 0.4, a, 0, 7); this._paint(ctx, '#ffd24a', 1.600);
                ctx.beginPath(); ctx.ellipse(x - 0.8, y - 0.8, 2.200, 1.800, a, 0, 7); ctx.fillStyle = '#fff3a6'; ctx.fill();
            } else if (kind === 'stars') {
                ctx.beginPath(); for (let k = 0; k < 10; k++) { const t = k * Math.PI / 5 - Math.PI / 2, q = k % 2 ? 2 : 4.800; if (k) ctx.lineTo(x + Math.cos(t) * q, y + Math.sin(t) * q); else ctx.moveTo(x + Math.cos(t) * q, y + Math.sin(t) * q); } ctx.closePath(); this._paint(ctx, c, 1.300);
            } else {
                switch (i % 4) {
                    case 0: ctx.save(); ctx.translate(x, y); ctx.rotate(a * 3); this._rr(ctx, -3.600, -1.800, 7.200, 3.600, 1); this._paint(ctx, c, 1.200); ctx.restore(); break;
                    case 1: ctx.beginPath(); ctx.arc(x, y, 2.400, 0, 7); this._paint(ctx, c, 1.200); break;
                    case 2: this._sparkle(ctx, x, y, 3.800, c, true); break;
                    default: ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.quadraticCurveTo(x - 1, y - 4, x + 1, y); ctx.quadraticCurveTo(x + 3, y + 4, x + 6, y); ctx.lineWidth = 3.600; ctx.strokeStyle = K; ctx.stroke(); ctx.lineWidth = 1.800; ctx.strokeStyle = c; ctx.stroke();
                }
            }
        }
        ctx.restore();
        // звезда-вспышка: текстуры игры; пока картинка не загрузилась — рисуем звезду сами
        const starName = winfx.star === 'rainbow' ? 'rainbowStar' : winfx.star === 'flash' ? 'flashStar' : '';
        const img = starName ? this.image(starName, () => this.drawWinFx(canvas, winfx)) : null;
        if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, cx - 24, cy - 24, 48, 48);
        else if (winfx.star) {
            ctx.beginPath();
            for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 7.500 : 17; const x = cx + Math.cos(a) * r, y = cy + 1 + Math.sin(a) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
            ctx.closePath(); this._paint(ctx, winfx.star === 'rainbow' ? '#ff9ad0' : this.hex(colors[0]), 2.600);
        } else { ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K; ctx.stroke(); }
    },

    // =============================================================================================
    // Canvas: щупальце
    // =============================================================================================

    drawArm(canvas, arm) {
        const ctx = this._ctx(canvas);
        if (!ctx || !arm) return;
        const colors = (arm.colors && arm.colors.length ? arm.colors : [0x888888]).map((c) => this.hex(c));
        const thick = arm.thick || 1;
        // кривая: основание слева внизу, кончик справа вверху
        const P = [[20, 88], [8, 46], [58, 80], [70, 30]];
        const pt = (t) => {
            const u = 1 - t;
            return [
                u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0],
                u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1],
            ];
        };
        const tan = (t) => {
            const u = 1 - t;
            const dx = 3 * u * u * (P[1][0] - P[0][0]) + 6 * u * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
            const dy = 3 * u * u * (P[1][1] - P[0][1]) + 6 * u * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
            return Math.atan2(dy, dx);
        };
        // свечение редких рук
        if (arm.glow >= 0) {
            const gl = ctx.createRadialGradient(56, 52, 4, 56, 52, 56);
            gl.addColorStop(0, this.hex(arm.glow) + '99');
            gl.addColorStop(0.55, this.hex(arm.glow) + '33');
            gl.addColorStop(1, this.hex(arm.glow) + '00');
            ctx.fillStyle = gl;
            ctx.fillRect(0, 0, 100, 100);
        }
        // кабель под звеньями
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) { const [x, y] = pt(i / 24); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.lineWidth = 9 * thick;
        ctx.strokeStyle = GAME_ICON_INK;
        ctx.stroke();
        ctx.lineWidth = 5.600 * thick;
        ctx.strokeStyle = '#3a3f52';
        ctx.stroke();
        // ядро на основании
        const core = arm.core >= 0 ? arm.core : 0xffc93c;
        ctx.beginPath(); ctx.arc(P[0][0], P[0][1], 9.500, 0, 7);
        this._paint(ctx, this.hex(this.mix(core, 0x000000, 0.35)), 2.600);
        ctx.beginPath(); ctx.arc(P[0][0], P[0][1], 5.200, 0, 7);
        ctx.fillStyle = this.hex(core); ctx.fill();
        ctx.beginPath(); ctx.arc(P[0][0] - 1.600, P[0][1] - 1.800, 1.800, 0, 7);
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
        // звенья
        const N = 11;
        for (let i = 0; i < N; i++) {
            const t = (i + 0.7) / (N + 0.2);
            const [x, y] = pt(t);
            const a = tan(t);
            const w = (7.600 - 2.600 * t) * thick;
            const L = 7.800;
            const col = colors[i % colors.length];
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(a);
            this._segment(ctx, arm.seg, L, w, col, i);
            ctx.restore();
        }
        // суставы-шары
        if (arm.joint >= 0) {
            for (let i = 3; i < N; i += 4) {
                const [x, y] = pt((i + 1.2) / (N + 0.2));
                ctx.beginPath(); ctx.arc(x, y, 5.100 * thick, 0, 7);
                this._paint(ctx, this.hex(arm.joint), 2.200);
                ctx.beginPath(); ctx.arc(x - 1.400, y - 1.600, 1.500, 0, 7);
                ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
            }
        }
        // кисть
        const [tx, ty] = pt(1);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(tan(1));
        this._claw(ctx, arm.claw, this.hex(arm.clawColor >= 0 ? arm.clawColor : 0x2d2f36), thick);
        ctx.restore();
        this._fx(ctx, arm.fx, tx, ty);
    },

    _segment(ctx, kind, L, w, col, i) {
        const light = 'rgba(255,255,255,.45)';
        switch (kind) {
            case 'ball':
                ctx.beginPath(); ctx.arc(0, 0, w * 0.98, 0, 7); this._paint(ctx, col, 2.200);
                ctx.beginPath(); ctx.arc(-w * 0.3, -w * 0.35, w * 0.28, 0, 7); ctx.fillStyle = light; ctx.fill();
                break;
            case 'cube':
                this._rr(ctx, -L * 0.52, -w, L * 1.04, w * 2, 1.800); this._paint(ctx, col, 2.200);
                ctx.beginPath(); ctx.moveTo(-L * 0.4, -w * 0.62); ctx.lineTo(L * 0.4, -w * 0.62);
                ctx.lineWidth = 1.800; ctx.strokeStyle = light; ctx.stroke();
                break;
            case 'ring':
                ctx.beginPath(); ctx.ellipse(0, 0, L * 0.36, w * 1.05, 0, 0, 7); this._paint(ctx, col, 2.200);
                ctx.beginPath(); ctx.ellipse(0, 0, L * 0.1, w * 0.62, 0, 0, 7); ctx.fillStyle = 'rgba(20,16,47,.35)'; ctx.fill();
                break;
            case 'spike':
                ctx.beginPath();
                ctx.moveTo(-L * 0.55, -w * 0.7); ctx.lineTo(0, -w * 1.9); ctx.lineTo(L * 0.55, -w * 0.7);
                ctx.lineTo(L * 0.55, w * 0.7); ctx.lineTo(0, w * 1.9); ctx.lineTo(-L * 0.55, w * 0.7); ctx.closePath();
                this._paint(ctx, col, 2.200);
                break;
            case 'bone':
                ctx.beginPath(); ctx.ellipse(0, 0, L * 0.34, w * 1.15, 0, 0, 7); this._paint(ctx, col, 2.200);
                ctx.beginPath(); ctx.moveTo(-L * 0.55, 0); ctx.lineTo(L * 0.55, 0);
                ctx.lineWidth = w * 0.5; ctx.strokeStyle = GAME_ICON_INK; ctx.stroke();
                break;
            default: // disc — шайба
                this._rr(ctx, -L * 0.42, -w * 1.05, L * 0.84, w * 2.1, 2.200); this._paint(ctx, col, 2.200);
                ctx.beginPath(); ctx.moveTo(-L * 0.2, -w * 0.7); ctx.lineTo(-L * 0.2, w * 0.7);
                ctx.lineWidth = 1.600; ctx.strokeStyle = light; ctx.stroke();
        }
    },

    /** Кисть: начало координат — кончик щупальца, ось x — вдоль него. */
    _claw(ctx, kind, col, thick) {
        const k = Math.max(0.85, thick);
        const stroke = (draw, lw) => {
            ctx.beginPath(); draw();
            ctx.lineWidth = lw + 3.200; ctx.strokeStyle = GAME_ICON_INK; ctx.stroke();
            ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke();
        };
        switch (kind) {
            case 'hand':
                ctx.beginPath(); ctx.arc(5 * k, 0, 6.200 * k, 0, 7); this._paint(ctx, col, 2.400);
                for (const a of [-0.9, -0.3, 0.3, 0.9]) stroke(() => { ctx.moveTo(8 * k, 0); ctx.lineTo(8 * k + Math.cos(a) * 9 * k, Math.sin(a) * 9 * k); }, 3.200 * k);
                break;
            case 'hook':
                stroke(() => { ctx.moveTo(2, 0); ctx.quadraticCurveTo(14 * k, -2, 12 * k, 11 * k); ctx.lineTo(8 * k, 9 * k); }, 3.800 * k);
                break;
            case 'drill':
                ctx.beginPath(); ctx.moveTo(2, -6 * k); ctx.lineTo(18 * k, 0); ctx.lineTo(2, 6 * k); ctx.closePath(); this._paint(ctx, col, 2.400);
                ctx.beginPath(); ctx.moveTo(6, -4 * k); ctx.lineTo(8, 4 * k); ctx.moveTo(11 * k, -2.500 * k); ctx.lineTo(12.500 * k, 2.500 * k);
                ctx.lineWidth = 1.600; ctx.strokeStyle = 'rgba(20,16,47,.6)'; ctx.stroke();
                break;
            case 'star':
                ctx.beginPath();
                for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = (i % 2 ? 5.200 : 12) * k; const x = 8 * k + Math.cos(a) * r, y = Math.sin(a) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
                ctx.closePath(); this._paint(ctx, col, 2.400);
                break;
            case 'paw':
                ctx.beginPath(); ctx.arc(4 * k, 0, 6.200 * k, 0, 7); this._paint(ctx, col, 2.400);
                for (const a of [-0.8, 0, 0.8]) { ctx.beginPath(); ctx.arc(10.500 * k + Math.cos(a) * 3 * k, Math.sin(a) * 8 * k, 3.400 * k, 0, 7); this._paint(ctx, col, 2); }
                break;
            case 'blade':
                for (const s of [-1, 1]) {
                    ctx.beginPath(); ctx.moveTo(1, s * 2); ctx.lineTo(19 * k, s * 8.500 * k); ctx.lineTo(10 * k, s * 1.200); ctx.closePath(); this._paint(ctx, col, 2.200);
                }
                break;
            default: // pincer — клешня
                for (const s of [-1, 1]) stroke(() => { ctx.moveTo(1, s * 1.500); ctx.quadraticCurveTo(10 * k, s * 9 * k, 17 * k, s * 4 * k); }, 3.600 * k);
                ctx.beginPath(); ctx.arc(1.500, 0, 3.800 * k, 0, 7); this._paint(ctx, col, 2.200);
        }
    },

    /** Частицы на кончике по item.arm.fx — несколько точек и штрихов, чтобы редкое отличалось от обычного. */
    _fx(ctx, fx, x, y) {
        if (!fx || fx === 'none') return;
        const dot = (dx, dy, r, c) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 7); ctx.fillStyle = c; ctx.fill(); };
        const spark = (dx, dy, r, c) => {
            ctx.beginPath();
            for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.3 : r; const px = x + dx + Math.cos(a) * rr, py = y + dy + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
            ctx.closePath(); ctx.fillStyle = c; ctx.fill();
        };
        switch (fx) {
            case 'sparks': spark(10, -9, 3.600, '#ffe27a'); spark(-4, -13, 2.400, '#fff'); spark(14, 4, 2.200, '#ffb02e'); break;
            case 'flame': dot(5, -12, 3.400, '#ff7a1a'); dot(11, -8, 2.600, '#ffc21a'); dot(0, -15, 2.200, '#ff4a1a'); break;
            case 'electric':
                ctx.beginPath(); ctx.moveTo(x + 6, y - 14); ctx.lineTo(x + 3, y - 9); ctx.lineTo(x + 8, y - 8); ctx.lineTo(x + 4, y - 2);
                ctx.lineWidth = 1.800; ctx.strokeStyle = '#9ff2ff'; ctx.stroke(); spark(12, -4, 2.600, '#fff'); break;
            case 'hearts': for (const [dx, dy, r] of [[8, -12, 3.200], [14, -4, 2.400], [-2, -15, 2]]) { dot(dx - r * 0.5, dy, r * 0.62, '#ff5db1'); dot(dx + r * 0.5, dy, r * 0.62, '#ff5db1'); ctx.beginPath(); ctx.moveTo(x + dx - r, y + dy + r * 0.2); ctx.lineTo(x + dx, y + dy + r * 1.3); ctx.lineTo(x + dx + r, y + dy + r * 0.2); ctx.fillStyle = '#ff5db1'; ctx.fill(); } break;
            case 'frost': spark(9, -11, 3.600, '#e6fbff'); spark(15, -2, 2.400, '#9fefff'); spark(-1, -14, 2.400, '#fff'); break;
            case 'rainbow': dot(8, -12, 2.600, '#ff4f4f'); dot(13, -7, 2.600, '#fff04f'); dot(14, 0, 2.600, '#4fff7a'); dot(2, -14, 2.600, '#4fc8ff'); break;
            case 'void': dot(7, -12, 3, '#c04dff'); dot(13, -5, 2.200, '#6b2bd9'); dot(1, -15, 2, '#e5b3ff'); break;
            case 'gold': spark(9, -11, 3.800, '#fff1a8'); spark(15, -3, 2.600, '#ffd24a'); spark(0, -14, 2.200, '#fff'); break;
            default: break;
        }
    },

    // =============================================================================================
    // Canvas: блочный персонаж (вид спереди)
    // =============================================================================================

    drawSkin(canvas, look) {
        const ctx = this._ctx(canvas);
        if (!ctx || !look) return;
        const h = (n) => this.hex(n);
        const skin = h(look.skin), shirt = h(look.shirt), pants = h(look.pants), shoes = h(look.shoes);
        const accent = h(look.accent), K = GAME_ICON_INK;
        const dark = (n) => this.darken(n, 0.28);
        const R = (x, y, w, hh, r, fill, lw = 2.200) => { this._rr(ctx, x, y, w, hh, r); this._paint(ctx, fill, lw); };
        // тень на земле
        ctx.beginPath(); ctx.ellipse(50, 95, 24, 3.600, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill();
        // ноги и ботинки
        R(34, 71, 15, 21, 3, pants); R(51, 71, 15, 21, 3, pants);
        R(33, 87, 17, 7, 3, shoes); R(50, 87, 17, 7, 3, shoes);
        // руки: рукав и кисть
        R(21, 42, 11, 28, 4, look.pattern === 'plain' ? shirt : dark(look.shirt) );
        R(68, 42, 11, 28, 4, look.pattern === 'plain' ? shirt : dark(look.shirt));
        R(21, 62, 11, 9, 4, skin); R(68, 62, 11, 9, 4, skin);
        // торс
        R(32, 41, 36, 32, 4, shirt);
        this._pattern(ctx, look.pattern, shirt, accent, look.shirt);
        // голова
        R(35, 11, 30, 29, 7, skin);
        // волосы
        this._hair(ctx, look.hair, h(look.hairColor));
        // лицо
        this._face(ctx, look.face, look.skin);
        if (look.glasses) {
            ctx.fillStyle = K; ctx.fillRect(38, 21, 24, 6.500);
            ctx.fillStyle = 'rgba(120,220,255,.9)'; ctx.fillRect(40, 22.500, 8, 3.400); ctx.fillRect(52, 22.500, 8, 3.400);
        }
        this._hat(ctx, look.hat, h(look.hatColor || 0xffffff), look);
    },

    _pattern(ctx, pattern, shirt, accent, shirtN) {
        const K = GAME_ICON_INK;
        switch (pattern) {
            case 'star':
                ctx.beginPath();
                for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 4.500 : 10; const x = 50 + Math.cos(a) * r, y = 57 + Math.sin(a) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
                ctx.closePath(); this._paint(ctx, accent, 1.800); break;
            case 'stripe':
                ctx.fillStyle = accent; ctx.fillRect(32.500, 50, 35, 5); ctx.fillRect(32.500, 60, 35, 5); break;
            case 'suit':
                ctx.beginPath(); ctx.moveTo(40, 41.500); ctx.lineTo(50, 55); ctx.lineTo(44, 72); ctx.lineTo(33, 72); ctx.closePath(); ctx.fillStyle = this.darken(shirtN, 0.3); ctx.fill();
                ctx.beginPath(); ctx.moveTo(60, 41.500); ctx.lineTo(50, 55); ctx.lineTo(56, 72); ctx.lineTo(67, 72); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.moveTo(48, 42); ctx.lineTo(52, 42); ctx.lineTo(53, 62); ctx.lineTo(50, 66); ctx.lineTo(47, 62); ctx.closePath(); this._paint(ctx, accent, 1.600); break;
            case 'hoodie':
                ctx.beginPath(); ctx.arc(50, 42, 9, 0, Math.PI); this._paint(ctx, this.darken(shirtN, 0.25), 2);
                ctx.strokeStyle = accent; ctx.lineWidth = 1.800; ctx.beginPath(); ctx.moveTo(46, 50); ctx.lineTo(45, 60); ctx.moveTo(54, 50); ctx.lineTo(55, 60); ctx.stroke();
                this._rr(ctx, 40, 64, 20, 6, 2); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill(); ctx.strokeStyle = K; ctx.lineWidth = 1.600; ctx.stroke(); break;
            case 'armor':
                ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(34, 43, 32, 6);
                ctx.strokeStyle = K; ctx.lineWidth = 1.800; ctx.strokeRect(36, 52, 28, 16);
                ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(50, 60, 4.200, 0, 7); ctx.fill(); ctx.stroke(); break;
            case 'zip':
                ctx.fillStyle = accent; ctx.fillRect(48.800, 42, 2.400, 30);
                ctx.fillStyle = accent; ctx.fillRect(32.500, 41.500, 35, 3.600); break;
            default: break;
        }
    },

    _hair(ctx, hair, col) {
        if (!hair || hair === 'none') return;
        const f = () => this._paint(ctx, col, 2.200);
        switch (hair) {
            case 'spiky':
                ctx.beginPath(); ctx.moveTo(35, 22); ctx.lineTo(35, 13); ctx.lineTo(40, 3); ctx.lineTo(45, 12); ctx.lineTo(50, 1); ctx.lineTo(55, 12); ctx.lineTo(60, 3); ctx.lineTo(65, 13); ctx.lineTo(65, 22); ctx.lineTo(60, 15); ctx.lineTo(40, 15); ctx.closePath(); f(); break;
            case 'long':
                this._rr(ctx, 33, 8, 34, 11, 6); f(); this._rr(ctx, 31, 12, 8, 30, 3); f(); this._rr(ctx, 61, 12, 8, 30, 3); f(); break;
            case 'mohawk':
                ctx.beginPath(); ctx.moveTo(44, 13); ctx.lineTo(46, 2); ctx.lineTo(54, 2); ctx.lineTo(56, 13); ctx.closePath(); f(); break;
            case 'bun':
                this._rr(ctx, 35, 10, 30, 9, 5); f(); ctx.beginPath(); ctx.arc(50, 6, 6.500, 0, 7); f(); break;
            default: // short
                this._rr(ctx, 34, 9, 32, 12, 6); f();
        }
    },

    _face(ctx, face, skinN) {
        const K = GAME_ICON_INK;
        const eye = (x, y, w, hh, c = K) => { ctx.fillStyle = c; this._rr(ctx, x, y, w, hh, Math.min(w, hh) / 2); ctx.fill(); };
        switch (face) {
            case 'smile': eye(41, 23, 4.500, 6); eye(54.500, 23, 4.500, 6);
                ctx.strokeStyle = K; ctx.lineWidth = 2.200; ctx.beginPath(); ctx.arc(50, 29.500, 6, 0.25, Math.PI - 0.25); ctx.stroke(); break;
            case 'cool': eye(41, 24, 5, 3); eye(54, 24, 5, 3);
                ctx.strokeStyle = K; ctx.lineWidth = 2.200; ctx.beginPath(); ctx.moveTo(44, 33); ctx.quadraticCurveTo(51, 36, 57, 31); ctx.stroke(); break;
            case 'angry': eye(41, 24.500, 5, 4.500); eye(54, 24.500, 5, 4.500);
                ctx.strokeStyle = K; ctx.lineWidth = 2.600; ctx.beginPath(); ctx.moveTo(39, 20); ctx.lineTo(46, 23); ctx.moveTo(61, 20); ctx.lineTo(54, 23); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(43, 34); ctx.lineTo(57, 34); ctx.stroke(); break;
            case 'cute': eye(40, 22, 6.500, 8.500); eye(53.500, 22, 6.500, 8.500);
                ctx.fillStyle = '#fff'; ctx.fillRect(41.500, 23.500, 2.200, 2.200); ctx.fillRect(55, 23.500, 2.200, 2.200);
                ctx.fillStyle = 'rgba(255,90,140,.45)'; ctx.beginPath(); ctx.ellipse(40, 33, 3.600, 2.200, 0, 0, 7); ctx.ellipse(60, 33, 3.600, 2.200, 0, 0, 7); ctx.fill();
                ctx.strokeStyle = K; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(50, 31.500, 2.800, 0.3, Math.PI - 0.3); ctx.stroke(); break;
            case 'robot':
                ctx.fillStyle = '#38e1ff'; ctx.strokeStyle = K; ctx.lineWidth = 1.600;
                ctx.fillRect(40, 21, 7, 7); ctx.strokeRect(40, 21, 7, 7); ctx.fillRect(53, 21, 7, 7); ctx.strokeRect(53, 21, 7, 7);
                ctx.fillStyle = K; ctx.fillRect(42, 32, 16, 4.500);
                ctx.fillStyle = '#9fb3c8'; for (let i = 0; i < 4; i++) ctx.fillRect(43.500 + i * 3.800, 32.800, 1.600, 2.800); break;
            case 'skull':
                eye(40, 22, 7, 7); eye(53, 22, 7, 7);
                ctx.fillStyle = K; ctx.beginPath(); ctx.moveTo(48, 30); ctx.lineTo(52, 30); ctx.lineTo(50, 34); ctx.fill();
                ctx.fillRect(43, 35, 14, 3); break;
            default: // grin
                eye(41, 22.500, 4.500, 6.500); eye(54.500, 22.500, 4.500, 6.500);
                ctx.beginPath(); this._rr(ctx, 42, 30, 16, 7, 3); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = K; ctx.lineWidth = 2; ctx.stroke();
                ctx.beginPath(); ctx.moveTo(50, 30.500); ctx.lineTo(50, 36.500); ctx.lineWidth = 1.200; ctx.stroke();
        }
    },

    _hat(ctx, hat, col, look) {
        if (!hat || hat === 'none') return;
        const K = GAME_ICON_INK;
        const fill = () => this._paint(ctx, col, 2.200);
        // вторая деталь шапки (помпон, лента, внутренность уха, блики): hatColor2, иначе производное от основного цвета
        const c2 = look && look.hatColor2 >= 0 ? this.hex(look.hatColor2) : '';
        switch (hat) {
            case 'cap':
                this._rr(ctx, 34, 5, 32, 13, 7); fill(); this._rr(ctx, 40, 15, 34, 5, 2.500); fill(); break;
            case 'beanie':
                this._rr(ctx, 34, 4, 32, 15, 8); fill(); ctx.beginPath(); ctx.arc(50, 3.500, 4.200, 0, 7); this._paint(ctx, c2 || this.lighten(look.hatColor || 0xffffff, 0.3), 2); break;
            case 'crown':
                ctx.beginPath(); ctx.moveTo(35, 17); ctx.lineTo(35, 4); ctx.lineTo(42.500, 11); ctx.lineTo(50, 1); ctx.lineTo(57.500, 11); ctx.lineTo(65, 4); ctx.lineTo(65, 17); ctx.closePath(); fill();
                ctx.fillStyle = c2 || '#ff4a5c'; ctx.beginPath(); ctx.arc(50, 12.500, 2.200, 0, 7); ctx.fill(); break;
            case 'helmet':
                ctx.beginPath(); ctx.moveTo(33, 20); ctx.quadraticCurveTo(33, 1, 50, 1); ctx.quadraticCurveTo(67, 1, 67, 20); ctx.closePath(); fill();
                this._rr(ctx, 31, 17, 38, 5, 2.500); fill();
                ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(40, 6, 5, 6); break;
            case 'headband':
                ctx.fillStyle = col; ctx.fillRect(34, 14, 32, 5); ctx.strokeStyle = K; ctx.lineWidth = 1.800; ctx.strokeRect(34, 14, 32, 5);
                ctx.beginPath(); ctx.moveTo(66, 16); ctx.lineTo(72, 13); ctx.lineTo(70, 20); ctx.closePath(); fill(); break;
            case 'tophat':
                this._rr(ctx, 30, 13, 40, 5, 2.500); fill(); this._rr(ctx, 37, -2, 26, 17, 3); fill();
                ctx.fillStyle = c2 || (look.accent !== undefined ? this.hex(look.accent) : '#c62828'); ctx.fillRect(37.500, 9, 25, 3.400); break;
            case 'horns':
                for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(50 + s * 11, 13); ctx.quadraticCurveTo(50 + s * 19, 11, 50 + s * 18, 0); ctx.quadraticCurveTo(50 + s * 14, 7, 50 + s * 6, 9); ctx.closePath(); fill(); } break;
            case 'halo':
                ctx.beginPath(); ctx.ellipse(50, 5, 15, 4.200, 0, 0, 7); ctx.lineWidth = 5.400; ctx.strokeStyle = K; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke(); break;
            case 'visor':
                this._rr(ctx, 36, 17, 28, 9, 4.500); ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 2.200; ctx.strokeStyle = K; ctx.stroke(); break;
            case 'propeller': {
                const hi = this.lighten(look.hatColor || 0xffffff, 0.45);
                this._rr(ctx, 35, 6, 30, 13, 8); fill();
                ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(39, 9, 8, 3);
                ctx.beginPath(); ctx.moveTo(50, 7); ctx.lineTo(50, 0); ctx.lineWidth = 3.600; ctx.strokeStyle = K; ctx.stroke();
                for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(50 + s * 7.500, -0.500, 8, 2.600, s * -0.12, 0, 7); this._paint(ctx, s < 0 ? hi : (c2 || '#ff5a5a'), 2); }
                ctx.beginPath(); ctx.arc(50, 0, 2.400, 0, 7); this._paint(ctx, '#ffd24a', 1.600); break;
            }
            case 'chef':
                this._rr(ctx, 36, 10, 28, 9, 3); fill();
                for (const [x, y, r] of [[41, 6, 7], [59, 6, 7], [50, 1.500, 8.500]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); fill(); }
                ctx.fillStyle = 'rgba(20,16,47,.18)'; ctx.fillRect(43, 12, 1.600, 6); ctx.fillRect(56, 12, 1.600, 6); break;
            case 'bunny':
                for (const s of [-1, 1]) {
                    this._rr(ctx, 50 + s * 8 - 4.600, -14, 9.200, 27, 4.600); fill();
                    this._rr(ctx, 50 + s * 8 - 2, -10, 4, 18, 2); ctx.fillStyle = c2 || '#ff9ccb'; ctx.fill();
                }
                ctx.fillStyle = col; ctx.fillRect(34, 13, 32, 5); ctx.strokeStyle = K; ctx.lineWidth = 1.800; ctx.strokeRect(34, 13, 32, 5); break;
            case 'antenna':
                ctx.fillStyle = col; ctx.fillRect(34, 13, 32, 5); ctx.strokeStyle = K; ctx.lineWidth = 1.800; ctx.strokeRect(34, 13, 32, 5);
                ctx.beginPath(); ctx.moveTo(50, 13); ctx.quadraticCurveTo(46, 5, 52, -4); ctx.lineWidth = 4.200; ctx.strokeStyle = K; ctx.stroke(); ctx.lineWidth = 1.800; ctx.strokeStyle = '#c6cde0'; ctx.stroke();
                ctx.beginPath(); ctx.arc(52, -5, 4.600, 0, 7); this._paint(ctx, c2 || this.hex(this.mix(look.hatColor || 0xffffff, 0xff3b4e, 0.6)), 2);
                ctx.beginPath(); ctx.arc(50.500, -6.500, 1.400, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); break;
            case 'wizard':
                ctx.beginPath(); ctx.moveTo(36, 18); ctx.lineTo(46, -4); ctx.quadraticCurveTo(50, -10, 56, -9); ctx.lineTo(64, 18); ctx.closePath(); fill();
                this._rr(ctx, 29, 15, 42, 6, 3); fill();
                ctx.beginPath(); ctx.moveTo(34, 12); ctx.lineTo(66, 12); ctx.lineWidth = 2.400; ctx.strokeStyle = this.hex(this.mix(look.hatColor || 0xffffff, 0xffd24a, 0.7)); ctx.stroke();
                this._sparkle(ctx, 50, 4, 4.400, '#ffe14a', true); break;
            case 'party':
                ctx.beginPath(); ctx.moveTo(40, 18); ctx.lineTo(50, -6); ctx.lineTo(60, 18); ctx.closePath(); fill();
                ctx.save(); ctx.clip(); ctx.fillStyle = this.hex(this.mix(look.hatColor || 0xffffff, 0xffffff, 0.7));
                for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(34 + i * 9, 20); ctx.lineTo(40 + i * 9, 20); ctx.lineTo(48 + i * 3, -6); ctx.lineTo(44 + i * 3, -6); ctx.closePath(); ctx.fill(); }
                ctx.restore();
                ctx.beginPath(); ctx.moveTo(40, 18); ctx.lineTo(50, -6); ctx.lineTo(60, 18); ctx.closePath(); ctx.lineWidth = 2.200; ctx.strokeStyle = K; ctx.stroke();
                ctx.beginPath(); ctx.arc(50, -6, 3.800, 0, 7); this._paint(ctx, '#ffd24a', 1.800); break;
            case 'cowboy':
                ctx.beginPath(); ctx.moveTo(24, 17); ctx.quadraticCurveTo(34, 24, 50, 20); ctx.quadraticCurveTo(66, 24, 76, 17); ctx.quadraticCurveTo(70, 12, 62, 14); ctx.lineTo(38, 14); ctx.quadraticCurveTo(30, 12, 24, 17); ctx.closePath(); fill();
                ctx.beginPath(); ctx.moveTo(36, 15); ctx.quadraticCurveTo(35, 0, 42, -1); ctx.quadraticCurveTo(50, 4, 58, -1); ctx.quadraticCurveTo(65, 0, 64, 15); ctx.closePath(); fill();
                ctx.fillStyle = this.hex(this.mix(look.hatColor || 0xffffff, 0x000000, 0.5)); ctx.fillRect(36.500, 10, 27, 3.400); break;
            case 'santa':
                ctx.beginPath(); ctx.moveTo(34, 17); ctx.quadraticCurveTo(34, 3, 52, 3); ctx.quadraticCurveTo(64, 3, 70, 14); ctx.lineTo(66, 17); ctx.closePath(); fill();
                this._rr(ctx, 32, 14, 36, 7, 3.500); this._paint(ctx, '#ffffff', 2.200);
                ctx.beginPath(); ctx.arc(71, 14, 4.600, 0, 7); this._paint(ctx, '#ffffff', 2); break;
            default: break;
        }
    },
};
