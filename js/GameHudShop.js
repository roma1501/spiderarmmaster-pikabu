// GameHudShop.js — модальные окна Spider Arm Master: магазин (6 вкладок: руки, скины, шапки, следы, ядра, победные эффекты; за победы и
// за рекламу), подарок дня (x2 за рекламу), колесо фортуны, перерождение, телепорт.
// Глобал GameWindows; рисует только интерфейс: логика — Shop.js, DailyGift.js и Wheel.js (карточки Shop.cards, покупка Shop.buy,
// просмотр рекламы Shop.watchAd, подарок DailyGift.view / claim / claimX2, колесо Wheel.status / spinFree / spinAd / finish), игра
// получает колбэки GameHud (onBuy, onEquip, onPreview, onDaily, onWheel, onRebirth, onTeleport, onLobby).
// Магазин не закрывает героя (примерка): на широком экране и в альбоме — панель у правого края (≤46% ширины), в портрете — нижний
// лист (≤58% высоты); игра ставит героя в центр свободной части по GameWindows.rect() (GameHud.windowRect()).
// Кнопки «За рекламу» показываются, пока Platform.rewardedSupported(): без поддержки площадки карточка остаётся, но неактивна
// («Реклама недоступна»). Локально реклама есть только с ?mockads в адресе.
//
//   GameWindows.shop(tab?) · daily() · wheel() · rebirth(info) · teleport(list) · close() · isOpen() · refresh() · rect()
//   onShopOpen(isOpen, kind) вызывается для КАЖДОГО окна (kind: 'shop' | 'daily' | 'wheel' | 'rebirth' | 'teleport'): игра ставит паузу
//   всегда, а камеру на героя приближает только при kind === 'shop'.
//   Магазин: вкладки берутся из Shop.tabs() (сколько есть, столько и рисуется); реклама за предмет — await Shop.watchAd(id): засчитан
//   последний просмотр -> cb.onBuy(id) (+ cb.onEquip(id), если предмет надет автоматически). Колесо: cb.onWheel(result), result —
//   ответ Wheel.finish() ({ kind, sector, prize, label, got: [{ type: 'coins', amount } | { type: 'item', id }] }).

const GAME_WIN_LANG = {
    ru: {
        'ui.shop.title': 'Магазин', 'ui.shop.hint': 'Нажми на предмет, чтобы примерить его на герое', 'ui.shop.empty': 'Здесь пока пусто',
        'ui.shop.exclusive': 'Подарок дня', 'ui.shop.new': 'Куплено!',
        'ui.daily.title': 'Подарок дня', 'ui.daily.sub': 'Заходи каждый день: награды растут, а на 7-й день ждёт эксклюзив!',
        'ui.daily.got': 'Ты получил', 'ui.daily.ok': 'Отлично!', 'ui.daily.done': 'Получено', 'ui.daily.day7': 'Эксклюзив',
        'ui.rb.title': 'Перерождение', 'ui.rb.now': 'Сейчас', 'ui.rb.after': 'После', 'ui.rb.xpv': 'Опыт x{n}', 'ui.rb.lvv': 'Ур. {n}',
        'ui.rb.warn': 'Перерождение сбросит твой уровень!', 'ui.rb.progress': 'Уровень {a}/{b}', 'ui.rb.go': 'Переродиться',
        'ui.rb.need': 'Нужен {n} уровень', 'ui.rb.count': 'Перерождений: {n}',
        'ui.tp.title': 'Телепорт', 'ui.tp.lobby': 'В лобби', 'ui.tp.locked': 'Закрыто', 'ui.tp.need': 'Сначала пройди этап {n}', 'ui.tp.stage': 'Этап {n}',
        'ui.ads.off': 'Реклама недоступна', 'ui.ads.busy': 'Загрузка…', 'ui.ads.failed': 'Реклама не сработала. Прогресс сохранён', 'ui.ads.wait': 'Через {n} с',
        'ui.shop.ad': 'За рекламу', 'ui.shop.opened': 'Открыто: {name}', 'ui.shop.step': '{name}: {a}/{b}', 'ui.shop.rewardsOff': 'Реклама сейчас недоступна',
        'ui.wheel.title': 'Колесо фортуны', 'ui.wheel.free': 'Крутить бесплатно', 'ui.wheel.freeIn': 'Бесплатно через {t}', 'ui.wheel.ad': 'Крутить за рекламу',
        'ui.wheel.left': 'Осталось: {a}', 'ui.wheel.tomorrow': 'Приходи завтра', 'ui.wheel.spinning': 'Крутится…', 'ui.wheel.win': 'Выигрыш!',
        'ui.wheel.sub': 'Одно бесплатное вращение в день и ещё несколько за рекламу', 'ui.wheel.coins': '+{n}',
    },
    en: {
        'ui.shop.title': 'Shop', 'ui.shop.hint': 'Tap an item to try it on your hero', 'ui.shop.empty': 'Nothing here yet',
        'ui.shop.exclusive': 'Daily Gift', 'ui.shop.new': 'Purchased!',
        'ui.daily.title': 'Daily Gift', 'ui.daily.sub': 'Come back every day: rewards grow, and day 7 brings an exclusive!',
        'ui.daily.got': 'You got', 'ui.daily.ok': 'Awesome!', 'ui.daily.done': 'Claimed', 'ui.daily.day7': 'Exclusive',
        'ui.rb.title': 'Rebirth', 'ui.rb.now': 'Now', 'ui.rb.after': 'After', 'ui.rb.xpv': 'XP x{n}', 'ui.rb.lvv': 'Lv. {n}',
        'ui.rb.warn': 'Rebirth resets your level!', 'ui.rb.progress': 'Level {a}/{b}', 'ui.rb.go': 'Rebirth',
        'ui.rb.need': 'Reach level {n}', 'ui.rb.count': 'Rebirths: {n}',
        'ui.tp.title': 'Teleport', 'ui.tp.lobby': 'To the lobby', 'ui.tp.locked': 'Locked', 'ui.tp.need': 'Beat stage {n} first', 'ui.tp.stage': 'Stage {n}',
        'ui.ads.off': 'Ads unavailable', 'ui.ads.busy': 'Loading…', 'ui.ads.failed': 'Ad did not play. Progress is saved', 'ui.ads.wait': 'In {n} s',
        'ui.shop.ad': 'Watch ad', 'ui.shop.opened': 'Unlocked: {name}', 'ui.shop.step': '{name}: {a}/{b}', 'ui.shop.rewardsOff': 'No ads right now',
        'ui.wheel.title': 'Wheel of Fortune', 'ui.wheel.free': 'Spin for free', 'ui.wheel.freeIn': 'Free in {t}', 'ui.wheel.ad': 'Watch ad to spin',
        'ui.wheel.left': '{a} left', 'ui.wheel.tomorrow': 'Come back tomorrow', 'ui.wheel.spinning': 'Spinning…', 'ui.wheel.win': 'You won!',
        'ui.wheel.sub': 'One free spin a day, plus a few more for watching an ad', 'ui.wheel.coins': '+{n}',
    },
};
for (const code of Object.keys(GAME_WIN_LANG)) Object.assign(LANG_STRINGS[code], GAME_WIN_LANG[code]);

