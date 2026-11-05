// SpiderBody.js — тело на руках-щупальцах: ходьба (руки переставляются по земле, тело висит на них), лазание по любой
// вертикальной грани при зажатом «Лезть» (хватка тратится за высоту), перелезание через край, падение и ловля стены,
// тренировка (руки бьют по мишени). Мир — запросы ObbyCourse (чистая логика, одинаково на всех устройствах).
//
// Каждая рука — цепочка точек: каждая точка — пружина с затуханием (инерция, раскачка; не зависит от FPS) к своей цели на
// направляющей кривой «плечо → дуга над спиной → кончик на поверхности», опущенной на провис; кончик шагает по
// поверхности походкой (не больше половины рук в полёте, соседи не шагают вместе). Вид рук — SpiderArmsView
// (js/SpiderArms.js), вид тела — SpiderAvatar.
// Лазание: рывок в такт постановкам рук, обход внешних углов коробок (mantle с corner), перелезание и тонких стен;
// приземление — удар: руки хлопают в пол, торс проседает и пружинит.
//
//   const b = new SpiderBody({ arms: 2, reach: 360, collide: true });
//   b.place(x, y, z, yaw);                                 // y — центр торса (ноги ниже на SPIDER_FEET)
//   b.step(dt, { mx, mz, climb, speedMul });              // mx, mz — желаемое направление по миру (длина ≤ 1)
//   b.on = { plant(arm, p, n), grab(n), mantle(), land(speed), outOfGrip(), punch(arm, p) };
//   b.mode: 'walk' | 'climb' | 'mantle' | 'air' | 'train'
// Координаты — мир Babylon: x, y вверх, z (y карты). Числа — SPIDER_* в Constants.js.

/** @satisfies {Record<string, any>} */
const SpiderMath = {
    len(x, y, z) { return Math.sqrt(x * x + y * y + z * z); },
    norm(v) { const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; v[0] /= l; v[1] /= l; v[2] /= l; return v; },
    cross(a, b, o) { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o = o || [0, 0, 0]; o[0] = x; o[1] = y; o[2] = z; return o; },
    dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
    smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); },
    damp(rate, dt) { return 1 - Math.exp(-rate * dt); },
};

/** @satisfies {Record<string, any>} */
const SpiderCfg = {
    get() {
        const U = 'undefined';
        return {
            walk: typeof SPIDER_WALK_SPEED !== U ? SPIDER_WALK_SPEED : 430,
            walkPerArm: typeof SPIDER_WALK_PER_ARM !== U ? SPIDER_WALK_PER_ARM : 40,
            hover: typeof SPIDER_HOVER !== U ? SPIDER_HOVER : 235,
            feet: typeof SPIDER_FEET !== U ? SPIDER_FEET : 100,
            reach: typeof SPIDER_REACH !== U ? SPIDER_REACH : 360,
            climb: typeof SPIDER_CLIMB_SPEED !== U ? SPIDER_CLIMB_SPEED : 165,
            climbPerArm: typeof SPIDER_CLIMB_PER_ARM !== U ? SPIDER_CLIMB_PER_ARM : 30,
            wallDist: typeof SPIDER_WALL_DIST !== U ? SPIDER_WALL_DIST : 110,
            gravity: typeof SPIDER_GRAVITY !== U ? SPIDER_GRAVITY : 2600,
            fallMax: typeof SPIDER_FALL_MAX !== U ? SPIDER_FALL_MAX : 2600,
            gripPx: typeof SPIDER_GRIP_PX !== U ? SPIDER_GRIP_PX : 20,
            hangDrain: typeof SPIDER_HANG_DRAIN !== U ? SPIDER_HANG_DRAIN : 1.5,
            gripRefill: typeof SPIDER_GRIP_REFILL !== U ? SPIDER_GRIP_REFILL : 140,
            stepDist: typeof SPIDER_STEP_DIST !== U ? SPIDER_STEP_DIST : 0.42,
            stepTime: typeof SPIDER_STEP_TIME !== U ? SPIDER_STEP_TIME : 0.2,
            stepLift: typeof SPIDER_STEP_LIFT !== U ? SPIDER_STEP_LIFT : 80,
            stepUp: typeof SPIDER_STEP_UP !== U ? SPIDER_STEP_UP : 300,
            accel: typeof SPIDER_ACCEL !== U ? SPIDER_ACCEL : 9,
            radius: typeof SPIDER_RADIUS !== U ? SPIDER_RADIUS : 42,
            segs: typeof SPIDER_ARM_POINTS !== U ? SPIDER_ARM_POINTS : 14,
            stiff: typeof SPIDER_ARM_STIFF !== U ? SPIDER_ARM_STIFF : 24,
            wobble: typeof SPIDER_ARM_WOBBLE !== U ? SPIDER_ARM_WOBBLE : 11,
            sag: typeof SPIDER_ARM_SAG !== U ? SPIDER_ARM_SAG : 2500,
            armDamp: typeof SPIDER_ARM_DAMP !== U ? SPIDER_ARM_DAMP : 0.4,
            landSquash: typeof SPIDER_LAND_SQUASH !== U ? SPIDER_LAND_SQUASH : 120,
            surge: typeof SPIDER_CLIMB_SURGE !== U ? SPIDER_CLIMB_SURGE : 1.6,
            punchRate: typeof SPIDER_PUNCH_RATE !== U ? SPIDER_PUNCH_RATE : 2.2,
        };
    },
};

/** Можно ли хвататься за коллайдер (бортики-границы карты — нет). */
function spiderGrabbable(col) {
    const p = col && col.piece;
    if (!p) return true;
    return p.color !== 'bound' && !(p.prm && p.prm.role === 'nogrip');
}

class SpiderBody {
    /** @param {{ arms?: number, reach?: number, collide?: boolean, armCollide?: boolean, scale?: number }} [opts] */
    constructor(opts) {
        const o = opts || {};
        this.c = SpiderCfg.get();
        this.x = 0; this.y = 0; this.z = 0;
        this.vx = 0; this.vy = 0; this.vz = 0;
        this.yaw = 0; this.yawV = 0;
        this.mode = 'walk';
        this.n = [0, 1, 0];          // нормаль поверхности, на которой тело (земля — вверх, стена — от стены)
        this.wall = 0;               // расстояние до стены в режиме лазания
        this.wallCol = null;
        this.groundY = 0;
        this.ground = null;          // коллайдер опоры
        this.grip = 100; this.gripMax = 100;
        this.gripMult = 1;           // ледяная стена тратит хватку быстрее
        this.reach = o.reach || this.c.reach;
        this.collide = o.collide !== false;
        this.armCollide = o.armCollide != null ? !!o.armCollide : this.collide;   // руки не проходят сквозь стены (дорого — у героя)
        this.arms = [];
        this.on = {};
        this.t = 0;
        this.ax = 0; this.az = 0;    // ускорение в осях героя (для маятника ног)
        this.noGrab = 0;             // нельзя схватиться (после «нет хватки» — до приземления)
        this.spent = false;          // хватка кончилась: не хвататься снова, пока она не накопится (или «Лезть» отпущена)
        this.surge = 0; this.surgeAvg = 0;   // рывок лазания: каждая постановка руки подтягивает тело
        this.wrapHold = 0;           // с после обхода угла: «от стены» не считается спуском, пока ввод не сменился
        /** @type {number[] | null} */
        this.wrapDir = null;         // направление ввода (в мире) в момент обхода угла
        /** @type {Float32Array | null} */
        this._gs = null;             // выборка направляющей руки по длине дуги (общая для рук, считается заново в _chain)
        this.mantle = null;
        this.train = null;           // { px, py, pz, nx, nz } — мишень тренировки
        this.fallSpeed = 0;
        this.climbedPx = 0;
        this.speed = 0;
        this.airT = 0;
        this.setArms(o.arms || 2);
    }

