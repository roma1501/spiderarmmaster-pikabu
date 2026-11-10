// @ts-nocheck
// PikabuPacks.js — наборы за рубли в сборке Пикабу Игр (js/PikabuShop.js). Цены и названия товаров — в Студии
// (каталог CSV: coins_s 19 ₽, coins_m 49 ₽, coins_l 99 ₽, starter 29 ₽, no_ads 59 ₽), здесь — что игрок получает.
// Валюта — победы (Shop.addCoins), предметы набора — легендарки «за рекламу» из GameData.
PikabuShop.setup({
    colors: ['#7c4dff', '#ff4f8b'],
    ready: () => !!(typeof Game !== 'undefined' && Game.save && typeof Shop !== 'undefined' && Shop.state),
    visible: () => Game.state !== 'play' && !(typeof GameWindows !== 'undefined' && GameWindows.isOpen()) && !(typeof Tutorial !== 'undefined' && Tutorial.active),
    persist: () => Game.persist(),
    button: { corner: 'tr', x: 12, y: 74 },
    packs: [
        { id: 'coins_s', type: 'consumable', icon: '🏅', name: 'Пачка побед', desc: '300 побед на руки, облики и следы', grant: () => Shop.addCoins(300) },
        { id: 'coins_m', type: 'consumable', icon: '🎖️', name: 'Мешок побед', desc: '1 000 побед', grant: () => Shop.addCoins(1000) },
        { id: 'coins_l', type: 'consumable', icon: '🏆', name: 'Гора побед', desc: '3 000 побед — хватит на самые дорогие предметы', best: true, grant: () => Shop.addCoins(3000) },
        {
            id: 'starter', type: 'non_consumable', icon: '🐉', name: 'Сердце дракона', best: 'Один раз',
            desc: '500 побед, облик «Дракон», рука «Магма» и след «Северное сияние»',
            grant: () => Shop.addCoins(500),
            apply: () => ['skin-dragon', 'arm-magma', 'trail-aurora'].forEach((id) => { if (!Shop.owns(id)) Shop.grant(id); }),
        },
        { id: 'no_ads', type: 'non_consumable', icon: '🚫', name: 'Без рекламы', desc: 'Убирает рекламу между забегами навсегда. Награды за рекламу остаются', noAds: true },
    ],
});
