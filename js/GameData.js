// GameData.js — данные Spider Arm Master: этапы, уровни, тренировочные платы, ребитх, магазин из 6 вкладок, подарок дня, колесо.
// Числа физики и камеры — в Constants.js (блок SPIDER_*); здесь — таблицы контента (как GameShopData у других игр).
//
// МАГАЗИН (правило пользователя): 6 вкладок × 25–28 предметов, в каждой ≈35 % за Победы (валюта магазина) и ≈65 % за рекламу
// (rewarded, 1…7 просмотров: чем ценнее предмет, тем больше; лимит 7 — SHOP_ADS_MAX в Constants.js). Прогресс «За рекламу 2/5» хранит Shop.
// Слот предмета (Shop.slotOf, ключ Shop.look()): arms · skin (вкладка skins) · hats · trails · cores · winfx. В слоте один предмет
// `default: true` (бесплатный, надет с начала); `exclusive: 'daily'` — только из Daily Gift, в магазине и на колесе не бывает.
// У бесплатных и эксклюзивных `price: {}` (цена 0 Shop.validate считает ошибкой). Предметы внутри вкладки идут по возрастанию редкости.
//
// Схема скина РУК (item.arm):
//   seg       форма звена: 'disc' (шайбы) | 'ball' (бусины) | 'cube' (кубики) | 'ring' (кольца на тросе) | 'spike' (шипы) | 'bone' (позвонки)
//   colors    цвета звеньев по кругу [0xRRGGBB, …]
//   joint     цвет шаров-суставов (каждое 4-е звено), −1 — без суставов
//   claw      кисть на конце: 'pincer' (клешня-3 пальца) | 'hand' (ладонь) | 'hook' (крюк) | 'drill' (бур) | 'star' (звезда) | 'paw' (лапа) | 'blade' (лезвия)
//   clawColor цвет кисти;  core — цвет ядра-рюкзака на спине;  glow — цвет свечения (−1 нет)
//   thick     толщина (1 — обычная);  fx — частицы на кончиках (виды GameFx.KINDS): 'none' | 'sparks' | 'flame' | 'electric' | 'hearts' |
//             'frost' | 'rainbow' | 'void' | 'gold' | 'bubbles' | 'leaves' | 'stars' | 'smoke';  fxColor / fxColor2 — свои цвета частиц (−1 — вид по умолчанию)
// Схема скина ПЕРСОНАЖА (item.look):
//   skin shirt pants shoes — цвета;  hair 'none' | 'short' | 'spiky' | 'long' | 'mohawk' | 'bun' + hairColor
//   face 'grin' | 'smile' | 'cool' | 'angry' | 'cute' | 'robot' | 'skull';  hat — форма шапки (список ниже) + hatColor, hatColor2 (−1 — по умолчанию);
//   pattern 'plain' | 'star' | 'stripe' | 'suit' | 'hoodie' | 'armor' | 'zip';  accent — цвет узора;  glasses — true/false.
//   item.aura (необязательно) — частицы вокруг головы: { fx, color, color2, power } (виды те же, что у следов).
// Шапка (item.hat, вкладка hats; НАДЕТАЯ шапка перекрывает шапку скина, 'none' по умолчанию — остаётся шапка скина):
//   { type, color, color2 }  type: 'none' | 'cap' | 'beanie' | 'crown' | 'helmet' | 'headband' | 'tophat' | 'horns' | 'halo' | 'visor' |
//   'propeller' | 'chef' | 'bunny' | 'antenna'  (последние четыре — новые, SpiderAvatar._head);  color2 — вторая деталь (помпон, лента, блики, внутренность уха). + item.aura.
// След на кончиках рук (item.trail, вкладка trails): { fx, color, color2, power }  fx — вид (см. arm.fx), color / color2 — 0xRRGGBB, power — густота ×.
//   По умолчанию ('trail-none', auto) след берётся из arm.fx надетой руки.
// Ядро-рюкзак (item.core, вкладка cores): { shape, color, glow, pulse, ring, halo, spin }  shape 'orb' | 'cube' | 'gem' | 'crystal' | 'dodeca' | 'ico';
//   glow — яркость свечения (1 — обычная; >1.2 добавляет ореол), pulse — скорость пульса (рад/с), ring — цвет вращающегося кольца (−1 нет),
//   halo — цвет ореола (−1 — как у ядра), spin — вращение граней. По умолчанию ('core-stock', auto) ядро берётся из arm.core.
// Победный эффект (item.winfx, вкладка winfx): { colors: [0xRRGGBB, …], star: 'flash' | 'rainbow' | null, burst: 'confetti' | 'stars' | 'coins' | 'fireworks', power }
//   вспышка при взятии WIN-платы; star — текстура звезды (assets/fx/flash-star.webp | rainbow-star.webp). 'winfx-classic' (auto) — исходный эффект.

/** Этапы трассы (маркеры stage-N, sign-N, win-N на карте). need — сколько хватки (grip) нужно на самый длинный подъём без отдыха. */
const STAGES = [
    { id: 1, name: { ru: 'Стартовый город', en: 'Starter Town' }, need: 54, wins: 1, bonus: 2, color: '#ff8a3d' },
    { id: 2, name: { ru: 'Город небоскрёбов', en: 'Skyline City' }, need: 90, wins: 2, bonus: 4, color: '#3da5ff' },
    { id: 3, name: { ru: 'Храм пустыни', en: 'Desert Temple' }, need: 125, wins: 4, bonus: 8, color: '#f2c14e' },
    { id: 4, name: { ru: 'Ледяной пик', en: 'Frozen Peak' }, need: 160, wins: 7, bonus: 14, color: '#8fe3ff' },
    { id: 5, name: { ru: 'Руины джунглей', en: 'Jungle Ruins' }, need: 200, wins: 12, bonus: 24, color: '#5fd35f' },
    { id: 6, name: { ru: 'Лавовая кузня', en: 'Lava Forge' }, need: 240, wins: 20, bonus: 40, color: '#ff5a2a' },
    { id: 7, name: { ru: 'Конфетное королевство', en: 'Candy Kingdom' }, need: 280, wins: 32, bonus: 64, color: '#ff7ad9' },
    { id: 8, name: { ru: 'Небесная цитадель', en: 'Sky Citadel' }, need: 330, wins: 50, bonus: 100, color: '#ffd84a' },
];

/** Тренировочные платы лобби (маркеры train-N): множитель опыта за удар и сколько перерождений нужно. */
const TRAIN_PADS = [
    { mult: 1, rebirths: 0, color: 0x9aa4b8 },
    { mult: 2, rebirths: 0, color: 0xff5a5a },
    { mult: 3, rebirths: 1, color: 0xffb02e },
    { mult: 6, rebirths: 2, color: 0x2ecbff },
    { mult: 10, rebirths: 4, color: 0xb85cff },
    { mult: 25, rebirths: 6, color: 0xff4fb4 },
    { mult: 50, rebirths: 10, color: 0x2bff88 },
    { mult: 100, rebirths: 15, color: 0xfff04a },
];

// Числа баланса PUNCH_XP, WIN_ARM_DROP, GRIP_RETRY — в Constants.js (блок SPIDER ARM MASTER, правятся в редакторе).

