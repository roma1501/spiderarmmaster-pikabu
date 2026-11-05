// GameHud.js — интерфейс Spider Arm Master (DOM поверх холста): титульный экран, пауза, счётчик побед, кнопки окон, верх-центр с
// названием зоны, нижняя стопка (руки · хватка · уровень), баннеры, всплывающие «+1», подсказки, чат, оформление туториала и
// контекстной кнопки «лезть». Окна (магазин, подарок дня, перерождение, телепорт) — js/GameHudShop.js (глобал GameWindows),
// иконки и превью предметов — js/GameHudIcons.js (GameIcons). Стиль: «мастерская щупалец» — густо-синие панели с заклёпками,
// глянцевые кнопки с толстой тёмной рамкой, шрифт Nunito 1000 с обводкой, жёлто-чёрные «предупреждающие» полосы.
//
//   GameHud.init({ onPlay, onHowTo, onSound, onQuality, onPause, onResume, onLobby, onTeleport, onRebirth,
//                  onShopOpen(isOpen, kind), onPreview, onEquip, onBuy, onDaily, onWheel(result),
//                  onBoost()        // async -> boolean: «Опыт x2 · 3 мин» нажата; игра показывает rewarded и возвращает true только по награде, дальше зовёт setBoost(сек)
//                  onWheelTick()    // необязательно: щелчок стрелки колеса о штырь (звук)
//                  onWindowRect(rect)   // необязательно: раскладка открытого окна сменилась (поворот экрана) — игра пересчитывает кадр героя
//                  onButton(name)   // необязательно: нажата кнопка 'rebirth' | 'teleport' — игра зовёт openRebirth(info) / openTeleport(list)
//                })
//   GameHud.menu(on) · pause(on) · setArea({ kind:'lobby' } | { kind:'stage', n, name, need, rec }) · setWins(total, delta)
//   GameHud.setLevel(level, xp, need) · setArms(arms, nextLevel) · setGrip(value, max, show) · setRebirths(n, mult)
//   GameHud.banner(title, sub, kind) · levelUp({ from, to, armsFrom, armsTo, gripFrom, gripTo }) · float(x, y, text, color)
//   GameHud.hint('Удерживай [Пробел], чтобы лезть' | null) · toast(text, ms) · chat(name, text, color)
//   GameHud.openShop(tab?) · closeShop() · isOpen() · openRebirth(info) · openDaily() · openWheel() · openTeleport(list)
//   GameHud.setWheelBadge(on) — красная точка на кнопке «Колесо» (Wheel.badge(): бесплатное вращение готово)
//   GameHud.offer({ id, icon: 'trophy' | 'bolt' | 'fist', title, sub?, ms, onAccept: async () => boolean }) -> boolean — временная кнопка «за рекламу» с
//     кольцом обратного отсчёта на ms; нажатие -> спиннер, await onAccept(); true — кнопка исчезает, false — остаётся с подсказкой. GameHud.hideOffer(id?)
//   GameHud.setBoost(секунд) — чип «x2 опыт 2:31», пока > 0 (0 убирает чип и возвращает кнопку «Опыт x2 · 3 мин»); setBoostInfo({ mult, minutes }) · setBoostEnabled(on)
//   Кнопки «за рекламу» не рисуются, пока Platform.rewardedSupported() = false; в паузу между rewarded подпись «Через N с».
//   GameHud.windowRect() -> { x, y, w, h, vw, vh, free, kind } | null — окно в px поля игры (free — свободная часть для героя), см. GameWindows.rect
//   GameHud.setDailyBadge(on) · setSound(on) · refresh()
// Раскладка — HudLayout (блоки sam-*) с ФИКСИРОВАННЫМИ размерами из таблицы SAM_LAYOUT: размер блока = база × масштаб режима (тот же,
// что считает HudLayout.scaleFor), без замеров DOM — раскладка не зависит от содержимого и не мигает. CSS считает в тех же единицах (--u).

const GAME_HUD_LANG = {
    ru: {
        'ui.tagline': 'Тренируйся • Открывай • Лезь',
        'ui.play': 'Играть', 'ui.howto': 'Как играть', 'ui.sound': 'Звук', 'ui.on': 'Вкл', 'ui.off': 'Выкл',
        'ui.paused': 'Пауза', 'ui.resume': 'Продолжить', 'ui.quality': 'Графика',
        'ui.q.auto': 'Авто', 'ui.q.low': 'Низкая', 'ui.q.medium': 'Средняя', 'ui.q.high': 'Высокая',
        'ui.lobby': 'Лобби', 'ui.stage': 'Этап {n}', 'ui.stage.sub': 'Рекомендуемый уровень {rec} • Нужно хватки: {need}', 'ui.stage.sub.s': 'Рекоменд. ур. {rec} • Хватка {need}',
        'ui.level': 'Уровень {n}', 'ui.grip': 'Хватка',
        'ui.arms.one': 'рука', 'ui.arms.few': 'руки', 'ui.arms.many': 'рук',
        'ui.arms.next': '+1 на ур. {n}', 'ui.arms.max': 'максимум',
        // чип под счётчиком: значок перерождения + короткий текст (полный — в title/aria-label); мягкий перенос \xAD — «Пере-рождение» в две строки
        'ui.rebirths': 'Перерождения: {n} · Опыт x{m}', 'ui.rebirths.s': '{n} · Опыт x{m}',
        'ui.btn.rebirth': 'Пере\xADрождение', 'ui.btn.shop': 'Магазин', 'ui.btn.daily': 'Подарок', 'ui.btn.teleport': 'Телепорт', 'ui.btn.wheel': 'Колесо',
        'ui.boost.btn': 'Опыт x{m}', 'ui.boost.sub': '{n} мин', 'ui.boost.chip': 'x{m} опыт {t}', 'ui.boost.aria': 'Опыт x{m} на {n} мин за рекламу', 'ui.offer.sub': 'За рекламу',
        'ui.ban.outgrip': 'Хватка кончилась!', 'ui.ban.outgrip.s': 'Встань на твёрдую землю, чтобы восстановить хватку',
        'ui.ban.win': '+1 победа', 'ui.ban.win.s': 'Всего: {n}',
        'ui.lu.level': 'Уровень\xA0{a}\xA0>\xA0{b}', 'ui.lu.arms': 'Руки\xA0{a}\xA0>\xA0{b}', 'ui.lu.grip': 'Хватка\xA0{a}\xA0>\xA0{b}', 'ui.lu.arm': '+1 рука!',
        'ui.close': 'Закрыть',
        // магазин считает победы, а не монеты
        'shop.noCoins': 'Не хватает побед: {n}',
        'reward.coins': 'Победы: {n}', 'reward.big': 'Крупная награда: победы {n}', 'reward.dup': 'Такой предмет уже есть, победы: {n}',
    },
    en: {
        'ui.tagline': 'Train • Unlock • Climb',
        'ui.play': 'Play', 'ui.howto': 'How to play', 'ui.sound': 'Sound', 'ui.on': 'On', 'ui.off': 'Off',
        'ui.paused': 'Paused', 'ui.resume': 'Resume', 'ui.quality': 'Graphics',
        'ui.q.auto': 'Auto', 'ui.q.low': 'Low', 'ui.q.medium': 'Medium', 'ui.q.high': 'High',
        'ui.lobby': 'Lobby', 'ui.stage': 'Stage {n}', 'ui.stage.sub': 'Recommended level {rec} • Needs {need} grip', 'ui.stage.sub.s': 'Rec. level {rec} • Grip {need}',
        'ui.level': 'Level {n}', 'ui.grip': 'Grip',
        'ui.arms.one': 'arm', 'ui.arms.few': 'arms', 'ui.arms.many': 'arms',
        'ui.arms.next': '+1 at lv {n}', 'ui.arms.max': 'max',
        'ui.rebirths': 'Rebirths: {n} · XP x{m}', 'ui.rebirths.s': '{n} · XP x{m}',
        'ui.btn.rebirth': 'Rebirth', 'ui.btn.shop': 'Shop', 'ui.btn.daily': 'Daily', 'ui.btn.teleport': 'Teleport', 'ui.btn.wheel': 'Wheel',
        'ui.boost.btn': 'XP x{m}', 'ui.boost.sub': '{n} min', 'ui.boost.chip': 'x{m} XP {t}', 'ui.boost.aria': 'XP x{m} for {n} min: watch an ad', 'ui.offer.sub': 'Watch ad',
        'ui.ban.outgrip': 'Out of grip!', 'ui.ban.outgrip.s': 'Stand on solid ground to refill your grip',
        'ui.ban.win': '+1 win', 'ui.ban.win.s': 'Total: {n}',
        'ui.lu.level': 'Level\xA0{a}\xA0>\xA0{b}', 'ui.lu.arms': 'Arms\xA0{a}\xA0>\xA0{b}', 'ui.lu.grip': 'Grip\xA0{a}\xA0>\xA0{b}', 'ui.lu.arm': '+1 arm!',
        'ui.close': 'Close',
        'shop.noCoins': 'Not enough wins: {n}',
        'reward.coins': 'Wins: {n}', 'reward.big': 'Big reward: {n} wins', 'reward.dup': 'You already have this item, wins: {n}',
    },
};
for (const code of Object.keys(GAME_HUD_LANG)) Object.assign(LANG_STRINGS[code], GAME_HUD_LANG[code]);

/**
 * Размеры блоков HUD в px при масштабе 1 (потом × масштаб режима): area [ширина, высота] · wins [ширина, плашка, чип, зазор] ·
 * menu [ширина, высота, колонок, рядов] · gear · stack [ширина, подсказка, руки, хватка, уровень, зазор] · toast · chat ·
 * offer / boost / chip — правая колонка (предложение за рекламу, кнопка «Опыт x2», чип «x2 опыт 2:31»).
 * Числа должны совпадать с CSS ниже (высоты плашек, кнопок, полос).
 */
const SAM_LAYOUT = {
    wide: { area: [520, 50], wins: [170, 50, 22, 5], menu: [184, 274, 2, 3], gear: 50, stack: [430, 34, 31, 33, 46, 6], toast: [320, 40], chat: [250, 108], offer: [212, 88], boost: [176, 56], chip: [172, 46] },
    tall: { area: [520, 50], wins: [160, 50, 22, 5], menu: [96, 392, 1, 5], gear: 50, stack: [430, 34, 31, 33, 46, 6], toast: [320, 40], chat: [250, 108], offer: [196, 88], boost: [152, 54], chip: [150, 44] },
    low: { area: [420, 40], wins: [132, 40, 20, 4], menu: [205, 46, 5, 1], gear: 44, stack: [380, 26, 24, 26, 34, 4], toast: [300, 32], chat: [250, 90], offer: [212, 62], boost: [126, 46], chip: [126, 40] },
};
SAM_LAYOUT.land = SAM_LAYOUT.wide;

/** Наименьшая кнопка меню в px (без масштаба): подпись в ней стоит не мельче 11 px («РОЖДЕНИЕ» в две строки), а не ужимается --fit. */
const SAM_MENU_BTN_MIN = { w: 78, h: 56 };

/** Размер в единицах интерфейса: n px при масштабе режима 1 (--u ставит GameHud._applyLayout). */
const samU = (n) => 'calc(' + n + '*var(--u))';