const GAME_WIN_CSS = `
.sam-wl{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));font-family:var(--sam-font);font-weight:900;color:#fff;background:rgba(8,6,34,.55);animation:sam-fadein .16s ease-out;-webkit-user-select:none;user-select:none}
.sam-wl.closing{animation:sam-fadeout .14s ease-in forwards;pointer-events:none}
.sam-wl.k-shop{justify-content:flex-end;padding-right:max(calc(var(--vcap-w,100vw)*.03),env(safe-area-inset-right));background:linear-gradient(90deg,rgba(8,6,34,0) 0,rgba(8,6,34,0) 40%,rgba(8,6,34,.62) 100%)}
.sam-win{--h1:#ffc24a;--h2:#ff8a1c;--hd:#a24c06;position:relative;box-sizing:border-box;display:flex;flex-direction:column;width:min(96vw,${samU(580)});max-height:min(94vh,${samU(640)});border-radius:${samU(24)};border:${samU(4.5)} solid var(--sam-ink);background:linear-gradient(#2b2478,#1b1655);box-shadow:0 0 0 ${samU(3)} rgba(255,255,255,.92),0 ${samU(10)} 0 rgba(0,0,0,.42),0 ${samU(22)} ${samU(44)} rgba(0,0,0,.55);animation:sam-winpop .26s cubic-bezier(.2,1.3,.4,1);overflow:hidden}
.sam-win.w-shop{width:min(calc(var(--vcap-w,100vw)*.46),${samU(620)});height:min(86vh,${samU(580)})}
.sam-win.w-rebirth{width:min(96vw,${samU(500)})}
.sam-win.w-teleport{width:min(96vw,${samU(600)})}
.sam-win.w-wheel{width:min(96vw,${samU(740)});height:min(94vh,${samU(560)})}
.win-head{position:relative;flex:none;display:flex;align-items:center;gap:${samU(10)};padding:${samU(8)} ${samU(10)} ${samU(8)} ${samU(18)};border-bottom:${samU(4.5)} solid var(--sam-ink);background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.3) 0 ${samU(3)},rgba(0,0,0,.14) ${samU(3.5)} ${samU(5)},transparent ${samU(5.5)}) 0 0/${samU(26)} ${samU(26)},linear-gradient(var(--h1),var(--h2))}
.win-head .wt{flex:1;min-width:0;font-size:calc(30*var(--u)*var(--fit,1));text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-text-stroke:${samU(6)} var(--sam-ink)}
.win-bal{display:inline-flex;align-items:center;gap:${samU(6)};height:${samU(38)};padding:0 ${samU(14)} 0 ${samU(6)};border-radius:${samU(19)};background:rgba(20,16,60,.88);border:${samU(3)} solid var(--sam-ink);font-size:${samU(22)};-webkit-text-stroke:${samU(4)} var(--sam-ink)}
.win-bal .sam-ic{font-size:${samU(30)}}
.win-bal.bump{animation:sam-bump .4s cubic-bezier(.3,1.6,.5,1)}
.win-x{flex:none;width:max(44px,${samU(44)});height:max(44px,${samU(44)});min-height:0;padding:0;border-radius:${samU(13)}}
.win-x .sam-ic{font-size:${samU(30)}}
.win-body{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}

/* магазин */
.shop-body{flex:1;min-height:0;display:grid;grid-template-columns:${samU(88)} 1fr;gap:${samU(10)};padding:${samU(10)}}
.shop-tabs{display:flex;flex-direction:column;gap:${samU(6)};overflow-x:hidden;overflow-y:auto;scrollbar-width:none;padding:0 ${samU(2)} ${samU(6)} 0}.shop-tabs::-webkit-scrollbar{display:none}
.shop-tabs .tab{--c1:#4a4396;--c2:#322c76;--c3:#262059;--cd:#100c26;flex:none;flex-direction:column;gap:${samU(0.5)};padding:${samU(3)} ${samU(2)} ${samU(4)};min-height:${samU(64)};font-size:max(11px,calc(13.5*var(--u)*var(--fit,1)));-webkit-text-stroke-width:${samU(3.4)};border-radius:${samU(15)};letter-spacing:0}
.shop-tabs .tab .sam-ic{font-size:${samU(30)}}
.shop-tabs .tab small{font-size:${samU(10.5)};opacity:.85;-webkit-text-stroke-width:${samU(2.4)}}
.shop-tabs .tab span{white-space:normal;text-align:center;line-height:1}
.shop-tabs .tab.sel{--c1:#ffe070;--c2:#ffa71f;--c3:#ee7b0c;--cd:#9c4a05;box-shadow:0 ${samU(5)} 0 var(--cd),0 0 0 ${samU(2.5)} #fff,0 ${samU(9)} ${samU(12)} rgba(0,0,0,.38),inset 0 ${samU(2)} 0 rgba(255,255,255,.6)}
.shop-main{min-width:0;min-height:0;display:flex;flex-direction:column;gap:${samU(6)}}
.shop-grid{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;display:grid;grid-template-columns:repeat(auto-fill,minmax(max(92px,${samU(124)}),1fr));grid-auto-rows:max-content;gap:${samU(12)};padding:${samU(8)} ${samU(8)} ${samU(14)};border-radius:${samU(14)};background:rgba(8,6,34,.36);box-shadow:inset 0 ${samU(3)} 0 rgba(0,0,0,.3);scrollbar-width:thin;scrollbar-color:#ffb02e #1b1655;touch-action:pan-y}
.shop-grid::-webkit-scrollbar{width:${samU(10)}}.shop-grid::-webkit-scrollbar-thumb{background:#ffb02e;border-radius:9px;border:2px solid #1b1655}
.shop-hint{flex:none;text-align:center;font-size:${samU(12.5)};color:#bfd3ff;-webkit-text-stroke:${samU(3)} var(--sam-ink);text-transform:none}
.shop-empty{grid-column:1/-1;text-align:center;padding:${samU(30)};font-size:${samU(18)};color:#bfd3ff}
.card{--rc:#9aa7b8;position:relative;display:flex;flex-direction:column;align-items:center;gap:${samU(4)};padding:${samU(22)} ${samU(7)} ${samU(8)};border-radius:${samU(17)};border:${samU(4)} solid var(--rc);background:linear-gradient(#3a3494,#262069);box-shadow:0 ${samU(4)} 0 rgba(0,0,0,.4),inset 0 0 0 ${samU(2)} rgba(255,255,255,.07);cursor:pointer;touch-action:manipulation;overflow:hidden;-webkit-tap-highlight-color:transparent;transition:transform .12s}
@media (hover:hover){.card:hover{transform:translateY(${samU(-3)})}}
.card.sel{box-shadow:0 0 0 ${samU(3)} #fff,0 ${samU(4)} 0 rgba(0,0,0,.4),0 0 ${samU(16)} ${samU(3)} rgba(255,255,255,.5)}
.card.focus{animation:sam-card-focus .65s ease-in-out 3 alternate}
@keyframes sam-card-focus{from{transform:scale(1)}to{transform:scale(1.06)}}
.card .rar{position:absolute;left:0;top:0;box-sizing:border-box;padding:${samU(2)} ${samU(8)} ${samU(2)} ${samU(6)};border-radius:0 0 ${samU(12)} 0;background:var(--rc);border-right:${samU(3)} solid var(--sam-ink);border-bottom:${samU(3)} solid var(--sam-ink);font-size:max(11px,${samU(10.5)});text-transform:uppercase;-webkit-text-stroke:${samU(2.8)} var(--sam-ink);z-index:2;max-width:94%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card .chk{position:absolute;right:${samU(3)};top:${samU(3)};font-size:${samU(26)};z-index:2}
.card .ico{position:relative;width:100%;aspect-ratio:1;max-width:${samU(112)};border-radius:${samU(12)};background:radial-gradient(circle at 50% 55%,rgba(255,255,255,.2),rgba(255,255,255,0) 70%)}
.card .ico canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.card.locked .ico canvas{filter:brightness(.82) saturate(.8)}
.card .ico .lk{position:absolute;right:${samU(2)};bottom:${samU(2)};font-size:${samU(26)}}
.card .nm.two{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.02;min-height:2.04em}
.card .nm{width:100%;font-size:max(11px,calc(14*var(--u)*var(--fit,1)));line-height:1.05;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;-webkit-text-stroke:${samU(3.4)} var(--sam-ink)}
.card .cp{font-size:${samU(11)};color:#bfd3ff;-webkit-text-stroke:${samU(2.6)} var(--sam-ink);text-align:center}
.card .cb{width:100%;min-height:max(44px,${samU(38)});padding:${samU(3)} ${samU(4)};font-size:${samU(15)};border-width:${samU(3)};border-radius:${samU(12)};-webkit-text-stroke-width:${samU(3.6)};gap:${samU(4)};letter-spacing:0}
.card .cb .sam-ic{font-size:${samU(22)}}
.card .cb.cant{filter:grayscale(.6) brightness(.9)}
.card .adbar{display:flex;gap:${samU(2)};width:100%;height:${samU(11)};padding:0 ${samU(1)};box-sizing:border-box}
.card .adbar i{flex:1;min-width:0;border-radius:${samU(4)};background:rgba(8,6,34,.6);border:${samU(2)} solid var(--sam-ink);box-sizing:border-box;position:relative}
.card .adbar i.on{background:linear-gradient(#fff3a6,#ffb02e 60%,#f08a0c);box-shadow:inset 0 ${samU(1)} 0 rgba(255,255,255,.75)}
.card .adbar i.pop{animation:sam-bought .55s cubic-bezier(.3,1.6,.5,1)}
.card .adbar.cont{display:block;position:relative;border-radius:${samU(5)};background:rgba(8,6,34,.6);border:${samU(2)} solid var(--sam-ink);overflow:hidden}
.card .adbar.cont b{display:block;height:100%;background:linear-gradient(#fff3a6,#ffb02e 60%,#f08a0c);transition:width .4s}
.card .cb.ad{flex-direction:row;justify-content:center;gap:${samU(5)};padding:${samU(3)} ${samU(5)};font-size:max(11px,${samU(12.5)});line-height:1;text-transform:uppercase;white-space:normal;-webkit-text-stroke-width:${samU(3.2)}}
.card .cb.ad .sam-ic{font-size:${samU(21)};flex:none}
.card .cb.ad .tt{display:flex;flex-direction:column;align-items:flex-start;gap:${samU(1)};min-width:0;text-align:left}
.card .cb.ad .t2{font-size:max(12px,${samU(15)});color:#fff3a6;line-height:1}
.card .cb.ad.off .tt{align-items:center;text-align:center}
.sam-spin{display:inline-block;flex:none;width:${samU(18)};height:${samU(18)};box-sizing:border-box;border:${samU(4)} solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:sam-spin .8s linear infinite}
.card .spk{position:absolute;width:${samU(14)};height:${samU(14)};background:#fff;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);opacity:0;animation:sam-twinkle 2.4s ease-in-out infinite;pointer-events:none;z-index:2;filter:drop-shadow(0 0 ${samU(3)} var(--rc))}
.card .spk.s1{left:8%;top:12%;animation-delay:0s}.card .spk.s2{right:10%;top:34%;animation-delay:.8s;width:${samU(10)};height:${samU(10)}}.card .spk.s3{left:22%;bottom:12%;animation-delay:1.5s;width:${samU(9)};height:${samU(9)}}
.card.rar-legendary{box-shadow:0 ${samU(4)} 0 rgba(0,0,0,.4),0 0 ${samU(14)} ${samU(2)} rgba(255,176,46,.55),inset 0 0 0 ${samU(2)} rgba(255,236,160,.25)}
.card.rar-mythic{border-color:transparent;background:linear-gradient(#3a3494,#262069) padding-box,conic-gradient(from var(--ang,0deg),#ff4f8b,#ffb02e,#fff04a,#4fff7a,#42e8ff,#9b6bff,#ff4f8b) border-box;animation:sam-hue 5s linear infinite;box-shadow:0 ${samU(4)} 0 rgba(0,0,0,.4),0 0 ${samU(18)} ${samU(3)} rgba(255,79,139,.45)}
.card.rar-mythic.sel{box-shadow:0 0 0 ${samU(3)} #fff,0 ${samU(4)} 0 rgba(0,0,0,.4),0 0 ${samU(22)} ${samU(5)} rgba(255,79,139,.6)}
.card.rar-legendary::after,.card.rar-mythic::after,.card.rar-epic::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.34) 50%,transparent 62%);transform:translateX(-130%);animation:sam-sheen 3.6s ease-in-out infinite;pointer-events:none;z-index:1}
.card.rar-epic::after{animation-duration:5s;opacity:.6}
.card.rar-mythic::before,.card.rar-legendary::before{content:'';position:absolute;inset:0;box-shadow:inset 0 0 ${samU(16)} ${samU(2)} var(--rc);opacity:.35;animation:sam-glow 2s ease-in-out infinite;pointer-events:none;z-index:1}
.card.bought{animation:sam-bought .55s cubic-bezier(.3,1.5,.5,1)}

/* подарок дня */
.daily-body{padding:${samU(12)} ${samU(14)} ${samU(14)};gap:${samU(10)};overflow:hidden;touch-action:pan-y}
.d-sub{flex:none;text-align:center;font-size:${samU(14)};color:#cfe0ff;-webkit-text-stroke:${samU(3.2)} var(--sam-ink);line-height:1.15}
.d-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:${samU(8)};flex:0 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;align-content:start;padding:${samU(5)} ${samU(3)} ${samU(8)};scrollbar-width:thin}
.day{--dc:#6f78b4;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:${samU(2)};padding:${samU(6)} ${samU(4)} ${samU(6)};min-height:${samU(112)};border-radius:${samU(14)};border:${samU(3.5)} solid var(--sam-ink);background:linear-gradient(#3b3593,#26206a);box-shadow:0 ${samU(4)} 0 rgba(0,0,0,.38),inset 0 0 0 ${samU(2.5)} var(--dc);overflow:hidden}
.day .dn{font-size:${samU(12.5)};text-transform:uppercase;-webkit-text-stroke:${samU(3)} var(--sam-ink);color:#d6e2ff}
.day .di{position:relative;flex:1;width:100%;display:flex;align-items:center;justify-content:center;min-height:0}
.day .di .sam-ic{font-size:${samU(46)}}
.day .di canvas{width:${samU(64)};height:${samU(64)};display:block}
.day .dl{font-size:${samU(16)};line-height:1;-webkit-text-stroke:${samU(3.6)} var(--sam-ink);max-width:100%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.day .ds{font-size:${samU(10.5)};text-transform:uppercase;color:#ffe9a6;-webkit-text-stroke:${samU(2.6)} var(--sam-ink)}
.day.d7{grid-column:span 2;--dc:#ffb02e;background:linear-gradient(#5a2fc9,#341a8a)}
.day.d7 .di canvas{width:${samU(78)};height:${samU(78)}}
.day.d7::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.28) 50%,transparent 62%);transform:translateX(-130%);animation:sam-sheen 3.4s ease-in-out infinite;pointer-events:none}
.day.st-today{--dc:#ffe14a;background:linear-gradient(#6b5ad8,#3e2fa6);animation:sam-today 1.2s ease-in-out infinite}
.day.st-claimed{--dc:#34e06f;filter:saturate(.8)}
.day.st-claimed .di>*:not(.dchk){opacity:.45}
.day .dchk{position:absolute;left:50%;top:50%;font-size:${samU(44)};transform:translate(-50%,-50%);display:block!important;opacity:1!important}
.day.st-locked{filter:brightness(.8)}
.d-foot{flex:none;display:flex;flex-direction:column;align-items:center;gap:${samU(8)}}
.d-foot .row2{display:flex;gap:${samU(10)};flex-wrap:wrap;justify-content:center;width:100%}
.d-foot .sam-btn{min-width:min(${samU(250)},60%);font-size:${samU(24)};min-height:max(48px,${samU(56)})}
.d-foot .sam-btn.x2 .sam-ic{font-size:${samU(26)}}
.d-foot .sam-btn.x2{min-width:min(${samU(250)},70%)}
.d-next{font-size:${samU(14)};color:#bfd3ff;-webkit-text-stroke:${samU(3)} var(--sam-ink);text-align:center}
.d-pop{position:absolute;inset:0;z-index:5;display:none;flex-direction:column;align-items:center;justify-content:center;gap:${samU(10)};background:rgba(10,8,44,.86);text-align:center;padding:${samU(16)}}
.d-pop.on{display:flex;animation:sam-fadein .2s}
.d-pop .pg{font-size:${samU(26)};text-transform:uppercase;-webkit-text-stroke:${samU(5)} var(--sam-ink);color:#ffe14a}
.d-pop .pi{display:flex;gap:${samU(14)};flex-wrap:wrap;justify-content:center;align-items:center}
.d-pop .pr{display:flex;flex-direction:column;align-items:center;gap:${samU(4)};font-size:${samU(30)};-webkit-text-stroke:${samU(5.5)} var(--sam-ink);animation:sam-bought .6s cubic-bezier(.3,1.6,.5,1) both}
.d-pop .pr .sam-ic{font-size:${samU(86)}}.d-pop .pr canvas{width:${samU(110)};height:${samU(110)}}
.d-pop .pr small{font-size:${samU(16)}}

/* перерождение */
.rb-body{padding:${samU(14)} ${samU(18)} ${samU(18)};gap:${samU(12)};align-items:stretch;overflow:auto}
.rb-grid{display:grid;grid-template-columns:1fr ${samU(34)} 1fr;gap:${samU(8)} ${samU(6)};align-items:center}
.rb-h{text-align:center;font-size:${samU(15)};text-transform:uppercase;color:#bfd3ff;-webkit-text-stroke:${samU(3.4)} var(--sam-ink)}
.rb-pill{display:flex;align-items:center;justify-content:center;min-height:${samU(46)};border-radius:${samU(13)};border:${samU(3.5)} solid var(--sam-ink);font-size:${samU(21)};text-transform:uppercase;-webkit-text-stroke:${samU(4.4)} var(--sam-ink);box-shadow:0 ${samU(4)} 0 rgba(0,0,0,.38),inset 0 ${samU(2)} 0 rgba(255,255,255,.5)}
.rb-pill.xp{background:linear-gradient(#8ccdff,#3b9bff 55%,#2368df)}.rb-pill.lv{background:linear-gradient(#ffe070,#ffa71f 55%,#ee7b0c)}.rb-pill.new{filter:saturate(1.2) brightness(1.08)}
.rb-arrow{width:100%;height:${samU(30)};display:block}
.rb-prog{height:${samU(36)}}.rb-prog .fill{background:linear-gradient(#8dff9e,#2bd45c 55%,#139a3d)}.rb-prog .row{justify-content:center;font-size:${samU(17)};-webkit-text-stroke:${samU(3.6)} var(--sam-ink)}
.rb-warn{text-align:center;font-size:${samU(16)};color:#d9bfff;-webkit-text-stroke:${samU(3.4)} var(--sam-ink);text-transform:uppercase}
.rb-cnt{text-align:center;font-size:${samU(13)};color:#bfd3ff;-webkit-text-stroke:${samU(3)} var(--sam-ink)}
.rb-body .go{font-size:${samU(26)};min-height:max(52px,${samU(60)})}

/* телепорт */
.tp-body{padding:${samU(12)} ${samU(14)} ${samU(16)};gap:${samU(10)};overflow:auto;touch-action:pan-y}
.tp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(max(170px,${samU(200)}),1fr));gap:${samU(10)}}
.tp{--sc:#ff8a3d;flex-direction:row;justify-content:flex-start;gap:${samU(10)};min-height:max(56px,${samU(66)});padding:${samU(6)} ${samU(10)} ${samU(6)} ${samU(8)};text-align:left;font-size:${samU(15)};white-space:normal;line-height:1.05;-webkit-text-stroke-width:${samU(3.6)};letter-spacing:0}
.tp .num{flex:none;display:flex;align-items:center;justify-content:center;width:${samU(40)};height:${samU(40)};border-radius:50%;background:var(--sc);border:${samU(3.5)} solid var(--sam-ink);font-size:${samU(22)};box-shadow:inset 0 ${samU(2)} 0 rgba(255,255,255,.5)}
.tp .tn{flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:${samU(2)}}
.tp .tn>span:first-child{font-size:max(11px,calc(15*var(--u)*var(--fit,1)));white-space:normal;overflow-wrap:normal;line-height:1.02}
.tp .tn small{font-size:max(11px,${samU(11)});color:#ffe9a6;-webkit-text-stroke-width:${samU(2.6)}}
.tp .sam-ic.lk{font-size:${samU(26)};flex:none}
.tp.lobby{grid-column:1/-1;min-height:max(56px,${samU(60)});justify-content:center;font-size:${samU(22)}}
.tp.lobby .sam-ic{font-size:${samU(38)}}
.tp.off .num{background:#59607a}

/* колесо фортуны */
.wheel-body{align-items:center;justify-content:center;flex-direction:row;gap:${samU(22)};padding:${samU(12)} ${samU(18)} ${samU(14)};overflow:hidden;touch-action:manipulation}
.wh-stage{position:relative;flex:none;width:var(--wd,${samU(360)});height:var(--wd,${samU(360)})}
.wh-disc{position:absolute;inset:0;width:100%;height:100%;display:block;will-change:transform;transform-origin:50% 50%}
.wh-lights{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
.wh-lights circle{fill:#fff7c9;opacity:.45;animation:sam-bulb 1s ease-in-out infinite}.wh-lights circle.b{animation-delay:.5s}
.wh-stage.spinning .wh-lights circle{animation-duration:.34s}.wh-stage.spinning .wh-lights circle.b{animation-delay:.17s}
.wh-ptr{position:absolute;left:50%;top:-5%;width:12.5%;transform:translateX(-50%);transform-origin:50% 18%;z-index:4;filter:drop-shadow(0 ${samU(4)} 0 rgba(0,0,0,.38));pointer-events:none}
.wh-hub{position:absolute;left:50%;top:50%;width:21%;height:21%;transform:translate(-50%,-50%);z-index:3;border-radius:50%;border:${samU(4)} solid var(--sam-ink);background:radial-gradient(circle at 38% 30%,#fff8cf,#ffd23a 46%,#e58a0a);box-shadow:0 ${samU(4)} 0 rgba(0,0,0,.4),inset 0 ${samU(3)} 0 rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;pointer-events:none}
.wh-hub .sam-ic{font-size:calc(var(--wd,${samU(360)})*.12)}
.wh-side{flex:0 1 ${samU(260)};min-width:0;display:flex;flex-direction:column;gap:${samU(10)};align-items:stretch;justify-content:center}
.wh-sub{text-align:center;font-size:${samU(13)};line-height:1.15;color:#cfe0ff;-webkit-text-stroke:${samU(3)} var(--sam-ink)}
.wh-btn{min-height:max(52px,${samU(62)});flex-direction:row;gap:${samU(8)};padding:${samU(6)} ${samU(12)};line-height:1;white-space:normal;text-align:left;justify-content:center}
.wh-btn .sam-ic{font-size:${samU(30)};flex:none}
.wh-btn .tt{display:flex;flex-direction:column;align-items:flex-start;gap:${samU(3)};min-width:0}
.wh-btn .l1{font-size:max(11px,calc(19*var(--u)*var(--fit,1)));white-space:nowrap}.wh-btn .l2{font-size:max(11px,${samU(13)});color:#fff3a6;-webkit-text-stroke-width:${samU(3)};white-space:nowrap}
.wh-btn.off .tt{align-items:center;text-align:center}.wh-btn.off{justify-content:center}
.wh-stage .wh-flash{position:absolute;inset:0;border-radius:50%;box-shadow:0 0 ${samU(40)} ${samU(8)} rgba(255,236,120,.9);opacity:0;pointer-events:none;z-index:0}
.wh-stage.won .wh-flash{animation:sam-glow 0.7s ease-in-out 3}
.hl-tall .sam-win.w-wheel{width:min(96vw,${samU(520)});height:min(94vh,${samU(720)})}
.hl-tall .wheel-body{flex-direction:column;gap:${samU(14)};padding:${samU(16)} ${samU(14)} ${samU(14)}}
.hl-tall .wh-side{flex:none;width:100%;max-width:${samU(420)}}
.hl-low .sam-win.w-wheel{width:min(98vw,${samU(740)});height:100%}
.hl-low .wheel-body{gap:${samU(12)};padding:${samU(6)} ${samU(10)}}
.hl-low .wh-side{flex-basis:${samU(240)};gap:${samU(8)}}
.hl-low .wh-sub{display:none}
.hl-low .wh-btn{min-height:max(48px,${samU(54)})}.hl-low .wh-btn .l1{font-size:max(11px,calc(16*var(--u)*var(--fit,1)))}.hl-low .wh-btn .sam-ic{font-size:${samU(24)}}
@keyframes sam-bulb{0%{opacity:.45}50%{opacity:1}100%{opacity:.45}}
@keyframes sam-ptr{0%{transform:translateX(-50%) rotate(0)}30%{transform:translateX(-50%) rotate(-24deg)}100%{transform:translateX(-50%) rotate(0)}}

/* режимы */
.hl-tall .sam-wl.k-shop{align-items:flex-end;justify-content:center;padding-right:max(8px,env(safe-area-inset-right));background:linear-gradient(180deg,rgba(8,6,34,0) 0,rgba(8,6,34,0) 34%,rgba(8,6,34,.62) 100%)}
.hl-tall .sam-win.w-shop{width:100%;height:58%;max-height:none;border-radius:${samU(22)} ${samU(22)} ${samU(18)} ${samU(18)}}
.hl-tall .shop-body{grid-template-columns:1fr;grid-template-rows:auto 1fr}
.hl-tall .shop-tabs{flex-direction:row;gap:${samU(5)};overflow-x:auto;overflow-y:hidden;padding:0 0 ${samU(6)} 0;touch-action:pan-x;-webkit-overflow-scrolling:touch}
.hl-tall .shop-tabs .tab{flex:1 1 0;min-width:max(44px,${samU(46)});flex-direction:row;min-height:max(44px,${samU(48)});padding:${samU(4)} ${samU(4)};gap:${samU(6)}}
.hl-tall .shop-tabs .tab small,.hl-tall .shop-tabs .tab span{display:none}.hl-tall .shop-tabs .tab .sam-ic{font-size:${samU(30)}}
.hl-tall .shop-tabs .tab.sel{flex:2.6 1 0;min-width:max(84px,${samU(100)})}
.hl-tall .shop-tabs .tab.sel span{display:block;white-space:normal;line-height:.95}
.hl-land .sam-win.w-shop{height:min(94vh,${samU(580)})}
.hl-land .shop-body{grid-template-columns:${samU(78)} 1fr}
.hl-land .shop-tabs{gap:${samU(6)}}.hl-land .shop-tabs .tab{min-height:max(44px,${samU(48)});padding:${samU(4)} ${samU(2)}}.hl-land .shop-tabs .tab small{display:none}.hl-land .shop-tabs .tab .sam-ic{font-size:${samU(30)}}
.hl-land .shop-tabs .tab{font-size:max(11px,calc(12.5*var(--u)*var(--fit,1)));-webkit-text-stroke-width:${samU(3)}}
.hl-tall .shop-hint{display:none}
.hl-low .sam-win.w-shop{width:min(calc(var(--vcap-w,100vw)*.56),${samU(660)});height:100%;max-height:none;border-radius:${samU(18)}}
.hl-low .sam-win{max-height:100%}
.hl-low .win-head{padding:${samU(4)} ${samU(8)} ${samU(4)} ${samU(14)}}.hl-low .win-head .wt{font-size:calc(24*var(--u)*var(--fit,1))}
.hl-low .win-bal{height:${samU(32)};font-size:${samU(19)}}
.hl-low .shop-body{grid-template-columns:calc(2*max(44px,${samU(46)}) + ${samU(5)}) 1fr;padding:${samU(6)};gap:${samU(6)}}
.hl-low .shop-tabs{display:grid;grid-template-columns:repeat(2,max(44px,${samU(46)}));grid-auto-rows:max(44px,${samU(46)});gap:${samU(5)};align-content:start;padding:0}
.hl-low .shop-tabs .tab{min-height:0;padding:0;border-radius:${samU(12)}}.hl-low .shop-tabs .tab span,.hl-low .shop-tabs .tab small{display:none}.hl-low .shop-tabs .tab .sam-ic{font-size:${samU(32)}}
.hl-low .shop-hint{display:none}
.hl-low .shop-grid{grid-template-columns:repeat(auto-fill,minmax(max(76px,${samU(92)}),1fr));gap:${samU(8)}}
.hl-low .card{padding-top:${samU(18)}}
.hl-low .card .rar{font-size:0;-webkit-text-stroke:0;padding:0;width:${samU(34)};height:${samU(15)};border-radius:0 0 ${samU(10)} 0}
.hl-low .card .rar::before{content:'';position:absolute;left:${samU(6)};top:50%;width:${samU(11)};height:${samU(11)};margin-top:${samU(-5.5)};background:#fff;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)}
.card .cb.ad.tight .sam-ic{display:none}
.hl-low .card .cb.ad{padding:${samU(2)} ${samU(3)};font-size:max(11px,${samU(11)})}.hl-low .card .cb.ad .t2{font-size:max(12px,${samU(13)})}.hl-low .card .cb.ad .sam-ic{font-size:${samU(17)}}
:is(.hl-low,.hl-land) .daily-body{padding:${samU(6)} ${samU(10)} ${samU(8)};gap:${samU(5)}}
:is(.hl-low,.hl-land) .d-sub{display:none}
:is(.hl-low,.hl-land) .d-grid{grid-template-columns:repeat(7,1fr);gap:${samU(4)}}:is(.hl-low,.hl-land) .day{min-height:${samU(92)}}:is(.hl-low,.hl-land) .day.d7{grid-column:span 1}
:is(.hl-low,.hl-land) .day .di .sam-ic{font-size:${samU(34)}}:is(.hl-low,.hl-land) .day .di canvas,:is(.hl-low,.hl-land) .day.d7 .di canvas{width:${samU(48)};height:${samU(48)}}
:is(.hl-low,.hl-land) .day .dl{font-size:${samU(13)}}:is(.hl-low,.hl-land) .day .dn{font-size:${samU(10.5)}}:is(.hl-low,.hl-land) .day .ds{display:none}
:is(.hl-low,.hl-land) .d-foot{flex-direction:row;justify-content:center;gap:${samU(14)}}:is(.hl-low,.hl-land) .d-foot .sam-btn{min-height:max(44px,${samU(46)});font-size:${samU(20)}}
:is(.hl-low,.hl-land) .rb-body{gap:${samU(7)};padding:${samU(8)} ${samU(14)} ${samU(10)}}:is(.hl-low,.hl-land) .rb-pill{min-height:${samU(36)};font-size:${samU(17)}}:is(.hl-low,.hl-land) .rb-warn{font-size:${samU(13)}}
:is(.hl-low,.hl-land) .rb-body .go{min-height:max(44px,${samU(48)});font-size:${samU(20)}}
:is(.hl-low,.hl-land) .tp-body{padding:${samU(8)} ${samU(10)}}:is(.hl-low,.hl-land) .tp{min-height:max(48px,${samU(52)})}

:is(.hl-low,.hl-land) .d-pop{gap:${samU(4)};padding:${samU(6)};overflow:auto}
:is(.hl-low,.hl-land) .d-pop .pg{font-size:${samU(20)}}
:is(.hl-low,.hl-land) .d-pop .pr{font-size:${samU(24)}}
:is(.hl-low,.hl-land) .d-pop .pr .sam-ic{font-size:${samU(56)}}
:is(.hl-low,.hl-land) .d-pop .pr canvas{width:${samU(72)};height:${samU(72)}}
:is(.hl-low,.hl-land) .d-pop .sam-btn{min-height:max(44px,${samU(44)});font-size:${samU(20)}}
@property --ang{syntax:'<angle>';initial-value:0deg;inherits:false}
@keyframes sam-hue{to{--ang:360deg}}
@keyframes sam-twinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}45%{opacity:1;transform:scale(1) rotate(45deg)}70%{opacity:.2;transform:scale(.6) rotate(90deg)}}
@keyframes sam-spin{to{transform:rotate(360deg)}}
@keyframes sam-fadein{from{opacity:0}to{opacity:1}}
@keyframes sam-fadeout{from{opacity:1}to{opacity:0}}
@keyframes sam-winpop{0%{opacity:0;transform:translateY(${samU(20)}) scale(.9)}100%{opacity:1;transform:none}}
@keyframes sam-sheen{0%{transform:translateX(-130%)}55%,100%{transform:translateX(130%)}}
@keyframes sam-glow{0%,100%{opacity:.15}50%{opacity:.5}}
@keyframes sam-bought{0%{transform:scale(.8)}55%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes sam-today{0%,100%{box-shadow:0 ${samU(4)} 0 rgba(0,0,0,.38),inset 0 0 0 ${samU(2.5)} var(--dc),0 0 0 rgba(255,225,74,0)}50%{box-shadow:0 ${samU(4)} 0 rgba(0,0,0,.38),inset 0 0 0 ${samU(2.5)} var(--dc),0 0 ${samU(18)} ${samU(4)} rgba(255,225,74,.75)}}
@media (prefers-reduced-motion:reduce){.card::after,.card::before,.card,.card .spk,.day,.day::after,.wh-lights circle{animation:none!important}}
`;

