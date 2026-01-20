let toastTimer = null;

export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function showToast(msg, ms = 2200) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
}

export function openModal({ title, bodyHtml, actions }) {
  const back = document.getElementById("modalBackdrop");
  const t = document.getElementById("modalTitle");
  const b = document.getElementById("modalBody");
  const a = document.getElementById("modalActions");

  t.textContent = title;
  b.innerHTML = bodyHtml;
  a.innerHTML = "";

  for (const act of actions) {
    const btn = document.createElement("button");
    btn.textContent = act.label;
    if (act.variant === "ghost") btn.classList.add("ghost");
    btn.addEventListener("click", act.onClick);
    a.appendChild(btn);
  }

  back.classList.remove("hidden");
}

export function closeModal() {
  document.getElementById("modalBackdrop").classList.add("hidden");
}

export function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[m]));
}