    // ---------------------------------------------------------------------------------------------
    // Руки
    // ---------------------------------------------------------------------------------------------

    /** Число рук: новые растут из спины сразу «в воздухе» и находят опору сами. */
    setArms(n) {
        n = Math.max(1, Math.min(8, n | 0));
        const K = this.c.segs;
        while (this.arms.length < n) {
            const i = this.arms.length;
            const pts = new Float32Array(K * 3), old = new Float32Array(K * 3);
            this.arms.push({ i, state: 'free', tip: [this.x, this.y, this.z], n: [0, 1, 0], from: [0, 0, 0], to: [0, 0, 0], toN: [0, 1, 0],
                t: 0, dur: 0.2, lift: 60, grip: 0, retry: 0, pts, old, root: [0, 0, 0], dir: [0, 1, 0], theta: 0, side: 1, home: [0, 0, 0],
                punchT: -1, punchP: [0, 0, 0], rest: 1, idle: 0, col: null, fresh: true, dtPrev: 0 });
        }
        if (this.arms.length > n) this.arms.length = n;
        this._layout();
        for (const a of this.arms) if (a.fresh) this._resetChain(a);
    }

    // Углы «домашних» точек рук по кругу (0 — вперёд, плюс — вправо) и сторона на спине.
    _layout() {
        const N = this.arms.length;
        const left = [], right = [];
        for (let i = 0; i < N; i++) (i % 2 ? left : right).push(this.arms[i]);
        const spread = (list, s) => {
            const m = list.length;
            list.forEach((a, k) => {
                const f = m === 1 ? 0.45 : k / (m - 1);
                a.theta = s * (0.55 + f * 1.75);   // от 31° до 132° от «вперёд»
                a.side = s;
                a.row = k;
            });
        };
        spread(right, 1); spread(left, -1);
    }

    _resetChain(a) {
        this._roots();
        const K = this.c.segs;
        for (let j = 0; j < K; j++) {
            const k = j / (K - 1);
            const x = a.root[0] + (a.tip[0] - a.root[0]) * k, y = a.root[1] + (a.tip[1] - a.root[1]) * k + Math.sin(k * Math.PI) * 60, z = a.root[2] + (a.tip[2] - a.root[2]) * k;
            a.pts[j * 3] = a.old[j * 3] = x; a.pts[j * 3 + 1] = a.old[j * 3 + 1] = y; a.pts[j * 3 + 2] = a.old[j * 3 + 2] = z;
        }
        a.fresh = false;
    }

    // ---------------------------------------------------------------------------------------------
    // Постановка
    // ---------------------------------------------------------------------------------------------

    place(x, y, z, yaw) {
        this.x = x; this.y = y; this.z = z;
        this.vx = this.vy = this.vz = 0;
        if (yaw != null) this.yaw = yaw;
        this.mode = 'walk'; this.n = [0, 1, 0]; this.mantle = null; this.train = null; this.noGrab = 0;
        this.spent = false; this.surge = this.surgeAvg = 0; this.wrapHold = 0; this.wrapDir = null;
        const g = ObbyCourse.rayDown(x, y + 60, z, 2000);
        if (g) { this.groundY = g.y; this.y = g.y + this.c.hover; this.ground = g.col; }
        this._roots();
        for (const a of this.arms) { this._plantHome(a, true); a.fresh = true; this._resetChain(a); }
    }

    /** Ноги героя (для аватара и табличек). */
    feetY() { return this.y - this.c.feet; }

    // Плечи: пучок у «рюкзака» на спине, по рядам.
    _roots() {
        const f = [Math.cos(this.yaw), 0, Math.sin(this.yaw)], r = [-f[2], 0, f[0]];
        for (const a of this.arms) {
            const row = a.row || 0;
            const up = 42 - row * 9, back = -20 - row * 3, side = a.side * (9 + row * 5);
            a.root[0] = this.x + f[0] * back + r[0] * side;
            a.root[1] = this.y + up;
            a.root[2] = this.z + f[2] * back + r[2] * side;
        }
    }

    // Рамка поверхности: нормаль n, «вперёд» по поверхности f, «вправо» r.
    _frame() {
        const n = this.n;
        let f;
        if (this.mode === 'climb' || this.mode === 'mantle' && this.mantle && this.mantle.wall) f = [0, 1, 0];
        else f = [Math.cos(this.yaw), 0, Math.sin(this.yaw)];
        // f по плоскости поверхности
        const d = SpiderMath.dot(f, n);
        f = SpiderMath.norm([f[0] - n[0] * d, f[1] - n[1] * d, f[2] - n[2] * d]);
        const r = SpiderMath.norm(SpiderMath.cross(f, n));
        return { n, f, r };
    }

    // Идеальная точка руки на поверхности (без поиска опоры).
    _homePoint(a, fr, lead, out) {
        const R = this.reach * 0.62;
        const dist = this.mode === 'climb' ? this.wall : this.c.hover;
        const c = Math.cos(a.theta), s = Math.sin(a.theta);
        const fs = this.mode === 'climb' ? 0.85 : 1;
        out[0] = this.x - fr.n[0] * dist + (fr.f[0] * c * fs + fr.r[0] * s) * R + this.vx * lead;
        out[1] = this.y - fr.n[1] * dist + (fr.f[1] * c * fs + fr.r[1] * s) * R + this.vy * lead;
        out[2] = this.z - fr.n[2] * dist + (fr.f[2] * c * fs + fr.r[2] * s) * R + this.vz * lead;
        return out;
    }