/** Маленькая фабрика DOM: тег, класс, текст. */
const samEl = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
};

/** @satisfies {Record<string, any>} */
const GameWindows = {
    /** @type {any} */ hud: null,
    /** @type {HTMLElement | null} */ layer: null,
    /** @type {HTMLElement | null} */ win: null,
    /** @type {HTMLElement | null} */ body: null,
    kind: '',
    _tab: '', _sel: '', _info: /** @type {any} */ (null), _list: /** @type {any[]} */ ([]),
    _timer: /** @type {any} */ (0), _unsub: /** @type {any} */ (null), _bought: '', _attached: false,
    /** Карточка, у которой сейчас идёт реклама (спиннер на её кнопке); у остальных кнопки «За рекламу» на это время неактивны. */
    _adBusyId: '',
    /** Идёт реклама за «x2» в подарке дня. */
    _x2Busy: false,
    /** Какой отрезок полосы просмотров «выскочит» при ближайшей перерисовке: { id, idx }. */
    _pop: /** @type {any} */ (null),
    /** Состояние колеса: угол диска (0..360), крутится ли, ждём ли рекламу, id кадра, размер холста, подсвеченный сектор. */
    _wh: /** @type {any} */ ({ angle: 0, spinning: false, busy: false, raf: 0, px: 0, hi: -1, sig: '', snap: null }),

    TAB_ICON: { arms: 'arm', skins: 'skin', hats: 'hat', trails: 'trail', cores: 'core', winfx: 'sparkles' },

    attach(hud) {
        this.hud = hud;
        if (this._attached) return;
        this._attached = true;
        const st = document.createElement('style');
        st.id = 'sam-win-css';
        st.textContent = GAME_WIN_CSS;
        document.head.appendChild(st);
        // Esc игра не занимает (Playgama 1.5.2): окно закрывают крестик, фон или P
        window.addEventListener('lory-release-input', () => { /* окно живёт: ввод его не касается */ });
        // «Через N с» на кнопках «за рекламу» обновляется сразу, как только платформа сообщила о паузе между rewarded
        if (typeof Platform !== 'undefined' && typeof Platform.onRewardedCooldown === 'function') Platform.onRewardedCooldown(() => this._tick());
    },

    isOpen() { return !!this.layer; },

    /**
     * Открытое окно в px ПОЛЯ игры (слой окна — fixed inset 0, при ViewCap это поле, а не окно браузера) или null:
     * { x, y, w, h, vw, vh, free, kind } — vw/vh размер поля, free — свободная часть для героя (слева от панели или над листом,
     * где места больше). offset*, а не getBoundingClientRect: во время открытия (sam-winpop) окно сдвинуто и сжато transform.
     */
    rect() {
        const win = this.win, layer = this.layer;
        if (!win || !layer) return null;
        const x = win.offsetLeft, y = win.offsetTop, vw = layer.clientWidth, vh = layer.clientHeight;
        const left = { x: 0, y: 0, w: Math.max(0, x), h: vh }, top = { x: 0, y: 0, w: vw, h: Math.max(0, y) };
        return { x, y, w: win.offsetWidth, h: win.offsetHeight, vw, vh, free: left.w * left.h >= top.w * top.h ? left : top, kind: this.kind };
    },

    _cb(name, ...args) { return this.hud ? this.hud._call(name, ...args) : undefined; },

    /** Раскладка сменилась (поворот экрана, размер окна): колесу нужен новый диаметр, вкладкам — новая подгонка подписей. */
    relayout() {
        if (this.layer && this.kind === 'wheel') this._wheelFit();
        if (this.layer && this.kind === 'shop') this._fitTabs();
    },

    /** Раз в секунду, пока окно открыто, и сразу по событию паузы между rewarded: подписи кнопок «за рекламу» и таймеры. */
    _tick() {
        if (!this.layer) return;
        if (this.kind === 'shop') this._syncAds();
        else if (this.kind === 'daily') { this._tickDaily(); this._renderX2(); }
        else if (this.kind === 'wheel') this._wheelButtons();
    },

    // =============================================================================================
    // Рамка окна
    // =============================================================================================

    _open(kind, titleKey, colors, balance) {
        const hud = this.hud;
        if (!hud || hud._menuOn || hud._pauseOn) return null;
        if (this.layer) this.close();
        const layer = samEl('div', 'sam-wl k-' + kind);
        const win = samEl('div', 'sam-win w-' + kind);
        win.setAttribute('role', 'dialog');
        win.setAttribute('aria-modal', 'true');
        win.style.setProperty('--h1', colors[0]);
        win.style.setProperty('--h2', colors[1]);
        const head = samEl('div', 'win-head');
        const title = samEl('div', 'wt sam-o', Lang.t(titleKey));
        title.dataset.t = titleKey;
        head.appendChild(title);
        if (balance) {
            const bal = samEl('div', 'win-bal sam-o');
            bal.innerHTML = GameIcons.html('trophy') + '<span class="bv"></span>';
            head.appendChild(bal);
        }
        const x = samEl('button', 'sam-btn win-x c-red');
        x.type = 'button';
        x.setAttribute('aria-label', Lang.t('ui.close'));
        x.innerHTML = GameIcons.html('close');
        x.addEventListener('click', (e) => { e.stopPropagation(); x.blur(); this._userClose(); });
        head.appendChild(x);
        const body = samEl('div', 'win-body');
        win.appendChild(head);
        win.appendChild(body);
        layer.appendChild(win);
        // закрытие по click, и только если нажатие тоже было на фоне: pointerdown закрывал слой, а следующий за ним click на таче
        // падал в кнопку HUD под фоном (Подарок/Перерождение/шестерёнка), и протяжка из окна наружу случайно закрывала окно
        let downOnLayer = false;
        layer.addEventListener('pointerdown', (e) => { downOnLayer = e.target === layer; });
        layer.addEventListener('click', (e) => { const ok = downOnLayer && e.target === layer; downOnLayer = false; if (ok) this._userClose(); });
        document.body.appendChild(layer);
        this.layer = layer; this.win = win; this.body = body; this.kind = kind;
        clearInterval(this._timer);
        this._timer = setInterval(() => this._tick(), 1000);
        hud._syncModal();
        this._cb('onShopOpen', true, kind);
        if (balance) this._syncBalance(false);
        this._fitHead();
        return body;
    },

    /** Закрыть по нажатию игрока: колесо во время вращения (и пока ждём рекламу) не закрывается — приз выдаётся по остановке. */
    _userClose() {
        if (this.kind === 'wheel' && (this._wh.spinning || this._wh.busy)) return;
        this.close();
    },

    /** Заголовок окна не режется троеточием: слишком длинный — мельче (--fit, не меньше 0.55). */
    _fitHead() {
        const t = /** @type {HTMLElement | null} */ (this.win && this.win.querySelector('.wt'));
        if (!t) return;
        t.style.setProperty('--fit', '1');
        const w = t.scrollWidth, cw = t.clientWidth;
        if (cw > 0 && w > cw + 1) t.style.setProperty('--fit', Math.max(0.55, cw / w).toFixed(3));
    },

    /** Закрыть открытое окно любого вида. Колесо посреди вращения: приз выдаётся сразу (ровно один раз), игра получает cb.onWheel. */
    close() {
        if (!this.layer) return;
        const layer = this.layer, kind = this.kind;
        if (kind === 'wheel') this._wheelAbort();
        clearInterval(this._timer);
        this._timer = 0;
        if (this._unsub) { this._unsub(); this._unsub = null; }
        if (kind === 'shop' && typeof Shop !== 'undefined') { Shop.clearPreview(); this._cb('onPreview', null); }
        this.layer = null; this.win = null; this.body = null; this.kind = '';
        layer.classList.add('closing');
        setTimeout(() => layer.remove(), 150);
        this.hud._syncModal();
        this._cb('onShopOpen', false, kind);
    },

    _syncBalance(bump) {
        if (!this.win || typeof Shop === 'undefined') return;
        const bv = /** @type {HTMLElement | null} */ (this.win.querySelector('.win-bal .bv'));
        if (!bv) return;
        const n = String(Shop.coins);
        if (bv.textContent === n) return;
        bv.textContent = n;
        const bal = /** @type {HTMLElement} */ (bv.parentElement);
        if (bump) { bal.classList.remove('bump'); void bal.offsetWidth; bal.classList.add('bump'); }
    },

    /** Перерисовать открытое окно (смена языка, победы). */
    refresh() {
        if (!this.layer) return;
        const kind = this.kind;
        const t = /** @type {HTMLElement | null} */ (this.layer.querySelector('.wt'));
        if (t && t.dataset.t) { t.textContent = Lang.t(t.dataset.t); this._fitHead(); }
        if (kind === 'shop') this._renderShop();
        else if (kind === 'daily') this._renderDaily();
        else if (kind === 'wheel') { this._wheelDraw(this._wh.hi); this._wheelButtons(); }
        else if (kind === 'rebirth') this._renderRebirth();
        else if (kind === 'teleport') this._renderTeleport();
    },

    badge(on) { /* точка на кнопке рисуется в GameHud; окно её не использует */ },

    /** Реклама «за награду» есть, если площадка умеет rewarded (локально — только с ?mockads: без него показ вернёт false, прогресс цел). */
    _adsOk() { return typeof Platform !== 'undefined' && typeof Platform.rewardedSupported === 'function' && !!Platform.rewardedSupported(); },

    /** Текст «Через N с» (общая пауза между rewarded или пауза после неудачи). */
    _waitText(n) { return Lang.t('ui.ads.wait', { n }); },

    _rarity(r) {
        const R = typeof RARITY !== 'undefined' ? RARITY[r] : null;
        return R ? { label: R[Lang.code] || R.en || r, color: R.color } : { label: r || '', color: '#9aa7b8' };
    },

    /** Холст с превью предмета. */
    _icon(item, px) {
        const c = /** @type {HTMLCanvasElement} */ (document.createElement('canvas'));
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        c.width = c.height = Math.round(px * dpr);
        GameIcons.paintItem(c, item);
        return c;
    },

    // =============================================================================================
    // Магазин
    // =============================================================================================

    /** focusId — открыть сразу на предмете (пьедестал в лобби): карточка выбрана, примерена на герое и прокручена в вид. */
    shop(tab, focusId) {
        if (typeof Shop === 'undefined' || !Shop._items || !Shop._items.length) return;
        if (this.kind === 'shop') { if (tab) { this._tab = tab; this._renderShop(); } if (focusId) this._focus(focusId); return; }
        const body = this._open('shop', 'ui.shop.title', ['#ffc24a', '#ff8a1c'], true);
        if (!body) return;
        const tabs = Shop.tabs();
        this._tab = tab && tabs.some((t) => t.id === tab) ? tab : (tabs[0] ? tabs[0].id : '');
        this._sel = '';
        this._adBusyId = '';
        body.className = 'win-body shop-body';
        body.innerHTML = '<nav class="shop-tabs"></nav><div class="shop-main"><div class="shop-grid"></div><div class="shop-hint" data-t="ui.shop.hint"></div></div>';
        Lang.apply(body);
        this._unsub = Shop.on((e) => {
            if (e.type === 'coins') { this._syncBalance(true); this._renderCards(); }
        });
        this._renderShop();
        setTimeout(() => this._fitTabs(), 320);   // окно «выезжает» (масштаб): размеры вкладок точны после анимации
        if (focusId) this._focus(focusId);
    },

    _focus(id) {
        this._select(id);
        const card = this.body && /** @type {HTMLElement} */ (this.body.querySelector('.card[data-id="' + id + '"]'));
        if (!card) return;
        card.classList.add('focus');
        try { card.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { card.scrollIntoView(); }
        setTimeout(() => card.classList.remove('focus'), 2600);
    },

    _renderShop() {
        if (!this.body || this.kind !== 'shop') return;
        this._renderTabs();
        this._syncBalance(false);
        this._renderCards();
    },

    /** Вкладки: кнопки со значком, названием и «куплено/всего»; при той же раскладке перерисовка только меняет выбранную и счётчики. */
    _renderTabs() {
        const nav = /** @type {HTMLElement} */ (this.body && this.body.querySelector('.shop-tabs'));
        if (!nav) return;
        const tabs = Shop.tabs();
        const sig = tabs.map((t) => t.id + ':' + t.name).join('|') + '|' + Lang.code;
        if (nav.dataset.sig !== sig) {
            nav.dataset.sig = sig;
            nav.textContent = '';
            for (const t of tabs) {
                const b = samEl('button', 'sam-btn tab');
                b.type = 'button';
                b.dataset.tab = t.id;
                b.setAttribute('aria-label', t.name);
                b.title = t.name;
                b.innerHTML = GameIcons.html(this.TAB_ICON[t.id] || 'gift') + '<span></span><small></small>';
                /** @type {HTMLElement} */ (b.querySelector('span')).textContent = t.name;
                b.addEventListener('click', () => {
                    b.blur();
                    if (this._tab === t.id) return;
                    Shop.clearPreview(); this._cb('onPreview', null);
                    this._tab = t.id; this._sel = '';
                    this._renderShop();
                });
                nav.appendChild(b);
            }
        }
        tabs.forEach((t, i) => {
            const b = /** @type {HTMLElement} */ (nav.children[i]);
            if (!b) return;
            b.classList.toggle('sel', t.id === this._tab);
            b.setAttribute('aria-pressed', t.id === this._tab ? 'true' : 'false');
            const sm = b.querySelector('small');
            if (sm) sm.textContent = t.owned + '/' + t.count;
        });
        this._fitTabs();
    },

    /** Подпись вкладки не вылезает за кнопку (--fit, не мельче 0.62; кегль не мельче 11px по CSS) и выбранная вкладка видна в прокрутке. */
    _fitTabs() {
        const nav = /** @type {HTMLElement | null} */ (this.body && this.kind === 'shop' ? this.body.querySelector('.shop-tabs') : null);
        if (!nav) return;
        for (const el of Array.from(nav.querySelectorAll('.tab'))) {
            const b = /** @type {HTMLElement} */ (el);
            b.style.setProperty('--fit', '1');
            b.style.minWidth = '';
            const sp = /** @type {HTMLElement | null} */ (b.querySelector('span'));
            if (!sp || sp.offsetWidth === 0) continue;
            const cs = getComputedStyle(b);
            const avail = cs.flexDirection === 'row' ? b.clientWidth - sp.offsetLeft - (parseFloat(cs.paddingRight) || 0) : b.clientWidth - 2 * (parseFloat(cs.paddingLeft) || 0) - 2;
            if (avail > 0 && sp.scrollWidth > avail + 1) b.style.setProperty('--fit', Math.max(0.62, avail / sp.scrollWidth).toFixed(3));
            if (cs.flexDirection === 'row') {   // портрет: не лезет и после сжатия — выбранная вкладка шире (полоса вкладок прокручивается)
                const over = sp.scrollWidth - (b.clientWidth - sp.offsetLeft - (parseFloat(cs.paddingRight) || 0));
                if (over > 1) b.style.minWidth = Math.ceil(b.offsetWidth + over + 2) + 'px';
            }
        }
        const sel = /** @type {HTMLElement | null} */ (nav.querySelector('.sel'));
        if (!sel) return;
        const nr = nav.getBoundingClientRect(), sr = sel.getBoundingClientRect();
        if (nav.scrollWidth > nav.clientWidth + 1) nav.scrollLeft += (sr.left + sr.width / 2) - (nr.left + nr.width / 2);
        if (nav.scrollHeight > nav.clientHeight + 1) nav.scrollTop += (sr.top + sr.height / 2) - (nr.top + nr.height / 2);
    },

    _renderCards() {
        if (!this.body || this.kind !== 'shop') return;
        const grid = /** @type {HTMLElement} */ (this.body.querySelector('.shop-grid'));
        const keep = grid.scrollTop;
        grid.textContent = '';
        const cards = Shop.cards(this._tab, { lockedExclusive: false });
        if (!cards.length) grid.appendChild(samEl('div', 'shop-empty sam-o', Lang.t('ui.shop.empty')));
        for (const c of cards) grid.appendChild(this._card(c));
        grid.scrollTop = keep;
        for (const el of Array.from(grid.querySelectorAll('.cb.ad'))) el.classList.toggle('tight', /** @type {HTMLElement} */ (el).clientWidth < 104);
        // длинное имя сжимается (не мельче 11px по CSS), а не режется троеточием
        for (const el of Array.from(grid.querySelectorAll('.nm'))) {
            const n = /** @type {HTMLElement} */ (el);
            if (!(n.clientWidth > 0 && n.scrollWidth > n.clientWidth + 1)) continue;
            n.style.setProperty('--fit', Math.max(0.8, n.clientWidth / n.scrollWidth).toFixed(3));
            if (n.scrollWidth > n.clientWidth + 1) { n.classList.add('two'); n.style.setProperty('--fit', '0.92'); }   // всё ещё не лезет — в две строки
        }
        // в подписи вкладок число купленного
        const tabs = Shop.tabs();
        const small = this.body.querySelectorAll('.shop-tabs .tab small');
        tabs.forEach((t, i) => { if (small[i]) small[i].textContent = t.owned + '/' + t.count; });
    },

    /** Полоса просмотров рекламы: по отрезку на каждый нужный просмотр (до 8), иначе одна сплошная. */
    _adBar(c) {
        const bar = samEl('div', 'adbar');
        const pop = this._pop && this._pop.id === c.id ? this._pop.idx : -1;
        if (c.need > 8) {
            bar.classList.add('cont');
            const f = samEl('b');
            f.style.width = Math.round(100 * c.progress / c.need) + '%';
            bar.appendChild(f);
        } else {
            for (let i = 0; i < c.need; i++) bar.appendChild(samEl('i', (i < c.progress ? 'on' : '') + (i === pop ? ' pop' : '')));
        }
        bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', c.priceLabel);
        return bar;
    },

    /**
     * Содержимое кнопки «За рекламу» карточки: [▶ За рекламу 2/5] | [спиннер Загрузка…] | [▶ Через 12 с 2/5] | [Реклама недоступна].
     * Перерисовывается только при смене состояния (подпись sig), поэтому секундный тик ничего не мигает.
     */
    _fillAdBtn(b, c) {
        const wait = c.adWait > 0 ? c.adWait : 0;
        const unavailable = !this._adsOk() || (!c.enabled && !wait && !c.busy);
        const mine = this._adBusyId === c.id;
        const label = unavailable ? Lang.t('ui.ads.off') : mine ? Lang.t('ui.ads.busy') : wait ? this._waitText(wait) : Lang.t('ui.shop.ad');
        const ok = !unavailable && !mine && !wait && !c.busy;
        const sig = (unavailable ? 'off' : mine ? 'busy' : wait ? 'wait' : c.busy ? 'other' : 'ok') + '|' + label + '|' + c.progress + '/' + c.need;
        if (b.dataset.sig === sig) return;
        b.dataset.sig = sig;
        b.classList.remove('c-purple', 'c-gray', 'is-off', 'off', 'cant');
        b.classList.add(unavailable || (!mine && !ok) ? 'c-gray' : 'c-purple');
        if (unavailable) b.classList.add('is-off', 'off');
        b.textContent = '';
        if (unavailable) { b.appendChild(samEl('span', 'tt', label)); b.setAttribute('aria-label', label); return; }
        if (mine) b.appendChild(samEl('span', 'sam-spin'));
        else b.insertAdjacentHTML('beforeend', GameIcons.html('adplay'));
        const tt = samEl('span', 'tt');
        tt.appendChild(samEl('span', 't1', label));
        if (!mine) tt.appendChild(samEl('span', 't2', c.progress + '/' + c.need));
        b.appendChild(tt);
        b.setAttribute('aria-label', label + ' ' + c.progress + '/' + c.need);
    },

    /** Перерисовать только кнопки «За рекламу» открытого магазина (секундный тик, конец рекламы). */
    _syncAds() {
        if (!this.body || this.kind !== 'shop') return;
        for (const el of Array.from(this.body.querySelectorAll('.cb.ad'))) {
            const b = /** @type {HTMLElement} */ (el);
            const c = Shop.card(b.dataset.ad || '');
            if (c && !c.owned) this._fillAdBtn(b, c);
        }
    },

    _card(c) {
        const rar = this._rarity(c.rarity);
        const isAd = c.kind === 'ads' && !c.owned;
        const el = samEl('div', 'card rar-' + c.rarity + ' k-' + c.kind + (c.owned ? ' owned' : ' locked') + (c.equipped ? ' eq' : '') + (c.id === this._sel ? ' sel' : '') + (c.id === this._bought ? ' bought' : ''));
        el.style.setProperty('--rc', rar.color);
        el.dataset.id = c.id;
        el.appendChild(samEl('div', 'rar sam-o', rar.label));
        if (c.equipped) { const k = samEl('div', 'chk'); k.innerHTML = GameIcons.html('check'); el.appendChild(k); }
        const ico = samEl('div', 'ico');
        ico.appendChild(this._icon(c.item, 192));
        if (c.rarity === 'legendary' || c.rarity === 'mythic') for (const n of ['s1', 's2', 's3']) ico.appendChild(samEl('i', 'spk ' + n));
        if (!c.owned) { const l = samEl('div', 'lk'); l.innerHTML = GameIcons.html('lock'); ico.appendChild(l); }
        el.appendChild(ico);
        el.appendChild(samEl('div', 'nm sam-o', c.name));
        if (isAd) el.appendChild(this._adBar(c));
        if (c.kind === 'exclusive' && !c.owned) el.appendChild(samEl('div', 'cp sam-o', Lang.t('ui.shop.exclusive')));

        const b = samEl('button', 'sam-btn cb');
        b.type = 'button';
        if (c.owned) {
            if (c.equipped) {
                if (c.action === 'unequip') { b.classList.add('c-gray'); b.textContent = c.actionLabel; } else { b.classList.add('c-gold', 'is-off'); b.textContent = Shop.t('shop.equipped'); }
            } else { b.classList.add('c-blue'); b.textContent = c.actionLabel; }
        } else if (c.kind === 'coins') {
            b.classList.add(c.enabled ? 'c-green' : 'c-gray');
            if (!c.enabled) b.classList.add('cant');
            b.innerHTML = GameIcons.html('trophy');
            b.appendChild(samEl('span', '', String(c.price)));
        } else if (isAd) {
            b.classList.add('ad');
            b.dataset.ad = c.id;
            this._fillAdBtn(b, c);
        } else {
            b.classList.add('c-gray', 'is-off');
            b.innerHTML = GameIcons.html('lock');
            b.appendChild(samEl('span', '', Lang.t('shop.locked')));
        }
        b.addEventListener('click', (e) => { e.stopPropagation(); b.blur(); this._act(c); });
        el.appendChild(b);
        el.addEventListener('click', () => this._select(c.id));
        return el;
    },

    _select(id) {
        if (this._sel === id) return;
        this._sel = id;
        Shop.preview(id);
        this._cb('onPreview', id);
        if (!this.body) return;
        for (const n of Array.from(this.body.querySelectorAll('.card'))) n.classList.toggle('sel', /** @type {HTMLElement} */ (n).dataset.id === id);
    },

    async _act(c) {
        const hud = this.hud;
        if (c.action === 'buy') {
            if (!c.enabled) { hud.toast(c.hint, 1600); this._select(c.id); return; }
            const r = Shop.buy(c.id);
            if (!r.ok) { hud.toast(c.hint || Shop.t('shop.noCoins', { n: r.missing || 0 }), 1600); return; }
            this._bought = c.id; this._sel = '';
            this._cb('onBuy', c.id);
            if (Shop.isEquipped(c.id)) this._cb('onEquip', c.id);
            hud.setWins(Shop.coins, 0);
        } else if (c.action === 'equip') {
            const r = Shop.equip(c.id);
            if (!r.ok) return;
            this._cb('onEquip', c.id);
        } else if (c.action === 'unequip') {
            const r = Shop.unequip(c.slot);
            if (!r.ok) return;
            const now = Shop.equippedId(c.slot);
            this._cb('onEquip', now);
        } else if (c.action === 'watch') {
            await this._watch(c.id);
            return;
        } else return;
        if (this.kind !== 'shop') return;
        this._syncBalance(true);
        this._renderShop();
        this._bought = '';
    },

    /**
     * «За рекламу» на карточке: await Shop.watchAd(id). Просмотр засчитан — полоса растёт; последний открывает предмет: cb.onBuy(id) (и
     * cb.onEquip(id), если он надет автоматически) — как после покупки за победы. Отказ или закрытие ролика — прогресс цел, короткий тост.
     */
    async _watch(id) {
        const hud = this.hud;
        if (this._adBusyId) return;
        const c = Shop.card(id);
        if (!c || c.owned) return;
        if (!this._adsOk()) { hud.toast(Lang.t('ui.shop.rewardsOff'), 1800); return; }
        if (!c.enabled) { hud.toast(c.adWait > 0 ? this._waitText(c.adWait) : (c.busy ? Lang.t('ui.ads.busy') : Lang.t('ui.shop.rewardsOff')), 1600); this._select(id); return; }
        this._adBusyId = id;
        this._syncAds();
        /** @type {any} */
        let r = null;
        try { r = await Shop.watchAd(id); } catch (e) { r = null; }
        this._adBusyId = '';
        const name = Shop.name(id);
        if (r && r.ok) {
            if (r.unlocked || r.done) {
                this._bought = id; this._sel = '';
                this._cb('onBuy', id);
                if (Shop.isEquipped(id)) this._cb('onEquip', id);
                hud.toast(Lang.t('ui.shop.opened', { name }), 2000);
            } else {
                this._pop = { id, idx: Math.max(0, (r.progress || 1) - 1) };
                hud.toast(Lang.t('ui.shop.step', { name, a: r.progress, b: r.need }), 1500);
            }
        } else if (r && r.reason === 'cooldown') hud.toast(this._waitText(Shop.adWaitSec() || 1), 1600);
        else if (!r || (r.reason !== 'owned' && r.reason !== 'busy')) hud.toast(Lang.t('ui.ads.failed'), 2200);
        if (this.layer && this.kind === 'shop') { this._syncBalance(false); this._renderShop(); }
        this._bought = ''; this._pop = null;
    },

    // =============================================================================================
    // Подарок дня
    // =============================================================================================

    daily() {
        if (typeof DailyGift === 'undefined' || !DailyGift._rewards || !DailyGift._rewards.length) return;
        if (this.kind === 'daily') return;
        const body = this._open('daily', 'ui.daily.title', ['#c9a3ff', '#8c5cff'], true);
        if (!body) return;
        body.className = 'win-body daily-body';
        body.innerHTML = '<div class="d-sub" data-t="ui.daily.sub"></div><div class="d-grid"></div><div class="d-foot"><div class="row2"></div><div class="d-next"></div></div><div class="d-pop"></div>';
        Lang.apply(body);
        this._unsub = Shop.on((e) => { if (e.type === 'coins') this._syncBalance(true); });
        this._x2Busy = false;
        this._renderDaily();
    },

    _dayIcon(d) {
        const wrap = samEl('div', 'di');
        const r = d.reward || {};
        const itemId = d.skin || r.item || '';
        const it = itemId && typeof Shop !== 'undefined' ? Shop.item(itemId) : null;
        if (it && GameIcons.canPaint(it)) wrap.appendChild(this._icon(it, 128));
        else if (r.randomItems > 0 && !(r.coins > 0)) wrap.innerHTML = GameIcons.html('gift');
        else wrap.innerHTML = GameIcons.html('trophy');
        if (d.state === 'claimed') { const k = samEl('div', 'dchk'); k.innerHTML = GameIcons.html('check'); wrap.appendChild(k); }
        return wrap;
    },

    _dayLabel(d) {
        const r = d.reward || {};
        const id = d.skin || r.item || '';
        if (id) return Shop.name(id);
        if (r.coins > 0) return '+' + r.coins;
        if (r.randomItems > 0) return '?';
        return '';
    },

    _renderDaily() {
        if (!this.body || this.kind !== 'daily') return;
        const v = DailyGift.view();
        const grid = /** @type {HTMLElement} */ (this.body.querySelector('.d-grid'));
        grid.textContent = '';
        for (const d of v.days) {
            const t = samEl('div', 'day st-' + d.state + (d.exclusive ? ' d7' : ''));
            t.appendChild(samEl('div', 'dn sam-o', d.dayLabel));
            t.appendChild(this._dayIcon(d));
            t.appendChild(samEl('div', 'dl sam-o', this._dayLabel(d)));
            const st = d.exclusive && d.state !== 'claimed' ? Lang.t('ui.daily.day7') : d.stateLabel;
            if (st) t.appendChild(samEl('div', 'ds sam-o', st));
            grid.appendChild(t);
        }
        const row = /** @type {HTMLElement} */ (this.body.querySelector('.d-foot .row2'));
        row.textContent = '';
        const claim = samEl('button', 'sam-btn ' + (v.claim.enabled ? 'c-green' : 'c-gray is-off'));
        claim.type = 'button';
        claim.innerHTML = GameIcons.html(v.claim.enabled ? 'gift' : 'check');
        claim.appendChild(samEl('span', '', v.claim.enabled ? v.claim.label : Lang.t('ui.daily.done')));
        claim.addEventListener('click', () => { claim.blur(); this._claimDaily(false); });
        row.appendChild(claim);
        // «x2 за рекламу»: пока площадка умеет rewarded (подпись, «Через N с» и спиннер — _renderX2)
        this._renderX2();
        this._tickDaily();
    },

    _tickDaily() {
        if (!this.body || this.kind !== 'daily') return;
        const n = /** @type {HTMLElement | null} */ (this.body.querySelector('.d-next'));
        if (!n) return;
        if (DailyGift.canClaim()) { n.textContent = ''; return; }
        const ms = DailyGift.msToNextDay();
        n.textContent = DailyGift.t('daily.nextIn', { t: DailyGift.formatTime(ms) });
        if (ms <= 1000) setTimeout(() => this._renderDaily(), 1200);
    },

    /** Кнопка «x2 за рекламу» подарка дня: ▶ + подпись из DailyGift.view().x2; «Через N с» в паузу между rewarded; спиннер, пока идёт реклама. */
    _renderX2() {
        if (!this.body || this.kind !== 'daily') return;
        const row = /** @type {HTMLElement | null} */ (this.body.querySelector('.d-foot .row2'));
        if (!row) return;
        const v = DailyGift.view();
        const old = /** @type {HTMLElement | null} */ (row.querySelector('.x2'));
        if (!(v.x2.available && this._adsOk())) { if (old) old.remove(); return; }
        const busy = this._x2Busy;
        const label = busy ? Lang.t('ui.ads.busy') : v.x2.label;
        const state = busy ? 'busy' : v.x2.enabled ? 'ok' : 'off';
        const sig = state + '|' + label;
        if (old && old.dataset.sig === sig) return;
        const b = samEl('button', 'sam-btn x2 ' + (state === 'off' ? 'c-gray' : 'c-purple'));
        b.type = 'button';
        b.dataset.sig = sig;
        if (busy) b.appendChild(samEl('span', 'sam-spin')); else b.insertAdjacentHTML('beforeend', GameIcons.html('adplay'));
        b.appendChild(samEl('span', '', label));
        b.addEventListener('click', () => {
            b.blur();
            if (this._x2Busy) return;
            const cur = DailyGift.view().x2;
            if (!cur.enabled) { this.hud.toast(cur.adWait > 0 ? this._waitText(cur.adWait) : (cur.hint || Lang.t('ui.shop.rewardsOff')), 1600); return; }
            this._claimDaily(true);
        });
        if (old) old.replaceWith(b); else row.appendChild(b);
    },

    async _claimDaily(x2) {
        if (this._x2Busy || !DailyGift.canClaim()) return;
        /** @type {any} */
        let r = null;
        if (x2) {
            this._x2Busy = true;
            this._renderX2();
            try { r = await DailyGift.claimX2(); } catch (e) { r = null; }
            this._x2Busy = false;
        } else r = DailyGift.claim();
        if (!r || !r.ok) {
            if (x2 && (!r || r.reason === 'adFailed' || r.reason === 'adUnavailable')) this.hud.toast(Lang.t('ui.ads.failed'), 2000);
            else if (r && r.reason === 'cooldown') this.hud.toast(this._waitText(DailyGift.adWaitSec() || 1), 1600);
            if (this.kind === 'daily') this._renderDaily();
            return;
        }
        this.hud.setDailyBadge(false);
        this.hud.setWins(Shop.coins, 0);
        this._cb('onDaily', r);
        if (this.kind !== 'daily') return;
        this._syncBalance(true);
        this._renderDaily();
        this._showPop(r);
    },

    /** Всплывашка «Ты получил»: победы и предметы из r.got. */
    _showPop(r) {
        if (!this.body) return;
        const pop = /** @type {HTMLElement} */ (this.body.querySelector('.d-pop'));
        pop.textContent = '';
        pop.appendChild(samEl('div', 'pg sam-o', Lang.t('ui.daily.got')));
        const items = samEl('div', 'pi');
        let coins = 0;
        for (const g of r.got || []) {
            if (g.type === 'coins') { coins += g.amount; continue; }
            const it = Shop.item(g.id);
            const box = samEl('div', 'pr sam-o');
            if (it && GameIcons.canPaint(it)) box.appendChild(this._icon(it, 160)); else box.innerHTML = GameIcons.html('gift');
            box.appendChild(samEl('small', '', Shop.name(g.id)));
            items.appendChild(box);
        }
        if (coins > 0) {
            const box = samEl('div', 'pr sam-o');
            box.innerHTML = GameIcons.html('trophy');
            box.appendChild(samEl('span', '', '+' + coins));
            items.insertBefore(box, items.firstChild);
        }
        pop.appendChild(items);
        const ok = samEl('button', 'sam-btn c-orange');
        ok.type = 'button';
        ok.textContent = Lang.t('ui.daily.ok');
        ok.addEventListener('click', () => { ok.blur(); pop.classList.remove('on'); });
        pop.appendChild(ok);
        pop.classList.add('on');
    },

    // =============================================================================================
    // Колесо фортуны
    // =============================================================================================

    /** Цвета секторов (по кругу; до 10 секторов — без повторов рядом). */
    WHEEL_COLORS: ['#ff5d7a', '#ffb02e', '#3fd16c', '#3b9bff', '#9b6bff', '#ff8a3d', '#42e8ff', '#ff5db1', '#b6e63a', '#ffd23a'],

    /**
     * Колесо фортуны: диск на canvas (сектор = значок + сумма победы или превью предмета), стрелка сверху, кнопки «Крутить бесплатно»
     * (с таймером до следующего) и «Крутить за рекламу» (сколько осталось). Результат выбирает Wheel ДО анимации, диск замедляется
     * и встаёт точно на выпавший сектор; потом Wheel.finish() (приз ровно один раз), cb.onWheel(result) и окно «Выигрыш!».
     */
    wheel() {
        if (typeof Wheel === 'undefined' || !Wheel._sectors || Wheel._sectors.length < 2) return;
        if (this.kind === 'wheel') return;
        const body = this._open('wheel', 'ui.wheel.title', ['#8ef5ae', '#25cb5c'], true);
        if (!body) return;
        body.className = 'win-body wheel-body';
        const N = 24;
        let bulbs = '';
        for (let i = 0; i < N; i++) {
            const a = i * Math.PI * 2 / N;
            bulbs += '<circle class="' + (i % 2 ? 'b' : 'a') + '" cx="' + (50 + Math.sin(a) * 46.600).toFixed(2) + '" cy="' + (50 - Math.cos(a) * 46.600).toFixed(2) + '" r="1.500"/>';
        }
        const ptr = '<svg class="wh-ptr" viewBox="0 0 48 64" aria-hidden="true"><defs><linearGradient id="sam-gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb0ba"/><stop offset=".5" stop-color="#ff4a5c"/><stop offset="1" stop-color="#c81a36"/></linearGradient></defs>' +
            '<path d="M24 61C20 53 4 35 4 21a20 20 0 0 1 40 0C44 35 28 53 24 61z" fill="url(#sam-gp)" stroke="#14102f" stroke-width="4.500" stroke-linejoin="round"/><circle cx="24" cy="21" r="7.500" fill="#fff" stroke="#14102f" stroke-width="3"/></svg>';
        body.innerHTML =
            '<div class="wh-stage"><div class="wh-flash"></div><canvas class="wh-disc" role="img"></canvas>' +
            '<svg class="wh-lights" viewBox="0 0 100 100" aria-hidden="true">' + bulbs + '</svg>' +
            '<div class="wh-hub">' + GameIcons.html('star') + '</div>' + ptr + '</div>' +
            '<div class="wh-side"><div class="wh-sub sam-o"></div>' +
            '<button type="button" class="sam-btn wh-btn" data-w="free"></button><button type="button" class="sam-btn wh-btn" data-w="ad"></button></div>' +
            '<div class="d-pop"></div>';
        this._wh = { angle: 0, spinning: false, busy: false, raf: 0, px: 0, hi: -1, sig: '', secs: [], snap: null };
        for (const el of Array.from(body.querySelectorAll('.wh-btn'))) {
            const b = /** @type {HTMLElement} */ (el);
            b.addEventListener('click', () => { b.blur(); this._wheelClick(b.dataset.w === 'ad' ? 'ad' : 'free'); });
        }
        this._unsub = Shop.on((e) => { if (e.type === 'coins') this._syncBalance(true); });
        this._wheelFit();
        this._wheelButtons();
        if (document.fonts && typeof document.fonts.load === 'function') document.fonts.load('1000 20px Nunito').then(() => { if (this.kind === 'wheel') this._wheelDraw(this._wh.hi); }).catch(() => { /* шрифт не нужен для работы */ });
        const pend = Wheel.pendingSpin();
        if (pend) this._wheelRun(pend, 0, pend.elapsedMs);   // вращение, приз которого ещё не выдан (recover: false): доигрываем
        setTimeout(() => { if (this.kind === 'wheel') this._wheelFit(); }, 320);   // окно «выезжает» (масштаб): диаметр точен после анимации
    },

    /** Диаметр диска по свободному месту окна (в альбоме диск слева, кнопки справа; в портрете диск сверху) и перерисовка холста. */
    _wheelFit() {
        const body = this.body;
        if (!body || this.kind !== 'wheel') return;
        const stage = /** @type {HTMLElement | null} */ (body.querySelector('.wh-stage')), side = /** @type {HTMLElement | null} */ (body.querySelector('.wh-side'));
        if (!stage || !side) return;
        const cs = getComputedStyle(body);
        const col = cs.flexDirection === 'column';
        const px = (v) => parseFloat(v) || 0;
        const padX = px(cs.paddingLeft) + px(cs.paddingRight), padY = px(cs.paddingTop) + px(cs.paddingBottom);
        const gap = px(cs.rowGap) || px(cs.columnGap);
        const u = px(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1;
        let d;
        if (col) d = Math.min(body.clientWidth - padX, body.clientHeight - padY - side.offsetHeight - gap);
        else d = Math.min(body.clientHeight - padY, body.clientWidth - padX - gap - Math.max(160, 200 * u));
        // стрелка вылезает над диском на 5,5 %: оставляем ей место сверху
        d = Math.max(120, Math.floor(d * 0.95));
        stage.style.setProperty('--wd', d + 'px');
        stage.style.marginTop = Math.round(d * 0.045) + 'px';
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const px2 = Math.round(Math.max(240, Math.min(1000, d * dpr)));
        if (this._wh.px !== px2) { this._wh.px = px2; const cv = /** @type {HTMLCanvasElement | null} */ (stage.querySelector('.wh-disc')); if (cv) { cv.width = cv.height = px2; this._wheelDraw(this._wh.hi); } }
        this._wheelApply();
    },

    /** Положение диска по текущему углу. */
    _wheelApply() {
        const cv = /** @type {HTMLElement | null} */ (this.body && this.body.querySelector('.wh-disc'));
        if (cv) cv.style.transform = 'rotate(' + this._wh.angle.toFixed(3) + 'deg)';
    },

    /**
     * Рисует диск: обод, секторы с подписями (значок + сумма / превью предмета). hi — подсвеченный выигрышный сектор (-1 — нет).
     * secs — снимок секторов (Wheel.sectors()) ДО выдачи приза: пока сектор подсвечен, он остаётся таким, каким выпал
     * (выигранный предмет уже «есть», и Wheel показал бы вместо него валюту).
     */
    _wheelDraw(hi, secs0) {
        const w = this._wh;
        const cv = /** @type {HTMLCanvasElement | null} */ (this.body && this.kind === 'wheel' ? this.body.querySelector('.wh-disc') : null);
        if (!cv || !cv.width || typeof Wheel === 'undefined') return;
        w.hi = hi;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        if (secs0) w.snap = secs0; else if (hi < 0) w.snap = null;
        const secs = hi >= 0 && w.snap ? w.snap : Wheel.sectors();
        w.secs = secs;
        cv.setAttribute('aria-label', secs.map((x) => x.label).join(', '));
        const n = secs.length, size = cv.width, R = size / 2, u = R / 150, TAU = Math.PI * 2, step = TAU / n, K = GAME_ICON_INK;
        const Rs = R * 0.925;
        const redraw = () => { if (this.kind === 'wheel') this._wheelDraw(this._wh.hi); };
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(R, R);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        // обод
        const rim = ctx.createLinearGradient(0, -R, 0, R);
        rim.addColorStop(0, '#fff3a6'); rim.addColorStop(0.5, '#ffc21a'); rim.addColorStop(1, '#d9780c');
        ctx.beginPath(); ctx.arc(0, 0, R - 2 * u, 0, TAU); ctx.fillStyle = rim; ctx.fill();
        ctx.lineWidth = 4.500 * u; ctx.strokeStyle = K; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, Rs, 0, TAU); ctx.lineWidth = 3.500 * u; ctx.stroke();
        // секторы
        for (let i = 0; i < n; i++) {
            const a0 = -Math.PI / 2 + (i - 0.5) * step, a1 = a0 + step;
            const item = secs[i].kind === 'item';
            const own = secs[i].data && typeof secs[i].data.color === 'string' && /^#[0-9a-f]{6}$/i.test(secs[i].data.color) ? secs[i].data.color : '';   // цвет сектора из данных игры
            const base = own || (item ? (i % 2 ? '#7a45ee' : '#5b2fd2') : this.WHEEL_COLORS[i % this.WHEEL_COLORS.length]);
            const g = ctx.createRadialGradient(0, 0, Rs * 0.1, 0, 0, Rs);
            g.addColorStop(0, GameIcons.lighten(GameIcons.num(base, 0x888888), 0.28)); g.addColorStop(0.55, base); g.addColorStop(1, GameIcons.darken(GameIcons.num(base, 0x888888), 0.22));
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, Rs - 1 * u, a0, a1); ctx.closePath();
            ctx.fillStyle = g; ctx.fill();
            ctx.lineWidth = 3 * u; ctx.strokeStyle = K; ctx.stroke();
            if (hi >= 0) {
                if (hi === i) { ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.fill(); } else { ctx.fillStyle = 'rgba(15,10,50,.46)'; ctx.fill(); }
            }
        }
        if (hi >= 0) {   // белая рамка выигрышного сектора поверх соседей
            const a0 = -Math.PI / 2 + (hi - 0.5) * step, a1 = a0 + step;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, Rs - 1 * u, a0, a1); ctx.closePath();
            ctx.lineWidth = 6 * u; ctx.strokeStyle = '#fff'; ctx.stroke();
            ctx.lineWidth = 2.200 * u; ctx.strokeStyle = K; ctx.stroke();
        }
        // подписи: локальная ось «вверх» смотрит на обод
        const font = (px) => '1000 ' + px.toFixed(1) + 'px Nunito, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
        const chord = (r) => 2 * r * Math.sin(step / 2);
        for (let i = 0; i < n; i++) {
            const sc = secs[i];
            ctx.save();
            ctx.rotate(i * step);
            ctx.globalAlpha = hi >= 0 && hi !== i ? 0.65 : 1;
            if (sc.kind === 'item') {
                const it = typeof Shop !== 'undefined' ? Shop.item(sc.itemId) : null;
                const rc = this._rarity(it && it.rarity).color;
                const rr = R * 0.60, s = Math.min(R * 0.42, chord(rr) * 0.82);
                ctx.beginPath(); ctx.arc(0, -rr, s * 0.56, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
                ctx.lineWidth = 2.600 * u; ctx.strokeStyle = rc; ctx.stroke();
                const m = document.createElement('canvas');
                m.width = m.height = 128;
                if (it && GameIcons.canPaint(it)) GameIcons.paintItem(m, it);
                if (it && GameIcons.canPaint(it)) ctx.drawImage(m, -s / 2, -rr - s / 2, s, s);
                else { const gi = GameIcons.image('gift', redraw); if (gi && gi.complete && gi.naturalWidth) ctx.drawImage(gi, -s / 2, -rr - s / 2, s, s); }
                this._wheelStar(ctx, 0, -R * 0.84, R * 0.075, '#ffe14a', u);
            } else {
                const ri = R * 0.76, isz = Math.min(R * 0.27, chord(ri) * 0.66);
                const im = GameIcons.image('trophy', redraw);
                if (im && im.complete && im.naturalWidth) ctx.drawImage(im, -isz / 2, -ri - isz / 2, isz, isz);
                const txt = this.hud && typeof this.hud._fmt === 'function' ? this.hud._fmt(sc.coins) : String(sc.coins);
                const rt = R * 0.48, avail = chord(rt) * 0.9;
                ctx.font = font(100);
                const tw = ctx.measureText(txt).width || 1;
                const fs = Math.min(R * 0.2, avail / (tw / 100));
                ctx.font = font(fs);
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.lineWidth = fs * 0.24; ctx.strokeStyle = K; ctx.strokeText(txt, 0, -rt);
                ctx.fillStyle = '#fff'; ctx.fillText(txt, 0, -rt);
            }
            ctx.restore();
        }
        // кольцо вокруг втулки
        ctx.beginPath(); ctx.arc(0, 0, R * 0.17, 0, TAU); ctx.fillStyle = K; ctx.fill();
        ctx.restore();
    },

    _wheelStar(ctx, x, y, r, c, u) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1.600 * u; ctx.strokeStyle = GAME_ICON_INK; ctx.stroke();
    },

    /** Кнопки колеса по Wheel.status(): подпись, таймер до бесплатного вращения, сколько осталось за рекламу, «Через N с», состояние занятости. */
    _wheelButtons() {
        if (!this.body || this.kind !== 'wheel') return;
        const st = Wheel.status();
        const w = this._wh;
        const spin = w.spinning, busy = w.busy || st.busy;
        const sub = /** @type {HTMLElement | null} */ (this.body.querySelector('.wh-sub'));
        if (sub) sub.textContent = spin ? Lang.t('ui.wheel.spinning') : Lang.t('ui.wheel.sub');
        const set = (el, o) => {
            const sig = [o.cls, o.icon, o.l1, o.l2].join('|');
            if (el.dataset.sig === sig) return;
            el.dataset.sig = sig;
            el.className = 'sam-btn wh-btn ' + o.cls;
            el.textContent = '';
            if (o.icon === 'spin') el.appendChild(samEl('span', 'sam-spin'));
            else if (o.icon) el.insertAdjacentHTML('beforeend', GameIcons.html(o.icon));
            const tt = samEl('span', 'tt');
            const l1 = samEl('span', 'l1', o.l1);
            tt.appendChild(l1);
            if (o.l2) tt.appendChild(samEl('span', 'l2', o.l2));
            el.appendChild(tt);
            el.setAttribute('aria-label', o.l1 + (o.l2 ? ' ' + o.l2 : ''));
        };
        const free = /** @type {HTMLElement} */ (this.body.querySelector('[data-w=free]'));
        const ad = /** @type {HTMLElement} */ (this.body.querySelector('[data-w=ad]'));
        if (st.canSpinFree) set(free, { cls: spin || busy ? 'c-gray' : 'c-green', icon: 'gift', l1: Lang.t('ui.wheel.free'), l2: '' });
        else set(free, { cls: 'c-gray is-off off', icon: '', l1: st.freeAvailable ? Lang.t('ui.wheel.free') : Lang.t('ui.wheel.freeIn', { t: st.nextFreeLabel }), l2: '' });
        const left = st.adLeft + st.banked;
        if (!this._adsOk()) set(ad, { cls: 'c-gray is-off off', icon: '', l1: Lang.t('ui.ads.off'), l2: '' });
        else if (w.busy || (st.busy && !spin)) set(ad, { cls: 'c-purple', icon: 'spin', l1: Lang.t('ui.ads.busy'), l2: '' });
        else if (left <= 0) set(ad, { cls: 'c-gray is-off off', icon: '', l1: Lang.t('ui.wheel.tomorrow'), l2: '' });
        else if (st.adWait > 0) set(ad, { cls: 'c-gray', icon: 'adplay', l1: Lang.t('ui.wheel.ad'), l2: this._waitText(st.adWait) });
        else set(ad, { cls: spin ? 'c-gray' : 'c-purple', icon: 'adplay', l1: Lang.t('ui.wheel.ad'), l2: Lang.t('ui.wheel.left', { a: left }) });
        this._wheelFitText();
    },

    /** Длинная подпись кнопки колеса не вылезает за кнопку: --fit на .l1 (не меньше 0.62 и 11px по CSS). */
    _wheelFitText() {
        if (!this.body) return;
        for (const el of Array.from(this.body.querySelectorAll('.wh-btn .l1'))) {
            const l = /** @type {HTMLElement} */ (el);
            l.style.setProperty('--fit', '1');
            const tt = /** @type {HTMLElement} */ (l.parentElement), btn = /** @type {HTMLElement} */ (tt.parentElement);
            const cs = getComputedStyle(btn), ic = tt.previousElementSibling;
            const avail = btn.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0) - (ic ? ic.getBoundingClientRect().width + (parseFloat(cs.columnGap) || 0) : 0) - 2;
            if (avail > 0 && l.scrollWidth > avail) l.style.setProperty('--fit', Math.max(0.62, avail / l.scrollWidth).toFixed(3));
        }
    },

    _wheelClick(kind) {
        const w = this._wh;
        if (w.spinning || w.busy) return;
        const st = Wheel.status();
        if (kind === 'free') {
            if (!st.canSpinFree) { this.hud.toast(st.freeAvailable ? Lang.t('ui.wheel.spinning') : Lang.t('ui.wheel.freeIn', { t: st.nextFreeLabel }), 1600); return; }
        } else {
            if (!this._adsOk()) { this.hud.toast(Lang.t('ui.shop.rewardsOff'), 1800); return; }
            if (!st.canSpinAd) { this.hud.toast(st.adWait > 0 ? this._waitText(st.adWait) : st.adLeft + st.banked <= 0 ? Lang.t('ui.wheel.tomorrow') : Lang.t('ui.shop.rewardsOff'), 1600); return; }
        }
        this._wheelSpin(kind);
    },

    /** Вращение: free — сразу, ad — после rewarded. Окно закрыли, пока шла реклама, — приз всё равно выдаётся (один раз). */
    async _wheelSpin(kind) {
        const w = this._wh;
        this._wheelUnhi();
        /** @type {any} */
        let res = null;
        if (kind === 'free') res = Wheel.spinFree();
        else {
            w.busy = true;
            this._wheelButtons();
            try { res = await Wheel.spinAd(); } catch (e) { res = null; }
            w.busy = false;
        }
        const open = !!this.layer && this.kind === 'wheel' && this._wh === w;
        if (!res || !res.ok) {
            if (open) this._wheelButtons();
            const why = res && res.reason;
            if (why === 'cooldown') this.hud.toast(this._waitText(Wheel.adWaitSec() || 1), 1600);
            else if (why === 'limit') this.hud.toast(Lang.t('ui.wheel.tomorrow'), 1600);
            else if (why !== 'busy' && why !== 'pending' && why !== 'noFree') this.hud.toast(Lang.t('ui.ads.failed'), 2200);
            return;
        }
        if (!open) {
            const r = Wheel.finish();
            if (r && r.ok) { this._cb('onWheel', r); this.hud.setWheelBadge(!!Wheel.badge()); this.hud.toast(r.label, 2600); }
            return;
        }
        this._wheelRun(res, w.angle, 0);
    },

    /** Анимация: ease-out до Wheel.angleFrom(угол, res), последний кадр — точно целевой угол. elapsedMs — уже прошедшее время (доигрываем). */
    _wheelRun(res, start, elapsedMs) {
        const w = this._wh;
        const body = this.body;
        if (!body) return;
        const disc = /** @type {HTMLElement} */ (body.querySelector('.wh-disc')), stage = /** @type {HTMLElement} */ (body.querySelector('.wh-stage')), ptr = /** @type {HTMLElement} */ (body.querySelector('.wh-ptr'));
        const dur = Math.max(1200, Number(res.durationMs) || 5500);
        const target = Wheel.angleFrom(start, res);
        const step = Wheel.step();
        w.spinning = true;
        stage.classList.add('spinning');
        stage.classList.remove('won');
        this._wheelButtons();
        const t0 = performance.now() - Math.max(0, elapsedMs || 0);
        let lastIdx = -1, lastTick = 0;
        const frame = (now) => {
            w.raf = 0;
            if (!this.layer || this.kind !== 'wheel' || this._wh !== w) return;
            const k = Math.min(1, (now - t0) / dur);
            const ang = k >= 1 ? target : start + (target - start) * (1 - Math.pow(1 - k, 3.6));
            disc.style.transform = 'rotate(' + ang.toFixed(3) + 'deg)';
            const idx = Math.floor((((-ang) % 360 + 360) % 360 + step / 2) / step);
            if (idx !== lastIdx) {
                if (lastIdx >= 0 && now - lastTick > 60) { lastTick = now; this._wheelTick(ptr); }
                lastIdx = idx;
            }
            if (k < 1) { w.raf = requestAnimationFrame(frame); return; }
            this._wheelStop(target, res);
        };
        w.raf = requestAnimationFrame(frame);
    },

    /** Щелчок стрелки о штырь: короткий качок + cb.onWheelTick (игра может сыграть звук). */
    _wheelTick(ptr) {
        if (typeof ptr.animate === 'function') ptr.animate([{ transform: 'translateX(-50%) rotate(0deg)' }, { transform: 'translateX(-50%) rotate(-24deg)', offset: 0.3 }, { transform: 'translateX(-50%) rotate(0deg)' }], { duration: 150, easing: 'ease-out' });
        this._cb('onWheelTick');
    },

    /** Диск остановился ровно на target: приз выдаётся (Wheel.finish — один раз), игра узнаёт, сектор подсвечивается, потом окно «Выигрыш!». */
    _wheelStop(target, res) {
        const w = this._wh;
        w.angle = ((target % 360) + 360) % 360;
        this._wheelApply();
        w.spinning = false;
        const stage = /** @type {HTMLElement | null} */ (this.body && this.body.querySelector('.wh-stage'));
        if (stage) { stage.classList.remove('spinning'); stage.classList.add('won'); }
        const before = Wheel.sectors();   // как выглядели секторы до выдачи приза
        const r = Wheel.finish();
        this.hud.setWheelBadge(!!Wheel.badge());
        this._syncBalance(true);
        if (!r || !r.ok) { this._wheelButtons(); return; }
        this._cb('onWheel', r);
        this._wheelDraw(r.sector, before);
        this._wheelButtons();
        setTimeout(() => { if (this.kind === 'wheel' && this._wh === w) this._wheelPop(r); }, 750);
    },

    _wheelUnhi() {
        const stage = /** @type {HTMLElement | null} */ (this.body && this.body.querySelector('.wh-stage'));
        if (stage) stage.classList.remove('won');
        if (this._wh.hi >= 0) this._wheelDraw(-1);
    },

    /** Окно закрыли посреди вращения (или игра закрыла окно): приз выдаётся сразу и ровно один раз. */
    _wheelAbort() {
        const w = this._wh;
        if (w.raf) { cancelAnimationFrame(w.raf); w.raf = 0; }
        w.spinning = false;
        if (typeof Wheel !== 'undefined' && Wheel.state && Wheel.state.pending) {
            const r = Wheel.finish();
            if (r && r.ok) { this._cb('onWheel', r); this.hud.setWheelBadge(!!Wheel.badge()); this.hud.toast(r.label, 2600); }
        }
    },

    /** «Выигрыш!»: победы (+N) и/или предмет с превью и редкостью; предмет, который уже есть, пришёл победами (got.converted). */
    _wheelPop(r) {
        if (!this.body) return;
        const pop = /** @type {HTMLElement} */ (this.body.querySelector('.d-pop'));
        pop.textContent = '';
        pop.appendChild(samEl('div', 'pg sam-o', Lang.t('ui.wheel.win')));
        const items = samEl('div', 'pi');
        for (const g of r.got || []) {
            const box = samEl('div', 'pr sam-o');
            if (g.type === 'item') {
                const it = Shop.item(g.id);
                if (it && GameIcons.canPaint(it)) box.appendChild(this._icon(it, 160)); else box.innerHTML = GameIcons.html('gift');
                box.appendChild(samEl('small', '', Shop.name(g.id)));
                if (it && it.rarity) { const ra = this._rarity(it.rarity); const t = samEl('small', '', ra.label); t.style.color = ra.color; box.appendChild(t); }
            } else {
                box.innerHTML = GameIcons.html('trophy');
                box.appendChild(samEl('span', '', Lang.t('ui.wheel.coins', { n: g.amount })));
                if (g.converted) box.appendChild(samEl('small', '', Lang.t('reward.dup', { n: g.amount })));
            }
            items.appendChild(box);
        }
        pop.appendChild(items);
        const ok = samEl('button', 'sam-btn c-orange');
        ok.type = 'button';
        ok.textContent = Lang.t('ui.daily.ok');
        ok.addEventListener('click', () => { ok.blur(); pop.classList.remove('on'); this._wheelUnhi(); this._wheelButtons(); });
        pop.appendChild(ok);
        pop.classList.add('on');
    },

    // =============================================================================================
    // Перерождение
    // =============================================================================================

    /** info = { level, needLevel, rebirths, multNow, multNext, canRebirth } */
    rebirth(info) {
        if (!info) return;
        this._info = info;
        if (this.kind === 'rebirth') { this._renderRebirth(); return; }
        const body = this._open('rebirth', 'ui.rb.title', ['#ff9ad0', '#ff4a8f'], false);
        if (!body) return;
        body.className = 'win-body rb-body';
        this._renderRebirth();
    },

    _renderRebirth() {
        if (!this.body || this.kind !== 'rebirth') return;
        const i = this._info || {};
        const num = (n) => String(Math.round((Number(n) || 0) * 100) / 100);
        const arrow = '<svg class="rb-arrow" viewBox="0 0 40 30" aria-hidden="true"><path d="M5 15h24M21 5l11 10-11 10" fill="none" stroke="#14102f" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 15h24M21 5l11 10-11 10" fill="none" stroke="#fff" stroke-width="4.600" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const need = Math.max(1, Number(i.needLevel) || 1);
        const pct = Math.max(0, Math.min(100, 100 * (Number(i.level) || 0) / need));
        const b = this.body;
        b.innerHTML =
            '<div class="rb-grid"><div class="rb-h"></div><div></div><div class="rb-h"></div>' +
            '<div class="rb-pill xp sam-o"></div>' + arrow + '<div class="rb-pill xp new sam-o"></div>' +
            '<div class="rb-pill lv sam-o"></div>' + arrow + '<div class="rb-pill lv new sam-o"></div></div>' +
            '<div class="rb-prog bar"><div class="fill"></div><div class="row"><span></span></div></div>' +
            '<div class="rb-warn sam-o"></div><div class="rb-cnt sam-o"></div><button type="button" class="sam-btn go"></button>';
        const q = (s) => /** @type {HTMLElement[]} */ (Array.from(b.querySelectorAll(s)));
        const hs = q('.rb-h'); hs[0].textContent = Lang.t('ui.rb.now'); hs[1].textContent = Lang.t('ui.rb.after');
        const xp = q('.rb-pill.xp'); xp[0].textContent = Lang.t('ui.rb.xpv', { n: num(i.multNow) }); xp[1].textContent = Lang.t('ui.rb.xpv', { n: num(i.multNext) });
        const lv = q('.rb-pill.lv'); lv[0].textContent = Lang.t('ui.rb.lvv', { n: i.level }); lv[1].textContent = Lang.t('ui.rb.lvv', { n: 1 });
        q('.rb-prog .fill')[0].style.width = pct + '%';
        q('.rb-prog .row span')[0].textContent = Lang.t('ui.rb.progress', { a: i.level, b: need });
        q('.rb-warn')[0].textContent = Lang.t('ui.rb.warn');
        q('.rb-cnt')[0].textContent = Lang.t('ui.rb.count', { n: i.rebirths || 0 });
        const go = q('.go')[0];
        if (i.canRebirth) {
            go.classList.add('c-green');
            go.innerHTML = GameIcons.html('rebirth');
            go.appendChild(samEl('span', '', Lang.t('ui.rb.go')));
            go.addEventListener('click', () => { go.blur(); this.close(); this._cb('onRebirth'); });
        } else {
            go.classList.add('c-gray', 'is-off');
            go.innerHTML = GameIcons.html('lock');
            go.appendChild(samEl('span', '', Lang.t('ui.rb.need', { n: need })));
            go.addEventListener('click', () => { go.blur(); this.hud.toast(Lang.t('ui.rb.need', { n: need }), 1600); });
        }
    },

    // =============================================================================================
    // Телепорт
    // =============================================================================================

    /** list = [{ n, name, unlocked }]; кнопка «В лобби» — cb.onLobby, этап — cb.onTeleport(n). */
    teleport(list) {
        this._list = Array.isArray(list) ? list : [];
        if (this.kind === 'teleport') { this._renderTeleport(); return; }
        const body = this._open('teleport', 'ui.tp.title', ['#7fd8ff', '#2f8cff'], false);
        if (!body) return;
        body.className = 'win-body tp-body';
        this._renderTeleport();
    },

    _renderTeleport() {
        if (!this.body || this.kind !== 'teleport') return;
        const b = this.body;
        b.textContent = '';
        const grid = samEl('div', 'tp-grid');
        const lobby = samEl('button', 'sam-btn tp lobby c-orange');
        lobby.type = 'button';
        lobby.innerHTML = GameIcons.html('home');
        lobby.appendChild(samEl('span', '', Lang.t('ui.tp.lobby')));
        lobby.addEventListener('click', () => { lobby.blur(); this.close(); this._cb('onLobby'); });
        grid.appendChild(lobby);
        for (const s of this._list) {
            const data = typeof STAGES !== 'undefined' ? STAGES.find((x) => x.id === s.n) : null;
            const btn = samEl('button', 'sam-btn tp ' + (s.unlocked ? 'c-blue' : 'c-gray off'));
            btn.type = 'button';
            btn.style.setProperty('--sc', data ? data.color : '#ff8a3d');
            const nm = typeof s.name === 'object' && s.name ? (s.name[Lang.code] || s.name.en || s.name.ru || '') : String(s.name || '');
            btn.appendChild(samEl('span', 'num', String(s.n)));
            const tn = samEl('span', 'tn');
            tn.appendChild(samEl('span', '', nm));
            tn.appendChild(samEl('small', '', s.unlocked ? Lang.t('ui.tp.stage', { n: s.n }) : Lang.t('ui.tp.locked')));
            btn.appendChild(tn);
            if (!s.unlocked) { const l = samEl('span', ''); l.innerHTML = GameIcons.html('lock', 'lk'); btn.appendChild(l.firstChild); }
            btn.addEventListener('click', () => {
                btn.blur();
                if (!s.unlocked) { this.hud.toast(Lang.t('ui.tp.need', { n: Math.max(1, s.n - 1) }), 1600); return; }   // что откроет этап, а не просто «Закрыто»
                this.close();
                this._cb('onTeleport', s.n);
            });
            grid.appendChild(btn);
        }
        b.appendChild(grid);
        // название переносится на вторую строку; длинное слово, которое не лезет и так, чуть сжимаем (не мельче 0.8 и 11px по CSS)
        for (const n of Array.from(grid.querySelectorAll('.tp .tn>span:first-child'))) {
            const e = /** @type {HTMLElement} */ (n);
            const box = /** @type {HTMLElement} */ (e.parentElement);
            if (box.clientWidth > 0 && e.scrollWidth > box.clientWidth + 1) e.style.setProperty('--fit', Math.max(0.8, box.clientWidth / e.scrollWidth).toFixed(3));
        }
    },
};
