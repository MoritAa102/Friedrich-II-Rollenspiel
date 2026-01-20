import { WORLD, WALLS, GATES, NPCS, rectsOverlap, clamp, circleDist } from "./map.js";
import { MISSIONS } from "./missions.js";
import { openModal, closeModal, showToast, escapeHtml, setText } from "./ui.js";

function isSmallScreen() {
  return Math.min(window.innerWidth, window.innerHeight) < 820;
}

export class Game {
  constructor({ canvas, audio, net, input }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audio = audio;

    this.net = net;   // { uid, writeMyPlayer, submitForChapter }
    this.input = input; // { getAxes:()=>({x,y}), consumeInteract:()=>bool }

    this.me = { x: 120, y: 120, r: 16, speed: 240 };
    this.lastT = performance.now();
    this.accumNet = 0;

    this.players = {};
    this.state = null;
    this.isHost = false;

    this.camera = { x: 0, y: 0 };

    this._seenChapterIntro = new Set(); // local only
    this._setupResize();
  }

  _setupResize() {
    const resize = () => {
      const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width * dpr));
      const h = Math.max(240, Math.floor(rect.height * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    };
    this._resize = resize;
    window.addEventListener("resize", resize);
    // first tick after layout
    setTimeout(resize, 50);
  }

  destroy() {
    window.removeEventListener("resize", this._resize);
  }

  setNetworkSnapshot({ players, state, isHost }) {
    this.players = players || {};
    this.state = state || this.state;
    this.isHost = !!isHost;

    const chap = this.state?.chapter ?? 0;
    setText("chapterLabel", `Kapitel: ${Math.min(chap+1, MISSIONS.length)} / ${MISSIONS.length}`);
    setText("phaseLabel", `Phase: ${this.state?.phase || "?"}`);

    // Kapitel-Intro einmal pro Kapitel zeigen (nur in playing)
    if (this.state?.phase === "playing" && chap < MISSIONS.length && !this._seenChapterIntro.has(chap)) {
      this._seenChapterIntro.add(chap);
      this._openChapterIntro(chap);
    }
  }

  start() {
    requestAnimationFrame(() => this._tick());
  }

  _tick() {
    const now = performance.now();
    const dt = (now - this.lastT) / 1000;
    this.lastT = now;

    this._update(dt);
    this._render();

    requestAnimationFrame(() => this._tick());
  }

  _update(dt) {
    if (!this.state) return;

    // Wenn noch Lobby: keine Bewegung
    if (this.state.phase !== "playing") return;

    const axes = this.input.getAxes();
    let ix = axes.x;
    let iy = axes.y;

    // normalize
    const mag = Math.hypot(ix, iy) || 1;
    ix /= mag; iy /= mag;

    const vx = ix * this.me.speed;
    const vy = iy * this.me.speed;

    const old = { x: this.me.x, y: this.me.y };
    this.me.x += vx * dt;
    this.me.y += vy * dt;

    this.me.x = clamp(this.me.x, 60, WORLD.w - 60);
    this.me.y = clamp(this.me.y, 60, WORLD.h - 60);

    if (this._collidesWithWorld()) {
      this.me.x = old.x;
      this.me.y = old.y;
    }

    this.audio.stepTick((vx !== 0 || vy !== 0), dt);

    const vw = this.canvas.width, vh = this.canvas.height;
    this.camera.x = clamp(this.me.x - vw * 0.5, 0, WORLD.w - vw);
    this.camera.y = clamp(this.me.y - vh * 0.5, 0, WORLD.h - vh);

    if (this.input.consumeInteract()) {
      this._tryInteract();
    }

    this.accumNet += dt;
    if (this.accumNet >= 0.08) {
      this.accumNet = 0;
      this.net.writeMyPlayer({
        x: Math.round(this.me.x),
        y: Math.round(this.me.y),
        vx: Math.round(vx),
        vy: Math.round(vy)
      });
    }
  }

  _collidesWithWorld() {
    const meRect = { x: this.me.x - this.me.r, y: this.me.y - this.me.r, w: this.me.r*2, h: this.me.r*2 };
    for (const w of WALLS) if (rectsOverlap(meRect, w)) return true;

    const gates = this.state?.gates || {};
    for (const [id, g] of Object.entries(GATES)) {
      const open = !!gates[id];
      if (!open && rectsOverlap(meRect, g)) return true;
    }
    return false;
  }