    // Поиск опоры около точки p: луч вдоль −n, затем от плеча к точке. → { p, n, col } | null
    _probe(p, n, root) {
        const up = 170;
        let h = ObbyCourse.ray(p[0] + n[0] * up, p[1] + n[1] * up, p[2] + n[2] * up, -n[0], -n[1], -n[2], up + 220);
        if (h && spiderGrabbable(h.col)) {
            const t = h.t;
            return { p: [p[0] + n[0] * (up - t), p[1] + n[1] * (up - t), p[2] + n[2] * (up - t)], n: h.n.slice(), col: h.col };
        }
        if (root) {
            const dx = p[0] - root[0], dy = p[1] - root[1], dz = p[2] - root[2], l = SpiderMath.len(dx, dy, dz) || 1;
            h = ObbyCourse.ray(root[0], root[1], root[2], dx / l, dy / l, dz / l, this.reach * 1.05);
            if (h && spiderGrabbable(h.col)) return { p: [root[0] + dx / l * h.t, root[1] + dy / l * h.t, root[2] + dz / l * h.t], n: h.n.slice(), col: h.col };
        }
        return null;
    }

    _plantHome(a, instant) {
        const fr = this._frame();
        this._homePoint(a, fr, 0, a.home);
        const hit = this._probe(a.home, fr.n, a.root);
        if (hit) {
            a.tip = hit.p; a.n = hit.n; a.col = hit.col;
            a.state = 'plant'; a.grip = 1;
        } else if (instant) { a.state = 'free'; a.tip = a.home.slice(); }
    }

    // ---------------------------------------------------------------------------------------------
    // Кадр
    // ---------------------------------------------------------------------------------------------

    /** @param {number} dt @param {{ mx?: number, mz?: number, climb?: boolean, speedMul?: number, face?: number }} cmd */
    step(dt, cmd) {
        dt = Math.min(dt, 1 / 30);
        if (dt <= 0) return;
        this.t += dt;
        const c = this.c;
        const pvx = this.vx, pvz = this.vz;
        const nArms = this.arms.length;
        cmd = cmd || {};
        // хватка кончилась: снова хвататься можно, когда накопилось 30% (или «Лезть» отпущена) — иначе цикл «схватил → пусто → упал»
        if (this.spent && (!cmd.climb || this.grip >= this.gripMax * 0.3)) this.spent = false;
        if (this.mode === 'walk') this._walk(dt, cmd, c, nArms);
        else if (this.mode === 'climb') this._climb(dt, cmd, c, nArms);
        else if (this.mode === 'mantle') this._mantle(dt, c);
        else if (this.mode === 'train') this._train(dt, cmd, c);
        else this._air(dt, cmd, c);
        if (this.noGrab > 0 && this.mode !== 'air') this.noGrab = 0;
        // ускорение в осях героя — для болтающихся ног
        const f = [Math.cos(this.yaw), Math.sin(this.yaw)];
        const ax = (this.vx - pvx) / dt, az = (this.vz - pvz) / dt;
        this.ax += ((ax * f[0] + az * f[1]) - this.ax) * SpiderMath.damp(10, dt);
        this.az += ((-ax * f[1] + az * f[0]) - this.az) * SpiderMath.damp(10, dt);
        this.speed = Math.hypot(this.vx, this.vz);
        this._roots();
        this._gait(dt, cmd, c);
        for (const a of this.arms) this._chain(a, dt, c);
    }

    _turnTo(target, dt, rate) {
        let d = target - this.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.yaw += d * SpiderMath.damp(rate, dt);
    }

    _collide() {
        if (!this.collide) return;
        const r = this.c.radius;
        const o = ObbyCourse.pushOut(this.x, this.y - this.c.feet + 8, this.z, r, this.c.feet + 70);
        const nx = o.x - this.x, ny = o.y + this.c.feet - 8 - this.y, nz = o.z - this.z, l = Math.hypot(nx, ny, nz);
        this.x = o.x; this.z = o.z; this.y = o.y + this.c.feet - 8;
        // скорость «в препятствие» гасится: тело не копит разгон об стену и не «скребёт» пол (звук лазания, шаги)
        if (l > 0.01) {
            const vn = (this.vx * nx + this.vy * ny + this.vz * nz) / l;
            if (vn < 0) { this.vx -= nx / l * vn; this.vy -= ny / l * vn; this.vz -= nz / l * vn; }
        }
    }

    // ----- ходьба на руках -----
    _walk(dt, cmd, c, nArms) {
        const sp = (c.walk + c.walkPerArm * (nArms - 2)) * (cmd.speedMul || 1);
        const tvx = (cmd.mx || 0) * sp, tvz = (cmd.mz || 0) * sp;
        const k = SpiderMath.damp(c.accel, dt);
        this.vx += (tvx - this.vx) * k; this.vz += (tvz - this.vz) * k;
        if (Math.hypot(tvx, tvz) > 30) this._turnTo(Math.atan2(tvz, tvx), dt, 9);
        else if (cmd.face != null) this._turnTo(cmd.face, dt, 6);
        // опора под телом и чуть впереди (ступени, бордюры — тело поднимается заранее)
        const g = ObbyCourse.rayDown(this.x, this.y + 40, this.z, c.hover + c.stepUp + 260);
        const sp2 = Math.hypot(this.vx, this.vz);
        let target = null, gy = null;
        if (g) { gy = g.y; this.ground = g.col; this.n = [g.n[0] * 0.3, 0.7 + g.n[1] * 0.3, g.n[2] * 0.3]; SpiderMath.norm(this.n); }
        if (sp2 > 20) {
            const la = 70 + sp2 * 0.16;
            const ah = ObbyCourse.rayDown(this.x + this.vx / sp2 * la, this.y + c.stepUp, this.z + this.vz / sp2 * la, c.stepUp + c.hover + 200);
            if (ah && (gy == null || (ah.y > gy && ah.y - gy <= c.stepUp))) gy = ah.y;
        }
        if (gy != null && this.y - gy <= c.hover + 220) target = gy + c.hover + Math.sin(this.t * 2.2) * 4 - this._swingDip() * 10;
        if (target == null) { this._toAir(); return; }
        this.groundY = gy;
        const dy = target - this.y;
        // высота торса — пружина с лёгким недодемпфированием (ω ≈ 11.8, ζ = 0.6): приземление и уступы дают мягкий «отскок»
        this.vy += (dy * 140 - this.vy * 14.2) * dt;
        this.vy = Math.max(-900, Math.min(900, this.vy));
        this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
        this._collide();
        // подвижная опора везёт тело
        if (this.ground && this.ground.dynamic) {
            const d = ObbyCourse.pointDelta(this.ground, [this.x, gy, this.z]);
            if (d) { this.x += d[0]; this.z += d[2]; }
        }
        // хватка восстанавливается на земле
        if (this.grip < this.gripMax) this.grip = Math.min(this.gripMax, this.grip + c.gripRefill * dt);
        this.gripMult = 1;
        if (cmd.climb && this.grip > 0.5 && !this.spent) this._tryGrab(cmd, false);
    }

    _swingDip() { let s = 0; for (const a of this.arms) if (a.state === 'swing') s++; return this.arms.length ? s / this.arms.length : 0; }

