export class AudioBus {
  constructor() {
    this.music = new Audio("./assets/audio/bgm.mp3");
    this.music.loop = true;
    this.music.volume = 0.18; // leise Hintergrundmusik

    this.sfx = {
      pickup: "./assets/audio/sfx_pickup.wav",
      correct: "./assets/audio/sfx_correct.wav",
      wrong: "./assets/audio/sfx_wrong.wav",
      gate: "./assets/audio/sfx_gate.wav",
      step: "./assets/audio/sfx_step.wav"
    };

    this._stepCooldown = 0;
  }

  // Muss nach User-Interaktion gestartet werden (Browser-Regel)
  async startMusic() {
    try { await this.music.play(); } catch { /* ignorieren */ }
  }

  stopMusic() {
    this.music.pause();
    this.music.currentTime = 0;
  }

  play(name, volume = 0.7) {
    const src = this.sfx[name];
    if (!src) return;
    const a = new Audio(src);
    a.volume = volume;
    a.play().catch(() => {});
  }

  stepTick(isMoving, dt) {
    if (!isMoving) { this._stepCooldown = 0; return; }
    this._stepCooldown -= dt;
    if (this._stepCooldown <= 0) {
      this.play("step", 0.22);
      this._stepCooldown = 0.22; // steps pro Sekunde
    }
  }
}