const GAME_HUD_CSS = `
:root{--sam-ink:#14102f;--sam-ink2:#241d5c;--sam-panel:#1d1857;--sam-gold:#ffd23a;--sam-orange:#ff9d1c;--sam-green:#34e06f;--sam-blue:#3b9bff;--sam-red:#ff4a5c;--sam-pink:#ff5db1;--sam-cyan:#42e8ff;--sam-purple:#9b6bff;
--sam-font:'Nunito','Arial Rounded MT Bold','Trebuchet MS',system-ui,sans-serif;--u:1px;
--lory-input-fg:#fff;--lory-input-bg:rgba(20,16,47,.32);--lory-input-accent:#ff9d1c;--sam-climb:none}
#sam-hud,#sam-banner,#sam-floats,#sam-toast,.sam-screen,.sam-wl{paint-order:stroke fill}
.sam-ic,.sam-ic *{paint-order:normal;-webkit-text-stroke:0}
.sam-ic{display:block;width:1em;height:1em;flex:none;object-fit:contain;pointer-events:none;-webkit-user-drag:none;filter:drop-shadow(0 ${samU(2)} 0 rgba(0,0,0,.3))}
.sam-o{font-family:var(--sam-font);font-weight:1000;color:#fff;letter-spacing:.01em;-webkit-text-stroke:${samU(5)} var(--sam-ink);paint-order:stroke fill;text-shadow:0 ${samU(2.5)} 0 var(--sam-ink)}
@supports not (paint-order:stroke fill){.sam-o{-webkit-text-stroke:0;text-shadow:${samU(2)} 0 0 var(--sam-ink),-${samU(2)} 0 0 var(--sam-ink),0 ${samU(2)} 0 var(--sam-ink),0 -${samU(2)} 0 var(--sam-ink),${samU(2)} ${samU(2)} 0 var(--sam-ink),-${samU(2)} ${samU(2)} 0 var(--sam-ink)}}

/* ---------- кнопки ---------- */
.sam-btn{--c1:#7bf7a3;--c2:#25cb5c;--c3:#13a247;--cd:#0b6a2b;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:${samU(8)};box-sizing:border-box;min-height:max(44px,${samU(48)});padding:${samU(6)} ${samU(20)};margin:0;
font:1000 ${samU(21)}/1 var(--sam-font);text-transform:uppercase;letter-spacing:.02em;color:#fff;cursor:pointer;border:${samU(3.5)} solid var(--sam-ink);border-radius:${samU(15)};background:linear-gradient(var(--c1),var(--c2) 52%,var(--c3));
box-shadow:0 ${samU(5)} 0 var(--cd),0 ${samU(9)} ${samU(12)} rgba(0,0,0,.38),inset 0 ${samU(2)} 0 rgba(255,255,255,.6);-webkit-text-stroke:${samU(4.5)} var(--sam-ink);paint-order:stroke fill;text-shadow:0 ${samU(2)} 0 var(--sam-ink);
touch-action:manipulation;-webkit-tap-highlight-color:transparent;outline:none;transition:transform .08s,filter .12s;pointer-events:auto;white-space:nowrap}
.sam-btn::after{content:'';position:absolute;left:${samU(5)};right:${samU(5)};top:${samU(3)};height:38%;border-radius:${samU(10)} ${samU(10)} ${samU(14)} ${samU(14)}/${samU(9)} ${samU(9)} ${samU(14)} ${samU(14)};background:linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,.04));pointer-events:none}
.sam-btn>*{position:relative;z-index:1}
.sam-btn:active:not([disabled]){transform:translateY(${samU(4)});box-shadow:0 ${samU(1)} 0 var(--cd),0 ${samU(3)} ${samU(6)} rgba(0,0,0,.4),inset 0 ${samU(2)} 0 rgba(255,255,255,.4)}
@media (hover:hover){.sam-btn:hover:not([disabled]){filter:brightness(1.1) saturate(1.1)}}
.sam-btn[disabled],.sam-btn.is-off{filter:grayscale(.85) brightness(.82);cursor:default}
.sam-btn .sam-ic{font-size:${samU(26)};-webkit-text-stroke:0}
.c-orange{--c1:#ffe070;--c2:#ffa71f;--c3:#ee7b0c;--cd:#9c4a05}.c-blue{--c1:#8ccdff;--c2:#3b9bff;--c3:#2368df;--cd:#143f96}
.c-red{--c1:#ff95a2;--c2:#ff4a5c;--c3:#d01f3b;--cd:#7d0f22}.c-purple{--c1:#cfb4ff;--c2:#8c5cff;--c3:#5f33cf;--cd:#37188a}
.c-gray{--c1:#c3c9dc;--c2:#8e97b6;--c3:#6a7390;--cd:#454c66}.c-gold{--c1:#fff3a6;--c2:#ffd23a;--c3:#f0a30e;--cd:#9a6200}.c-dark{--c1:#51499c;--c2:#352f78;--c3:#262059;--cd:#100c26}
.sam-ico-btn{width:max(44px,${samU(50)});min-width:0;padding:0;min-height:max(44px,${samU(50)});border-radius:${samU(15)}}
.sam-ico-btn .sam-ic{font-size:${samU(32)}}

/* ---------- слой HUD ---------- */
#sam-hud{position:fixed;inset:0;z-index:20;pointer-events:none;font-family:var(--sam-font);font-weight:900;color:#fff;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#sam-hud.is-menu{display:none}
body.sam-modal #sam-hud .sam-hide-modal{visibility:hidden}
body.sam-shop #sam-hud{visibility:hidden}
#sam-hud button{pointer-events:auto}

/* верх-центр: зона (размер блока ставит JS-раскладка, текст сжимается переменной --fit) */
#sam-area{text-align:center;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;line-height:1.02;overflow:visible}
#sam-area::before{content:'';position:absolute;left:-14%;right:-14%;top:${samU(-14)};height:${samU(86)};background:radial-gradient(ellipse at 50% 0,rgba(12,9,48,.78),rgba(12,9,48,0) 70%);z-index:-1}
#sam-area .a-t,#sam-area .a-s{display:block;white-space:nowrap;--fit:1}
#sam-area .a-t{font-size:calc(27*var(--u)*var(--fit));text-transform:uppercase}
#sam-area .a-t b{color:var(--sam-gold);font-weight:inherit;margin-right:.3em}
#sam-area .a-s{font-size:max(11px,calc(13.5*var(--u)*var(--fit)));margin-top:${samU(2)};text-transform:uppercase;color:#fff;-webkit-text-stroke-width:${samU(3.4)}}
#sam-area.is-stage .a-s{color:#8dff9c}
.hl-low #sam-area .a-t{font-size:calc(22*var(--u)*var(--fit))}.hl-low #sam-area .a-s{font-size:max(11px,calc(11.5*var(--u)*var(--fit)))}
/* верх-лево: победы */
#sam-wins{display:flex;flex-direction:column;align-items:stretch;gap:${samU(5)}}
#sam-wins .w-main{position:relative;display:flex;align-items:center;flex:none;box-sizing:border-box;height:${samU(50)};padding:0 ${samU(14)} 0 ${samU(62)};border-radius:${samU(16)} ${samU(24)} ${samU(24)} ${samU(16)};background:linear-gradient(90deg,rgba(21,16,72,.9),rgba(21,16,72,.62) 78%,rgba(21,16,72,.12));box-shadow:inset 0 0 0 ${samU(2.5)} rgba(255,255,255,.14)}
#sam-wins .w-ico{position:absolute;left:${samU(5)};top:50%;font-size:${samU(54)};transform:translateY(-50%) rotate(-6deg);transform-origin:50% 60%}
#sam-wins .w-num{font-size:${samU(35)};display:inline-block;transform-origin:0 60%}
#sam-wins.bump .w-num{animation:sam-bump .42s cubic-bezier(.3,1.6,.5,1)}
#sam-wins.bump .w-ico{animation:sam-trophy .5s ease-out}
#sam-wins .w-reb{display:none;align-items:center;gap:${samU(4)};align-self:flex-start;max-width:100%;box-sizing:border-box;height:${samU(22)};padding:0 ${samU(10)} 0 ${samU(5)};border-radius:${samU(11)};background:rgba(29,24,87,.86);border:${samU(2.5)} solid var(--sam-ink);text-transform:uppercase;color:#ffe9a6;-webkit-text-stroke:${samU(3)} var(--sam-ink);box-shadow:0 ${samU(2)} 0 rgba(0,0,0,.3);white-space:nowrap;overflow:hidden}
#sam-wins .w-reb .sam-ic{font-size:max(14px,${samU(17)})}
#sam-wins .w-reb .rt{--fit:1;font-size:max(11px,calc(11.5*var(--u)*var(--fit)));line-height:1}
#sam-wins.has-reb .w-reb{display:inline-flex}
.hl-low #sam-wins .w-main{height:${samU(40)};padding-left:${samU(50)}}
.hl-low #sam-wins .w-ico{font-size:${samU(44)}}.hl-low #sam-wins .w-num{font-size:${samU(28)}}
.hl-low #sam-wins .w-reb{height:${samU(20)}}
/* верх-право: шестерёнка */
#sam-gear .sam-ico-btn{width:100%;height:100%;min-height:0;min-width:0}
/* левая колонка: окна (число колонок и рядов ставит JS-раскладка) */
#sam-menu{display:grid;grid-template-columns:repeat(var(--mc,2),1fr);grid-template-rows:repeat(var(--mr,2),1fr);gap:${samU(8)}}
#sam-menu .sam-btn{width:100%;height:100%;min-height:0;min-width:0;flex-direction:column;justify-content:flex-end;gap:${samU(2)};padding:${samU(4)} ${samU(1)} ${samU(8)};font-size:${samU(11.5)};-webkit-text-stroke-width:${samU(3.4)};border-radius:${samU(17)};letter-spacing:0;overflow:visible}
#sam-menu .sam-btn .sam-ic{position:absolute;left:50%;top:${samU(7)};font-size:${samU(46)};transform:translateX(-50%);transition:transform .15s}
#sam-menu .sam-btn:active .sam-ic{transform:translateX(-50%) scale(.92)}
#sam-menu .sam-btn span{position:relative;z-index:2;max-width:none;white-space:nowrap;--fit:1;font-size:max(11px,calc(11.5*var(--u)*var(--fit)))}
#sam-menu .sam-btn[data-act=rebirth] span{white-space:normal;hyphens:manual;-webkit-hyphens:manual;line-height:.92;text-align:center}
#sam-menu .sam-btn .dot{position:absolute;right:${samU(-6)};top:${samU(-7)};width:${samU(24)};height:${samU(24)};border-radius:50%;border:${samU(3)} solid var(--sam-ink);background:radial-gradient(circle at 40% 30%,#ff8d9a,#ff2f48 70%);display:none;align-items:center;justify-content:center;font-size:${samU(15)};-webkit-text-stroke:${samU(2.6)} var(--sam-ink);z-index:3;animation:sam-dot 1.1s ease-in-out infinite}
#sam-menu .sam-btn.has-dot .dot{display:flex}
.hl-tall #sam-menu{gap:${samU(7)}}
.hl-tall #sam-menu .sam-btn{border-radius:${samU(15)};padding-bottom:${samU(6)}}
.hl-tall #sam-menu .sam-btn .sam-ic{font-size:${samU(38)};top:${samU(5)}}
.hl-tall #sam-menu .sam-btn span{font-size:max(11px,calc(10.5*var(--u)*var(--fit)))}
.hl-low #sam-menu{gap:${samU(7)}}
.hl-low #sam-menu .sam-btn{padding:0}
.hl-low #sam-menu .sam-btn span{display:none}
.hl-low #sam-menu .sam-btn .sam-ic{top:50%;font-size:${samU(30)};transform:translate(-50%,-50%)}
.hl-low #sam-menu .sam-btn:active .sam-ic{transform:translate(-50%,-50%) scale(.92)}

/* низ-центр: руки, хватка, уровень (высоту стопки ставит JS-раскладка по тому, что показано) */
#sam-stack{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-end;gap:${samU(6)};pointer-events:none}
#sam-hint{align-self:center;display:none;box-sizing:border-box;height:${samU(34)};max-width:100%;padding:0 ${samU(18)};border-radius:${samU(20)};background:rgba(20,16,60,.88);border:${samU(3)} solid var(--sam-ink);box-shadow:0 0 0 ${samU(2)} rgba(255,255,255,.9),0 ${samU(5)} 0 rgba(0,0,0,.35);font-size:calc(16*var(--u)*var(--fit,1));text-align:center;text-transform:uppercase;-webkit-text-stroke:${samU(3.4)} var(--sam-ink);line-height:calc(28*var(--u));white-space:nowrap;overflow:hidden}
#sam-hint.on{display:block;animation:sam-rise .28s cubic-bezier(.3,1.5,.5,1)}
#sam-hint kbd{display:inline-block;margin:0 .15em;padding:0 .5em;border-radius:${samU(8)};background:#fff;color:var(--sam-ink);-webkit-text-stroke:0;text-shadow:none;font:inherit;line-height:1.25;box-shadow:0 ${samU(3)} 0 #9aa7c7;border:${samU(2)} solid var(--sam-ink)}
#sam-arms{align-self:center;display:inline-flex;align-items:center;flex:none;gap:${samU(8)};height:${samU(31)};padding:0 ${samU(16)} 0 ${samU(8)};border-radius:${samU(18)};background:rgba(20,16,60,.88);border:${samU(3)} solid var(--sam-ink);box-shadow:0 0 0 ${samU(2)} rgba(255,255,255,.18),0 ${samU(4)} 0 rgba(0,0,0,.3);font-size:max(11px,${samU(15)});text-transform:uppercase;-webkit-text-stroke:${samU(3.2)} var(--sam-ink);white-space:nowrap;box-sizing:border-box}
#sam-arms .sam-ic{font-size:${samU(26)};margin-left:${samU(2)}}
#sam-arms i{font-style:normal;color:#9fd2ff;font-size:max(10px,.86em)}
.bar{position:relative;box-sizing:border-box;flex:none;border-radius:${samU(15)};border:${samU(3.5)} solid var(--sam-ink);background:#171347;box-shadow:0 0 0 ${samU(2.5)} rgba(255,255,255,.92),0 ${samU(5)} 0 rgba(0,0,0,.38);overflow:hidden}
.bar .fill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:0 ${samU(12)} ${samU(12)} 0}
.bar .fill::after{content:'';position:absolute;left:${samU(4)};right:${samU(5)};top:${samU(3)};height:34%;border-radius:${samU(8)};background:linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.05))}
.bar .row{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 ${samU(14)}}
#sam-grip{display:none;height:${samU(33)}}
#sam-grip.on{display:block;animation:sam-rise .25s ease-out}
#sam-grip.out{display:block;animation:none;opacity:0;transform:translateY(${samU(6)});transition:opacity .2s,transform .2s}
#sam-grip .fill{background:linear-gradient(#aaf7ff,#3fd6ff 52%,#1b9ad6);transition:width .12s linear}
#sam-grip .row{padding-left:${samU(40)};font-size:${samU(16)};text-transform:uppercase;-webkit-text-stroke:${samU(3.2)} var(--sam-ink)}
#sam-grip .gi{position:absolute;left:${samU(5)};top:50%;font-size:${samU(34)};transform:translateY(-50%);z-index:2}
#sam-grip.low{animation:sam-lowgrip .5s ease-in-out infinite}
#sam-grip.low .fill{background:linear-gradient(#ffb1ba,#ff4a5c 52%,#c91f3a)}
#sam-grip.low.on,#sam-grip.low{box-shadow:0 0 0 ${samU(2.5)} #ffd0d5,0 0 ${samU(18)} rgba(255,60,80,.8)}
#sam-level{height:${samU(46)}}
#sam-level .fill{background:linear-gradient(#8fe0ff,#2f9bff 52%,#1f6fe0);transition:width .38s cubic-bezier(.2,.8,.2,1)}
#sam-level.flash{animation:sam-flash .6s ease-out}
#sam-level .row{font-size:${samU(24)};text-transform:none;-webkit-text-stroke:${samU(4.4)} var(--sam-ink)}
#sam-level .xp{font-size:${samU(19)}}
.hl-low #sam-stack{gap:${samU(4)}}
.hl-low #sam-arms{height:${samU(24)};font-size:max(11px,${samU(12.5)});padding-right:${samU(12)}}.hl-low #sam-arms .sam-ic{font-size:${samU(20)}}
.hl-low #sam-grip{height:${samU(26)}}.hl-low #sam-grip .row{font-size:${samU(13)};padding-left:${samU(32)}}.hl-low #sam-grip .gi{font-size:${samU(27)}}
.hl-low #sam-level{height:${samU(34)}}.hl-low #sam-level .row{font-size:${samU(18)}}.hl-low #sam-level .xp{font-size:${samU(15)}}
.hl-low #sam-hint{height:${samU(26)};font-size:calc(13*var(--u)*var(--fit,1));line-height:calc(20*var(--u));padding:0 ${samU(12)}}

/* кнопка «Колесо»: в широком режиме занимает нижний ряд целиком */
.hl-wide #sam-menu .sam-btn[data-act=wheel],.hl-land #sam-menu .sam-btn[data-act=wheel]{grid-column:1/-1}
#sam-menu .sam-btn[data-act=wheel].has-dot .sam-ic{animation:sam-wob 1.8s ease-in-out infinite}
#sam-menu .sam-btn[hidden]{display:none}

/* правая колонка: предложение за рекламу (кольцо обратного отсчёта) и «Опыт x2» / чип бонуса. Размеры — SAM_LAYOUT.offer / boost / chip */
#sam-offer,#sam-boost{display:none}
#sam-offer.on,#sam-boost.on{display:block}
#sam-offer .o-btn{position:relative;width:100%;height:100%;min-height:0;min-width:0;display:flex;align-items:center;justify-content:flex-start;gap:${samU(7)};padding:${samU(4)} ${samU(16)} ${samU(8)} ${samU(8)};border-radius:${samU(21)};text-align:left;line-height:1;white-space:normal;overflow:visible;animation:sam-offer-in .45s cubic-bezier(.2,1.5,.4,1) both,sam-pulse 1.6s .5s ease-in-out infinite}
#sam-offer .o-btn.wait,#sam-boost .b-btn.wait{filter:grayscale(.55) brightness(.92)}
#sam-offer .o-ico{position:relative;flex:none;width:${samU(56)};height:${samU(56)};display:flex;align-items:center;justify-content:center}
#sam-offer .o-ico svg.ring{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
#sam-offer .o-ico .rb{fill:rgba(20,16,47,.55);stroke:rgba(20,16,47,.55);stroke-width:5}
#sam-offer .o-ico .rf{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;stroke-dasharray:131.9;filter:drop-shadow(0 0 2px rgba(255,255,255,.7))}
#sam-offer .o-ic{position:relative;z-index:1;display:flex;align-items:center;justify-content:center}
#sam-offer .o-ic .sam-ic{font-size:${samU(34)}}
#sam-offer .o-spin{display:none;position:absolute;left:50%;top:50%;width:${samU(30)};height:${samU(30)};margin:${samU(-15)} 0 0 ${samU(-15)};border-width:${samU(5)}}
#sam-offer .o-btn.busy .o-spin{display:block;z-index:2}#sam-offer .o-btn.busy .o-ic{opacity:.25}#sam-offer .o-btn.busy .rf{opacity:.3}
#sam-offer .o-tx{display:flex;flex-direction:column;gap:${samU(2)};min-width:0;flex:1}
#sam-offer .o-t,#sam-offer .o-s{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;padding:${samU(1)} 0}
#sam-offer .o-s{-webkit-line-clamp:3}.hl-low #sam-offer .o-s{-webkit-line-clamp:2}
#sam-offer .o-t{white-space:normal;overflow-wrap:anywhere;--fit:1;font-size:max(12px,calc(19*var(--u)*var(--fit)));text-transform:uppercase;line-height:.98;-webkit-text-stroke:${samU(4.5)} var(--sam-ink)}
#sam-offer .o-s{white-space:normal;overflow-wrap:anywhere;--fit:1;font-size:max(11px,calc(12.5*var(--u)*var(--fit)));line-height:1;text-transform:uppercase;color:#fff3a6;-webkit-text-stroke:${samU(3.2)} var(--sam-ink)}
.o-ad,.b-ad{position:absolute;right:${samU(-8)};top:${samU(-13)};width:${samU(24)};height:${samU(24)};border-radius:50%;border:${samU(3)} solid var(--sam-ink);background:radial-gradient(circle at 38% 30%,#d9c4ff,#8c5cff 65%,#5a2fc9);display:flex;align-items:center;justify-content:center;box-shadow:0 ${samU(2)} 0 rgba(0,0,0,.35);z-index:3;pointer-events:none}
.o-ad .sam-ic,.b-ad .sam-ic{font-size:${samU(14)};margin-left:${samU(1.5)};filter:none}
#sam-boost .b-btn{position:relative;width:100%;height:100%;min-height:0;min-width:0;display:flex;align-items:center;justify-content:flex-start;gap:${samU(6)};padding:${samU(3)} ${samU(18)} ${samU(7)} ${samU(8)};border-radius:${samU(18)};text-align:left;line-height:1;white-space:normal;overflow:visible}
#sam-boost .b-btn .sam-ic{font-size:${samU(36)}}
#sam-boost .b-tx{display:flex;flex-direction:column;gap:${samU(2)};min-width:0;flex:1}
#sam-boost .b-t{display:block;white-space:nowrap;--fit:1;font-size:max(12px,calc(17*var(--u)*var(--fit)));text-transform:uppercase;-webkit-text-stroke:${samU(4)} var(--sam-ink)}
#sam-boost .b-s{display:block;white-space:nowrap;--fit:1;font-size:max(11px,calc(12*var(--u)*var(--fit)));text-transform:uppercase;color:#ffe9a6;-webkit-text-stroke:${samU(3)} var(--sam-ink)}
#sam-boost .b-spin{display:none;flex:none;width:${samU(24)};height:${samU(24)};border-width:${samU(4.5)}}
#sam-boost .b-btn.busy .b-spin{display:block}#sam-boost .b-btn.busy>.sam-ic{display:none}
#sam-boost .b-chip{display:none;width:100%;height:100%;box-sizing:border-box;align-items:center;justify-content:center;gap:${samU(6)};padding:0 ${samU(12)} 0 ${samU(6)};border-radius:${samU(24)};background:linear-gradient(#ffe070,#ffa71f 60%,#ee7b0c);border:${samU(3.5)} solid var(--sam-ink);box-shadow:0 0 0 ${samU(2.5)} rgba(255,255,255,.85),0 ${samU(5)} 0 rgba(0,0,0,.35);animation:sam-rise .3s ease-out}
#sam-boost.is-chip .b-btn{display:none}#sam-boost.is-chip .b-chip{display:flex}
#sam-boost .b-chip .sam-ic{font-size:${samU(32)}}
#sam-boost .b-ct{display:block;flex:1;min-width:0;white-space:nowrap;--fit:1;font-size:max(11px,calc(17*var(--u)*var(--fit)));text-transform:uppercase;-webkit-text-stroke:${samU(4)} var(--sam-ink);color:#fff}
.hl-low #sam-offer .o-btn{padding:${samU(3)} ${samU(9)} ${samU(6)} ${samU(6)};gap:${samU(5)};border-radius:${samU(18)}}
.hl-low #sam-offer .o-ico{width:${samU(44)};height:${samU(44)}}.hl-low #sam-offer .o-ic .sam-ic{font-size:${samU(27)}}
.hl-low #sam-offer .o-t{font-size:max(12px,calc(15*var(--u)*var(--fit)))}.hl-low #sam-offer .o-s{font-size:max(11px,calc(11*var(--u)*var(--fit)))}
.hl-low #sam-boost .b-btn{padding:${samU(2)} ${samU(10)} ${samU(5)} ${samU(6)};gap:${samU(4)}}.hl-low #sam-boost .b-btn .sam-ic{font-size:${samU(30)}}
.hl-low #sam-boost .b-t{font-size:max(12px,calc(15*var(--u)*var(--fit)))}.hl-low #sam-boost .b-s{display:none}
.hl-low #sam-boost .b-chip .sam-ic{font-size:${samU(26)}}.hl-low #sam-boost .b-ct{font-size:max(11px,calc(14*var(--u)*var(--fit)))}
.hl-tall #sam-offer .o-t{font-size:max(12px,calc(17*var(--u)*var(--fit)))}.hl-tall #sam-offer .o-s{-webkit-line-clamp:3}.hl-tall #sam-offer .o-ico{width:${samU(52)};height:${samU(52)}}
body.sam-modal #sam-hud #sam-offer .o-btn,body.sam-modal #sam-hud #sam-boost .b-btn{animation-play-state:paused}

/* тост и чат */
#sam-toast{z-index:70;display:none;align-items:center;justify-content:center;text-align:center;font-family:var(--sam-font);font-weight:900;color:#fff;pointer-events:none;-webkit-user-select:none;user-select:none;box-sizing:border-box;padding:0 ${samU(18)};border-radius:${samU(16)};background:rgba(20,16,60,.9);border:${samU(3)} solid var(--sam-ink);box-shadow:0 0 0 ${samU(2)} rgba(255,255,255,.88),0 ${samU(5)} 0 rgba(0,0,0,.35);-webkit-text-stroke:${samU(3.4)} var(--sam-ink);opacity:0;transition:opacity .2s;overflow:hidden}
#sam-toast span{display:block;white-space:nowrap;--fit:1;font-size:calc(17*var(--u)*var(--fit))}
#sam-toast.show{display:flex;opacity:1}
#sam-chat{display:flex;flex-direction:column;justify-content:flex-end;gap:${samU(3)};overflow:hidden;font-size:${samU(13)};font-weight:800}
#sam-chat:empty{display:none!important}
.hl-low #sam-chat,.hl-land #sam-chat,.hl-touch #sam-chat{display:none!important}
#sam-chat .cr{align-self:flex-start;max-width:100%;padding:${samU(2)} ${samU(8)};border-radius:${samU(9)};background:rgba(15,12,48,.62);text-shadow:0 1px 2px #000;animation:sam-chatfade 14s linear forwards;overflow-wrap:anywhere}
#sam-chat .cr b{margin-right:${samU(5)}}

/* баннеры по центру */
#sam-banner{position:fixed;left:50%;top:30%;z-index:62;transform:translate(-50%,-50%);display:none;flex-direction:column;align-items:center;text-align:center;pointer-events:none;width:min(94vw,${samU(760)});line-height:1.04}
#sam-banner.on{display:flex}
#sam-banner .b-t{font-size:${samU(60)};text-transform:uppercase;-webkit-text-stroke:${samU(8)} var(--sam-ink);text-shadow:0 ${samU(5)} 0 var(--sam-ink);overflow-wrap:anywhere}
#sam-banner .b-s{font-size:${samU(22)};margin-top:${samU(6)};text-transform:uppercase;-webkit-text-stroke:${samU(5)} var(--sam-ink);text-shadow:0 ${samU(3)} 0 var(--sam-ink)}
#sam-banner .b-i{display:none;font-size:${samU(86)};margin-bottom:${samU(-6)}}
#sam-banner .b-b{display:none;margin-top:${samU(10)};padding:${samU(2)} ${samU(18)};font-size:${samU(30)};text-transform:uppercase;border-radius:${samU(12)};background:linear-gradient(#ffcc4a,#ff8a1c);border:${samU(3.5)} solid var(--sam-ink);box-shadow:0 ${samU(4)} 0 #9c4a05;-webkit-text-stroke:${samU(5)} var(--sam-ink);transform:rotate(-4deg)}
#sam-banner.k-stage .b-t{color:#fff}#sam-banner.k-stage .b-s{color:#ffe14a}
#sam-banner.k-win .b-t{color:var(--sam-gold)}#sam-banner.k-win .b-s{color:#fff}#sam-banner.k-win .b-i{display:block}
#sam-banner.k-outgrip .b-t{color:#ff5a5a}#sam-banner.k-outgrip .b-s{color:#9fe8ff;font-size:${samU(19)}}
#sam-banner.k-info .b-t{color:#7cc6ff}
#sam-banner.k-levelup .b-t{color:#fff;font-size:${samU(44)}}#sam-banner.k-levelup .b-s{color:#ffe14a;font-size:${samU(24)}}#sam-banner.k-levelup .b-b{display:block}
#sam-banner.play{animation:sam-ban var(--ms,1800ms) both}
#sam-banner.k-win.play .b-i{animation:sam-trophy .9s ease-out}
#sam-banner.k-outgrip.play{animation:sam-ban-shake var(--ms,1800ms) both}
#sam-banner.k-levelup.play{animation:sam-ban-top var(--ms,2600ms) both}
#sam-banner.k-levelup.play .b-b{animation:sam-pop .6s .25s cubic-bezier(.3,1.7,.5,1) both}
.hl-low #sam-banner .b-i{font-size:${samU(44)};margin-bottom:${samU(-4)}}
.hl-low #sam-banner .b-t{font-size:${samU(40)};-webkit-text-stroke-width:${samU(6)}}
.hl-low #sam-banner .b-s{font-size:${samU(16)};margin-top:${samU(4)}}
.hl-low #sam-banner.k-outgrip .b-s{font-size:${samU(15)}}
.hl-low #sam-banner.k-levelup .b-t{font-size:${samU(32)}}.hl-low #sam-banner.k-levelup .b-s{font-size:${samU(17)}}
.hl-low #sam-banner .b-b{margin-top:${samU(6)};font-size:${samU(20)}}
.hl-low body.sam-ban .lory-tut-card{opacity:.2;transition:opacity .15s}
#sam-floats{position:fixed;inset:0;z-index:62;pointer-events:none;overflow:hidden}
.sam-fl{position:absolute;left:0;top:0;white-space:nowrap;font-size:${samU(28)};-webkit-text-stroke:${samU(5)} var(--sam-ink);text-shadow:0 ${samU(2.5)} 0 var(--sam-ink);opacity:0;will-change:transform,opacity;font-family:var(--sam-font);font-weight:1000}
body.sam-modal #sam-banner,body.sam-modal #sam-floats{visibility:hidden}

/* титульный экран и пауза */
.sam-screen{position:fixed;inset:0;z-index:40;display:none;flex-direction:column;align-items:center;justify-content:center;gap:${samU(14)};padding:${samU(14)};box-sizing:border-box;text-align:center;font-family:var(--sam-font);font-weight:900;color:#fff;overflow:hidden;
background:radial-gradient(ellipse 80% 70% at 50% 46%,rgba(12,9,48,0) 0,rgba(12,9,48,.55) 100%),linear-gradient(rgba(12,9,48,.14),rgba(12,9,48,.3))}
.sam-screen.on{display:flex}
.sam-screen.on>*{animation:sam-rise .5s cubic-bezier(.2,1.2,.4,1) both}
.sam-screen.on>*:nth-child(2){animation-delay:.08s}.sam-screen.on>*:nth-child(3){animation-delay:.16s}.sam-screen.on>*:nth-child(4){animation-delay:.24s}
#sam-menu-screen .logo{position:relative;display:flex;flex-direction:column;align-items:center;transform:rotate(-2.5deg);margin-bottom:${samU(6)}}
#sam-menu-screen .logo svg.arms{position:absolute;left:50%;top:50%;width:150%;height:210%;transform:translate(-50%,-52%);z-index:0;pointer-events:none;overflow:visible}
.logo-line{position:relative;display:inline-block;z-index:1;font-family:var(--sam-font);font-weight:1000;text-transform:uppercase;line-height:.95;letter-spacing:.012em;white-space:nowrap;-webkit-text-stroke:0;paint-order:normal}
.logo-line::before{content:attr(data-text);position:absolute;left:0;top:0;z-index:0;color:var(--sam-ink);-webkit-text-stroke:.17em var(--sam-ink);paint-order:stroke fill;text-shadow:0 .075em 0 var(--sam-ink),0 .13em .09em rgba(0,0,0,.55);pointer-events:none}
.logo-line span{position:relative;z-index:1;background:var(--lg);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;-webkit-text-stroke:0;filter:drop-shadow(0 .012em 0 rgba(255,255,255,.55))}
.logo-line.l1{--lg:linear-gradient(#fffbd0 0,#fff08a 12%,#ffe14a 13%,#ffd028 46%,#ffb01f 47%,#ff9a16 74%,#ff7d12 100%);font-size:min(${samU(86)},13.5vw,17vh)}
.logo-line.l2{--lg:linear-gradient(#f4feff 0,#b6f6ff 12%,#7fe9ff 13%,#47c8ff 46%,#2faaff 47%,#2b86ff 74%,#2563ee 100%);font-size:min(${samU(108)},17vw,21vh);margin-top:${samU(-2)}}
.hazard{height:${samU(14)};width:min(100%,${samU(520)});border-radius:${samU(8)};border:${samU(3)} solid var(--sam-ink);background:repeating-linear-gradient(-45deg,#ffd23a 0 ${samU(14)},#1b1540 ${samU(14)} ${samU(28)});box-shadow:0 ${samU(4)} 0 rgba(0,0,0,.4)}
#sam-menu-screen .tag{font-size:${samU(20)};text-transform:uppercase;-webkit-text-stroke:${samU(6)} var(--sam-ink);color:#ffe9a6;max-width:94%;text-shadow:0 ${samU(2.5)} 0 var(--sam-ink)}
#sam-menu-screen .play{font-size:${samU(38)};min-width:min(${samU(300)},82vw);min-height:max(56px,${samU(76)});border-radius:${samU(22)};-webkit-text-stroke-width:${samU(6)};animation:sam-pulse 1.6s ease-in-out infinite}
#sam-menu-screen .play .sam-ic{font-size:${samU(38)}}
#sam-menu-screen .row2,.sam-panel .row2{display:flex;gap:${samU(12)};flex-wrap:wrap;justify-content:center;align-items:center}
.sam-panel{position:relative;box-sizing:border-box;width:min(94vw,${samU(430)});padding:${samU(46)} ${samU(22)} ${samU(22)};border-radius:${samU(22)};border:${samU(4)} solid var(--sam-ink);background:linear-gradient(#2a2377,#1b1655);box-shadow:0 0 0 ${samU(3)} rgba(255,255,255,.9),0 ${samU(10)} 0 rgba(0,0,0,.4),0 ${samU(18)} ${samU(36)} rgba(0,0,0,.5);display:flex;flex-direction:column;gap:${samU(14)};align-items:stretch}
.sam-panel .p-title{position:absolute;left:${samU(-4)};right:${samU(-4)};top:${samU(-4)};height:${samU(40)};display:flex;align-items:center;justify-content:center;border-radius:${samU(22)} ${samU(22)} ${samU(8)} ${samU(8)};border:${samU(4)} solid var(--sam-ink);background:repeating-linear-gradient(-45deg,#ffd23a 0 ${samU(13)},#e9b214 ${samU(13)} ${samU(26)});font-size:${samU(26)};text-transform:uppercase}
.sam-panel .p-title span{padding:0 ${samU(14)};border-radius:${samU(10)};background:linear-gradient(#ffb02e,#ff8a1c)}
.sam-panel .q-label{font-size:${samU(15)};text-transform:uppercase;color:#bfd3ff;-webkit-text-stroke:${samU(3.4)} var(--sam-ink)}
.seg{display:flex;gap:${samU(6)}}
.seg button{flex:1;min-width:0;padding:${samU(6)} ${samU(4)};min-height:max(44px,${samU(44)});font-size:${samU(14)};-webkit-text-stroke-width:${samU(3.4)}}
.seg button.sel{--c1:#fff3a6;--c2:#ffd23a;--c3:#f0a30e;--cd:#9a6200}
.hl-low .sam-panel{padding-top:${samU(42)};gap:${samU(8)}}
.hl-low .sam-panel .btn-big{min-height:max(44px,${samU(44)});font-size:${samU(18)}}
.hl-low #sam-menu-screen .tag{display:none}
.hl-low #sam-menu-screen .logo svg.arms{height:170%}
.hl-low #sam-menu-screen .play{min-height:max(48px,${samU(60)});font-size:${samU(30)}}
.hl-low #sam-menu-screen{gap:${samU(8)}}
@media (max-height:420px){.hl-low .sam-screen{gap:${samU(8)}}}

/* туториал: синяя карточка «ШАГ n ИЗ m»; на низком альбоме и в land она компактная (одна строка с «Пропустить», без «Шаг n из m») — не закрывает героя в центре экрана */
.lory-tut{--tut-font:var(--sam-font)}
.lory-tut .lory-tut-card{padding:${samU(10)} ${samU(16)} ${samU(11)};gap:${samU(6)} ${samU(12)};background:linear-gradient(#4b97ff,#2a62e0 62%,#2150c4);border:${samU(4)} solid var(--sam-ink);border-radius:${samU(18)};box-shadow:0 0 0 ${samU(2.5)} rgba(255,255,255,.85),0 ${samU(6)} 0 #0f2a78,0 ${samU(12)} ${samU(18)} rgba(0,0,0,.4),inset 0 ${samU(3)} 0 rgba(255,255,255,.38);font-family:var(--sam-font)}
.lory-tut .lory-tut-card.lory-tut-ok{background:linear-gradient(#58e88a,#22b955 62%,#18983f);box-shadow:0 0 0 ${samU(2.5)} rgba(255,255,255,.85),0 ${samU(6)} 0 #0b6a2b,0 ${samU(12)} ${samU(18)} rgba(0,0,0,.4),inset 0 ${samU(3)} 0 rgba(255,255,255,.38)}
.lory-tut .lory-tut-step{display:block;font-size:${samU(13)};letter-spacing:.07em;text-transform:uppercase;color:#ffe14a;font-weight:1000;-webkit-text-stroke:${samU(3.2)} var(--sam-ink);paint-order:stroke fill}
.lory-tut .lory-tut-title{font-size:${samU(27)};font-weight:1000;text-transform:uppercase;line-height:1.04;-webkit-text-stroke:${samU(5)} var(--sam-ink);paint-order:stroke fill;text-shadow:0 ${samU(2.5)} 0 var(--sam-ink)}
.lory-tut .lory-tut-hint{font-size:${samU(16)};font-weight:800;line-height:1.55;-webkit-text-stroke:${samU(3.4)} #153a9c;paint-order:stroke fill}
.lory-tut .lory-tut-hint svg{color:#ffe14a}
.lory-tut .lory-tut-key{background:#fff;color:var(--sam-ink);border:${samU(2.5)} solid var(--sam-ink);box-shadow:0 ${samU(3)} 0 #9aa7c7;-webkit-text-stroke:0;font-weight:1000;paint-order:normal}
.lory-tut .lory-tut-bar{height:${samU(13)};background:rgba(8,18,80,.6);border:${samU(2.5)} solid var(--sam-ink);border-radius:99px}
.lory-tut .lory-tut-bar i{background:linear-gradient(#fff3a6,#ffd23a 60%,#f0a30e)}
.lory-tut .lory-tut-dots{display:none}
.lory-tut .lory-tut-skip{min-height:max(40px,${samU(40)});padding:${samU(6)} ${samU(16)};border:${samU(3.5)} solid var(--sam-ink);border-radius:${samU(14)};background:linear-gradient(#ffffff,#d9e2ff);color:var(--sam-ink);font-family:var(--sam-font);font-weight:1000;font-size:${samU(15)};text-transform:uppercase;box-shadow:0 ${samU(4)} 0 #8793c9;letter-spacing:.02em;-webkit-text-stroke:0;paint-order:normal}
.lory-tut .lory-tut-skip:active{transform:translateY(${samU(3)});box-shadow:0 ${samU(1)} 0 #8793c9}
.lory-tut .lory-tut-skip kbd{background:var(--sam-ink);color:#fff}
.lory-tut .lory-tut-final{font-family:var(--sam-font);font-weight:1000;border:${samU(4)} solid var(--sam-ink);background:linear-gradient(#58e88a,#22b955);-webkit-text-stroke:${samU(4)} var(--sam-ink);paint-order:stroke fill;text-transform:uppercase}
:is(.hl-low,.hl-land) .lory-tut .lory-tut-title{font-size:${samU(18)}}
:is(.hl-low,.hl-land) .lory-tut .lory-tut-hint{font-size:max(11px,${samU(12)});line-height:1.2}
:is(.hl-low,.hl-land) .lory-tut .lory-tut-card{padding:${samU(4)} ${samU(10)};flex-wrap:nowrap}
:is(.hl-low,.hl-land) .lory-tut .lory-tut-main{flex:1 1 0;gap:${samU(2)}}
:is(.hl-low,.hl-land) .lory-tut .lory-tut-step{display:none}
:is(.hl-low,.hl-land) .lory-tut .lory-tut-bar{height:${samU(6)}}
:is(.hl-low,.hl-land) .lory-tut .lory-tut-skip,:is(.hl-low,.hl-land) .lory-tut.lory-tut-touch .lory-tut-skip{min-height:44px;padding:0 ${samU(10)};font-size:${samU(13)}}

/* контекстная кнопка «лезть» (Input.js, класс .lory-ctx): крупная, круглая, стрелка вверх */
html .lory-ctx{border:${samU(5)} solid var(--sam-ink);background:radial-gradient(circle at 50% 24%,#ffeb8a 0,#ffb126 52%,#f06a0c 100%);box-shadow:0 ${samU(7)} 0 #9c4a05,0 ${samU(12)} ${samU(16)} rgba(0,0,0,.42),inset 0 ${samU(4)} 0 rgba(255,255,255,.6),0 0 0 ${samU(2.5)} rgba(255,255,255,.88)}
html .lory-ctx::after{content:'';position:absolute;left:14%;right:14%;top:5%;height:34%;border-radius:50%;background:linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,0));pointer-events:none}
html .lory-ctx .lory-ctx-icon{font-size:0;width:56%;height:56%;display:block;background:var(--sam-climb) center/contain no-repeat;filter:drop-shadow(0 ${samU(3)} 0 rgba(0,0,0,.3));position:relative;z-index:1}
html .lory-ctx .lory-ctx-icon:has(img){background:none}
html .lory-ctx .lory-ctx-icon img{width:100%;height:100%}
html .lory-ctx .lory-ctx-label{display:block;max-width:92%;margin-top:-6%;font:1000 calc(var(--lory-ctx-d)*.15)/1 var(--sam-font);text-transform:uppercase;letter-spacing:.02em;color:#fff;-webkit-text-stroke:calc(var(--lory-ctx-d)*.07) var(--sam-ink);paint-order:stroke fill;text-shadow:0 calc(var(--lory-ctx-d)*.03) 0 var(--sam-ink);position:relative;z-index:1}
html .lory-ctx:active,html .lory-ctx.held{transform:translateY(${samU(5)}) scale(.97);box-shadow:0 ${samU(2)} 0 #9c4a05,0 ${samU(4)} ${samU(8)} rgba(0,0,0,.4),inset 0 ${samU(4)} 0 rgba(255,255,255,.4),0 0 0 ${samU(2.5)} rgba(255,255,255,.88);background:radial-gradient(circle at 50% 24%,#fff3a6 0,#ffc23a 52%,#ff7c14 100%)}
html .lory-stick{border-color:#fff;box-shadow:0 0 0 ${samU(3)} rgba(20,16,47,.55)}

/* анимации */
@keyframes sam-bump{0%{transform:scale(1)}35%{transform:scale(1.5) rotate(-3deg)}100%{transform:scale(1)}}
@keyframes sam-trophy{0%{transform:translateY(-50%) rotate(-6deg) scale(1)}30%{transform:translateY(-58%) rotate(10deg) scale(1.28)}100%{transform:translateY(-50%) rotate(-6deg) scale(1)}}
@keyframes sam-dot{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes sam-wob{0%,100%{rotate:-7deg}50%{rotate:7deg}}
@keyframes sam-offer-in{0%{opacity:0;transform:translateX(${samU(60)}) scale(.7)}100%{opacity:1;transform:none}}
@keyframes sam-spin{to{transform:rotate(360deg)}}
@keyframes sam-rise{0%{opacity:0;transform:translateY(${samU(14)}) scale(.94)}100%{opacity:1;transform:none}}
@keyframes sam-flash{0%{box-shadow:0 0 0 ${samU(2.5)} rgba(255,255,255,.92),0 0 0 rgba(255,255,255,0)}40%{box-shadow:0 0 0 ${samU(2.5)} #fff,0 0 ${samU(30)} ${samU(6)} rgba(120,210,255,.95)}100%{box-shadow:0 0 0 ${samU(2.5)} rgba(255,255,255,.92),0 ${samU(5)} 0 rgba(0,0,0,.38)}}
@keyframes sam-lowgrip{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
@keyframes sam-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
@keyframes sam-chatfade{0%,82%{opacity:1}100%{opacity:0}}
@keyframes sam-pop{0%{transform:rotate(-4deg) scale(.2);opacity:0}100%{transform:rotate(-4deg) scale(1);opacity:1}}
@keyframes sam-ban{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.18)}22%{transform:translate(-50%,-50%) scale(1)}84%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-64%) scale(.94)}}
@keyframes sam-ban-top{0%{opacity:0;transform:translate(-50%,-30%) scale(.5)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}20%{transform:translate(-50%,-50%) scale(1)}86%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-70%) scale(.96)}}
@keyframes sam-ban-shake{0%{opacity:0;transform:translate(-50%,-50%) scale(1.8)}10%{opacity:1;transform:translate(-50%,-50%) scale(1)}16%{transform:translate(calc(-50% - 10px),-50%) rotate(-2deg)}24%{transform:translate(calc(-50% + 10px),-50%) rotate(2deg)}32%{transform:translate(calc(-50% - 8px),-50%) rotate(-1deg)}40%{transform:translate(calc(-50% + 6px),-50%)}50%,84%{opacity:1;transform:translate(-50%,-50%)}100%{opacity:0;transform:translate(-50%,-56%)}}
@media (prefers-reduced-motion:reduce){#sam-menu-screen .play,#sam-grip.low,#sam-menu .sam-btn .dot,#sam-menu .sam-btn[data-act=wheel].has-dot .sam-ic,#sam-offer .o-btn{animation:none}}
`;