/** Прогресс: опыт до следующего уровня, руки и хватка по уровню. Формулы — данные игры, не константы рендера. */
/** @satisfies {Record<string, any>} */
const Progress = {
    /** Опыт, нужный на уровне L, чтобы перейти на L+1 (200, 248, 308, …): первые уровни — минуты, поздние растут медленнее (1.24 за уровень). */
    need(L) { return Math.round(200 * Math.pow(1.24, Math.max(0, L - 1)) / 2) * 2; },
    /** Уровни, на которых растёт число рук (2 руки с начала, до 8). */
    ARM_LEVELS: [3, 5, 8, 12, 17, 23],
    arms(L) { let n = 2; for (const l of this.ARM_LEVELS) if (L >= l) n++; return n; },
    /** Следующий уровень с новой рукой или 0. */
    nextArmLevel(L) { for (const l of this.ARM_LEVELS) if (L < l) return l; return 0; },
    /** Хватка: 100 на 1 уровне, +10 за уровень, +30 за каждую руку сверх двух. */
    grip(L) { return 100 + 10 * (L - 1) + 30 * (this.arms(L) - 2); },
    /** Рекомендованный уровень этапа: первый, где хватки с запасом 10 % (целыми: 220 против 200 × 1.1 = 220.00000000000003). */
    recLevel(need) { for (let L = 1; L < 200; L++) if (this.grip(L) * 10 >= need * 11) return L; return 200; },
    /** Перерождение: с какого уровня можно (10, +4 за каждое из первых шести, дальше +2) и какой множитель опыта даёт. */
    rebirthLevel(rebirths) { return 10 + 4 * Math.min(rebirths, 6) + 2 * Math.max(0, rebirths - 6); },
    xpMult(rebirths) { return 1 + rebirths * 0.5; },
};

/** Редкость: рамка карточки и подпись. */
const RARITY = {
    common: { ru: 'Обычный', en: 'Common', color: '#9aa7b8' },
    rare: { ru: 'Редкий', en: 'Rare', color: '#3da5ff' },
    epic: { ru: 'Эпический', en: 'Epic', color: '#b35cff' },
    legendary: { ru: 'Легендарный', en: 'Legendary', color: '#ffb02e' },
    mythic: { ru: 'Мифический', en: 'Mythic', color: '#ff4f8b' },
};

/** Вкладки магазина: slot — ключ слота в Shop.look() (у скинов он 'skin', у остальных совпадает с id вкладки). */
const SHOP_TABS = [
    { id: 'arms', slot: 'arms', name: { ru: 'Руки', en: 'Arms' } },
    { id: 'skins', slot: 'skin', name: { ru: 'Скины', en: 'Skins' } },
    { id: 'hats', slot: 'hats', name: { ru: 'Шапки', en: 'Hats' } },
    { id: 'trails', slot: 'trails', name: { ru: 'Следы', en: 'Trails' } },
    { id: 'cores', slot: 'cores', name: { ru: 'Ядра', en: 'Cores' } },
    { id: 'winfx', slot: 'winfx', name: { ru: 'Победные эффекты', en: 'Win Effects' } },
];

/**
 * Каталог косметики (все слоты). Цена: { coins: n } — Победы, { ads: n } — просмотры рекламы (1…7). Собирается конструкторами
 * ниже (пропущенные поля берутся из значений по умолчанию), поэтому у каждого предмета данные превью полны.
 * @type {any[]}
 */
