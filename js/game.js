import { WORLD, WALLS, GATES, NPCS, rectsOverlap, clamp, circleDist } from "./map.js";
import { MISSIONS } from "./missions.js";
import { openModal, closeModal, showToast, escapeHtml, setText } from "./ui.js";

export class Game {
  constructor({ canvas, audio, net }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audio = audio;
    this.net = net;

    this.me = { x: 120, y: 120, r: 16, speed: 220 };
    this.keys = new Set();
    this.lastT = performance.now();
    this.accumNet = 0;

    this.players = {};     // uid -> data
    this.state = null;     // room state
    this.isHost = false;

    this.camera = { x: 0, y: 0 };
    this.interactPressed = false;

    this.completedLocal = new Set(); // lokal, für UI
    this._bindInputs();
  }

  _bindInputs() {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) {
        this.keys.add(k);
        e.preventDefault();
      }
      if (k === "e") {
        this.interactPressed = true;
      }
    });
    window.addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      if (k === "e") this.interactPressed = false;
    });
  }

  setNetworkSnapshot({ players, state, isHost }) {
    this.players = players || {};
    this.state = state || this.state;
    this.isHost = !!isHost;

    const chap = this.state?.chapter ?? 0;
    setText("chapterLabel", `Kapitel: ${Math.min(chap+1, MISSIONS.length)} / ${MISSIONS.length}`);
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

    // Movement input
    let ix = 0, iy = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) iy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) iy += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) ix -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) ix += 1;

    const mag = Math.hypot(ix, iy) || 1;
    ix /= mag; iy /= mag;

    const vx = ix * this.me.speed;
    const vy = iy * this.me.speed;

    const old = { x: this.me.x, y: this.me.y };
    this.me.x += vx * dt;
    this.me.y += vy * dt;

    // clamp to world
    this.me.x = clamp(this.me.x, 60, WORLD.w - 60);
    this.me.y = clamp(this.me.y, 60, WORLD.h - 60);

    // collisions (walls + closed gates)
    if (this._collidesWithWorld()) {
      this.me.x = old.x;
      this.me.y = old.y;
    }

    this.audio.stepTick((vx !== 0 || vy !== 0), dt);

    // camera follows
    const vw = this.canvas.width, vh = this.canvas.height;
    this.camera.x = clamp(this.me.x - vw * 0.5, 0, WORLD.w - vw);
    this.camera.y = clamp(this.me.y - vh * 0.5, 0, WORLD.h - vh);

    // interaction
    if (this.interactPressed) {
      this._tryInteract();
      // verhindert „Dauer-Trigger“
      this.interactPressed = false;
    }

    // net update throttle
    this.accumNet += dt;
    if (this.accumNet >= 0.08) { // ~12.5x/s
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

  _tryInteract() {
    const chap = this.state?.chapter ?? 0;
    if (chap >= MISSIONS.length) {
      this._openEndScreen();
      return;
    }

    // Nächstes NPC-Ziel = aktuelles Kapitel
    const npc = NPCS.find(n => n.missionId === chap);
    if (!npc) return;

    const d = circleDist(this.me.x, this.me.y, npc.x, npc.y);
    if (d > npc.r + 18) {
      showToast(`Zu weit weg. Such die Station „${npc.name}“.`);
      return;
    }

    // Öffne Mission-Modal
    this._openMissionModal(chap, npc.name);
  }

  _openMissionModal(chap, npcName) {
    const m = MISSIONS[chap];

    const infoHtml = `
      <div class="muted">Station: <b>${escapeHtml(npcName)}</b></div>
      <ul>
        ${m.info.map(x => `<li>${escapeHtml(x)}</li>`).join("")}
      </ul>
      <hr style="border:0;border-top:1px solid rgba(255,255,255,.10);margin:12px 0;">
      <div><b>Quiz:</b> ${escapeHtml(m.quiz.q)}</div>
      <div style="margin-top:10px;display:grid;gap:8px;">
        ${m.quiz.options.map((opt, i) => `
          <button data-opt="${i}" style="text-align:left;background:rgba(255,255,255,.06);font-weight:700;">
            ${escapeHtml(opt)}
          </button>
        `).join("")}
      </div>
      <div class="muted small" style="margin-top:10px;">
        Wenn alle im Raum dieses Kapitel geschafft haben, öffnet sich das nächste Tor.
      </div>
    `;

    openModal({
      title: m.title,
      bodyHtml: infoHtml,
      actions: [
        { label: "Schließen", variant: "ghost", onClick: () => closeModal() }
      ]
    });

    // Buttons aktivieren
    const body = document.getElementById("modalBody");
    body.querySelectorAll("button[data-opt]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.getAttribute("data-opt"));
        const ok = idx === m.quiz.correctIndex;

        if (ok) {
          this.audio.play("correct", 0.65);
          showToast("✅ Richtig! Kapitel als erledigt markiert.");
          this.completedLocal.add(chap);
          await this.net.markProgress(chap, true);
          closeModal();
        } else {
          this.audio.play("wrong", 0.6);
          showToast("❌ Nicht ganz. Lies die Infos nochmal und versuch es erneut.");
        }
      });
    });
  }

  _openEndScreen() {
    const summary = `
      <p><b>Glückwunsch!</b> Ihr habt alle Kapitel abgeschlossen.</p>
      <p class="muted">
        In Kurzform: Jugendkonflikt → Machtpolitik (Schlesien) → Aufklärung/Sanssouci → Krise im Siebenjährigen Krieg →
        Reformen/effizienter Staat → Versorgung (Kartoffeln & Landwirtschaft).
      </p>
      <hr style="border:0;border-top:1px solid rgba(255,255,255,.10);margin:12px 0;">
      <p><b>Wie spaßig war das Spiel?</b> (für die Klassen-Auswertung)</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${[1,2,3,4,5].map(n => `
          <button data-fun="${n}" style="min-width:64px;background:rgba(110,231,255,.14);font-weight:800;">
            ${n}/5
          </button>
        `).join("")}
      </div>
      <p class="muted small" style="margin-top:10px;">
        1 = eher meh · 5 = hat richtig Spaß gemacht
      </p>
    `;

    openModal({
      title: "Ende – Friedrich II gelernt ✅",
      bodyHtml: summary,
      actions: [
        { label: "Schließen", variant: "ghost", onClick: () => closeModal() }
      ]
    });

    const body = document.getElementById("modalBody");
    body.querySelectorAll("button[data-fun]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const v = Number(btn.getAttribute("data-fun"));
        await this.net.setFunRating(v);
        this.audio.play("pickup", 0.45);
        showToast(`Danke! Spaß-Wert: ${v}/5 gespeichert.`);
      });
    });
  }

  _render() {
    const ctx = this.ctx;
    const vw = this.canvas.width, vh = this.canvas.height;

    // background
    ctx.clearRect(0,0,vw,vh);
    ctx.fillRect(0,0,vw,vh);

    // world offset
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // floor grid (leicht)
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    for (let x = 0; x <= WORLD.w; x += 80) {
      ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.h);
    }
    for (let y = 0; y <= WORLD.h; y += 80) {
      ctx.moveTo(0, y); ctx.lineTo(WORLD.w, y);
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // walls
    ctx.fillStyle = "rgba(255,255,255,.12)";
    for (const w of WALLS) ctx.fillRect(w.x, w.y, w.w, w.h);

    // gates
    const gates = this.state?.gates || {};
    for (const [id, g] of Object.entries(GATES)) {
      const open = !!gates[id];
      ctx.fillStyle = open ? "rgba(125,255,178,.18)" : "rgba(255,110,110,.18)";
      ctx.fillRect(g.x, g.y, g.w, g.h);

      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.font = "12px ui-sans-serif";
      ctx.fillText(open ? "offen" : "zu", g.x + 6, g.y + 14);
    }

    // NPC stations
    const chap = this.state?.chapter ?? 0;
    for (const npc of NPCS) {
      const isActive = npc.missionId === chap;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y, npc.r, 0, Math.PI*2);
      ctx.fillStyle = isActive ? "rgba(110,231,255,.18)" : "rgba(255,255,255,.06)";
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.font = "14px ui-sans-serif";
      ctx.fillText(npc.name, npc.x - npc.r + 10, npc.y + 5);

      if (isActive) {
        ctx.fillStyle = "rgba(255,255,255,.65)";
        ctx.font = "12px ui-sans-serif";
        ctx.fillText("E drücken", npc.x - 22, npc.y + npc.r + 16);
      }
    }

    // other players
    for (const [id, p] of Object.entries(this.players || {})) {
      if (!p?.online) continue;
      if (id === this.net.uid) continue;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI*2);
      ctx.fillStyle = "rgba(255,255,255,.22)";
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.font = "12px ui-sans-serif";
      ctx.fillText(p.name || "Spieler", p.x - 18, p.y - 18);
    }

    // me
    ctx.beginPath();
    ctx.arc(this.me.x, this.me.y, this.me.r, 0, Math.PI*2);
    ctx.fillStyle = "rgba(110,231,255,.45)";
    ctx.fill();

    ctx.restore();

    // hint text
    if (this.state) {
      const chapIdx = this.state.chapter ?? 0;
      if (chapIdx < MISSIONS.length) {
        const hint = MISSIONS[chapIdx].npcHint;
        // klein rechts unten
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.font = "13px ui-sans-serif";
        ctx.fillText(hint, 14, vh - 16);
      }
    }
  }
}