/** @satisfies {Record<string, any>} */
const GameHud = {
    /** @type {Record<string, any>} */ cb: {},
    /** @type {HTMLElement | null} */ root: null,
    /** @type {Record<string, HTMLElement>} */ el: {},
    _inited: false,
    /** Последние показанные значения: частые вызовы (setGrip каждый кадр) не трогают DOM, если ничего не изменилось. */
    _v: /** @type {Record<string, any>} */ ({}),
    _area: /** @type {any} */ ({ kind: 'lobby' }),
    _winsShown: 0, _winsAnim: 0,
    _bq: /** @type {any[]} */ ([]),
    _bBusy: false, _bTimer: 0, _toastT: 0,
    _fp: /** @type {Array<{ el: HTMLElement, anim: Animation | null }>} */ ([]), _fi: -1,
    _sound: true,
    _menuOn: false, _pauseOn: false, _lsig: '', _fitRaf: 0,
    /** Предложение за рекламу: { id, left (мс), ms, onAccept, busy, ... } или null; кадр обратного отсчёта. */
    _offer: /** @type {any} */ (null), _offerRaf: 0, _offerT: 0,
    /** «Опыт x2»: left — секунд бонуса, mult, minutes — для подписи, busy — идёт реклама, enabled — игра разрешила показ. */
    _bst: /** @type {{ left: number, mult: number, minutes: number, busy: boolean, enabled: boolean, shown: number }} */ ({ left: 0, mult: 2, minutes: 3, busy: false, enabled: true, shown: -1 }),

    // =============================================================================================
    // Сборка
    // =============================================================================================

    /** Один раз после HudLayout.init и Input.init; cb — обратные вызовы игры (шапка файла). */
    init(cb) {
        this.cb = cb || {};
        if (typeof document === 'undefined' || this._inited) return this;
        this._inited = true;
        GameIcons.mount();
        const st = document.createElement('style');
        st.id = 'sam-hud-css';
        st.textContent = GAME_HUD_CSS + ':root{--sam-climb:' + GameIcons.climbDataUrl + '}';
        document.head.appendChild(st);

        const I = (n, c) => GameIcons.html(n, c);
        const root = this.root = document.createElement('div');
        root.id = 'sam-hud';
        root.innerHTML =
            '<div id="sam-area" class="sam-hide-modal"><span class="a-t sam-o"></span><span class="a-s sam-o"></span></div>' +
            '<div id="sam-wins"><div class="w-main">' + I('trophy', 'w-ico') + '<span class="w-num sam-o">0</span></div><div class="w-reb">' + I('rebirth') + '<span class="rt"></span></div></div>' +
            '<div id="sam-gear"><button type="button" class="sam-btn sam-ico-btn c-blue" data-act="gear" aria-label="Pause">' + I('gear') + '</button></div>' +
            '<div id="sam-menu">' +
            ['rebirth', 'shop', 'daily', 'teleport', 'wheel'].map((k) =>
                '<button type="button" class="sam-btn ' + { rebirth: 'c-pink', shop: 'c-orange', daily: 'c-purple', teleport: 'c-blue', wheel: 'c-green' }[k] + '" data-act="' + k + '">' + I(k) + '<span class="sam-o-l" data-t="ui.btn.' + k + '"></span><em class="dot">!</em></button>').join('') +
            '</div>' +
            '<div id="sam-offer" class="sam-hide-modal"><button type="button" class="sam-btn c-orange o-btn" data-act="offer"><span class="o-ico"><svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle class="rb" cx="24" cy="24" r="21"/><circle class="rf" cx="24" cy="24" r="21"/></svg><span class="o-ic"></span><i class="sam-spin o-spin"></i></span>' +
            '<span class="o-tx"><b class="o-t sam-o"></b><b class="o-s sam-o"></b></span><i class="o-ad">' + I('adplay') + '</i></button></div>' +
            '<div id="sam-boost" class="sam-hide-modal"><button type="button" class="sam-btn c-purple b-btn" data-act="boost">' + I('bolt') + '<i class="sam-spin b-spin"></i><span class="b-tx"><b class="b-t sam-o"></b><b class="b-s sam-o"></b></span><i class="b-ad">' + I('adplay') + '</i></button>' +
            '<div class="b-chip" role="status">' + I('bolt') + '<b class="b-ct sam-o"></b></div></div>' +
            '<div id="sam-stack">' +
            '<div id="sam-hint"></div>' +
            '<div id="sam-arms" class="sam-hide-modal">' + I('arm') + '<span class="at"></span><i class="an"></i></div>' +
            '<div id="sam-grip" class="bar"><div class="fill"></div>' + I('fist', 'gi') + '<div class="row"><span class="gl" data-t="ui.grip"></span><span class="gv">0/0</span></div></div>' +
            '<div id="sam-level" class="bar"><div class="fill"></div><div class="row"><span class="ll"></span><span class="xp">0/0</span></div></div>' +
            '</div>' +
            '<div id="sam-chat" aria-live="polite"></div>';
        document.body.appendChild(root);
        document.body.insertAdjacentHTML('beforeend',
            '<div id="sam-toast" role="status"><span></span></div>' +
            '<div id="sam-banner" role="status"><div class="b-i">' + I('trophy') + '</div><div class="b-t sam-o"></div><div class="b-s sam-o"></div><div class="b-b"></div></div>' +
            '<div id="sam-floats" aria-hidden="true"></div>' +
            '<div class="sam-screen" id="sam-menu-screen">' +
            '<div class="logo">' + this._armsDeco() + (String(GAME_PLATFORM) === 'pikabu'   // Пикабу: название только по-русски
                ? '<span class="logo-line l1" data-text="МАСТЕР"><span>МАСТЕР</span></span><span class="logo-line l2" data-text="ЩУПАЛЕЦ"><span>ЩУПАЛЕЦ</span></span></div>'
                : '<span class="logo-line l1" data-text="SPIDER ARM"><span>SPIDER ARM</span></span><span class="logo-line l2" data-text="MASTER"><span>MASTER</span></span></div>') +
            '<div class="hazard"></div><div class="tag sam-o" data-t="ui.tagline"></div>' +
            '<button type="button" class="sam-btn play c-orange" data-act="play">' + I('play') + '<span data-t="ui.play"></span></button>' +
            '<div class="row2"><button type="button" class="sam-btn c-blue" data-act="howto">' + I('question') + '<span data-t="ui.howto"></span></button>' +
            '<button type="button" class="sam-btn sam-ico-btn c-purple" data-act="sound" aria-label="Sound">' + I('sound', 'snd') + '</button></div></div>' +
            '<div class="sam-screen" id="sam-pause-screen"><div class="sam-panel" role="dialog" aria-modal="true">' +
            '<div class="p-title sam-o"><span data-t="ui.paused"></span></div>' +
            '<button type="button" class="sam-btn btn-big" data-act="resume">' + I('play') + '<span data-t="ui.resume"></span></button>' +
            '<button type="button" class="sam-btn btn-big c-blue" data-act="howto">' + I('question') + '<span data-t="ui.howto"></span></button>' +
            '<button type="button" class="sam-btn btn-big c-purple" data-act="sound">' + I('sound', 'snd') + '<span class="snd-t"></span></button>' +
            '<div class="q-label sam-o" data-t="ui.quality"></div>' +
            '<div class="seg" id="sam-quality">' + ['auto', 'low', 'medium', 'high'].map((q) => '<button type="button" class="sam-btn c-gray" data-q="' + q + '"><span data-t="ui.q.' + q + '"></span></button>').join('') + '</div>' +
            '</div></div>');

        this.el = {};
        for (const id of ['area', 'wins', 'gear', 'menu', 'stack', 'hint', 'arms', 'grip', 'level', 'toast', 'chat', 'banner', 'floats', 'offer', 'boost']) this.el[id] = /** @type {HTMLElement} */ (document.getElementById('sam-' + id));
        this.el.menuScreen = /** @type {HTMLElement} */ (document.getElementById('sam-menu-screen'));
        this.el.pauseScreen = /** @type {HTMLElement} */ (document.getElementById('sam-pause-screen'));
        const stl = document.createElement('style');
        stl.id = 'sam-hud-css2';
        stl.textContent = '.c-pink{--c1:#ffb6e4;--c2:#ff5db1;--c3:#d02a85;--cd:#7d1052}#sam-menu .sam-o-l{font-family:var(--sam-font)}';
        document.head.appendChild(stl);

        // нажатия: кнопка не должна оставаться в фокусе (иначе Пробел «нажмёт» её снова)
        const act = (a) => {
            switch (a) {
                case 'play': this._call('onPlay'); break;
                case 'howto': this._call('onHowTo'); break;
                case 'sound': this._call('onSound'); break;
                case 'resume': this._call('onResume'); break;
                case 'gear': this._call('onPause'); break;
                case 'shop': this.openShop(); break;
                case 'daily': this.openDaily(); break;
                case 'wheel': this.openWheel(); break;
                case 'offer': this._offerClick(); break;
                case 'boost': this._boostClick(); break;
                case 'rebirth': if (typeof this.cb.onButton === 'function') this.cb.onButton('rebirth'); break;
                case 'teleport': if (typeof this.cb.onButton === 'function') this.cb.onButton('teleport'); else this.openTeleport(this._defaultStages()); break;
                default: break;
            }
        };
        for (const host of [root, this.el.menuScreen, this.el.pauseScreen]) {
            host.addEventListener('click', (e) => {
                const b = /** @type {HTMLElement | null} */ ((/** @type {HTMLElement} */ (e.target)).closest('button'));
                if (!b) return;
                e.stopPropagation();
                b.blur();
                if (b.dataset.q) { this._setQualityBtn(b.dataset.q); this._call('onQuality', b.dataset.q); return; }
                if (b.dataset.act) act(b.dataset.act);
            });
        }

        // раскладка: блоки фиксированного размера, не пересекаются на любом экране (HudLayout)
        if (typeof HudLayout !== 'undefined') {
            this._applyLayout(true);
            HudLayout.onChange(() => {
                this._applyLayout(); this._fitAll(); this._tutMinW();
                if (typeof GameWindows !== 'undefined' && GameWindows.isOpen()) { GameWindows.relayout(); this._call('onWindowRect', GameWindows.rect()); }
            });
            window.addEventListener('resize', () => { this._applyLayout(); if (typeof GameWindows !== 'undefined' && GameWindows.isOpen()) GameWindows.relayout(); });
        }
        this._bindTutorial();
        this._bindWindows();
        this._initAds();
        this.setArea(this._area);
        this.setLevel(1, 0, 1);
        this.setArms(2, 3);
        this.setGrip(0, 100, false);
        this.setSound(this._sound);
        this._setQualityBtn(typeof Quality !== 'undefined' ? Quality.choice : 'auto');
        this.refresh();
        return this;
    },

    /** Декор логотипа: сегментные «лапы» с клешнями за буквами. */
    _armsDeco() {
        const leg = (d, col) => '<path d="' + d + '" fill="none" stroke="#14102f" stroke-width="30" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="20" stroke-dasharray="16 5" stroke-linecap="butt"/>';
        const claw = (x, y, r) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + r + ')"><path d="M-8 4Q-30 -8 -14 -34M8 4Q30 -8 14 -34" stroke="#14102f" stroke-width="22" stroke-linecap="round" fill="none"/><path d="M-8 4Q-30 -8 -14 -34M8 4Q30 -8 14 -34" stroke="#e9f2ff" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="0" cy="6" r="13" fill="#14102f"/><circle cx="0" cy="6" r="7" fill="#9fb3d8"/></g>';
        return '<svg class="arms" viewBox="0 0 600 300" aria-hidden="true">' +
            leg('M150 215 C40 215 20 120 70 55', '#ff9d1c') + claw(70, 55, -20) +
            leg('M450 215 C560 215 580 120 530 55', '#3b9bff') + claw(530, 55, 20) +
            leg('M215 250 C130 290 60 270 30 205', '#ffd23a') + claw(30, 205, -70) +
            leg('M385 250 C470 290 540 270 570 205', '#42e8ff') + claw(570, 205, 70) +
            '</svg>';
    },

    _call(name, ...args) {
        const f = this.cb && this.cb[name];
        if (typeof f !== 'function') return undefined;
        try { return f(...args); } catch (e) { console.error('GameHud.' + name + ':', e); return undefined; }
    },

    /** Масштаб и размеры блоков под режим окна и то, что сейчас показано (чип перерождений, хватка, подсказка). */
    _applyLayout(force) {
        if (typeof HudLayout === 'undefined' || !this._inited) return;
        const vp = HudLayout.viewport();
        const mode = HudLayout.modeFor(vp.W, vp.H);
        const k = HudLayout.scaleFor(mode, vp.W, vp.H);
        const v = this._v;
        const sig = mode + '|' + k.toFixed(3) + '|' + (v.rb > 0 ? 1 : 0) + '|' + (v.gs ? 1 : 0) + '|' + (v.hint ? 1 : 0) + '|' + (this._bst.left > 0 ? 1 : 0);
        if (!force && sig === this._lsig) return;
        this._lsig = sig;
        document.documentElement.style.setProperty('--u', k.toFixed(4) + 'px');
        const T = SAM_LAYOUT[mode] || SAM_LAYOUT.wide;
        const px = (n) => Math.max(1, Math.round(n * k));
        this.el.menu.style.setProperty('--mc', String(T.menu[2]));
        this.el.menu.style.setProperty('--mr', String(T.menu[3]));
        let mw = px(T.menu[0]), mh = px(T.menu[1]);
        if (mode === 'low') { const b = Math.max(44, px(46)); mw = T.menu[2] * b + (T.menu[2] - 1) * px(7); mh = b; } else {
            const mg = px(mode === 'tall' ? 7 : 8);   // зазор сетки меню, как в CSS
            mw = Math.max(mw, T.menu[2] * SAM_MENU_BTN_MIN.w + (T.menu[2] - 1) * mg);
            mh = Math.max(mh, T.menu[3] * SAM_MENU_BTN_MIN.h + (T.menu[3] - 1) * mg);
        }
        const winsH = px(T.wins[1]) + (v.rb > 0 ? px(T.wins[3]) + px(T.wins[2]) : 0);
        const S = T.stack;
        const stackH = (v.hint ? px(S[1]) + px(S[5]) : 0) + px(S[2]) + px(S[5]) + (v.gs ? px(S[3]) + px(S[5]) : 0) + px(S[4]);
        HudLayout.block('sam-area', { dock: 'tc', w: px(T.area[0]), h: px(T.area[1]), scale: false, el: '#sam-area', order: -10 });
        HudLayout.block('sam-wins', { dock: 'tl', w: px(T.wins[0]), h: winsH, scale: false, el: '#sam-wins', order: 0 });
        HudLayout.block('sam-menu', { dock: { tall: 'ml', default: 'tl' }, w: mw, h: mh, scale: false, el: '#sam-menu', order: 1 });
        HudLayout.block('sam-gear', { dock: 'tr', w: Math.max(44, px(T.gear)), h: Math.max(44, px(T.gear)), scale: false, el: '#sam-gear', order: 0 });
        HudLayout.block('sam-stack', { dock: 'bc', w: px(S[0]), h: stackH, scale: false, el: '#sam-stack', order: 0 });
        // minW почти во всю ширину: на низком экране тост встаёт в свободное место справа от ряда кнопок, а не сжимается симметрично до 130px
        HudLayout.block('sam-toast', { dock: 'tc', w: px(T.toast[0]), h: px(T.toast[1]), minW: T.toast[0] - 20, scale: false, el: '#sam-toast', order: 5 });
        // правая колонка (середина края, между шестерёнкой и кнопкой «лезть»): предложение за рекламу и «Опыт x2» / чип бонуса
        const chip = this._bst.left > 0;
        // на узком портрете предложение шире (до +35 %): подпись «За рекламу — и снова вверх» не режется
        const ow = mode === 'tall' ? Math.round(px(T.offer[0]) * Math.max(1, Math.min(1.35, 0.5 * vp.W / px(T.offer[0])))) : px(T.offer[0]);
        HudLayout.block('sam-offer', { dock: 'mr', w: ow, h: Math.max(48, px(T.offer[1])), scale: false, el: '#sam-offer', order: 3 });
        HudLayout.block('sam-boost', { dock: 'mr', w: px((chip ? T.chip : T.boost)[0]), h: Math.max(chip ? 40 : 44, px((chip ? T.chip : T.boost)[1])), scale: false, el: '#sam-boost', order: 4 });
        HudLayout.block('sam-chat', { dock: 'bl', w: px(T.chat[0]), h: px(T.chat[1]), scale: false, el: '#sam-chat', order: 6, modes: ['wide', 'tall'], visible: () => !HudLayout.touch });
        this._fitSoon();
    },

    /** Подгон текста по ширине: слишком длинная строка не режется, а уменьшается (--fit, не меньше min, по умолчанию 0.5). */
    _fitAll() {
        if (!this._inited) return;
        const fit = (el, avail, min) => {
            if (!el) return;
            el.style.setProperty('--fit', '1');
            const w = el.scrollWidth, cw = avail || el.clientWidth;
            if (cw > 0 && w > cw + 1) el.style.setProperty('--fit', Math.max(min || 0.5, cw / w).toFixed(3));
        };
        fit(/** @type {HTMLElement} */ (this.el.area.querySelector('.a-t')));
        const sub = /** @type {HTMLElement} */ (this.el.area.querySelector('.a-s'));
        if (this._area.kind === 'stage') {
            const setSub = (txt) => { if (sub.textContent !== txt) sub.textContent = txt; };
            setSub(this._stageSub(false));
            fit(sub);
            if (parseFloat(sub.style.getPropertyValue('--fit')) < 0.88) { setSub(this._stageSub(true)); fit(sub); }
        } else fit(sub);
        fit(this.el.hint);
        fit(/** @type {HTMLElement} */ (this.el.toast.querySelector('span')), 0, 0.75);
        for (const sel of ['#sam-offer .o-t', '#sam-offer .o-s', '#sam-boost .b-t', '#sam-boost .b-s', '#sam-boost .b-ct']) {
            const e = /** @type {HTMLElement | null} */ (this.root && this.root.querySelector(sel));
            if (e && e.offsetWidth > 0) fit(e, 0, 0.6);
        }
        // подписи меню: кнопка не уже SAM_MENU_BTN_MIN, шрифт не мельче 11px (CSS) — --fit только подстраховка на длинный перевод
        for (const btn of Array.from(this.el.menu.querySelectorAll('.sam-btn'))) fit(/** @type {HTMLElement} */ (btn.querySelector('span')), /** @type {HTMLElement} */ (btn).clientWidth - 2, 0.8);
        // чип перерождений: место под текстом = ширина чипа минус значок и правый отступ
        const rt = /** @type {HTMLElement | null} */ (this.el.wins.querySelector('.w-reb .rt'));
        if (rt && rt.offsetWidth > 0) {
            const chip = /** @type {HTMLElement} */ (rt.parentElement);
            fit(rt, chip.clientWidth - rt.offsetLeft - (parseFloat(getComputedStyle(chip).paddingRight) || 0), 0.8);
        }
    },

    _fitSoon() {
        if (this._fitRaf || typeof requestAnimationFrame !== 'function') return;
        this._fitRaf = requestAnimationFrame(() => { this._fitRaf = 0; this._fitAll(); });
    },

    /** Тексты разметки (data-t) и всё, что собрано из Lang, — заново (смена языка, победы). */
    refresh() {
        if (!this._inited) return;
        Lang.apply(document.body);
        this.setArea(this._area);
        this._renderLevel();
        this._renderArms();
        this._renderReb();
        this.setSound(this._sound);
        this._renderOffer();
        this._renderBoost();
        this._syncWheelBtn();
        if (typeof GameWindows !== 'undefined') GameWindows.refresh();
        this._applyLayout(true);
        if (typeof HudLayout !== 'undefined') HudLayout.schedule();
        this._fitSoon();
    },

    // =============================================================================================
    // Экраны: титульный и пауза
    // =============================================================================================

    /** Титульный экран поверх живого лобби; HUD забега скрыт. */
    menu(on) {
        if (!this._inited) return;
        this._menuOn = !!on;
        this.el.menuScreen.classList.toggle('on', !!on);
        this.root.classList.toggle('is-menu', !!on);
        if (on) { this.closeShop(); this.pause(false); this._clearBanners(); this.hideOffer(); }
        this._syncModal();
        if (typeof HudLayout !== 'undefined') HudLayout.refresh();
    },

    /** Пауза: «Продолжить», «Как играть», звук, качество графики. */
    pause(on) {
        if (!this._inited) return;
        this._pauseOn = !!on;
        this.el.pauseScreen.classList.toggle('on', !!on);
        if (on) this._setQualityBtn(typeof Quality !== 'undefined' ? Quality.choice : this._v.q || 'auto');
        this._syncModal();
    },

    _setQualityBtn(q) {
        this._v.q = q;
        for (const b of Array.from(this.el.pauseScreen.querySelectorAll('[data-q]'))) {
            const on = /** @type {HTMLElement} */ (b).dataset.q === q;
            b.classList.toggle('sel', on);
            b.classList.toggle('c-gray', !on);
        }
    },

    setSound(on) {
        this._sound = !!on;
        if (!this._inited) return;
        for (const ic of Array.from(document.querySelectorAll('#sam-hud .snd, #sam-menu-screen .snd, #sam-pause-screen .snd'))) {
            const src = GameIcons.IMAGES[on ? 'sound' : 'mute'];
            if (ic.tagName === 'IMG' && src) { if (ic.getAttribute('src') !== src) ic.setAttribute('src', src); continue; }
            const u = ic.querySelector('use');
            if (u) u.setAttribute('href', '#sam-ic-' + (on ? 'sound' : 'mute'));
        }
        const t = this.el.pauseScreen.querySelector('.snd-t');
        if (t) t.textContent = Lang.t('ui.sound') + ': ' + Lang.t(on ? 'ui.on' : 'ui.off');
        for (const b of Array.from(document.querySelectorAll('#sam-menu-screen [data-act=sound]'))) b.classList.toggle('is-off', !on);
    },

    /** Тело страницы с классом sam-modal: баннеры и «+1» не рисуются поверх окон. */
    _syncModal() {
        const open = this._menuOn || this._pauseOn || this.isOpen();
        document.body.classList.toggle('sam-modal', open);
        // примерка: пока открыт магазин, HUD не заслоняет героя (особенно колонка кнопок в портрете)
        document.body.classList.toggle('sam-shop', typeof GameWindows !== 'undefined' && GameWindows.kind === 'shop');
    },

    // =============================================================================================
    // Зона, победы, уровень, руки, хватка
    // =============================================================================================

    /** Название на языке игры: строка или { ru, en }. */
    _txt(v) {
        if (v == null) return '';
        if (typeof v === 'object') return String(v[Lang.code] || v.en || v.ru || '');
        const s = String(v);
        return Lang.has(s) ? Lang.t(s) : s;
    },

    /** a = { kind: 'lobby' } | { kind: 'stage', n, name, need, rec } */
    setArea(a) {
        this._area = a || { kind: 'lobby' };
        if (!this._inited) return;
        const el = this.el.area, t = /** @type {HTMLElement} */ (el.querySelector('.a-t')), s = /** @type {HTMLElement} */ (el.querySelector('.a-s'));
        const stage = this._area.kind === 'stage';
        el.classList.toggle('is-stage', stage);
        t.textContent = '';
        if (stage) {
            const b = document.createElement('b');
            b.textContent = Lang.t('ui.stage', { n: this._area.n });
            t.appendChild(b);
            t.appendChild(document.createTextNode(this._txt(this._area.name)));
            s.textContent = this._stageSub(false);
        } else {
            t.textContent = Lang.t('ui.lobby');
            s.textContent = Lang.t('ui.tagline');
        }
        this._fitSoon();
    },

    /** Подпись этапа: полная или короткая («Рекоменд. ур. 1 • Хватка 90» — когда полная не лезет в блок без сжатия мельче 11px). */
    _stageSub(short) {
        const a = this._area;
        return Lang.t(short ? 'ui.stage.sub.s' : 'ui.stage.sub', { rec: a.rec, need: a.need });
    },

    _fmt(n) {
        n = Math.max(0, Math.floor(Number(n) || 0));
        if (n < 10000) return String(n);
        if (n < 1e6) return (n / 1000).toFixed(n < 1e5 ? 1 : 0).replace(/\.0$/, '') + 'K';
        return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    },

    /** Счётчик кубков. delta > 0 — прыжок числа, подпрыгивает кубок, летит «+N». */
    setWins(total, delta) {
        if (!this._inited) return;
        total = Math.max(0, Math.floor(Number(total) || 0));
        const num = /** @type {HTMLElement} */ (this.el.wins.querySelector('.w-num'));
        if (this._winsAnim) { cancelAnimationFrame(this._winsAnim); this._winsAnim = 0; }
        const from = this._winsShown;
        this._winsShown = total;
        if (delta > 0 && total > from && typeof requestAnimationFrame === 'function') {
            const t0 = performance.now(), dur = Math.min(650, 200 + (total - from) * 12);
            const step = (now) => {
                const k = Math.min(1, (now - t0) / dur);
                num.textContent = this._fmt(Math.round(from + (total - from) * (1 - Math.pow(1 - k, 3))));
                if (k < 1) this._winsAnim = requestAnimationFrame(step); else this._winsAnim = 0;
            };
            this._winsAnim = requestAnimationFrame(step);
        } else num.textContent = this._fmt(total);
        if (delta > 0) {
            const w = this.el.wins;
            w.classList.remove('bump');
            void w.offsetWidth;
            w.classList.add('bump');
            const ic = /** @type {HTMLElement} */ (w.querySelector('.w-ico')).getBoundingClientRect();
            const cx = ic.left + ic.width * 0.5;
            this.float(typeof ViewCap !== 'undefined' ? ViewCap.x(cx) : cx, ic.top + ic.height * 0.9, '+' + this._fmt(delta), '#ffd84a');   // слой «+N» — в координатах поля (ViewCap), а rect — окна
        }
    },

    /** Полоса уровня: «Уровень 2   34/76». Смена уровня — заливка прыгает к новому значению со вспышкой. */
    setLevel(level, xp, need) {
        const v = this._v;
        level = Math.max(1, Math.floor(level) || 1); need = Math.max(1, Math.floor(need) || 1); xp = Math.max(0, Math.min(need, Math.floor(xp) || 0));
        if (v.lv === level && v.xp === xp && v.nd === need) return;
        const levelUp = v.lv !== undefined && level > v.lv;
        v.lv = level; v.xp = xp; v.nd = need;
        if (!this._inited) return;
        this._renderLevel(levelUp);
    },

    _renderLevel(jump) {
        const v = this._v;
        if (v.lv === undefined) return;
        const bar = this.el.level, fill = /** @type {HTMLElement} */ (bar.querySelector('.fill'));
        /** @type {HTMLElement} */ (bar.querySelector('.ll')).textContent = Lang.t('ui.level', { n: v.lv });
        /** @type {HTMLElement} */ (bar.querySelector('.xp')).textContent = this._fmt(v.xp) + '/' + this._fmt(v.nd);
        const w = (100 * v.xp / v.nd).toFixed(1) + '%';
        if (jump) {
            fill.style.transition = 'none';
            fill.style.width = w;
            void fill.offsetWidth;
            fill.style.transition = '';
            bar.classList.remove('flash');
            void bar.offsetWidth;
            bar.classList.add('flash');
        } else fill.style.width = w;
    },

    /** «2 РУКИ · +1 НА УР. 3»; nextLevel 0 — максимум. */
    setArms(arms, nextLevel) {
        const v = this._v;
        arms = Math.max(0, Math.floor(arms) || 0); nextLevel = Math.max(0, Math.floor(nextLevel) || 0);
        if (v.arms === arms && v.nl === nextLevel) return;
        v.arms = arms; v.nl = nextLevel;
        if (this._inited) this._renderArms();
    },

    _plural(n) {
        if (Lang.code === 'ru') {
            const a = n % 10, b = n % 100;
            return a === 1 && b !== 11 ? 'one' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'few' : 'many';
        }
        return n === 1 ? 'one' : 'many';
    },

    _renderArms() {
        const v = this._v;
        if (v.arms === undefined) return;
        /** @type {HTMLElement} */ (this.el.arms.querySelector('.at')).textContent = v.arms + ' ' + Lang.t('ui.arms.' + this._plural(v.arms));
        /** @type {HTMLElement} */ (this.el.arms.querySelector('.an')).textContent = v.nl ? Lang.t('ui.arms.next', { n: v.nl }) : Lang.t('ui.arms.max');
    },

    /** Полоса хватки; show = false — скрыть с затуханием; меньше 25 % — красная и пульсирует. */
    setGrip(value, max, show) {
        if (!this._inited) return;
        const v = this._v, g = this.el.grip;
        max = Math.max(1, Math.round(max) || 1);
        value = Math.max(0, Math.min(max, value || 0));
        const pct = Math.round(1000 * value / max) / 10;
        const txt = Math.ceil(value - 1e-6) + '/' + max;
        if (v.gp !== pct) { v.gp = pct; /** @type {HTMLElement} */ (g.querySelector('.fill')).style.width = pct + '%'; }
        if (v.gt !== txt) { v.gt = txt; /** @type {HTMLElement} */ (g.querySelector('.gv')).textContent = txt; }
        const low = pct < 25;
        if (v.gl !== low) { v.gl = low; g.classList.toggle('low', low); }
        const sh = !!show;
        if (v.gs === sh) return;
        v.gs = sh;
        clearTimeout(v.gTimer);
        if (sh) { g.classList.remove('out'); g.classList.add('on'); } else {
            g.classList.add('out');
            v.gTimer = setTimeout(() => { if (!this._v.gs) g.classList.remove('on', 'out'); }, 220);
        }
        this._applyLayout();
    },

    /** Перерождения: значок + «1 · Опыт x1.5» (полный текст — в title и aria-label; скрыто, пока их нет). */
    setRebirths(n, mult) {
        n = Math.max(0, Math.floor(n) || 0);
        this._v.rb = n; this._v.rm = mult;
        if (this._inited) this._renderReb();
    },

    _renderReb() {
        const n = this._v.rb || 0;
        const chip = /** @type {HTMLElement} */ (this.el.wins.querySelector('.w-reb'));
        this.el.wins.classList.toggle('has-reb', n > 0);
        const m = String(Math.round((this._v.rm || 1) * 100) / 100);
        /** @type {HTMLElement} */ (chip.querySelector('.rt')).textContent = n > 0 ? Lang.t('ui.rebirths.s', { n, m }) : '';
        const full = n > 0 ? Lang.t('ui.rebirths', { n, m }) : '';
        chip.title = full;
        if (full) chip.setAttribute('aria-label', full); else chip.removeAttribute('aria-label');
        this._applyLayout();
    },

    // =============================================================================================
    // Баннеры, повышение уровня, плавающие числа
    // =============================================================================================

    _clearBanners() {
        this._bq.length = 0;
        clearTimeout(this._bTimer);
        this._bBusy = false;
        if (this.el.banner) this.el.banner.classList.remove('on', 'play');
        document.body.classList.remove('sam-ban');
    },

    /** Большой баннер по центру; kind: 'stage' | 'win' | 'outgrip' | 'info'. Очередь; «хватка кончилась» вне очереди. */
    banner(title, sub, kind) {
        if (!this._inited) return;
        const k = kind || 'info';
        const it = { kind: k, title: title || '', sub: sub || '', ms: 1800 };
        if (k === 'outgrip') {
            if (!it.title) it.title = Lang.t('ui.ban.outgrip');
            if (!it.sub) it.sub = Lang.t('ui.ban.outgrip.s');
            this._bq = this._bq.filter((q) => q.kind !== 'outgrip');
            clearTimeout(this._bTimer);
            this._bBusy = false;
            this._bq.unshift(it);
        } else {
            if (k === 'win' && !it.title) it.title = Lang.t('ui.ban.win');
            if (this._bq.some((q) => q.kind === k && q.title === it.title && q.sub === it.sub)) return;
            if (this._bq.length >= 4) this._bq.shift();
            this._bq.push(it);
        }
        this._pump();
    },

    /** Повышение уровня: «Уровень 1 > 2 · Руки 2 > 3 · Хватка 100 > 110 · +1 РУКА!». */
    levelUp(o) {
        if (!this._inited || !o) return;
        const it = {
            kind: 'levelup', ms: 2600,
            title: Lang.t('ui.lu.level', { a: o.from, b: o.to }),
            sub: Lang.t('ui.lu.arms', { a: o.armsFrom, b: o.armsTo }) + ' · ' + Lang.t('ui.lu.grip', { a: Math.round(o.gripFrom), b: Math.round(o.gripTo) }),
            badge: o.armsTo > o.armsFrom ? Lang.t('ui.lu.arm') : '',
        };
        this._bq = this._bq.filter((q) => q.kind !== 'levelup');
        this._bq.unshift(it);
        if (this._bBusy && this._bCur && this._bCur.kind !== 'outgrip') { clearTimeout(this._bTimer); this._bBusy = false; }
        this._pump();
    },

    _bCur: /** @type {any} */ (null),

    _pump() {
        if (this._bBusy || !this._bq.length || document.body.classList.contains('sam-menu-lock')) return;
        const it = this._bq.shift();
        this._bBusy = true;
        this._bCur = it;
        const b = this.el.banner;
        const set = (sel, text) => { const n = /** @type {HTMLElement} */ (b.querySelector(sel)); n.textContent = text || ''; n.style.display = text ? '' : 'none'; };
        b.className = 'k-' + it.kind;
        set('.b-t', it.title); set('.b-s', it.sub); set('.b-b', it.badge);
        b.style.setProperty('--ms', it.ms + 'ms');
        void b.offsetWidth;
        b.classList.add('on', 'play');
        document.body.classList.add('sam-ban');   // на низком альбоме карточка обучения под баннером приглушается
        this._bTimer = setTimeout(() => {
            b.classList.remove('on', 'play');
            if (!this._bq.length) document.body.classList.remove('sam-ban');
            this._bBusy = false;
            this._bCur = null;
            this._bTimer = setTimeout(() => this._pump(), 90);
        }, it.ms);
    },

    /** Плавающий текст в точке холста (CSS px): пул до 40 узлов, анимация только transform и opacity. */
    float(x, y, text, color) {
        if (!this._inited) return;
        let slot;
        if (this._fp.length < 40) {
            const el = document.createElement('span');
            el.className = 'sam-fl';
            this.el.floats.appendChild(el);
            slot = { el, anim: null };
            this._fp.push(slot);
            this._fi = this._fp.length - 1;
        } else {
            this._fi = (this._fi + 1) % this._fp.length;
            slot = this._fp[this._fi];
        }
        const el = slot.el;
        if (el.textContent !== String(text)) el.textContent = String(text);
        const c = color || '#fff';
        if (el.style.color !== c) el.style.color = c;
        if (slot.anim) slot.anim.cancel();
        const tr = (dx, dy, s) => 'translate3d(' + Math.round(x + dx) + 'px,' + Math.round(y + dy) + 'px,0) translate(-50%,-50%) scale(' + s + ')';
        if (typeof el.animate === 'function') {
            slot.anim = el.animate([
                { transform: tr(0, 6, 0.4), opacity: 0 },
                { transform: tr(0, -8, 1.25), opacity: 1, offset: 0.16 },
                { transform: tr(0, -26, 1), opacity: 1, offset: 0.3 },
                { transform: tr(0, -62, 1), opacity: 1, offset: 0.72 },
                { transform: tr(0, -84, 0.9), opacity: 0 },
            ], { duration: 950, easing: 'ease-out', fill: 'both' });
        } else {
            el.style.transform = tr(0, -30, 1); el.style.opacity = '1';
            setTimeout(() => { el.style.opacity = '0'; }, 700);
        }
    },

    // =============================================================================================
    // Подсказка, тост, чат
    // =============================================================================================

    /** Подсказка над стопкой. «[Пробел]» в тексте рисуется клавишей. null — убрать. */
    hint(text) {
        if (!this._inited) return;
        if (this._v.hint === text) return;
        this._v.hint = text;
        const h = this.el.hint;
        if (!text) { h.classList.remove('on'); h.textContent = ''; this._applyLayout(); return; }
        h.textContent = '';
        String(text).split(/(\[[^\]]+\])/).forEach((part) => {
            if (!part) return;
            const m = /^\[([^\]]+)\]$/.exec(part);
            if (m) { const k = document.createElement('kbd'); k.textContent = m[1]; h.appendChild(k); } else h.appendChild(document.createTextNode(part));
        });
        h.classList.remove('on');
        void h.offsetWidth;
        h.classList.add('on');
        this._applyLayout();
        this._fitSoon();
    },

    toast(text, ms) {
        if (!this._inited) return;
        const t = this.el.toast;
        /** @type {HTMLElement} */ (t.querySelector('span')).textContent = text;
        t.classList.add('show');
        const dur = ms || 2200;
        clearTimeout(this._toastT);
        this._toastT = setTimeout(() => { t.classList.remove('show'); if (typeof HudLayout !== 'undefined') HudLayout.schedule(); }, dur);
        if (typeof HudLayout !== 'undefined') HudLayout.schedule();
        this._fitSoon();
    },

    /** Строка чата: имя цветом и текст; имя '' — системная строка. Видны последние 5, старые гаснут сами. */
    chat(name, text, color) {
        if (!this._inited) return;
        const c = this.el.chat;
        const row = document.createElement('div');
        row.className = 'cr';
        if (name) { const b = document.createElement('b'); b.style.color = color || '#ffd23a'; b.textContent = name + ':'; row.appendChild(b); }
        const s = document.createElement('span');
        s.textContent = text;
        if (!name) s.style.color = color || '#b9c6de';
        row.appendChild(s);
        row.addEventListener('animationend', () => { row.remove(); if (typeof HudLayout !== 'undefined') HudLayout.schedule(); });
        c.appendChild(row);
        while (c.children.length > 5) c.removeChild(/** @type {Node} */ (c.firstChild));
        if (typeof HudLayout !== 'undefined' && c.children.length === 1) HudLayout.schedule();
    },

    setDailyBadge(on) {
        if (!this._inited) return;
        const b = this.el.menu.querySelector('[data-act=daily]');
        if (b) b.classList.toggle('has-dot', !!on);
        this._v.badge = !!on;
        if (typeof GameWindows !== 'undefined') GameWindows.badge(!!on);
    },

    // =============================================================================================
    // Колесо, предложения за рекламу, «Опыт x2»
    // =============================================================================================

    /** Открыть колесо фортуны (окно GameWindows.wheel). false — колеса нет (Wheel не подключён) или другое окно мешает. */
    openWheel() {
        if (typeof GameWindows === 'undefined' || typeof Wheel === 'undefined' || !Wheel._sectors || Wheel._sectors.length < 2) return false;
        GameWindows.wheel();
        return GameWindows.kind === 'wheel';
    },

    /** Красная точка на кнопке «Колесо» (бесплатное вращение готово). */
    setWheelBadge(on) {
        this._v.wbadge = !!on;
        if (!this._inited) return;
        this._syncWheelBtn();
        const b = this.el.menu.querySelector('[data-act=wheel]');
        if (b) b.classList.toggle('has-dot', !!on);
    },

    /** Кнопка «Колесо» есть, только если колесо подключено (Wheel.init с секторами). */
    _syncWheelBtn() {
        const b = /** @type {HTMLElement | null} */ (this.el.menu && this.el.menu.querySelector('[data-act=wheel]'));
        if (!b) return;
        const has = typeof Wheel !== 'undefined' && !!Wheel._sectors && Wheel._sectors.length >= 2;
        if (b.hidden === !has) return;
        b.hidden = !has;
        if (typeof HudLayout !== 'undefined') HudLayout.schedule();
    },

    /** Подписки на паузу между rewarded («Через N с» на кнопках HUD) и разовая сборка состояния кнопок. */
    _initAds() {
        if (typeof Platform !== 'undefined' && typeof Platform.onRewardedCooldown === 'function') Platform.onRewardedCooldown(() => { this._renderOffer(); this._renderBoost(); });
        this._syncWheelBtn();
        this.setWheelBadge(!!this._v.wbadge);
        this._renderBoost();
    },

    /** Платформа умеет rewarded: без этого кнопки «за рекламу» в HUD не рисуются. */
    _rewardedOk() { return typeof Platform !== 'undefined' && typeof Platform.rewardedSupported === 'function' && !!Platform.rewardedSupported(); },

    /** Секунд до конца общей паузы между rewarded (0 — можно). */
    _adWait() { return typeof Platform !== 'undefined' && typeof Platform.rewardedCooldownLeft === 'function' ? Platform.rewardedCooldownLeft() : 0; },

    /**
     * Временное предложение «за рекламу»: крупная кнопка справа (середина края — не под джойстиком, не над героем и не на кнопке «лезть»)
     * с кольцом обратного отсчёта на ms. Нажатие -> спиннер, await o.onAccept() (игра показывает rewarded и выдаёт награду); true — кнопка
     * исчезает, false — остаётся (пока идёт время) с подсказкой. Повторный offer с тем же id пока он виден — ничего не меняет.
     * Площадка без rewarded: ничего не рисуется, возвращает false.
     * @param {{ id?: string, icon?: string, title?: any, sub?: any, ms?: number, onAccept?: () => any }} o
     */
    offer(o) {
        if (!this._inited || !o) return false;
        if (!this._rewardedOk() || typeof o.onAccept !== 'function') { this.hideOffer(); return false; }
        const id = String(o.id || 'offer');
        if (this._offer && this._offer.id === id) return true;
        const ms = Math.max(1500, Number(o.ms) || 12000);
        this._offer = { id, icon: o.icon === 'bolt' || o.icon === 'fist' ? o.icon : 'trophy', title: o.title, sub: o.sub, ms, left: ms, onAccept: o.onAccept, busy: false, shown: -1 };
        this._renderOffer();
        this.el.offer.classList.add('on');
        const btn = /** @type {HTMLElement} */ (this.el.offer.querySelector('.o-btn'));
        btn.style.animation = 'none'; void btn.offsetWidth; btn.style.animation = '';   // анимация появления — заново
        if (typeof HudLayout !== 'undefined') { this._applyLayout(true); HudLayout.schedule(); }
        this._fitSoon();
        this._offerT = 0;
        if (typeof requestAnimationFrame === 'function' && !this._offerRaf) this._offerRaf = requestAnimationFrame((t) => this._offerStep(t));
        return true;
    },

    /** Убрать предложение (id — только если показано именно оно; без id — любое). */
    hideOffer(id) {
        const o = this._offer;
        if (!o || (id && o.id !== id)) return;
        this._offer = null;
        if (this._offerRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._offerRaf);
        this._offerRaf = 0;
        if (this.el.offer) this.el.offer.classList.remove('on');
        if (typeof HudLayout !== 'undefined') HudLayout.schedule();
    },

    /** Кадр обратного отсчёта: время не идёт, пока открыто окно / пауза / меню, вкладка скрыта или смотрится сама реклама. */
    _offerStep(now) {
        this._offerRaf = 0;
        const o = this._offer;
        if (!o) return;
        const dt = this._offerT ? Math.min(250, now - this._offerT) : 0;
        this._offerT = now;
        if (!o.busy && !this.overlayOpen() && !(typeof document !== 'undefined' && document.hidden)) o.left -= dt;
        if (o.left <= 0) { this.hideOffer(); return; }
        const q = Math.round(1000 * o.left / o.ms);
        if (q !== o.shown) {
            o.shown = q;
            const rf = /** @type {SVGElement | null} */ (this.el.offer.querySelector('.rf'));
            if (rf) rf.style.strokeDashoffset = String(131.9 * (1 - o.left / o.ms));
        }
        this._offerRaf = requestAnimationFrame((t) => this._offerStep(t));
    },

    /** Тексты и состояние кнопки предложения (язык, пауза между rewarded, спиннер). */
    _renderOffer() {
        const o = this._offer;
        if (!o || !this.el.offer) return;
        const btn = /** @type {HTMLElement} */ (this.el.offer.querySelector('.o-btn'));
        const wait = this._adWait();
        const title = this._txt(o.title), sub = wait > 0 ? Lang.t('ui.ads.wait', { n: wait }) : (o.sub ? this._txt(o.sub) : Lang.t('ui.offer.sub'));
        const set = (sel, t) => { const n = /** @type {HTMLElement} */ (this.el.offer.querySelector(sel)); if (n.textContent !== t) n.textContent = t; };
        set('.o-t', title); set('.o-s', sub);
        const ic = /** @type {HTMLElement} */ (this.el.offer.querySelector('.o-ic'));
        if (ic.dataset.icon !== o.icon) { ic.dataset.icon = o.icon; ic.innerHTML = GameIcons.html(o.icon); }
        btn.classList.toggle('busy', !!o.busy);
        btn.classList.toggle('wait', wait > 0);
        btn.setAttribute('aria-label', title + '. ' + sub);
        this._fitSoon();
    },

    async _offerClick() {
        const o = this._offer;
        if (!o || o.busy) return;
        const wait = this._adWait();
        if (wait > 0) { this.toast(Lang.t('ui.ads.wait', { n: wait }), 1400); return; }
        o.busy = true;
        this._renderOffer();
        let ok = false;
        try { ok = !!(await o.onAccept()); } catch (e) { ok = false; }
        if (this._offer !== o) return;   // за время ролика предложение убрали или заменили
        o.busy = false;
        if (ok) { this.hideOffer(o.id); return; }
        this._renderOffer();
        this.toast(Lang.t('ui.ads.failed'), 2000);
    },

    /** Секунд до конца бонуса опыта: > 0 — чип «x2 опыт 2:31» вместо кнопки; 0 — чип убран, кнопка «Опыт x2 · 3 мин» снова на месте. */
    setBoost(seconds) {
        const left = Math.max(0, Number(seconds) || 0);
        const was = this._bst.left > 0;
        this._bst.left = left;
        if (!this._inited) return;
        const shown = Math.ceil(left);
        if (shown === this._bst.shown && was === left > 0) return;
        this._bst.shown = shown;
        this._renderBoost();
        if (was !== left > 0) { this._applyLayout(true); if (typeof HudLayout !== 'undefined') HudLayout.schedule(); }
    },

    /** Подпись кнопки: множитель и минуты (по умолчанию x2 и 3 мин). */
    setBoostInfo(info) {
        const i = info || {};
        if (i.mult > 0) this._bst.mult = Number(i.mult);
        if (i.minutes > 0) this._bst.minutes = Number(i.minutes);
        if (this._inited) this._renderBoost();
    },

    /** Игра разрешает (true) или прячет (false, например в туториале) кнопку «Опыт x2»; чип активного бонуса виден всегда. */
    setBoostEnabled(on) {
        this._bst.enabled = !!on;
        if (this._inited) this._renderBoost();
    },

    _renderBoost() {
        const el = this.el.boost;
        if (!el) return;
        const b = this._bst;
        const active = b.left > 0;
        const showBtn = !active && b.enabled && this._rewardedOk();
        const wasOn = el.classList.contains('on'), wasChip = el.classList.contains('is-chip');
        el.classList.toggle('on', active || showBtn);
        el.classList.toggle('is-chip', active);
        const set = (sel, t) => { const n = /** @type {HTMLElement} */ (el.querySelector(sel)); if (n.textContent !== t) n.textContent = t; };
        if (active) {
            const sec = Math.ceil(b.left), t = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
            const txt = Lang.t('ui.boost.chip', { m: b.mult, t });
            set('.b-ct', txt);
            el.setAttribute('aria-label', txt);
        } else {
            const wait = this._adWait();
            const btn = /** @type {HTMLElement} */ (el.querySelector('.b-btn'));
            set('.b-t', Lang.t('ui.boost.btn', { m: b.mult }));
            set('.b-s', wait > 0 ? Lang.t('ui.ads.wait', { n: wait }) : Lang.t('ui.boost.sub', { n: b.minutes }));
            btn.classList.toggle('busy', b.busy);
            btn.classList.toggle('wait', wait > 0);
            btn.setAttribute('aria-label', Lang.t('ui.boost.aria', { m: b.mult, n: b.minutes }));
            el.removeAttribute('aria-label');
        }
        if (wasOn !== el.classList.contains('on') || wasChip !== el.classList.contains('is-chip')) {
            if (typeof HudLayout !== 'undefined') { this._applyLayout(true); HudLayout.schedule(); }
        }
        this._fitSoon();
    },

    async _boostClick() {
        const b = this._bst;
        if (b.busy || b.left > 0) return;
        const wait = this._adWait();
        if (wait > 0) { this.toast(Lang.t('ui.ads.wait', { n: wait }), 1400); return; }
        b.busy = true;
        this._renderBoost();
        let ok = false;
        try { ok = !!(await this._call('onBoost')); } catch (e) { ok = false; }
        b.busy = false;
        this._renderBoost();
        if (!ok && !(b.left > 0)) this.toast(Lang.t('ui.ads.failed'), 2000);
    },

    // =============================================================================================
    // Окна (GameHudShop.js)
    // =============================================================================================

    /** Любое модальное окно (магазин, подарок, перерождение, телепорт) открыто. */
    isOpen() { return typeof GameWindows !== 'undefined' && GameWindows.isOpen(); },
    /** Меню, пауза или окно — что-то закрывает игру. */
    overlayOpen() { return this._menuOn || this._pauseOn || this.isOpen(); },

    /** Открытое окно в px поля игры: { x, y, w, h, vw, vh, free: { x, y, w, h }, kind } или null (камера магазина ставит героя в центр free). */
    windowRect() { return typeof GameWindows !== 'undefined' ? GameWindows.rect() : null; },

    openShop(tab) { if (typeof GameWindows !== 'undefined') GameWindows.shop(tab); },
    /** Закрывает открытое окно любого вида (магазин, подарок, перерождение, телепорт). */
    closeShop() { if (typeof GameWindows !== 'undefined') GameWindows.close(); },
    closeWindow() { this.closeShop(); },
    openRebirth(info) { if (typeof GameWindows !== 'undefined') GameWindows.rebirth(info); },
    openDaily() { if (typeof GameWindows !== 'undefined') GameWindows.daily(); },
    openTeleport(list) { if (typeof GameWindows !== 'undefined') GameWindows.teleport(list); },

    /** Список этапов из GameData, когда игра не прислала свой (все открыты). */
    _defaultStages() {
        return typeof STAGES !== 'undefined' ? STAGES.map((s) => ({ n: s.id, name: s.name, unlocked: true })) : [];
    },

    _bindWindows() {
        if (typeof GameWindows === 'undefined') return;
        GameWindows.attach(this);
    },

    // =============================================================================================
    // Туториал: «ШАГ n ИЗ m» в карточке движка
    // =============================================================================================

    /**
     * Ширина карточки обучения: на низком экране минимум 300u — карточка занимает свободное место справа от ряда кнопок,
     * а не узкую симметричную полосу в 3 строки (на ~670px) поверх головы героя. В других режимах — как в движке (260).
     */
    _tutMinW() {
        const tb = typeof HudLayout !== 'undefined' && HudLayout._defs ? HudLayout._defs.tutorial : null;
        if (!tb) return;
        const want = HudLayout.mode === 'low' ? 300 : 260;
        if (tb.minW !== want) HudLayout.block('tutorial', { minW: want });
    },

    _bindTutorial() {
        window.addEventListener('lory-tutorial', (e) => {
            const d = /** @type {any} */ (e).detail || {};
            if (d.type !== 'step') return;
            const main = document.querySelector('.lory-tut-card .lory-tut-main');
            if (!main) return;
            this._tutMinW();
            let lab = /** @type {HTMLElement | null} */ (main.querySelector('.lory-tut-step'));
            if (!lab) {
                lab = document.createElement('span');
                lab.className = 'lory-tut-step';
                main.insertBefore(lab, main.firstChild);
            }
            const total = typeof Tutorial !== 'undefined' ? Tutorial.steps.length : 0;
            lab.textContent = Lang.t('ui.tut.step', { n: d.index + 1, m: total });
        });
    },
};

Object.assign(LANG_STRINGS.ru, { 'ui.tut.step': 'Шаг {n} из {m}' });
Object.assign(LANG_STRINGS.en, { 'ui.tut.step': 'Step {n} of {m}' });
