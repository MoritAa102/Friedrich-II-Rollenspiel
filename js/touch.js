export function isTouchDevice() {
  return ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
}

export function setupTouchControls({ joyEl, knobEl, onMove, onInteract }) {
  let active = false;
  let center = { x: 0, y: 0 };
  let knob = { x: 0, y: 0 };
  const radius = 44;

  function setKnob(dx, dy) {
    // clamp to radius
    const len = Math.hypot(dx, dy);
    if (len > radius) {
      dx = dx / len * radius;
      dy = dy / len * radius;
    }
    knob.x = dx; knob.y = dy;
    knobEl.style.left = `calc(50% + ${dx}px)`;
    knobEl.style.top  = `calc(50% + ${dy}px)`;

    // output -1..1
    onMove(dx / radius, dy / radius);
  }

  function resetKnob() {
    knobEl.style.left = "50%";
    knobEl.style.top = "50%";
    onMove(0, 0);
  }

  function pointerDown(e) {
    active = true;
    const r = joyEl.getBoundingClientRect();
    center = { x: r.left + r.width/2, y: r.top + r.height/2 };
    joyEl.setPointerCapture?.(e.pointerId);
    pointerMove(e);
  }

  function pointerMove(e) {
    if (!active) return;
    const dx = e.clientX - center.x;
    const dy = e.clientY - center.y;
    setKnob(dx, dy);
  }

  function pointerUp() {
    active = false;
    resetKnob();
  }

  joyEl.addEventListener("pointerdown", pointerDown);
  joyEl.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
  window.addEventListener("pointercancel", pointerUp);

  // interact button wiring is done in main.js via click -> onInteract()

  return {
    destroy() {
      joyEl.removeEventListener("pointerdown", pointerDown);
      joyEl.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
    }
  };
}