    _toAir() {
        this.mode = 'air';
        this.airT = 0;
        this.n = [0, 1, 0];
        for (const a of this.arms) if (a.state !== 'free') { a.state = 'free'; a.grip = 0.3; }
    }

    // Найти стену рядом и схватиться. inAir — ловля в падении (смотрим во все стороны).
    _tryGrab(cmd, inAir) {
        const c = this.c;
        const dirs = [];
        const mx = cmd.mx || 0, mz = cmd.mz || 0, ml = Math.hypot(mx, mz);
        if (ml > 0.2) dirs.push([mx / ml, 0, mz / ml]);
        dirs.push([Math.cos(this.yaw), 0, Math.sin(this.yaw)]);
        if (inAir) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; dirs.push([Math.cos(a), 0, Math.sin(a)]); }
        const reach = c.wallDist + (inAir ? 170 : 210);
        let best = null;
        for (const d of dirs) for (const oy of inAir ? [0, -60, 70] : [0, 60]) {
            const h = ObbyCourse.ray(this.x, this.y + oy, this.z, d[0], 0, d[2], reach);
            if (!h || Math.abs(h.n[1]) > 0.55 || !spiderGrabbable(h.col)) continue;
            // стена «позади» ввода: игрок от неё уходит (спуск на пол, шаг с края) — не хватаемся и не затаскиваем обратно
            if (ml > 0.2 && (h.n[0] * mx + h.n[2] * mz) / ml > 0.3) continue;
            if (!best || h.t < best.t) best = { t: h.t, n: h.n, col: h.col, d };
        }
        if (!best) return false;
        let n = SpiderMath.norm([best.n[0], 0, best.n[2]]);
        // стена должна быть видна тому же лучу, которым её держит _climb (прямо от торса): косой луч видит углы и торцы,
        // а лазание тут же отпускало бы их — цикл «схватил → отпустил». Заодно берём настоящее расстояние до грани.
        const face = ObbyCourse.ray(this.x, this.y, this.z, -n[0], 0, -n[2], Math.max(c.wallDist + 260, best.t + 80));
        if (!face || Math.abs(face.n[1]) >= 0.62 || !spiderGrabbable(face.col)) return false;
        n = SpiderMath.norm([face.n[0], 0, face.n[2]]);
        best.t = face.t; best.col = face.col;
        // стена должна продолжаться вверх (иначе это бордюр — его перешагивают)
        const above = ObbyCourse.ray(this.x, this.y + 120, this.z, -n[0], 0, -n[2], best.t + 60);
        if (!above && !inAir) {
            // низкий уступ (выше шага, ниже груди): руки сразу втягивают тело наверх
            this.n = n; this.wall = best.t;
            if (this._tryMantle(c, 0)) { if (this.on.grab) this.on.grab(n, false); return true; }
            this.n = [0, 1, 0];
            return false;
        }
        this.mode = 'climb';
        this.n = n;
        this.wall = best.t;
        this.wallCol = best.col;
        this.surge = this.surgeAvg = 0; this.wrapHold = 0;
        this.gripMult = best.col && best.col.piece && (best.col.piece.color === 'frost' || best.col.piece.color === 'ice') ? 1.6 : 1;
        this.vx *= 0.2; this.vz *= 0.2; this.vy = inAir ? this.vy * 0.15 : 0;
        for (const a of this.arms) if (a.state === 'plant') { a.state = 'free'; }
        if (this.on.grab) this.on.grab(n, inAir);
        return true;
    }

    // ----- лазание -----
    _climb(dt, cmd, c, nArms) {
        if (!cmd.climb) { this._letGo(false); return; }
        const n = this.n;
        const hit = ObbyCourse.ray(this.x, this.y, this.z, -n[0], -n[1], -n[2], Math.max(c.wallDist + 260, this.wall + 80));
        const okHit = hit && Math.abs(hit.n[1]) < 0.62 && spiderGrabbable(hit.col);
        if (!okHit) {
            if (this._tryMantle(c, 0)) return;
            if (this._wrapCorner(c, cmd)) return;   // внешний угол коробки: перехват на соседнюю грань, а не падение
            this._letGo(false);
            return;
        }
        // нормаль плавно за стеной
        const hn = SpiderMath.norm([hit.n[0], 0, hit.n[2]]);
        const k = SpiderMath.damp(12, dt);
        this.n = SpiderMath.norm([n[0] + (hn[0] - n[0]) * k, 0, n[2] + (hn[2] - n[2]) * k]);
        this.wall = hit.t;
        this.wallCol = hit.col;
        this.gripMult = hit.col.piece && (hit.col.piece.color === 'frost' || hit.col.piece.color === 'ice') ? 1.6 : 1;
        this._turnTo(Math.atan2(-this.n[2], -this.n[0]), dt, 10);
        // край сверху: на уровне груди стены уже нет — перелезаем
        const top = ObbyCourse.ray(this.x, this.y + 70, this.z, -this.n[0], 0, -this.n[2], this.wall + 90);
        if (!top && this._tryMantle(c, 70)) return;
        // ввод: «Лезть» = вверх; от стены — вниз; вбок — по стене
        const up = [0, 1, 0], r = SpiderMath.norm(SpiderMath.cross(up, this.n));
        const mx = cmd.mx || 0, mz = cmd.mz || 0;
        const away = mx * this.n[0] + mz * this.n[2];
        const lat = mx * r[0] + mz * r[2];
        const sp = (c.climb + c.climbPerArm * (nArms - 2)) * (cmd.speedMul || 1);
        // сразу после обхода угла прежний «вбок» стал «от стены» — спуском это не считаем, пока игрок не сменит направление
        // ввода (или не отпустит стик): камера доворачивается за спину не сразу, и до этого стик «вправо» смотрит от стены
        if (this.wrapHold > 0) {
            this.wrapHold -= dt;
            const ml = Math.hypot(mx, mz);
            if (!this.wrapDir || ml < 0.2 || (mx * this.wrapDir[0] + mz * this.wrapDir[1]) / ml < 0.7) this.wrapHold = 0;
        }
        let vUp = cmd.climbDir != null ? cmd.climbDir * sp : sp * (away > 0.45 && this.wrapHold <= 0 ? -0.7 : 1);
        if (vUp > 0) {
            const ceil = ObbyCourse.ray(this.x, this.y, this.z, 0, 1, 0, 110);
            if (ceil) vUp = 0;
        }
        // рывок руками: каждая постановка подтягивает тело (пульс быстро гаснет); среднюю скорость и расход хватки не меняет
        this.surge *= Math.exp(-6 * dt);
        this.surgeAvg += (this.surge - this.surgeAvg) * SpiderMath.damp(1.5, dt);
        if (vUp > 0 && c.surge > 0) vUp *= Math.max(0.35, Math.min(1.8, 1 + c.surge * (this.surge - this.surgeAvg)));
        const vLat = lat * sp * 0.75;
        const keep = (c.wallDist - this.wall) * 10;
        const tvx = r[0] * vLat + this.n[0] * keep, tvz = r[2] * vLat + this.n[2] * keep;
        const kk = SpiderMath.damp(10, dt);
        this.vx += (tvx - this.vx) * kk; this.vz += (tvz - this.vz) * kk; this.vy += (vUp - this.vy) * kk;
        this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
        this._collide();
        // спустились до пола — снова ходьба (иначе ноги в полу, звук лазания не стихает, хватка не восстанавливается)
        if (this.vy < 0) {
            const fl = ObbyCourse.rayDown(this.x, this.y + 40, this.z, c.hover + 60);
            if (fl && fl.n[1] > 0.7 && this.y - fl.y < c.hover - 20) {
                this.mode = 'walk'; this.n = [0, 1, 0]; this.groundY = fl.y; this.ground = fl.col; this.vy = 0;
                if (this.on.land) this.on.land(0);
                return;
            }
        }
        // хватка: за высоту и понемногу за вис
        if (this.vy > 0) { this.grip -= this.vy * dt / c.gripPx * this.gripMult; this.climbedPx += this.vy * dt; }
        this.grip -= c.hangDrain * dt * this.gripMult;
        if (this.grip <= 0) {
            this.grip = 0;
            this._letGo(true);
            if (this.on.outOfGrip) this.on.outOfGrip();
        }
    }

    _letGo(exhausted) {
        this._toAir();
        this.vx += this.n[0] * 140; this.vz += this.n[2] * 140;
        this.vy = Math.min(this.vy, 80);
        if (exhausted) { this.noGrab = 1; this.spent = true; }
        if (this.on.release) this.on.release(exhausted);
    }

    // Внешний угол коробки: луч «прямо от торса» ушёл за ребро — вместо падения быстро обходим ребро и берёмся за соседнюю
    // грань (режим mantle с corner). Не выйдет (нет грани, нет места перед ней) → false, и лазание отпускает, как раньше.
    _wrapCorner(c, cmd) {
        const n = this.n, r = SpiderMath.norm(SpiderMath.cross([0, 1, 0], n));
        const s0 = this.vx * r[0] + this.vz * r[2] >= 0 ? 1 : -1;   // в какую сторону уходит тело
        for (const s of [s0, -s0]) {
            const qx = this.x - n[0] * (this.wall + 30) + r[0] * s * 60, qz = this.z - n[2] * (this.wall + 30) + r[2] * s * 60;
            const h = ObbyCourse.ray(qx, this.y, qz, -r[0] * s, 0, -r[2] * s, 200);
            if (!h || Math.abs(h.n[1]) >= 0.62 || !spiderGrabbable(h.col)) continue;
            const nn = SpiderMath.norm([h.n[0], 0, h.n[2]]);
            if (SpiderMath.dot(nn, n) > 0.9 || nn[0] * r[0] * s + nn[2] * r[2] * s < 0.5) continue;   // та же грань или не боковая
            const W = c.wallDist, hx = qx - r[0] * s * h.t, hz = qz - r[2] * s * h.t;
            // перед новой гранью должно быть место: иначе обход загнал бы торс в соседнее тело
            if (ObbyCourse.ray(hx + nn[0] * 2, this.y, hz + nn[2] * 2, nn[0], 0, nn[2], W + 10)) continue;
            const kx = hx - r[0] * s * 30, kz = hz - r[2] * s * 30;
            this.mode = 'mantle';
            this.mantle = { t: 0, dur: 0.32, a: [this.x, this.y, this.z], b: [kx + (n[0] + nn[0]) * W * 0.75, this.y, kz + (n[2] + nn[2]) * W * 0.75],
                e: [hx + nn[0] * W, this.y, hz + nn[2] * W], wall: true, n: n.slice(), corner: nn };
            const ml = Math.hypot(cmd.mx || 0, cmd.mz || 0);
            this.mantle.hold = ml > 0.2 ? [(cmd.mx || 0) / ml, (cmd.mz || 0) / ml] : null;
            this.vx = this.vy = this.vz = 0;
            if (this.on.mantle) this.on.mantle();
            return true;
        }
        return false;
    }

    // Перелезть через верх стены: опора за краем. ahead — запас по высоте луча.
    _tryMantle(c, ahead) {
        const n = this.n;
        // верх стены — около груди героя или выше (не пол где-то внизу за стеной). Тонкая стена: за 110 px уже пол с той
        // стороны, поэтому верх ищем на нескольких глубинах — от дальней к ближней
        let g = null, d = 0;
        for (const dd of [110, 60, 25, 12]) {
            const h = ObbyCourse.rayDown(this.x - n[0] * (this.wall + dd), this.y + 150 + ahead, this.z - n[2] * (this.wall + dd), 360 + ahead);
            if (h && h.n[1] >= 0.7 && spiderGrabbable(h.col) && h.y >= this.y - 120) { g = h; d = dd; break; }
        }
        if (!g) return false;
        // толстая стена (верх есть и в 150 px за гранью): встаём там; тонкая — посередине верха, чтобы не висеть на краю
        let land = 150;
        if (!ObbyCourse.rayDown(this.x - n[0] * (this.wall + 150), g.y + 40, this.z - n[2] * (this.wall + 150), 80)) {
            land = d;
            const back = ObbyCourse.ray(this.x - n[0] * (this.wall + 260), g.y - 5, this.z - n[2] * (this.wall + 260), n[0], 0, n[2], 260);
            const mid = back ? (this.wall + 260 - back.t - this.wall) / 2 : 0;   // половина толщины верха
            if (mid > 10 && mid < 150 && ObbyCourse.rayDown(this.x - n[0] * (this.wall + mid), g.y + 40, this.z - n[2] * (this.wall + mid), 80)) land = mid;
        }
        // место для тела над краем
        const tx = this.x - n[0] * (this.wall + land), tz = this.z - n[2] * (this.wall + land), ty = g.y + c.hover;
        const room = ObbyCourse.ray(tx, g.y + 30, tz, 0, 1, 0, c.hover + 40);
        if (room) return false;
        this.mode = 'mantle';
        this.mantle = { t: 0, dur: 0.5, a: [this.x, this.y, this.z], b: [this.x + (tx - this.x) * 0.15, Math.max(this.y, ty) + 90, this.z + (tz - this.z) * 0.15], e: [tx, ty, tz], wall: true, n: n.slice() };
        this.vx = this.vy = this.vz = 0;
        if (this.on.mantle) this.on.mantle();
        return true;
    }

    _mantle(dt, c) {
        const m = this.mantle;
        m.t += dt / m.dur;
        const t = SpiderMath.smooth(m.t), u = 1 - t;
        const px = this.x, py = this.y, pz = this.z;
        this.x = u * u * m.a[0] + 2 * u * t * m.b[0] + t * t * m.e[0];
        this.y = u * u * m.a[1] + 2 * u * t * m.b[1] + t * t * m.e[1];
        this.z = u * u * m.a[2] + 2 * u * t * m.b[2] + t * t * m.e[2];
        this.vx = (this.x - px) / dt; this.vy = (this.y - py) / dt; this.vz = (this.z - pz) / dt;
        if (m.corner) {
            // обход ребра: нормаль и взгляд плавно переходят на новую грань, в конце — снова лазание
            this.n = SpiderMath.norm([m.n[0] + (m.corner[0] - m.n[0]) * t, 0, m.n[2] + (m.corner[2] - m.n[2]) * t]);
            this._turnTo(Math.atan2(-this.n[2], -this.n[0]), dt, 14);
            if (m.t >= 1) {
                this.mode = 'climb'; this.mantle = null; this.n = m.corner.slice(); this.wall = c.wallDist;
                this.vx = this.vy = this.vz = 0;
                this.wrapDir = m.hold || null; this.wrapHold = this.wrapDir ? 2.5 : 0;
            }
            return;
        }
        if (m.t > 0.5) { m.wall = false; this.n = [0, 1, 0]; }
        if (m.t >= 1) {
            this.mode = 'walk'; this.mantle = null; this.n = [0, 1, 0];
            this.vx *= 0.3; this.vz *= 0.3; this.vy = 0;
        }
    }

    // ----- полёт -----
    _air(dt, cmd, c) {
        this.airT += dt;
        this.vy = Math.max(-c.fallMax, this.vy - c.gravity * dt);
        const k = SpiderMath.damp(1.2, dt);
        const sp = c.walk * 0.6;
        this.vx += ((cmd.mx || 0) * sp - this.vx) * k * 0.6; this.vz += ((cmd.mz || 0) * sp - this.vz) * k * 0.6;
        this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
        this._collide();
        this.fallSpeed = -this.vy;
        if (this.vy <= 0) {
            const g = ObbyCourse.rayDown(this.x, this.y + 40, this.z, c.hover + 60 - this.vy * dt);
            if (g && this.y - g.y <= c.hover + 10) {
                const sp2 = -this.vy, sq = Math.min(1, sp2 / c.fallMax);
                this.y = g.y + c.hover; this.groundY = g.y; this.mode = 'walk'; this.n = [0, 1, 0]; this.noGrab = 0;
                this._roots();
                // удар: руки разом «хлопают» в пол (опору ищем на полной высоте), потом торс проседает на них,
                // а пружина ходьбы возвращает его на место
                const fr = this._frame();
                for (const a of this.arms) {
                    this._homePoint(a, fr, 0, a.home);
                    const hit = this._probe(a.home, fr.n, a.root);
                    if (hit) { a.state = 'swing'; a.t = 0; a.from = a.tip.slice(); a.to = hit.p; a.toN = hit.n; a.col = hit.col; a.dur = 0.07 + 0.015 * (a.row || 0); a.lift = 10; }
                    else { a.state = 'free'; a.retry = 0; }
                }
                this.y -= c.landSquash * sq; this.vy = -sp2 * 0.12;
                this._roots();
                if (this.on.land) this.on.land(sp2);
                return;
            }
        }
        if (cmd.climb && this.grip > 0.5 && !this.noGrab && !this.spent && this.airT > 0.12) this._tryGrab(cmd, true);
    }

    // ----- тренировка: стоим, руки бьют мишень -----
    startTrain(px, py, pz, nx, nz) { this.train = { px, py, pz, nx, nz, next: 0, k: 0 }; this.mode = 'train'; this.vx = this.vz = 0; }
    stopTrain() { if (this.mode === 'train') { this.mode = 'walk'; for (const a of this.arms) if (a.state === 'punch') a.state = 'free'; } this.train = null; }

    _train(dt, cmd, c) {
        const T = this.train;
        if (!T || Math.hypot(cmd.mx || 0, cmd.mz || 0) > 0.3) { this.stopTrain(); this._walk(dt, cmd, c, this.arms.length); return; }
        this._turnTo(Math.atan2(-T.nz, -T.nx), dt, 8);
        const g = ObbyCourse.rayDown(this.x, this.y + 40, this.z, c.hover + 300);
        if (g) { this.groundY = g.y; this.vy = (g.y + c.hover + Math.sin(this.t * 9) * 5 - this.y) * 9; this.y += this.vy * dt; }
        if (this.grip < this.gripMax) this.grip = Math.min(this.gripMax, this.grip + c.gripRefill * dt);
        // удары по очереди: темп растёт с числом рук
        T.next -= dt;
        if (T.next <= 0) {
            const free = this.arms.filter(a => a.state !== 'punch');
            if (free.length) {
                const a = free[(T.k++) % free.length];
                const sx = -T.nz, sz = T.nx;   // вбок по мишени
                // точка удара — внутри круга мишени (радиус плиты 125 px; центр — T.py), а не в воздухе рядом с ней
                const ang = Math.random() * Math.PI * 2, rr = 100 * Math.sqrt(Math.random());
                const off = Math.cos(ang) * rr, oy = Math.sin(ang) * rr;
                a.state = 'punch'; a.t = 0; a.dur = 0.16;
                a.from = a.tip.slice();
                a.punchP = [T.px + sx * off, T.py + oy, T.pz + sz * off];
                a.toN = [T.nx, 0, T.nz];
            }
            T.next = 1 / (c.punchRate * Math.max(1, this.arms.length * 0.75));
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Походка кончиков
    // ---------------------------------------------------------------------------------------------

    _gait(dt, cmd, c) {
        const N = this.arms.length;
        if (!N) return;
        const fr = this._frame();
        const R = this.reach;
        const stepD = R * c.stepDist * (this.mode === 'climb' ? 0.85 : 1);
        const moving = Math.hypot(this.vx, this.vy, this.vz) > 25;
        const lead = this.mode === 'climb' ? 0.22 : 0.2;
        const grounded = this.mode === 'walk' || this.mode === 'climb' || this.mode === 'mantle' || this.mode === 'train';
        let swinging = 0;
        for (const a of this.arms) if (a.state === 'swing') swinging++;
        const maxSwing = Math.max(1, Math.floor(N / 2));
        /** @type {any[]} */
        const want = [];
        for (const a of this.arms) {
            if (a.state === 'swing') {
                a.t += dt / a.dur;
                const t = SpiderMath.smooth(a.t), lift = Math.sin(Math.min(1, a.t) * Math.PI) * a.lift;
                const ln = this.mode === 'climb' ? this.n : fr.n;
                for (let i = 0; i < 3; i++) a.tip[i] = a.from[i] + (a.to[i] - a.from[i]) * t + ln[i] * lift;
                for (let i = 0; i < 3; i++) a.n[i] += (a.toN[i] - a.n[i]) * 0.25;
                a.grip = Math.abs(a.t - 0.5) * 2;
                if (a.t >= 1) {
                    a.state = 'plant'; a.tip = a.to.slice(); a.n = a.toN.slice(); a.grip = 1; a.idle = 0;
                    swinging--;
                    if (this.mode === 'climb') this.surge = Math.min(1.6, this.surge + 2 / Math.max(2, N));   // рука встала — подтянулись
                    if (this.on.plant) this.on.plant(a, a.tip, a.n);
                }
                continue;
            }
            if (a.state === 'punch') {
                a.t += dt / a.dur;
                const out = a.t < 1, k = out ? SpiderMath.smooth(a.t) : 1 - SpiderMath.smooth((a.t - 1) * 0.8);
                const back = this._homePoint(a, fr, 0, a.home);
                for (let i = 0; i < 3; i++) a.tip[i] = (out ? a.from[i] : back[i]) + (a.punchP[i] - (out ? a.from[i] : back[i])) * k;
                a.n = a.toN.slice();
                a.grip = out ? 1 - a.t : 0.6;
                if (out && a.t + dt / a.dur >= 1 && !a.hit) { a.hit = true; if (this.on.punch) this.on.punch(a, a.punchP); }
                if (a.t >= 2.2) { a.state = 'free'; a.hit = false; a.retry = 0; }
                continue;
            }
            if (!grounded) {
                // полёт: руки тянутся в стороны и болтаются (физика цепочки сама даёт раскачку)
                const s = Math.sin(this.t * 7 + a.i * 1.7), r2 = R * 0.75;
                const dir = [Math.cos(this.yaw + a.theta), 0, Math.sin(this.yaw + a.theta)];
                a.tip[0] += (a.root[0] + dir[0] * r2 * (0.8 + s * 0.15) - a.tip[0]) * SpiderMath.damp(5, dt);
                a.tip[1] += (a.root[1] - R * 0.15 + s * 40 + (this.vy > 0 ? -60 : 70) - a.tip[1]) * SpiderMath.damp(5, dt);
                a.tip[2] += (a.root[2] + dir[2] * r2 * (0.8 + s * 0.15) - a.tip[2]) * SpiderMath.damp(5, dt);
                a.n = [-dir[0], 0.4, -dir[2]];
                a.grip = 0.35 + s * 0.2;
                continue;
            }
            this._homePoint(a, fr, moving ? lead : 0, a.home);
            // лазание вверх: передние руки тянутся выше (выпад); «дом» сдвинут целиком, поэтому шаг и число постановок прежние
            if (this.mode === 'climb' && c.surge > 0 && this.vy > 20) a.home[1] += Math.max(0, Math.cos(a.theta)) * 45 * Math.min(1, this.vy / 120);
            if (a.state === 'free') {
                a.retry -= dt;
                // свободная рука висит около дома, пока ищет опору
                for (let i = 0; i < 3; i++) a.tip[i] += (a.home[i] + fr.n[i] * 60 - a.tip[i]) * SpiderMath.damp(6, dt);
                if (a.retry <= 0) want.push({ a, err: 1e6 });
                continue;
            }
            const ex = a.tip[0] - a.home[0], ey = a.tip[1] - a.home[1], ez = a.tip[2] - a.home[2];
            const err = SpiderMath.len(ex, ey, ez);
            const fromRoot = SpiderMath.len(a.tip[0] - a.root[0], a.tip[1] - a.root[1], a.tip[2] - a.root[2]);
            a.idle = moving ? 0 : a.idle + dt;
            if (err > stepD || fromRoot > R * 1.08 || (a.idle > 0.5 && err > 45) || (a.col && a.col.enabled === false)) want.push({ a, err });
        }
        if (!want.length) return;
        want.sort((p, q) => q.err - p.err);
        for (const w of want) {
            if (swinging >= maxSwing) break;
            const a = w.a;
            if (N >= 3 && this._neighborSwinging(a)) continue;
            const hit = this._probe(a.home, fr.n, a.root);
            if (!hit) { a.state = 'free'; a.retry = 0.15; continue; }
            a.state = 'swing'; a.t = 0;
            a.from = a.tip.slice(); a.to = hit.p; a.toN = hit.n; a.col = hit.col;
            const d = SpiderMath.len(a.to[0] - a.from[0], a.to[1] - a.from[1], a.to[2] - a.from[2]);
            const sp = Math.hypot(this.vx, this.vy, this.vz);
            a.dur = Math.max(0.1, Math.min(c.stepTime * 1.3, c.stepTime * (1.2 - Math.min(0.55, sp / 1400)) * Math.min(1.2, 0.6 + d / R)));
            a.lift = Math.min(c.stepLift, 25 + d * 0.45);
            swinging++;
        }
    }

    _neighborSwinging(a) {
        // соседи по кругу углов (по θ) не поднимаются вместе — тело всегда на опоре
        const list = this.arms.slice().sort((p, q) => p.theta - q.theta);
        const k = list.indexOf(a), N = list.length;
        const p = list[(k + N - 1) % N], q = list[(k + 1) % N];
        return (p !== a && p.state === 'swing') || (q !== a && q.state === 'swing');
    }

    // ---------------------------------------------------------------------------------------------
    // Цепочка руки: Верле + пружина к направляющей кривой + длины звеньев
    // ---------------------------------------------------------------------------------------------

    _chain(a, dt, c) {
        const K = c.segs, P = a.pts, O = a.old;
        if (a.fresh) this._resetChain(a);
        const r = a.root, t = a.tip;
        const dx = t[0] - r[0], dy = t[1] - r[1], dz = t[2] - r[2];
        const L = Math.max(40, SpiderMath.len(dx, dy, dz));
        // направление из плеча: вверх и в сторону своей «домашней» точки, чуть назад
        const f = [Math.cos(this.yaw), 0, Math.sin(this.yaw)];
        const hx = Math.cos(this.yaw + a.theta), hz = Math.sin(this.yaw + a.theta);
        const d0 = SpiderMath.norm([hx * 0.75 - f[0] * 0.45, 1.05, hz * 0.75 - f[2] * 0.45]);
        const nT = a.n;
        const c1 = L * 0.55 + 30, c2 = L * 0.42 + 20;
        const p1x = r[0] + d0[0] * c1, p1y = r[1] + d0[1] * c1, p1z = r[2] + d0[2] * c1;
        const p2x = t[0] + nT[0] * c2, p2y = t[1] + nT[1] * c2, p2z = t[2] + nT[2] * c2;
        const dt2 = dt * dt;
        // кадр другой длины, чем прошлый: скорость Верле (смещение за кадр) пересчитать, иначе рывок на скачке FPS
        const vs = Math.min(2, dt / (a.dtPrev || dt)); a.dtPrev = dt;
        // направляющая — мелкая выборка с длиной дуги: цели точек стоят через равные отрезки дуги
        const NS = 26, G = this._gs || (this._gs = new Float32Array((NS + 1) * 4));
        G[0] = r[0]; G[1] = r[1]; G[2] = r[2]; G[3] = 0;
        for (let i = 1; i <= NS; i++) {
            const s = i / NS, u = 1 - s;
            const b0 = u * u * u, b1 = 3 * u * u * s, b2 = 3 * u * s * s, b3 = s * s * s, o = i * 4;
            G[o] = b0 * r[0] + b1 * p1x + b2 * p2x + b3 * t[0];
            G[o + 1] = b0 * r[1] + b1 * p1y + b2 * p2y + b3 * t[1];
            G[o + 2] = b0 * r[2] + b1 * p1z + b2 * p2z + b3 * t[2];
            G[o + 3] = G[o - 1] + SpiderMath.len(G[o] - G[o - 4], G[o + 1] - G[o - 3], G[o + 2] - G[o - 2]);
        }
        const glen = G[NS * 4 + 3];
        // цели точек: направляющая, опущенная на провис, и жёсткость пружины каждой точки. Длины звеньев берутся с самих целей
        // (рука в покое — без натяжения): иначе фиксированная длина и провисшие цели спорят, и рука ломается зигзагом
        const S = this._cs && this._cs.length >= K * 5 ? this._cs : (this._cs = new Float32Array(K * 5));   // на точку: цель x y z, w², длина звена до следующей
        S[0] = r[0]; S[1] = r[1]; S[2] = r[2];
        let gi = 0;
        for (let j = 1; j < K - 1; j++) {
            const s = j / (K - 1), want = glen * s;
            while (gi < NS - 1 && G[(gi + 1) * 4 + 3] < want) gi++;
            const oa = gi * 4, ob = oa + 4, w = (want - G[oa + 3]) / ((G[ob + 3] - G[oa + 3]) || 1);
            // собственная частота пружины: выше у плеча и кончика, в середине мягче (раскачка)
            const wn = Math.min(1.5 / dt, c.wobble + (c.stiff - c.wobble) * Math.pow(Math.abs(s - 0.5) * 2, 1.5)), w2 = wn * wn, o5 = j * 5;
            S[o5] = G[oa] + (G[ob] - G[oa]) * w;
            S[o5 + 1] = G[oa + 1] + (G[ob + 1] - G[oa + 1]) * w - c.sag * Math.sin(s * Math.PI) / w2;   // провис = сила тяжести / жёсткость
            S[o5 + 2] = G[oa + 2] + (G[ob + 2] - G[oa + 2]) * w;
            S[o5 + 3] = w2;
        }
        const e = (K - 1) * 3, e5 = (K - 1) * 5;
        S[e5] = t[0]; S[e5 + 1] = t[1]; S[e5 + 2] = t[2];
        for (let j = 0; j < K - 1; j++) S[j * 5 + 4] = Math.hypot(S[j * 5 + 5] - S[j * 5], S[j * 5 + 6] - S[j * 5 + 1], S[j * 5 + 7] - S[j * 5 + 2]);
        // точка — пружина к своей цели; затухание задано долей от критического и не зависит от FPS
        for (let j = 1; j < K - 1; j++) {
            const i3 = j * 3, o5 = j * 5, w2 = S[o5 + 3];
            const px = P[i3], py = P[i3 + 1], pz = P[i3 + 2];
            const vk = Math.exp(-2 * c.armDamp * Math.sqrt(w2) * dt) * vs;
            const nx = px + (px - O[i3]) * vk + (S[o5] - px) * w2 * dt2;
            const ny = py + (py - O[i3 + 1]) * vk + (S[o5 + 1] - py) * w2 * dt2;
            const nz = pz + (pz - O[i3 + 2]) * vk + (S[o5 + 2] - pz) * w2 * dt2;
            O[i3] = px; O[i3 + 1] = py; O[i3 + 2] = pz;
            P[i3] = nx; P[i3 + 1] = ny; P[i3 + 2] = nz;
        }
        P[0] = r[0]; P[1] = r[1]; P[2] = r[2];
        P[e] = t[0]; P[e + 1] = t[1]; P[e + 2] = t[2];
        O[e] = t[0]; O[e + 1] = t[1]; O[e + 2] = t[2];
        // изгиб: отклонение точки от цели сглаживается по соседям — пружины разной жёсткости иначе дают острые изломы у
        // кончика, а форма дуги (сама цель) не плоскеет. Сдвиг получают и P, и O (скорость не прибавляется), доля за проход
        // зависит от dt — гибкость одна и та же при любом FPS
        const bk = SpiderMath.damp(40, dt);
        for (let ps = 0; ps < 2; ps++) {
            for (let j = 1; j < K - 1; j++) {
                const i3 = j * 3, o5 = j * 5;
                for (let q = 0; q < 3; q++) {
                    const e0 = P[i3 - 3 + q] - S[o5 - 5 + q], e1 = P[i3 + q] - S[o5 + q], e2 = P[i3 + 3 + q] - S[o5 + 5 + q];
                    const dd = ((e0 + e2) * 0.5 - e1) * bk;
                    P[i3 + q] += dd; O[i3 + q] += dd;
                }
            }
        }
        // длины звеньев (телескоп: длина звена = расстояние между соседними целями)
        for (let it = 0; it < 2; it++) {
            for (let j = 0; j < K - 1; j++) {
                const i0 = j * 3, i1 = i0 + 3;
                const ex = P[i1] - P[i0], ey = P[i1 + 1] - P[i0 + 1], ez = P[i1 + 2] - P[i0 + 2];
                const l = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
                const diff = (l - S[j * 5 + 4]) / l;
                const w0 = j === 0 ? 0 : 0.5, w1 = j + 1 === K - 1 ? 0 : 0.5;
                const ws = w0 + w1 || 1;
                P[i0] += ex * diff * w0 / ws; P[i0 + 1] += ey * diff * w0 / ws; P[i0 + 2] += ez * diff * w0 / ws;
                P[i1] -= ex * diff * w1 / ws; P[i1 + 1] -= ey * diff * w1 / ws; P[i1 + 2] -= ez * diff * w1 / ws;
            }
        }
        // руки не проходят сквозь стены (только герой — у ботов дорого)
        if (this.armCollide) {
            for (let j = 2; j < K - 2; j += 2) {
                const i3 = j * 3;
                ObbyCourse.sphere(P[i3], P[i3 + 1], P[i3 + 2], 13, (h) => {
                    if (h.col.kill || h.col.kind === 'capsule' || h.depth > 60) return;
                    P[i3] += h.n[0] * h.depth; P[i3 + 1] += h.n[1] * h.depth; P[i3 + 2] += h.n[2] * h.depth;
                });
            }
        }
    }
}
