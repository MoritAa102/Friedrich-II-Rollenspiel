import { escapeHtml } from "./ui.js";

export function setupChatUI({ getPlayers, sendChat, listenChat }) {
  const chat = document.getElementById("chat");
  const chatTo = document.getElementById("chatTo");
  const chatMsgs = document.getElementById("chatMsgs");
  const chatInput = document.getElementById("chatInput");
  const chatSend = document.getElementById("chatSend");
  const chatClose = document.getElementById("chatClose");

  let toUid = "all";

  function open() { chat.classList.remove("hidden"); refreshRecipients(); chatInput.focus(); }
  function close(){ chat.classList.add("hidden"); }
  function toggle(){ chat.classList.contains("hidden") ? open() : close(); }

  function refreshRecipients() {
    const players = getPlayers();
    const opts = [{ uid: "all", name: "An alle" }];
    for (const [uid, p] of Object.entries(players || {})) {
      if (!p?.online) continue;
      opts.push({ uid, name: p.name || "Spieler" });
    }

    chatTo.innerHTML = "";
    for (const o of opts) {
      const opt = document.createElement("option");
      opt.value = o.uid;
      opt.textContent = o.uid === "all" ? "An alle" : `An: ${o.name}`;
      if (o.uid === toUid) opt.selected = true;
      chatTo.appendChild(opt);
    }
  }

  function addMsg(m, myUid) {
    // Show if: to all OR to me OR from me
    const isMine = m.fromUid === myUid;
    const visible = (m.toUid === "all") || isMine || (m.toUid === myUid);
    if (!visible) return;

    const div = document.createElement("div");
    div.className = "chatBubble" + (isMine ? " me" : "");
    const toLine = m.toUid === "all" ? "an alle" : "DM";
    div.innerHTML = `
      <div class="chatMeta"><b>${escapeHtml(m.fromName || "?" )}</b> · ${escapeHtml(toLine)}</div>
      <div>${escapeHtml(m.text || "")}</div>
    `;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  chatTo.addEventListener("change", () => {
    toUid = chatTo.value;
  });

  chatSend.addEventListener("click", async () => {
    const text = (chatInput.value || "").trim();
    if (!text) return;
    chatInput.value = "";
    await sendChat({ toUid, text });
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") chatSend.click();
  });

  chatClose.addEventListener("click", close);

  const unsub = listenChat((msg, myUid) => addMsg(msg, myUid));

  return { open, close, toggle, refreshRecipients, unsub };
}