  _openChapterIntro(chap) {
    const m = MISSIONS[chap];
    const myRole = this._getMyRoleForChapter(chap);
    const roleHtml = myRole ? `
      <div style="margin-top:10px;padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);">
        <div class="muted small">Deine Rolle:</div>
        <div style="font-weight:900; font-size:16px;">${escapeHtml(myRole.label)}</div>
        <div style="margin-top:6px;">${escapeHtml(myRole.info)}</div>
        <div class="muted small" style="margin-top:8px;">
          Teile diese Info im Chat – ohne die Team-Infos kann das Rätsel nicht gelöst werden.
        </div>
      </div>
    ` : `<div class="muted">Rolle wird geladen…</div>`;

    const body = `
      <ul>
        ${m.chapterIntro.map(x => `<li>${escapeHtml(x)}</li>`).join("")}
      </ul>
      ${roleHtml}
      <div class="muted small" style="margin-top:10px;">
        Danach geht ihr gemeinsam zur Station <b>${escapeHtml(m.npcName)}</b> und gebt eure Codes ab.
      </div>
    `;

    openModal({
      title: m.title,
      bodyHtml: body,
      actions: [
        { label: "OK", onClick: () => closeModal() }
      ]
    });
  }

  _getMyRoleForChapter(chap) {
    const assign = this.state?.assignments?.[chap];
    const roleIndex = assign ? assign[this.net.uid] : null;
    if (roleIndex == null) return null;
    const roles = MISSIONS[chap].roles;
    return roles[roleIndex % roles.length] || null;
  }

  _tryInteract() {
    const chap = this.state?.chapter ?? 0;
    if (chap >= MISSIONS.length) {
      showToast("Ende erreicht!");
      return;
    }
    const npc = NPCS.find(n => n.missionId === chap);
    if (!npc) return;

    const d = circleDist(this.me.x, this.me.y, npc.x, npc.y);
    if (d > npc.r + 18) {
      showToast(`Zu weit weg. Such die Station „${npc.name}“.`);
      return;
    }
    this._openSubmitModal(chap, npc.name);
  }

  _openSubmitModal(chap, npcName) {
    const m = MISSIONS[chap];
    const role = this._getMyRoleForChapter(chap);

    const body = `
      <div class="muted">Station: <b>${escapeHtml(npcName)}</b></div>
      <p>Gebt jetzt eure <b>individuellen Codes</b> ab. Erst wenn <b>alle</b> korrekt sind, öffnet sich das nächste Tor.</p>
      ${role ? `
        <div style="margin:10px 0;padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);">
          <div class="muted small">Deine Rolle:</div>
          <div style="font-weight:900;">${escapeHtml(role.label)}</div>
          <div style="margin-top:6px;">${escapeHtml(role.info)}</div>
        </div>
      ` : `<div class="muted">Rolle wird geladen…</div>`}

      <label style="margin-top:10px;display:block;">
        Dein Code (genau wie im Text)
        <input id="codeInput" placeholder="z.B. 1791" />
      </label>

      <div class="muted small">
        Tipp: Nutzt den Chat, um Infos auszutauschen.
      </div>
    `;

    openModal({
      title: `Abgabe – ${m.title}`,
      bodyHtml: body,
      actions: [
        {
          label: "Abgeben",
          onClick: async () => {
            const v = (document.getElementById("codeInput").value || "").trim();
            if (!v) return showToast("Bitte Code eingeben.");
            await this.net.submitForChapter(chap, v);
            this.audio.play("pickup", 0.45);
            closeModal();
            showToast("Abgegeben ✅ (Host prüft, ob alle korrekt sind)");
          }
        },
        { label: "Schließen", variant: "ghost", onClick: () => closeModal() }
      ]
    });
  }