const SHOP_ITEMS = (() => {
    const c = (n) => ({ coins: n });
    const a = (n) => ({ ads: n });
    const nm = (ru, en) => ({ ru, en });
    const ARM = { seg: 'disc', colors: [0x8a5a3c, 0xc9a24a], joint: 0x3a3f4b, claw: 'pincer', clawColor: 0x2d2f36, core: 0xffc93c, glow: -1, thick: 1, fx: 'none', fxColor: -1, fxColor2: -1 };
    const LOOK = { skin: 0xf2c9a0, shirt: 0xffffff, pants: 0x555b6e, shoes: 0x222222, hair: 'none', hairColor: 0, face: 'smile', hat: 'none', hatColor: 0, hatColor2: -1, pattern: 'plain', accent: 0xffffff, glasses: false };
    const arm = (id, rarity, price, ru, en, style, extra) => Object.assign({ id, tab: 'arms', slot: 'arms', rarity, price, name: nm(ru, en), arm: Object.assign({}, ARM, style) }, extra);
    const skin = (id, rarity, price, ru, en, look, extra) => Object.assign({ id, tab: 'skins', slot: 'skin', rarity, price, name: nm(ru, en), look: Object.assign({}, LOOK, look) }, extra);
    const hat = (id, rarity, price, ru, en, type, color, color2, extra) => Object.assign({ id, tab: 'hats', slot: 'hats', rarity, price, name: nm(ru, en), hat: { type, color, color2 } }, extra);
    const trail = (id, rarity, price, ru, en, fx, color, color2, power, extra) => Object.assign({ id, tab: 'trails', slot: 'trails', rarity, price, name: nm(ru, en), trail: { fx, color, color2, power: power || 1 } }, extra);
    const core = (id, rarity, price, ru, en, shape, color, glow, pulse, ring, halo, extra) => Object.assign({ id, tab: 'cores', slot: 'cores', rarity, price, name: nm(ru, en), core: { shape, color, glow, pulse, ring, halo: halo == null ? -1 : halo, spin: shape === 'orb' ? 0 : 1.4 } }, extra);
    const win = (id, rarity, price, ru, en, burst, colors, star, power, extra) => Object.assign({ id, tab: 'winfx', slot: 'winfx', rarity, price, name: nm(ru, en), winfx: { burst, colors, star, power: power || 1 } }, extra);
    const aura = (fx, color, color2, power) => ({ aura: { fx, color: color == null ? -1 : color, color2: color2 == null ? -1 : color2, power: power || 1 } });
    const free = { default: true };
    const daily = { exclusive: 'daily' };
    const none = {};

    return [
        // ===== РУКИ: 28 (1 бесплатная, 1 эксклюзив, 9 за Победы, 17 за рекламу 1…7) =====
        arm('arm-scrapper', 'common', none, 'Старьёвщик', 'Scrapper', { seg: 'disc', colors: [0x8a5a3c, 0xc9a24a, 0x6b7280, 0xb4532a], joint: 0x3a3f4b, claw: 'pincer', clawColor: 0x2d2f36, core: 0xffc93c, glow: -1, thick: 1, fx: 'none' }, free),
        arm('arm-bolt', 'common', c(3), 'Болт', 'Bolt', { seg: 'cube', colors: [0x9aa0a8, 0x6d737c], joint: 0x444a52, claw: 'hook', clawColor: 0x5a606a, core: 0x9ad0ff, thick: 0.9 }),
        arm('arm-hauler', 'common', c(5), 'Грузчик', 'Hauler', { seg: 'disc', colors: [0xffc21a, 0x2b2b2b], joint: 0x2b2b2b, claw: 'pincer', clawColor: 0x333333, core: 0xffd21a, glow: -1, thick: 1.15, fx: 'none' }),
        arm('arm-cobalt', 'common', c(12), 'Кобальт', 'Cobalt', { seg: 'ring', colors: [0x2d6cff, 0x1a3fa8, 0x9ec5ff], joint: 0xdfe8ff, claw: 'hand', clawColor: 0x1a2f6b, core: 0x5cc8ff, glow: -1, thick: 1, fx: 'none' }),
        arm('arm-cable', 'common', a(1), 'Кабель', 'Cable', { seg: 'ring', colors: [0xff5a3c, 0x2b2b2b], joint: -1, claw: 'pincer', clawColor: 0xffd54a, core: 0xff5a3c, thick: 0.85 }),
        arm('arm-garden', 'common', a(1), 'Садовник', 'Gardener', { seg: 'ball', colors: [0x4caf50, 0x2e7d32, 0x8bc34a], joint: 0x6d4c41, claw: 'paw', clawColor: 0x8bc34a, core: 0x8bc34a, thick: 1 }),
        arm('arm-octo', 'rare', c(25), 'Осьминог', 'Octo', { seg: 'ball', colors: [0xff7a3d, 0xff9a5c, 0xffb27a], joint: -1, claw: 'paw', clawColor: 0xffd0b0, core: 0xff7a3d, glow: -1, thick: 1.1, fx: 'bubbles', fxColor: 0xffb27a, fxColor2: 0xff7a3d }),
        arm('arm-tempest', 'rare', a(2), 'Буря', 'Tempest', { seg: 'ring', colors: [0xe8f4ff, 0x9fb8cc], joint: 0x38e1ff, claw: 'blade', clawColor: 0xd8f6ff, core: 0x38e1ff, glow: 0x38e1ff, thick: 0.9, fx: 'electric' }),
        arm('arm-bamboo', 'rare', a(2), 'Бамбук', 'Bamboo', { seg: 'disc', colors: [0xa8d65c, 0x7fae3c, 0xa8d65c, 0x5f8a2c], joint: 0x3f5c1c, claw: 'hook', clawColor: 0xe3f2b0, core: 0xb6e86a, thick: 1.2, fx: 'leaves', fxColor: 0x9acd5a, fxColor2: 0x5f8a2c }),
        arm('arm-rubber', 'rare', a(2), 'Резинка', 'Rubber', { seg: 'ball', colors: [0xff4f9a, 0xff80b8], joint: -1, claw: 'hand', clawColor: 0xffd0e6, core: 0xff4f9a, thick: 1.25, fx: 'sparks', fxColor: 0xff8ac4, fxColor2: 0xffd0e6 }),
        arm('arm-neon', 'rare', a(3), 'Неон', 'Neon', { seg: 'ring', colors: [0x39ff88, 0x0b2a1a], joint: 0x39ff88, claw: 'star', clawColor: 0x39ff88, core: 0x39ff88, glow: 0x39ff88, thick: 0.9, fx: 'sparks', fxColor: 0x39ff88, fxColor2: 0xd9ffe8 }),
        arm('arm-reaper', 'rare', c(70), 'Жнец', 'Reaper', { seg: 'bone', colors: [0x1f8a5b, 0x0f4a32], joint: 0x0b0f0d, claw: 'hook', clawColor: 0xc6ffd9, core: 0x2bff88, glow: 0x2bff88, thick: 1, fx: 'none' }),
        arm('arm-orbweaver', 'epic', a(3), 'Ткач', 'Orbweaver', { seg: 'spike', colors: [0xffd400, 0x1b1b1b], joint: 0xffd400, claw: 'hook', clawColor: 0x1b1b1b, core: 0xffd400, glow: -1, thick: 0.95, fx: 'sparks', fxColor: 0xffd400, fxColor2: 0xfff1a8 }),
        arm('arm-toxic', 'epic', a(3), 'Токсин', 'Toxic', { seg: 'spike', colors: [0x9bff2e, 0x3b2a6b], joint: 0xb6ff4a, claw: 'blade', clawColor: 0xd9ff8a, core: 0x9bff2e, glow: 0x9bff2e, thick: 1, fx: 'bubbles', fxColor: 0x9bff2e, fxColor2: 0x3b2a6b }),
        arm('arm-bubble', 'epic', a(4), 'Пузыри', 'Bubbly', { seg: 'ball', colors: [0x7fe0ff, 0xbdf3ff, 0xffffff], joint: -1, claw: 'paw', clawColor: 0xbdf3ff, core: 0x7fe0ff, glow: 0x7fe0ff, thick: 1.15, fx: 'bubbles' }),
        arm('arm-dreadnought', 'epic', c(200), 'Дредноут', 'Dreadnought', { seg: 'cube', colors: [0x3c5a8a, 0x2a3f63, 0x9fd3ff], joint: 0x0f1726, claw: 'drill', clawColor: 0xbfe6ff, core: 0x6ad1ff, glow: 0x6ad1ff, thick: 1.25, fx: 'sparks' }),
        arm('arm-samurai', 'epic', a(4), 'Самурай', 'Samurai', { seg: 'cube', colors: [0xb71c1c, 0x1b1b1b, 0xd4af37], joint: 0xd4af37, claw: 'blade', clawColor: 0xe8eef5, core: 0xff3b3b, thick: 1, fx: 'sparks', fxColor: 0xff5a4a, fxColor2: 0xffd4a0 }),
        arm('arm-circuit', 'epic', a(4), 'Схема', 'Circuit', { seg: 'ring', colors: [0x0f2a1c, 0x00e5a0, 0x0f2a1c, 0x00b3ff], joint: 0x00e5a0, claw: 'drill', clawColor: 0x9fffe0, core: 0x00e5a0, glow: 0x00e5a0, thick: 1, fx: 'electric', fxColor: 0x00ffc8, fxColor2: 0x9fffe0 }),
        arm('arm-inferno', 'epic', c(320), 'Инферно', 'Inferno', { seg: 'disc', colors: [0x2a0f0a, 0xff5a1f, 0x2a0f0a, 0xffb21f], joint: 0xff3b1f, claw: 'blade', clawColor: 0x3a1208, core: 0xff5a1f, glow: 0xff5a1f, thick: 1.05, fx: 'flame' }),
        arm('arm-seraph', 'legendary', c(800), 'Серафим', 'Seraph', { seg: 'ball', colors: [0xffffff, 0xffe9a6], joint: 0xffd24a, claw: 'hand', clawColor: 0xffd24a, core: 0xfff1a8, glow: 0xffe27a, thick: 0.95, fx: 'gold' }),
        arm('arm-frostbite', 'legendary', a(5), 'Обморожение', 'Frostbite', { seg: 'spike', colors: [0xbff3ff, 0x6fd6ff, 0xffffff], joint: 0x2f9bd6, claw: 'star', clawColor: 0xe6fbff, core: 0x9fefff, glow: 0x7fe8ff, thick: 1, fx: 'frost' }),
        arm('arm-candy', 'legendary', a(5), 'Леденец', 'Lollipop', { seg: 'disc', colors: [0xff4fa3, 0xffffff, 0x4fd2ff, 0xffffff, 0xffe14f, 0xffffff], joint: -1, claw: 'star', clawColor: 0xff4fa3, core: 0xff9ad5, glow: -1, thick: 1.1, fx: 'hearts' }),
        arm('arm-magma', 'legendary', a(5), 'Магма', 'Magma', { seg: 'ball', colors: [0x2b1b17, 0xff4a1a, 0x2b1b17, 0xffa000], joint: 0xff7a1a, claw: 'paw', clawColor: 0x3a1208, core: 0xff6a00, glow: 0xff4a1a, thick: 1.3, fx: 'smoke', fxColor: 0x6b4a40, fxColor2: 0xff7a30 }),
        arm('arm-thunder', 'legendary', a(6), 'Гроза', 'Thunder', { seg: 'spike', colors: [0xfff176, 0x37474f, 0xfff176], joint: 0xfff176, claw: 'blade', clawColor: 0xfff9c4, core: 0xffee58, glow: 0xffee58, thick: 1.05, fx: 'electric', fxColor: 0xfff176, fxColor2: 0xffffff }),
        arm('arm-prism', 'mythic', c(3000), 'Призма', 'Prism', { seg: 'cube', colors: [0xff4f4f, 0xffa34f, 0xfff04f, 0x4fff7a, 0x4fc8ff, 0x9a4fff], joint: 0xffffff, claw: 'pincer', clawColor: 0xffffff, core: 0xffffff, glow: 0xffffff, thick: 1.05, fx: 'rainbow' }),
        arm('arm-voidlord', 'mythic', a(7), 'Повелитель бездны', 'Void Lord', { seg: 'spike', colors: [0x1a0b2e, 0x6b2bd9, 0x1a0b2e], joint: 0xc04dff, claw: 'blade', clawColor: 0x0d0518, core: 0xc04dff, glow: 0xb04dff, thick: 1.15, fx: 'void' }),
        arm('arm-galaxy', 'mythic', a(7), 'Галактика', 'Galaxy', { seg: 'ring', colors: [0x1a1f4d, 0x6a3bd6, 0xff5ec8, 0x3bd6ff], joint: 0xffffff, claw: 'star', clawColor: 0xfff6a8, core: 0xb98cff, glow: 0x8f6bff, thick: 1.1, fx: 'stars', fxColor: 0xfff6a8, fxColor2: 0x8f6bff }),
        arm('arm-daily', 'mythic', none, 'Солнечный страж', 'Sun Warden', { seg: 'ring', colors: [0xffb21f, 0xff6a1f, 0xfff1a8], joint: 0xffffff, claw: 'star', clawColor: 0xfff1a8, core: 0xffd84a, glow: 0xffc21a, thick: 1.1, fx: 'gold' }, daily),

        // ===== СКИНЫ: 28 (1 бесплатный, 1 эксклюзив, 9 за Победы, 17 за рекламу 1…7) =====
        skin('skin-rookie', 'common', none, 'Новичок', 'Rookie', { skin: 0xf6b04a, shirt: 0x2ec4b6, pants: 0x6a4bc4, shoes: 0x3a2f5c, hair: 'none', hairColor: 0x000000, face: 'grin', hat: 'none', hatColor: 0, pattern: 'star', accent: 0xffffff, glasses: false }, free),
        skin('skin-hoodie', 'common', c(4), 'Худи', 'Hoodie Kid', { skin: 0xf2c9a0, shirt: 0x6a3fd0, pants: 0x4a4f63, shoes: 0xffffff, hair: 'short', hairColor: 0x5b3a1e, face: 'smile', hat: 'none', hatColor: 0, pattern: 'hoodie', accent: 0xffc857, glasses: false }),
        skin('skin-sporty', 'common', c(10), 'Спортсмен', 'Sporty', { skin: 0xc98e63, shirt: 0xff3b4e, pants: 0x1c1c28, shoes: 0xffffff, hair: 'spiky', hairColor: 0x16110c, face: 'grin', hat: 'headband', hatColor: 0xffffff, pattern: 'stripe', accent: 0xffffff, glasses: false }),
        skin('skin-fisher', 'common', c(7), 'Рыбак', 'Fisher', { skin: 0xe0b48a, shirt: 0xe8d9a8, pants: 0x4b6b3a, shoes: 0x5a4326, hair: 'short', hairColor: 0xc9a24a, face: 'smile', hat: 'cap', hatColor: 0x2e7d9a, pattern: 'stripe', accent: 0x2e7d9a }),
        skin('skin-farmer', 'common', a(1), 'Фермер', 'Farmer', { skin: 0xd9a77a, shirt: 0xc62828, pants: 0x5b8bd0, shoes: 0x5a3a1a, hair: 'short', hairColor: 0xd6b44a, face: 'grin', hat: 'cap', hatColor: 0xd8b25a, pattern: 'stripe', accent: 0x7a1414 }),
        skin('skin-student', 'common', a(1), 'Студент', 'Student', { skin: 0xf4d6b0, shirt: 0xf0f0f0, pants: 0x6a3a8a, shoes: 0xe8e8e8, hair: 'bun', hairColor: 0x3b2a1a, face: 'cute', pattern: 'zip', accent: 0x3a6bd6, glasses: true }),
        skin('skin-sunny', 'common', a(1), 'Пляжник', 'Beach Bum', { skin: 0xcf9462, shirt: 0xff7043, pants: 0x26c6da, shoes: 0xffffff, hair: 'spiky', hairColor: 0xffd54f, face: 'cool', pattern: 'star', accent: 0xfff59d }),
        skin('skin-cool', 'rare', c(20), 'Крутой', 'Cool Dude', { skin: 0xe8b98f, shirt: 0xf5f5f5, pants: 0x2a2f45, shoes: 0x111111, hair: 'mohawk', hairColor: 0x2bd4ff, face: 'cool', hat: 'none', hatColor: 0, pattern: 'zip', accent: 0x2bd4ff, glasses: true }, aura('sparks', 0x2bd4ff, 0xffffff, 0.5)),
        skin('skin-builder', 'rare', c(35), 'Строитель', 'Builder', { skin: 0xf4d6b0, shirt: 0xff8a1a, pants: 0x3a4b6b, shoes: 0x5a3a1a, hair: 'short', hairColor: 0x3b2a1a, face: 'smile', hat: 'helmet', hatColor: 0xffd21a, pattern: 'stripe', accent: 0xe8ff5a, glasses: false }),
        skin('skin-ninja', 'rare', a(3), 'Ниндзя', 'Ninja', { skin: 0x1b1b24, shirt: 0x1b1b24, pants: 0x1b1b24, shoes: 0x0d0d12, hair: 'none', hairColor: 0, face: 'angry', hat: 'headband', hatColor: 0xff2e4d, pattern: 'plain', accent: 0xff2e4d, glasses: false }, aura('smoke', 0x3a3a48, 0x14141c, 0.5)),
        skin('skin-chef', 'rare', a(2), 'Повар', 'Chef', { skin: 0xf2c9a0, shirt: 0xffffff, pants: 0x37474f, shoes: 0x263238, hair: 'none', face: 'smile', hat: 'chef', hatColor: 0xffffff, hatColor2: 0xd9d9d9, pattern: 'zip', accent: 0xb0bec5 }),
        skin('skin-punk', 'rare', a(2), 'Панк', 'Punk', { skin: 0xf0c8a0, shirt: 0x24242c, pants: 0x8e1b3a, shoes: 0xe53950, hair: 'mohawk', hairColor: 0xff2e93, face: 'angry', pattern: 'zip', accent: 0xff2e93 }, aura('sparks', 0xff2e93, 0xffd1ec, 0.5)),
        skin('skin-bunny', 'rare', a(2), 'Зайка', 'Bunny', { skin: 0xffe3ee, shirt: 0xffc1da, pants: 0xffffff, shoes: 0xff8fb0, hair: 'none', face: 'cute', hat: 'bunny', hatColor: 0xffffff, hatColor2: 0xffa6c9, pattern: 'star', accent: 0xffffff }, aura('hearts', 0xff9ad5, 0xffd1ec, 0.4)),
        skin('skin-pilot', 'rare', a(2), 'Пилот', 'Pilot', { skin: 0xd9a77a, shirt: 0x8a6a3c, pants: 0x4a4f3a, shoes: 0x2a1a0e, hair: 'short', hairColor: 0x2a1a0e, face: 'smile', hat: 'helmet', hatColor: 0x8a6a3c, pattern: 'zip', accent: 0xc9a24a, glasses: true }),
        skin('skin-pirate', 'epic', c(110), 'Пират', 'Pirate', { skin: 0xd9a77a, shirt: 0xfafafa, pants: 0x6b3a1e, shoes: 0x2a1a0e, hair: 'long', hairColor: 0x2a1a0e, face: 'grin', hat: 'tophat', hatColor: 0x1b1b24, pattern: 'stripe', accent: 0xc62828, glasses: false }, aura('gold', 0xffd84a, 0xc9a24a, 0.6)),
        skin('skin-robot', 'epic', a(4), 'Робот', 'Robot', { skin: 0xb8c4d6, shirt: 0x6b7a92, pants: 0x4a5568, shoes: 0x2d3748, hair: 'none', hairColor: 0, face: 'robot', hat: 'visor', hatColor: 0x38e1ff, pattern: 'armor', accent: 0x38e1ff, glasses: false }, aura('sparks', 0x9fe3ff, 0x4fa8ff, 0.7)),
        skin('skin-wizard', 'epic', a(4), 'Волшебник', 'Wizard', { skin: 0xf2d4b6, shirt: 0x4a2a9a, pants: 0x2c1a5e, shoes: 0xffd24a, hair: 'long', hairColor: 0xf5f5f5, face: 'smile', hat: 'tophat', hatColor: 0x4a2a9a, hatColor2: 0xffd24a, pattern: 'star', accent: 0xffd24a }, aura('stars', 0xffd84a, 0xb98cff, 0.8)),
        skin('skin-vampire', 'epic', a(4), 'Вампир', 'Vampire', { skin: 0xe8e0e8, shirt: 0x7a0f2a, pants: 0x1b1b24, shoes: 0x0d0d12, hair: 'long', hairColor: 0x14101a, face: 'angry', pattern: 'suit', accent: 0xe53950 }, aura('smoke', 0x8a1a3a, 0x2a0a14, 0.8)),
        skin('skin-astro', 'epic', c(300), 'Космонавт', 'Astronaut', { skin: 0xf2c9a0, shirt: 0xf5f7fa, pants: 0xe1e6ee, shoes: 0x9aa4b8, hair: 'short', hairColor: 0x3b2a1a, face: 'smile', hat: 'helmet', hatColor: 0xf5f7fa, pattern: 'armor', accent: 0xff7a1a, glasses: false }, aura('stars', 0xffffff, 0x9fe3ff, 0.7)),
        skin('skin-cyber', 'epic', a(5), 'Киборг', 'Cyber', { skin: 0x5b6b85, shirt: 0x101827, pants: 0x1a2236, shoes: 0x00e5ff, hair: 'mohawk', hairColor: 0x00e5ff, face: 'robot', hat: 'visor', hatColor: 0xff2bd6, pattern: 'armor', accent: 0xff2bd6 }, aura('electric', 0xff2bd6, 0x00e5ff, 0.9)),
        skin('skin-knight', 'legendary', c(520), 'Рыцарь', 'Knight', { skin: 0xf4d6b0, shirt: 0xb8c0cc, pants: 0x7a8494, shoes: 0x4a5160, hair: 'none', hairColor: 0, face: 'angry', hat: 'helmet', hatColor: 0xb8c0cc, pattern: 'armor', accent: 0xffd24a, glasses: false }, aura('sparks', 0xe8eef5, 0xffd24a, 0.8)),
        skin('skin-demon', 'legendary', a(6), 'Бесёнок', 'Imp', { skin: 0xd8343c, shirt: 0x1b1b24, pants: 0x1b1b24, shoes: 0x0d0d12, hair: 'none', hairColor: 0, face: 'angry', hat: 'horns', hatColor: 0x1b1b24, pattern: 'zip', accent: 0xff7a1a, glasses: false }, aura('flame', 0xff5a1f, 0xffb21f, 0.9)),
        skin('skin-dragon', 'legendary', a(5), 'Дракон', 'Dragon', { skin: 0x2e9b4f, shirt: 0xb71c1c, pants: 0x8a1a1a, shoes: 0xffc400, hair: 'spiky', hairColor: 0xffb300, face: 'angry', hat: 'horns', hatColor: 0xffe082, pattern: 'armor', accent: 0xffc400 }, aura('flame', 0xffb21f, 0xff4a1a, 1)),
        skin('skin-frost', 'legendary', a(6), 'Ледяной маг', 'Frost Mage', { skin: 0xcfeeff, shirt: 0x7fd3ff, pants: 0x3b6fd6, shoes: 0xffffff, hair: 'long', hairColor: 0xffffff, face: 'cute', hat: 'crown', hatColor: 0xbff3ff, pattern: 'star', accent: 0xffffff }, aura('frost', 0xdff8ff, 0x8fd8ff, 1)),
        skin('skin-angel', 'mythic', a(7), 'Ангел', 'Angel', { skin: 0xffe0c2, shirt: 0xffffff, pants: 0xfff5d6, shoes: 0xffd24a, hair: 'long', hairColor: 0xffe27a, face: 'cute', hat: 'halo', hatColor: 0xffd24a, pattern: 'plain', accent: 0xffd24a, glasses: false }, aura('gold', 0xffd84a, 0xfff1a8, 1.2)),
        skin('skin-king', 'mythic', c(2600), 'Король', 'King', { skin: 0xe8b98f, shirt: 0x7a1fd6, pants: 0x3a0f6b, shoes: 0xffd24a, hair: 'short', hairColor: 0xf5f5f5, face: 'smile', hat: 'crown', hatColor: 0xffd24a, pattern: 'suit', accent: 0xffd24a, glasses: false }, aura('gold', 0xffd84a, 0xffffff, 1.2)),
        skin('skin-cosmic', 'mythic', a(7), 'Космический', 'Cosmic', { skin: 0x1a1450, shirt: 0x2a1a6b, pants: 0x140f3a, shoes: 0xff5ec8, hair: 'none', face: 'cute', hat: 'halo', hatColor: 0xff5ec8, pattern: 'star', accent: 0x7df9ff }, aura('stars', 0x7df9ff, 0xff5ec8, 1.3)),
        skin('skin-daily', 'mythic', none, 'Золотой паук', 'Golden Spider', { skin: 0xffd24a, shirt: 0x1b1b24, pants: 0x1b1b24, shoes: 0xffd24a, hair: 'none', hairColor: 0, face: 'cool', hat: 'crown', hatColor: 0xffd24a, pattern: 'suit', accent: 0xffd24a, glasses: true }, Object.assign({}, daily, aura('gold', 0xffd84a, 0xfff1a8, 1.4))),

        // ===== ШАПКИ: 26 (1 бесплатная «без шапки», 9 за Победы, 16 за рекламу 1…7) =====
        hat('hat-none', 'common', none, 'Без шапки', 'No Hat', 'none', 0, -1, free),
        hat('hat-cap-red', 'common', c(3), 'Красная кепка', 'Red Cap', 'cap', 0xe53935, -1),
        hat('hat-beanie-blue', 'common', c(5), 'Синяя шапочка', 'Blue Beanie', 'beanie', 0x2979ff, 0xffffff),
        hat('hat-headband', 'common', c(8), 'Спортивная повязка', 'Sweatband', 'headband', 0xffffff, -1),
        hat('hat-cap-green', 'common', a(1), 'Зелёная кепка', 'Green Cap', 'cap', 0x43a047, 0x1b5e20),
        hat('hat-beanie-pink', 'common', a(1), 'Розовая шапочка', 'Pink Beanie', 'beanie', 0xff6fae, 0xffee58),
        hat('hat-bandana', 'common', a(1), 'Красная бандана', 'Red Bandana', 'headband', 0xd32f2f, -1),
        hat('hat-hardhat', 'rare', c(25), 'Каска', 'Hard Hat', 'helmet', 0xffc107, -1),
        hat('hat-tophat', 'rare', c(45), 'Цилиндр', 'Top Hat', 'tophat', 0x1b1b24, 0xc62828, aura('sparks', 0xffd84a, 0xffffff, 0.4)),
        hat('hat-visor', 'rare', c(60), 'Визор', 'Visor', 'visor', 0x26c6da, -1),
        hat('hat-chef', 'rare', a(2), 'Поварской колпак', 'Chef Hat', 'chef', 0xffffff, 0xd9d9d9),
        hat('hat-propeller', 'rare', a(2), 'Кепка с пропеллером', 'Propeller Cap', 'propeller', 0xe53935, 0xffeb3b),
        hat('hat-helm-steel', 'rare', a(3), 'Стальной шлем', 'Steel Helm', 'helmet', 0x90a4ae, -1),
        hat('hat-antenna', 'rare', a(3), 'Антенна', 'Antenna', 'antenna', 0x66bb6a, 0xff5252, aura('sparks', 0x9bff6a, 0xff5252, 0.5)),
        hat('hat-bunny', 'rare', a(3), 'Заячьи уши', 'Bunny Ears', 'bunny', 0xf5f5f5, 0xffa6c9, aura('hearts', 0xff9ad5, 0xffd1ec, 0.4)),
        hat('hat-horns', 'epic', c(120), 'Рожки', 'Little Horns', 'horns', 0xb71c1c, -1, aura('flame', 0xff5a1f, 0xffb21f, 0.5)),
        hat('hat-crown-silver', 'epic', c(260), 'Серебряная корона', 'Silver Crown', 'crown', 0xcfd8dc, 0x4fc8ff, aura('sparks', 0xe8eef5, 0x9fe3ff, 0.8)),
        hat('hat-antenna-alien', 'epic', a(3), 'Антенны пришельца', 'Alien Antennae', 'antenna', 0xb2ff59, 0xff1744, aura('electric', 0xb2ff59, 0xffffff, 0.8)),
        hat('hat-bunny-black', 'epic', a(4), 'Чёрные заячьи уши', 'Shadow Bunny Ears', 'bunny', 0x212121, 0xff4081, aura('smoke', 0x6a3a8a, 0x1a0a2a, 0.8)),
        hat('hat-horns-ice', 'epic', a(4), 'Ледяные рога', 'Ice Horns', 'horns', 0x81d4fa, -1, aura('frost', 0xdff8ff, 0x8fd8ff, 0.9)),
        hat('hat-jet', 'epic', a(4), 'Реактивный пропеллер', 'Jet Propeller', 'propeller', 0x7c4dff, 0x00e5ff, aura('electric', 0x00e5ff, 0xb98cff, 0.9)),
        hat('hat-crown-gold', 'legendary', c(1200), 'Золотая корона', 'Golden Crown', 'crown', 0xffd24a, 0xff3b5c, aura('gold', 0xffd84a, 0xfff1a8, 1)),
        hat('hat-halo-gold', 'legendary', a(5), 'Золотой нимб', 'Golden Halo', 'halo', 0xffd24a, -1, aura('gold', 0xffe27a, 0xffffff, 1)),
        hat('hat-horns-flame', 'legendary', a(5), 'Огненные рога', 'Flame Horns', 'horns', 0xff5722, -1, aura('flame', 0xff6a1a, 0xffd04a, 1.2)),
        hat('hat-crown-ruby', 'legendary', a(6), 'Рубиновая корона', 'Ruby Crown', 'crown', 0xe91e63, 0xffeb3b, aura('sparks', 0xff3b5c, 0xffd1dc, 1.3)),
        hat('hat-halo-star', 'mythic', a(7), 'Звёздный нимб', 'Starlight Halo', 'halo', 0x7df9ff, -1, aura('stars', 0x7df9ff, 0xff5ec8, 1.5)),

        // ===== СЛЕДЫ: 26 (1 «как у руки», 9 за Победы, 16 за рекламу 1…7) =====
        trail('trail-none', 'common', none, 'След руки', "Arm's Trail", 'none', -1, -1, 1, Object.assign({ auto: true }, free)),
        trail('trail-sparks-blue', 'common', c(3), 'Голубые искры', 'Blue Sparks', 'sparks', 0x9fe3ff, 0x4fa8ff),
        trail('trail-leaves', 'common', c(6), 'Листья', 'Leaves', 'leaves', 0x6fcf4a, 0xc6e84a),
        trail('trail-bubbles', 'common', c(10), 'Пузырьки', 'Bubbles', 'bubbles', 0xbdeaff, 0x7fd0ff),
        trail('trail-sparks-gold', 'common', a(1), 'Золотые искры', 'Gold Sparks', 'sparks', 0xffd36b, 0xff9a3a),
        trail('trail-leaves-autumn', 'common', a(1), 'Осенние листья', 'Autumn Leaves', 'leaves', 0xff8a3d, 0xd84315),
        trail('trail-bubbles-pink', 'common', a(1), 'Розовые пузыри', 'Pink Bubbles', 'bubbles', 0xffb3d9, 0xff7ac0),
        trail('trail-smoke', 'rare', c(25), 'Дымок', 'Smoke', 'smoke', 0xcfd2d6, 0x7a7f87),
        trail('trail-hearts', 'rare', c(45), 'Сердечки', 'Hearts', 'hearts', 0xff6fb5, 0xff9ad5),
        trail('trail-frost', 'rare', a(2), 'Иней', 'Frost', 'frost', 0xdff8ff, 0x8fd8ff),
        trail('trail-smoke-violet', 'rare', a(2), 'Фиолетовый дым', 'Violet Smoke', 'smoke', 0xb18cff, 0x5a3aa0),
        trail('trail-hearts-red', 'rare', a(3), 'Алые сердца', 'Scarlet Hearts', 'hearts', 0xff3b4e, 0xff8a8a),
        trail('trail-stars-blue', 'rare', a(3), 'Синие звёзды', 'Blue Stars', 'stars', 0x9ad0ff, 0x6a8cff),
        trail('trail-zap', 'rare', a(3), 'Разряд', 'Zap', 'electric', 0xffee58, 0xfff9c4),
        trail('trail-flame', 'epic', c(120), 'Пламя', 'Flame', 'flame', 0xff6a1a, 0xffd04a),
        trail('trail-stars-gold', 'epic', c(250), 'Золотые звёзды', 'Gold Stars', 'stars', 0xffd84a, 0xfff1a8),
        trail('trail-sakura', 'epic', a(3), 'Сакура', 'Sakura', 'leaves', 0xffb7d5, 0xff7aa8, 1.3),
        trail('trail-flame-blue', 'epic', a(4), 'Синее пламя', 'Blue Flame', 'flame', 0x4fa8ff, 0xbfe3ff),
        trail('trail-lightning', 'epic', a(4), 'Фиолетовая молния', 'Violet Lightning', 'electric', 0xc77dff, 0xff8aff, 1.2),
        trail('trail-gold-dust', 'epic', a(4), 'Золотая пыль', 'Gold Dust', 'gold', 0xffd84a, 0xfff1a8, 1.3),
        trail('trail-void', 'legendary', c(900), 'Пустота', 'Void', 'void', 0xb04dff, 0x1a0b2e, 1.2),
        trail('trail-green-fire', 'legendary', a(5), 'Зелёный огонь', 'Green Fire', 'flame', 0x39ff88, 0xd9ff7a, 1.3),
        trail('trail-aurora', 'legendary', a(5), 'Северное сияние', 'Aurora', 'stars', 0x7dffd1, 0xb98cff, 1.4),
        trail('trail-ice-storm', 'legendary', a(6), 'Ледяная буря', 'Ice Storm', 'frost', 0xbff3ff, 0xffffff, 1.8),
        trail('trail-rainbow', 'mythic', c(3000), 'Радуга', 'Rainbow', 'rainbow', 0xff4f4f, 0x4fc8ff, 1.3),
        trail('trail-supernova', 'mythic', a(7), 'Сверхновая', 'Supernova', 'sparks', 0xffffff, 0xff5ec8, 2),

        // ===== ЯДРА: 26 (1 «как у руки», 9 за Победы, 16 за рекламу 1…7) =====
        core('core-stock', 'common', none, 'Ядро руки', "Arm's Core", 'orb', 0xffc93c, 0.9, 5, -1, -1, Object.assign({ auto: true }, free)),
        core('core-ember', 'common', c(3), 'Уголёк', 'Ember', 'orb', 0xff7a3d, 0.9, 5, -1),
        core('core-mint', 'common', c(5), 'Мята', 'Mint', 'orb', 0x4de2b0, 0.9, 4, -1),
        core('core-cube', 'common', c(9), 'Кубик', 'Cube', 'cube', 0x7aa7ff, 0.85, 3, -1),
        core('core-lime', 'common', a(1), 'Лайм', 'Lime', 'orb', 0xc6ff3d, 0.9, 6.5, -1),
        core('core-sky', 'common', a(1), 'Небо', 'Sky', 'orb', 0x66b5ff, 0.9, 2.5, -1),
        core('core-rose', 'common', a(1), 'Роза', 'Rose', 'cube', 0xff6fae, 0.9, 4, -1),
        core('core-pearl', 'rare', c(25), 'Жемчужина', 'Pearl', 'orb', 0xf4ecff, 1.05, 2.5, 0xffd1f0),
        core('core-ruby', 'rare', c(50), 'Рубин', 'Ruby', 'gem', 0xe3243c, 1.1, 4, -1),
        core('core-amber', 'rare', a(2), 'Янтарь', 'Amber', 'gem', 0xffb300, 1.05, 5, -1),
        core('core-amethyst', 'rare', a(2), 'Аметист', 'Amethyst', 'cube', 0xa66bff, 1.1, 3.5, 0xe0c4ff),
        core('core-emerald', 'rare', a(3), 'Изумруд', 'Emerald', 'gem', 0x2ecc71, 1.15, 4.5, 0xa8ffcf),
        core('core-ice', 'rare', a(3), 'Ледышка', 'Ice Shard', 'crystal', 0xbff3ff, 1.1, 3, -1),
        core('core-sunset', 'rare', a(3), 'Закат', 'Sunset', 'dodeca', 0xff8a5c, 1.15, 3.5, 0xffd36b),
        core('core-aquamarine', 'epic', c(120), 'Аквамарин', 'Aquamarine', 'crystal', 0x2fd6ff, 1.2, 6, 0x9ff0ff),
        core('core-solar', 'epic', c(300), 'Солнце', 'Solar', 'orb', 0xffd21a, 1.4, 3, 0xff7a00, 0xffa000),
        core('core-toxic', 'epic', a(3), 'Кислота', 'Acid', 'orb', 0x9bff2e, 1.3, 8, 0x3b2a6b),
        core('core-spark', 'epic', a(4), 'Искра', 'Spark', 'ico', 0xfff04a, 1.3, 12, 0x4fc8ff),
        core('core-magma', 'epic', a(4), 'Лавовое сердце', 'Lava Heart', 'dodeca', 0xff4a1a, 1.4, 6, 0xffa000, 0xff6a00),
        core('core-nebula', 'epic', a(4), 'Туманность', 'Nebula', 'crystal', 0x7a5cff, 1.4, 4, 0xff5ec8, 0xb98cff),
        core('core-plasma', 'legendary', c(900), 'Плазма', 'Plasma', 'ico', 0xff2bd6, 1.5, 9, 0x00e5ff, 0xff2bd6),
        core('core-aurora', 'legendary', a(5), 'Полярный свет', 'Polar Light', 'ico', 0x7dffd1, 1.6, 5, 0xb98cff, 0x7dffd1),
        core('core-dragon', 'legendary', a(5), 'Сердце дракона', 'Dragon Heart', 'dodeca', 0xff3b3b, 1.7, 7, 0xffd24a, 0xff3b3b),
        core('core-diamond', 'legendary', a(6), 'Алмаз', 'Diamond', 'gem', 0xffffff, 1.8, 3, 0x9ad0ff, 0xbfe9ff),
        core('core-singularity', 'mythic', c(3000), 'Сингулярность', 'Singularity', 'orb', 0x1a0030, 1.6, 2, 0xb04dff, 0xb04dff),
        core('core-bigbang', 'mythic', a(7), 'Большой взрыв', 'Big Bang', 'ico', 0xffffff, 2, 10, 0xff5ec8, 0x7df9ff),

        // ===== ПОБЕДНЫЕ ЭФФЕКТЫ: 26 (1 «Классика», 9 за Победы, 16 за рекламу 1…7) =====
        win('winfx-classic', 'common', none, 'Классика', 'Classic', 'confetti', [0xff4f8b, 0x4fd2ff, 0xffd84a], 'flash', 1, Object.assign({ auto: true }, free)),
        win('winfx-confetti-red', 'common', c(3), 'Красное конфетти', 'Red Confetti', 'confetti', [0xff4f4f, 0xff8a8a], null),
        win('winfx-confetti-blue', 'common', c(5), 'Синее конфетти', 'Blue Confetti', 'confetti', [0x4f8bff, 0x8fd0ff], null),
        win('winfx-confetti-green', 'common', c(8), 'Зелёное конфетти', 'Green Confetti', 'confetti', [0x4fff7a, 0xb6ff6a], null),
        win('winfx-confetti-violet', 'common', a(1), 'Фиолетовое конфетти', 'Violet Confetti', 'confetti', [0xb35cff, 0xe0b3ff], null),
        win('winfx-confetti-orange', 'common', a(1), 'Оранжевое конфетти', 'Orange Confetti', 'confetti', [0xff8a3d, 0xffc27a], null),
        win('winfx-snow-stars', 'common', a(1), 'Снежные звёзды', 'Snow Stars', 'stars', [0xffffff, 0xcfe8ff], 'flash'),
        win('winfx-stars-gold', 'rare', c(25), 'Золотой звездопад', 'Gold Starfall', 'stars', [0xffd84a, 0xffb000], 'flash'),
        win('winfx-coins', 'rare', c(50), 'Монетный дождь', 'Coin Shower', 'coins', [0xffd84a, 0xffa800, 0xfff1a8], 'flash'),
        win('winfx-pink-stars', 'rare', a(2), 'Розовые звёзды', 'Pink Stars', 'stars', [0xff7ac0, 0xffc1e3], 'flash'),
        win('winfx-mint-coins', 'rare', a(2), 'Мятные монеты', 'Mint Coins', 'coins', [0x4fffc0, 0xb0ffe6], 'flash'),
        win('winfx-ice-fireworks', 'rare', a(3), 'Ледяной салют', 'Ice Fireworks', 'fireworks', [0x9fe3ff, 0xffffff], 'flash'),
        win('winfx-emerald-swirl', 'rare', a(3), 'Изумрудный вихрь', 'Emerald Swirl', 'confetti', [0x2ecc71, 0xf1c40f, 0x16a085], 'flash'),
        win('winfx-sunset-stars', 'rare', a(3), 'Закатные звёзды', 'Sunset Stars', 'stars', [0xff7a3d, 0xffd36b, 0xff4f8b], 'flash'),
        win('winfx-party', 'epic', c(120), 'Вечеринка', 'Party', 'confetti', [0xff4f8b, 0x4fd2ff, 0xffd84a, 0x7dff7a, 0xb35cff, 0xff8a3d], 'flash'),
        win('winfx-fireworks', 'epic', c(260), 'Салют', 'Fireworks', 'fireworks', [0xff4f4f, 0xffd84a, 0xffffff], 'flash'),
        win('winfx-gold-rush', 'epic', a(3), 'Золотая лихорадка', 'Gold Rush', 'coins', [0xffd84a, 0xffe27a, 0xffffff, 0xff9a00], 'flash', 1.3),
        win('winfx-neon-fireworks', 'epic', a(4), 'Неоновый салют', 'Neon Fireworks', 'fireworks', [0x00ffc8, 0xff2bd6, 0xfff04a], 'flash'),
        win('winfx-galaxy-stars', 'epic', a(4), 'Звёзды галактики', 'Galaxy Stars', 'stars', [0x7a5cff, 0xff5ec8, 0x7df9ff], 'rainbow'),
        win('winfx-rainbow-confetti', 'epic', a(4), 'Радужное конфетти', 'Rainbow Confetti', 'confetti', [0xff4f4f, 0xffa34f, 0xfff04f, 0x4fff7a, 0x4fc8ff, 0x9a4fff], 'rainbow'),
        win('winfx-rainbow-stars', 'legendary', c(900), 'Радужные звёзды', 'Rainbow Stars', 'stars', [0xff4f4f, 0xffa34f, 0xfff04f, 0x4fff7a, 0x4fc8ff, 0x9a4fff], 'rainbow', 1.3),
        win('winfx-grand-fireworks', 'legendary', a(5), 'Большой салют', 'Grand Fireworks', 'fireworks', [0xff4f4f, 0xffd84a, 0x4fd2ff, 0xb35cff, 0xffffff], 'rainbow', 1.3),
        win('winfx-diamond-rain', 'legendary', a(5), 'Алмазный дождь', 'Diamond Rain', 'coins', [0x9ff0ff, 0xffffff, 0xbfe9ff], 'rainbow', 1.4),
        win('winfx-inferno', 'legendary', a(6), 'Огненный шторм', 'Fire Storm', 'stars', [0xff5a1f, 0xffb21f, 0xfff1a8], 'flash', 1.5),
        win('winfx-royal', 'mythic', c(3000), 'Королевский дождь', 'Royal Shower', 'coins', [0xb35cff, 0xffd84a, 0xffffff], 'rainbow', 1.5),
        win('winfx-supernova', 'mythic', a(7), 'Вспышка сверхновой', 'Supernova Burst', 'fireworks', [0xffffff, 0xff5ec8, 0x7df9ff, 0xffd84a, 0xb35cff, 0xff4f4f], 'rainbow', 1.6),
    ];
})();

