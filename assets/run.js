// Canyon Dash — 3 レーンのエンドレスランナー（依存なし・Canvas 2D の疑似 3D）
(() => {
  "use strict";
  const cv = document.getElementById("run");
  const ctx = cv.getContext("2d");

  // ---- 定数 ----
  const LANES = [-1, 0, 1];
  const CAM_H = 1.6;      // カメラの高さ
  const PZ = 4.0;         // カメラからプレイヤーまでの距離
  const NEAR = 0.9, FAR = 70;
  const ROAD = 1.5;       // 道の半幅
  const WALL_X = 3.2, WALL_H = 2.8;
  const GRAVITY = -24, JUMP_V = 8, SLIDE_T = 0.65;
  const BEST_KEY = "canyon-dash-best";

  const COL = {
    skyTop: [44, 30, 80], skyBot: [250, 150, 90], fog: [240, 160, 110],
    road: [[112, 84, 64], [124, 94, 72]], line: [236, 214, 170],
    sand: [[214, 150, 92], [204, 140, 84]], wall: [[168, 82, 52], [150, 72, 46]],
  };
  const rgb = (c, t = 0) => {
    const f = COL.fog;
    return `rgb(${c.map((v, i) => Math.round(v + (f[i] - v) * t)).join(",")})`;
  };

  // ---- 画面サイズ ----
  let W = 0, H = 0, F = 0, HZ = 0;
  function resize() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    F = W * 0.9; HZ = H * 0.3;
    if (state !== "playing") draw();
  }
  const P = (x, y, z) => { const s = F / z; return [W / 2 + x * s, HZ + (CAM_H - y) * s, s]; };

  function quad(a, b, c, d, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    ctx.closePath(); ctx.fill();
  }

  // ---- ゲーム状態 ----
  let state = "ready";   // ready | playing | dying | over
  let dist, speed, coins, objs, nextZ, lane, px, py, vy, slide, t, shake, dieT;
  let best = 0;
  try { best = +localStorage.getItem(BEST_KEY) || 0; } catch (e) { /* 保存できない環境 */ }

  function reset() {
    dist = 0; speed = 12; coins = 0; objs = []; nextZ = 28;
    lane = 1; px = 0; py = 0; vy = 0; slide = 0; t = 0; shake = 0; dieT = 0;
  }
  const score = () => Math.floor(dist) + coins * 10;

  // ---- 障害物の生成 ----
  const rnd = (n) => Math.floor(Math.random() * n);
  function coinLine(ln, z, n, arc) {
    for (let i = 0; i < n; i++) {
      const y = arc ? 0.5 + Math.sin((i / (n - 1)) * Math.PI) * 1.1 : 0.5;
      objs.push({ type: "coin", lane: ln, z: z + i * 1.4, y });
    }
  }
  function spawnRow(z) {
    const lvl = Math.min(1, dist / 2500);
    const r = Math.random();
    if (r < 0.4) {
      const order = [0, 1, 2].sort(() => Math.random() - 0.5);
      const n = Math.random() < 0.3 + 0.45 * lvl ? 2 : 1;
      for (let i = 0; i < n; i++) objs.push({ type: "block", lane: order[i], z });
      if (Math.random() < 0.6) coinLine(order[2], z - 2, 4, false);
    } else if (r < 0.6) {
      for (const ln of [0, 1, 2]) objs.push({ type: "low", lane: ln, z });
      if (Math.random() < 0.5) coinLine(rnd(3), z - 2.8, 5, true);
    } else if (r < 0.78) {
      for (const ln of [0, 1, 2]) objs.push({ type: "high", lane: ln, z });
    } else {
      coinLine(rnd(3), z, 6, false);
    }
  }

  // ---- 入力 ----
  function act(a) {
    if (state === "ready" || state === "over") {
      if (a === "jump" || a === "start") { reset(); state = "playing"; last = performance.now(); requestAnimationFrame(loop); }
      return;
    }
    if (state !== "playing") return;
    if (a === "left") lane = Math.max(0, lane - 1);
    else if (a === "right") lane = Math.min(2, lane + 1);
    else if (a === "jump" && py === 0) { vy = JUMP_V; slide = 0; }
    else if (a === "slide") { if (py > 0) vy = -14; slide = SLIDE_T; }
  }
  const KEYS = {
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
    ArrowUp: "jump", KeyW: "jump", Space: "jump", ArrowDown: "slide", KeyS: "slide", Enter: "start",
  };
  addEventListener("keydown", (e) => {
    const a = KEYS[e.code];
    if (!a) return;
    e.preventDefault();
    if (!e.repeat) act(a);
  });
  let sx = 0, sy = 0, sid = null;
  cv.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; sid = e.pointerId; });
  cv.addEventListener("pointerup", (e) => {
    if (e.pointerId !== sid) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) act("jump");
    else if (Math.abs(dx) > Math.abs(dy)) act(dx < 0 ? "left" : "right");
    else act(dy < 0 ? "jump" : "slide");
  });

  // ---- 更新 ----
  function die() {
    state = "dying"; dieT = 0.7; shake = 0.35;
    if (score() > best) { best = score(); try { localStorage.setItem(BEST_KEY, best); } catch (e) { /* noop */ } }
  }
  function update(dt) {
    t += dt;
    if (shake > 0) shake -= dt;
    if (state === "dying") { dieT -= dt; if (dieT <= 0) state = "over"; return; }

    speed = Math.min(30, speed + dt * 0.22);
    dist += speed * dt;
    px += (LANES[lane] - px) * Math.min(1, dt * 14);
    if (py > 0 || vy > 0) { vy += GRAVITY * dt; py = Math.max(0, py + vy * dt); if (py === 0) vy = 0; }
    if (slide > 0) slide = Math.max(0, slide - dt);

    while (nextZ < dist + FAR) {
      spawnRow(nextZ);
      nextZ += speed * 0.8 + 5 + Math.random() * 6;
    }

    // プレイヤーの位置を通過する瞬間に一度だけ判定
    for (const o of objs) {
      if (o.done || o.z - dist > PZ + 0.25) continue;
      o.done = true;
      if (Math.abs(px - LANES[o.lane]) > 0.55) continue;
      if (o.type === "coin") { if (Math.abs(py + 0.5 - o.y) < 0.75) { coins++; o.got = true; } }
      else if (o.type === "block") return die();
      else if (o.type === "low" && py < 0.5) return die();
      else if (o.type === "high" && slide <= 0) return die();
    }
    objs = objs.filter((o) => o.z - dist > NEAR - 1);
  }

  // ---- 描画 ----
  function drawBox(x0, x1, y0, y1, z0, z1, front, top, side) {
    if (z0 < NEAR) return;
    const fog = Math.min(1, z0 / FAR) ** 1.5;
    if (x1 < 0) quad(P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), rgb(side, fog));
    if (x0 > 0) quad(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), rgb(side, fog));
    if (y1 < CAM_H) quad(P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1), rgb(top, fog));
    quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), rgb(front, fog));
  }

  function drawObj(o) {
    const z = o.z - dist, x = LANES[o.lane];
    if (z < NEAR || z > FAR) return;
    const fog = Math.min(1, z / FAR) ** 1.5;
    if (o.type === "block") {
      drawBox(x - 0.42, x + 0.42, 0, 1.5, z, z + 0.8, [120, 110, 104], [160, 150, 140], [96, 88, 84]);
      const [cx, cy, s] = P(x, 1.0, z);  // 目印の模様
      ctx.fillStyle = rgb([230, 120, 40], fog);
      ctx.fillRect(cx - 0.25 * s, cy - 0.06 * s, 0.5 * s, 0.12 * s);
    } else if (o.type === "low") {
      drawBox(x - 0.48, x + 0.48, 0, 0.45, z, z + 0.3, [90, 60, 40], [130, 92, 60], [70, 48, 32]);
      const [cx, cy, s] = P(x, 0.3, z);
      ctx.fillStyle = rgb([250, 210, 60], fog);
      for (let i = -2; i <= 1; i += 2) ctx.fillRect(cx + i * 0.2 * s, cy - 0.06 * s, 0.2 * s, 0.12 * s);
    } else if (o.type === "high") {
      drawBox(x - 0.5, x - 0.42, 0, 1.7, z, z + 0.15, [80, 60, 50], [110, 80, 60], [60, 45, 38]);
      drawBox(x + 0.42, x + 0.5, 0, 1.7, z, z + 0.15, [80, 60, 50], [110, 80, 60], [60, 45, 38]);
      drawBox(x - 0.5, x + 0.5, 0.9, 1.35, z, z + 0.15, [200, 60, 50], [230, 90, 70], [150, 40, 35]);
    } else if (o.type === "coin" && !o.got) {
      const [cx, cy, s] = P(x, o.y, z);
      const w = Math.abs(Math.cos(t * 5 + o.z)) * 0.18 * s + 1;
      ctx.fillStyle = rgb([255, 200, 40], fog);
      ctx.beginPath(); ctx.ellipse(cx, cy, w, 0.18 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgb([255, 240, 150], fog);
      ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.45, 0.09 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawPlayer() {
    const sliding = slide > 0 && py === 0;
    const [cx, gy, s] = P(px, 0, PZ);
    const [, cy] = P(px, py, PZ);
    // 影
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(cx, gy, 0.3 * s / (1 + py * 0.5), 0.07 * s, 0, 0, Math.PI * 2); ctx.fill();
    const run = state === "playing" && py === 0 && !sliding ? Math.sin(t * 18) : 0;
    const hurt = state !== "playing" && state !== "ready";
    const body = hurt ? "#9a9a9a" : "#2e7dd1", dark = hurt ? "#6b6b6b" : "#1f5a99";
    if (sliding) {
      ctx.fillStyle = body; rr(cx - 0.32 * s, cy - 0.42 * s, 0.64 * s, 0.4 * s, 0.15 * s);
      ctx.fillStyle = "#f2b33d"; rr(cx - 0.2 * s, cy - 0.5 * s, 0.4 * s, 0.22 * s, 0.1 * s);
      return;
    }
    // 脚
    ctx.fillStyle = dark;
    ctx.fillRect(cx - 0.16 * s, cy - 0.42 * s + run * 0.06 * s, 0.11 * s, 0.42 * s - run * 0.06 * s);
    ctx.fillRect(cx + 0.05 * s, cy - 0.42 * s - run * 0.06 * s, 0.11 * s, 0.42 * s + run * 0.06 * s);
    // 胴体・リュック
    ctx.fillStyle = body; rr(cx - 0.24 * s, cy - 0.95 * s, 0.48 * s, 0.56 * s, 0.12 * s);
    ctx.fillStyle = "#8a5a2b"; rr(cx - 0.17 * s, cy - 0.9 * s, 0.34 * s, 0.36 * s, 0.07 * s);
    // 腕
    ctx.fillStyle = body;
    ctx.fillRect(cx - 0.33 * s, cy - 0.88 * s - run * 0.08 * s, 0.09 * s, 0.34 * s);
    ctx.fillRect(cx + 0.24 * s, cy - 0.88 * s + run * 0.08 * s, 0.09 * s, 0.34 * s);
    // 頭・帽子
    ctx.fillStyle = "#e0a878";
    ctx.beginPath(); ctx.arc(cx, cy - 1.1 * s, 0.17 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f2b33d";
    ctx.beginPath(); ctx.ellipse(cx, cy - 1.16 * s, 0.27 * s, 0.06 * s, 0, 0, Math.PI * 2); ctx.fill();
    rr(cx - 0.15 * s, cy - 1.32 * s, 0.3 * s, 0.17 * s, 0.07 * s);
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

  function drawWorld() {
    // 空と太陽
    const g = ctx.createLinearGradient(0, 0, 0, HZ);
    g.addColorStop(0, rgb(COL.skyTop)); g.addColorStop(1, rgb(COL.skyBot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HZ + 1);
    ctx.fillStyle = "rgba(255,230,160,0.9)";
    ctx.beginPath(); ctx.arc(W * 0.5, HZ - H * 0.02, W * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgb(COL.fog); ctx.fillRect(0, HZ, W, H - HZ);

    // 地面・道・崖を遠くから手前へ 2 単位ごとに描く
    const SEG = 2;
    const k0 = Math.floor((dist + NEAR) / SEG), k1 = Math.ceil((dist + FAR) / SEG);
    for (let k = k1; k >= k0; k--) {
      const z0 = Math.max(NEAR, k * SEG - dist), z1 = (k + 1) * SEG - dist;
      if (z1 <= NEAR) continue;
      const fog = Math.min(1, z0 / FAR) ** 1.5, a = k & 1;
      quad(P(-WALL_X, 0, z0), P(WALL_X, 0, z0), P(WALL_X, 0, z1), P(-WALL_X, 0, z1), rgb(COL.sand[a], fog));
      quad(P(-ROAD, 0, z0), P(ROAD, 0, z0), P(ROAD, 0, z1), P(-ROAD, 0, z1), rgb(COL.road[a], fog));
      if (a) for (const lx of [-0.5, 0.5]) {
        quad(P(lx - 0.03, 0, z0), P(lx + 0.03, 0, z0), P(lx + 0.03, 0, z1), P(lx - 0.03, 0, z1), rgb(COL.line, fog));
      }
      for (const sx of [-1, 1]) {
        const x = sx * WALL_X;
        quad(P(x, 0, z0), P(x, 0, z1), P(x, WALL_H, z1), P(x, WALL_H, z0), rgb(COL.wall[a], fog));
      }
    }
  }

  function hud() {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, 34);
    ctx.fillStyle = "#fff"; ctx.font = "600 15px system-ui, sans-serif"; ctx.textBaseline = "middle";
    ctx.textAlign = "left"; ctx.fillText(`SCORE ${score()}`, 12, 17);
    ctx.textAlign = "center"; ctx.fillText(`BEST ${best}`, W / 2, 17);
    ctx.textAlign = "right"; ctx.fillText(`● ${coins}`, W - 12, 17);
  }
  function overlay(title, lines) {
    ctx.fillStyle = "rgba(20,12,30,0.55)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `800 ${Math.round(W * 0.1)}px system-ui, sans-serif`;
    ctx.fillText(title, W / 2, H * 0.38);
    ctx.font = `500 ${Math.round(Math.max(13, W * 0.04))}px system-ui, sans-serif`;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.5 + i * W * 0.065));
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 10 * shake);
    drawWorld();
    const list = objs.slice().sort((a, b) => b.z - a.z);
    let drawn = false;
    for (const o of list) {
      if (!drawn && o.z - dist < PZ) { drawPlayer(); drawn = true; }
      drawObj(o);
    }
    if (!drawn) drawPlayer();
    ctx.restore();
    hud();
    const touch = matchMedia("(pointer: coarse)").matches;
    if (state === "ready") {
      overlay("CANYON DASH", touch
        ? ["左右スワイプ: レーン移動", "上スワイプ / タップ: ジャンプ", "下スワイプ: スライディング", "タップでスタート"]
        : ["← →: レーン移動", "↑ / Space: ジャンプ", "↓: スライディング", "Space でスタート"]);
    } else if (state === "over") {
      overlay("GAME OVER", [`SCORE ${score()}`, `BEST ${best}`, touch ? "タップでリトライ" : "Space でリトライ"]);
    }
  }

  // ---- ループ ----
  let last = 0;
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    if (state === "playing" || state === "dying") requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); });

  reset();
  addEventListener("resize", resize);
  resize();
})();