  /* ---------- RENDER (Piraten-/Pergament-Look) ---------- */
  _render() {
    const ctx = this.ctx;
    const vw = this.canvas.width, vh = this.canvas.height;

    ctx.clearRect(0,0,vw,vh);

    // parchment background (screen-space)
    this._drawParchment(ctx, vw, vh);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // draw "ink coastline" walls
    for (const w of WALLS) {
      ctx.fillStyle = "rgba(40,25,12,.35)";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = "rgba(20,10,4,.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }

    // gates
    const gates = this.state?.gates || {};
    for (const [id, g] of Object.entries(GATES)) {
      const open = !!gates[id];
      ctx.fillStyle = open ? "rgba(90,140,80,.25)" : "rgba(120,60,45,.25)";
      ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.strokeStyle = open ? "rgba(60,110,60,.65)" : "rgba(90,40,30,.65)";
      ctx.lineWidth = 2;
      ctx.strokeRect(g.x, g.y, g.w, g.h);

      ctx.fillStyle = "rgba(20,10,4,.75)";
      ctx.font = "16px ui-sans-serif";
      ctx.fillText(open ? "✓" : "✕", g.x + 8, g.y + 20);
    }

    // NPC stations
    const chap = this.state?.chapter ?? 0;
    for (const npc of NPCS) {
      const isActive = npc.missionId === chap;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y, npc.r, 0, Math.PI*2);
      ctx.fillStyle = isActive ? "rgba(70,45,20,.28)" : "rgba(70,45,20,.16)";
      ctx.fill();
      ctx.strokeStyle = "rgba(20,10,4,.55)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "rgba(20,10,4,.85)";
      ctx.font = "16px ui-sans-serif";
      ctx.fillText(npc.name, npc.x - npc.r + 12, npc.y + 6);

      if (isActive) {
        ctx.fillStyle = "rgba(20,10,4,.75)";
        ctx.font = "13px ui-sans-serif";
        ctx.fillText("Interagieren (E)", npc.x - 40, npc.y + npc.r + 18);
      }
    }

    // players
    for (const [id, p] of Object.entries(this.players || {})) {
      if (!p?.online) continue;

      const isMe = id === this.net.uid;
      const r = isMe ? this.me.r : 14;
      const x = isMe ? this.me.x : p.x;
      const y = isMe ? this.me.y : p.y;

      const col = p.avatar?.color || (isMe ? "#6ee7ff" : "#ffffff");
      const icon = p.avatar?.icon || "🧭";

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = this._hexToRgba(col, isMe ? 0.55 : 0.35);
      ctx.fill();
      ctx.strokeStyle = "rgba(20,10,4,.55)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // icon
      ctx.font = "16px ui-sans-serif";
      ctx.fillStyle = "rgba(20,10,4,.85)";
      ctx.fillText(icon, x - 8, y + 6);

      // name
      ctx.font = "12px ui-sans-serif";
      ctx.fillStyle = "rgba(20,10,4,.85)";
      ctx.fillText(p.name || "Spieler", x - 22, y - 18);
    }

    ctx.restore();

    // bottom hint
    if (this.state?.phase === "playing") {
      const chapIdx = this.state.chapter ?? 0;
      if (chapIdx < MISSIONS.length) {
        const hint = `Ziel: Station „${MISSIONS[chapIdx].npcName}“ finden → Code abgeben. (Chat hilft!)`;
        ctx.fillStyle = "rgba(20,10,4,.85)";
        ctx.font = "14px ui-sans-serif";
        ctx.fillText(hint, 14, vh - 16);
      }
    } else {
      ctx.fillStyle = "rgba(20,10,4,.85)";
      ctx.font = "14px ui-sans-serif";
      ctx.fillText("Warte in der Room-Lobby, bis der Host startet…", 14, vh - 16);
    }
  }

  _drawParchment(ctx, w, h) {
    // parchment gradient
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0, "#f2e2b9");
    g.addColorStop(0.5, "#e7cf9a");
    g.addColorStop(1, "#d9b97f");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // vignette edges
    const vg = ctx.createRadialGradient(w/2,h/2, Math.min(w,h)*0.2, w/2,h/2, Math.min(w,h)*0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(60,30,10,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0,0,w,h);

    // light noise (deterministic-ish)
    ctx.globalAlpha = 0.08;
    for (let i=0;i<220;i++){
      const x = (i*73)%w;
      const y = (i*151)%h;
      ctx.fillStyle = "rgba(40,20,8,1)";
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;

    // compass rose (simple)
    ctx.save();
    ctx.translate(w-90, 90);
    ctx.strokeStyle = "rgba(20,10,4,.45)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0,0,36,0,Math.PI*2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0,-34); ctx.lineTo(0,34);
    ctx.moveTo(-34,0); ctx.lineTo(34,0);
    ctx.stroke();
    ctx.fillStyle = "rgba(20,10,4,.55)";
    ctx.font = "12px ui-sans-serif";
    ctx.fillText("N", -4, -42);
    ctx.restore();
  }

  _hexToRgba(hex, a) {
    const h = String(hex||"").replace("#","");
    const ok = h.length===6;
    const r = ok ? parseInt(h.slice(0,2),16) : 110;
    const g = ok ? parseInt(h.slice(2,4),16) : 231;
    const b = ok ? parseInt(h.slice(4,6),16) : 255;
    return `rgba(${r},${g},${b},${a})`;
  }
}