/** Руки на пьедесталах лобби (по порядку маркеров pedestal-N): за Победы и за рекламу — игрок видит оба вида ценника. */
const PEDESTAL_ARMS = ['arm-hauler', 'arm-tempest', 'arm-inferno', 'arm-frostbite', 'arm-voidlord'];

/** Подарок дня: дни 1–6 — победы (валюта); 7-й день — эксклюзив из очереди DAILY_EXCLUSIVE (его нет в магазине). */
const DAILY_REWARDS = [{ coins: 3 }, { coins: 5 }, { coins: 8 }, { coins: 12 }, { coins: 18 }, { coins: 25 }];
const DAILY_EXCLUSIVE = ['arm-daily', 'skin-daily'];

/**
 * Колесо фортуны (10 секторов, по часовой от стрелки): в основном Победы (3 / 5 / 8 / 12 / 20 / 40), два сектора — случайный предмет магазина
 * (до редкого и до эпического; не мифический, не эксклюзив Daily Gift). Имеющийся предмет заменяется dupCoins. color — цвет сектора для окна.
 */
const WHEEL_SECTORS = [
    { coins: 3, weight: 22, color: '#8fa3bf' },
    { coins: 8, weight: 14, color: '#3da5ff' },
    { randomItem: true, maxRarity: 'rare', dupCoins: 12, weight: 7, color: '#b35cff' },
    { coins: 5, weight: 18, color: '#4fd2a0' },
    { coins: 20, weight: 6, color: '#ff8a3d' },
    { coins: 12, weight: 10, color: '#ffd24a' },
    { randomItem: true, maxRarity: 'epic', dupCoins: 25, weight: 3, color: '#ff4f8b' },
    { coins: 5, weight: 16, color: '#4fd2a0' },
    { coins: 40, weight: 2.5, color: '#ff4f4f' },
    { coins: 8, weight: 12, color: '#3da5ff' },
];

/** Найти предмет каталога по id. */
function shopItem(id) { return SHOP_ITEMS.find(i => i.id === id) || null; }

// Движок знает редкости common…legendary; в игре есть ещё mythic. Без этой правки Shop.randomItem считал бы мифический предмет
// обычным (индекс −1 → 0) и колесо могло бы его выдать: добавляем редкость выше легендарной и малый вес.
if (typeof Shop !== 'undefined') {
    if (Shop.RARITIES.indexOf('mythic') < 0) Shop.RARITIES.push('mythic');
    const weights = /** @type {any} */ (Shop.RARITY_WEIGHT);
    if (!(weights.mythic > 0)) weights.mythic = 0.25;
}
if (typeof LANG_STRINGS !== 'undefined') {
    if (!LANG_STRINGS.ru['shop.rarity.mythic']) LANG_STRINGS.ru['shop.rarity.mythic'] = 'Мифический';
    if (!LANG_STRINGS.en['shop.rarity.mythic']) LANG_STRINGS.en['shop.rarity.mythic'] = 'Mythic';
}
