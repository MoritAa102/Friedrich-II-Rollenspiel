import { AudioBus } from "./audio.js";
import { Game } from "./game.js";
import { MISSIONS } from "./missions.js";
import { showToast } from "./ui.js";
import { isTouchDevice, setupTouchControls } from "./touch.js";
import { setupChatUI } from "./chat.js";

import {
  initFirebase, signInAnon,
  createRoomAsHost, joinRoom, leaveRoom,
  listenPlayers, listenState,
  writeMyPlayer, saveMyProfile, submitForChapter,
  hostUpdateState, hostSetAssignments, hostStartGame,
  sendChatMessage, listenChatMessages,
  getUid, getRoomId
} from "./firebase.js";

// 1) HIER Firebase Config einfügen
const firebaseConfig = {
  apiKey: "AIzaSyAMhMpk1OAgNPmhVG5F8W9fIAnODIPBvds",
  authDomain: "friedrich-ii-2.firebaseapp.com",
  databaseURL: "https://friedrich-ii-2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "friedrich-ii-2",
  storageBucket: "friedrich-ii-2.firebasestorage.app",
  messagingSenderId: "1052196901438",
  appId: "1:1052196901438:web:7d8424071a5b32e207376f"
};

initFirebase(firebaseConfig);

const els = {
  entry: document.getElementById("entry"),
  createBtn: document.getElementById("createBtn"),
  joinBtn: document.getElementById("joinBtn"),
  roomInput: document.getElementById("roomInput"),
  entryMsg: document.getElementById("entryMsg"),

  gameWrap: document.getElementById("gameWrap"),
  canvas: document.getElementById("game"),
  netStatus: document.getElementById("netStatus"),
  leaveBtn: document.getElementById("leaveBtn"),

  roomLabel: document.getElementById("roomLabel"),

  // room lobby
  roomLobby: document.getElementById("roomLobby"),
  nameInput: document.getElementById("nameInput"),
  avatarIcons: document.getElementById("avatarIcons"),
  avatarColors: document.getElementById("avatarColors"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  startBtn: document.getElementById("startBtn"),
  playerList: document.getElementById("playerList"),

  // touch
  touch: document.getElementById("touch"),
  joy: document.getElementById("joy"),
  joyKnob: document.getElementById("joyKnob"),
  btnInteract: document.getElementById("btnInteract"),
  btnChat: document.getElementById("btnChat")
};

const audio = new AudioBus();

let playersSnap = {};
let stateSnap = null;
let isHost = false;

let game = null;
let chatUI = null;
let touch = null;

// Input abstraction (keyboard + touch)
const keyState = new Set();
let touchAxes = { x: 0, y: 0 };
let interactFlag = false;

function setEntryMsg(msg, isErr=false){
  els.entryMsg.style.color = isErr ? "#ff6e6e" : "#6ee7ff";
  els.entryMsg.textContent = msg;
}

function showGameUI(roomId){
  els.entry.classList.add("hidden");
  els.gameWrap.classList.remove("hidden");
  els.roomLabel.textContent = `Raum: ${roomId}`;
}

function showEntryUI(){
  els.gameWrap.classList.add("hidden");
  els.entry.classList.remove("hidden");
  setEntryMsg("");
}

async function ensureSignedIn() {
  if (getUid()) return getUid();
  els.netStatus.textContent = "verbinden…";
  const uid = await signInAnon();
  els.netStatus.textContent = "online";
  return uid;
}

function normalizeName(raw) {
  const n = (raw || "").trim();
  return n.length ? n.slice(0,18) : "Spieler";
}

/* ---------- Avatar picker ---------- */
const ICONS = ["🧭","🗝️","📜","⚓","🗡️","🏰","🪙","🕯️"];
const COLORS = ["#6ee7ff","#7dffb2","#ffcf6e","#ff6e6e","#c7a6ff","#ffffff","#8bd3ff","#ffd6a5"];
let chosenIcon = ICONS[0];
let chosenColor = COLORS[0];

function renderAvatarPicker(){
  els.avatarIcons.innerHTML = "";
  for (const ic of ICONS) {
    const d = document.createElement("div");
    d.className = "avatarPick" + (ic===chosenIcon ? " active":"");
    d.textContent = ic;
    d.onclick = () => { chosenIcon = ic; renderAvatarPicker(); };
    els.avatarIcons.appendChild(d);
  }

  els.avatarColors.innerHTML = "";
  for (const c of COLORS) {
    const d = document.createElement("div");
    d.className = "avatarPick" + (c===chosenColor ? " active":"");
    d.style.background = c;
    d.textContent = "";
    d.onclick = () => { chosenColor = c; renderAvatarPicker(); };
    els.avatarColors.appendChild(d);
  }
}
renderAvatarPicker();

/* ---------- Keyboard input ---------- */
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) {
    keyState.add(k); e.preventDefault();
  }
  if (k === "e") interactFlag = true;
  if (k === "enter") {
    // optional
  }
});
window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  keyState.delete(k);
});

function getAxes() {
  // Touch has priority if active
  if (Math.abs(touchAxes.x) > 0.05 || Math.abs(touchAxes.y) > 0.05) {
    return { x: touchAxes.x, y: touchAxes.y };
  }

  let x = 0, y = 0;
  if (keyState.has("w") || keyState.has("arrowup")) y -= 1;
  if (keyState.has("s") || keyState.has("arrowdown")) y += 1;
  if (keyState.has("a") || keyState.has("arrowleft")) x -= 1;
  if (keyState.has("d") || keyState.has("arrowright")) x += 1;
  return { x, y };
}
function consumeInteract(){
  const v = interactFlag;
  interactFlag = false;
  return v;
}

/* ---------- Firebase listeners ---------- */
function attachListeners(){
  listenPlayers((p) => {
    playersSnap = p || {};
    updateRoomLobbyUI();
    if (game) game.setNetworkSnapshot({ players: playersSnap, state: stateSnap, isHost });
    if (chatUI) chatUI.refreshRecipients();
    if (isHost) hostCheckAdvance();
  });

  listenState((s) => {
    stateSnap = s;
    isHost = (stateSnap?.hostUid && stateSnap.hostUid === getUid());

    // show room lobby overlay if phase != playing
    if (stateSnap?.phase !== "playing") {
      els.roomLobby.classList.remove("hidden");
      els.startBtn.classList.toggle("hidden", !isHost);
    } else {
      els.roomLobby.classList.add("hidden");
    }

    if (game) game.setNetworkSnapshot({ players: playersSnap, state: stateSnap, isHost });
    if (isHost) hostEnsureAssignments();
  });
}

function updateRoomLobbyUI(){
  // list players
  const lines = [];
  for (const [uid, p] of Object.entries(playersSnap || {})) {
    if (!p) continue;
    const online = p.online ? "online" : "offline";
    const hostBadge = (uid === stateSnap?.hostUid) ? "HOST" : "";
    const av = `${p.avatar?.icon || "🧭"}`;
    lines.push({ uid, name: p.name || "Spieler", online, hostBadge, av });
  }

  els.playerList.innerHTML = "";
  for (const l of lines) {
    const div = document.createElement("div");
    div.className = "playerLine";
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:18px;">${l.av}</div>
        <div>
          <div style="font-weight:900;">${l.name}</div>
          <div class="muted small">${l.online}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        ${l.hostBadge ? `<div class="badge">${l.hostBadge}</div>` : ``}
      </div>
    `;
    els.playerList.appendChild(div);
  }
}

/* ---------- Host logic: assign roles & advance chapters ---------- */
function computeAssignmentsForChapter(chap) {
  const roles = MISSIONS[chap].roles.length;
  const online = Object.entries(playersSnap || {})
    .filter(([_,p]) => p?.online)
    .sort((a,b) => (a[1].joinedAt||0) - (b[1].joinedAt||0));

  const map = {};
  online.forEach(([uid], idx) => {
    map[uid] = idx % roles;
  });
  return map;
}

async function hostEnsureAssignments() {
  if (!isHost || !stateSnap) return;
  if (stateSnap.phase !== "playing") return;

  const chap = stateSnap.chapter ?? 0;
  if (chap >= MISSIONS.length) return;

  const has = stateSnap.assignments && stateSnap.assignments[chap];
  if (!has) {
    const map = computeAssignmentsForChapter(chap);
    await hostSetAssignments(chap, map);
  }
}

async function hostCheckAdvance(){
  if (!isHost || !stateSnap) return;
  if (stateSnap.phase !== "playing") return;

  const chap = stateSnap.chapter ?? 0;
  if (chap >= MISSIONS.length) return;

  const assign = stateSnap.assignments?.[chap];
  if (!assign) return; // hostEnsureAssignments will set it

  const onlinePlayers = Object.entries(playersSnap || {}).filter(([_,p]) => p?.online);
  if (onlinePlayers.length === 0) return;

  const roles = MISSIONS[chap].roles;

  // all online must have correct submission
  const allOk = onlinePlayers.every(([uid, p]) => {
    const roleIndex = assign[uid];
    if (roleIndex == null) return false;
    const expected = String(roles[roleIndex % roles.length].answer).trim().toLowerCase();

    const sub = p.submissions?.[chap]?.value;
    if (!sub) return false;
    const got = String(sub).trim().toLowerCase();

    return got === expected;
  });

  if (!allOk) return;

  // open gate and advance
  const mission = MISSIONS[chap];
  const gates = stateSnap.gates || {};
  await hostUpdateState({
    chapter: chap + 1,
    gates: { ...gates, [mission.unlockGateId]: true }
  });

  audio.play("gate", 0.6);
  showToast("Kapitel geschafft! Tor geöffnet ✅");
}

/* ---------- Chat ---------- */
function bootChat(){
  if (chatUI) return;

  chatUI = setupChatUI({
    getPlayers: () => playersSnap,
    sendChat: async ({toUid, text}) => {
      const me = playersSnap?.[getUid()];
      await sendChatMessage({ fromName: me?.name || "Spieler", toUid, text });
    },
    listenChat: (onMsg) => {
      // we listen to last messages and emit only new ones by keeping an index
      let lastCount = 0;
      const unsub = listenChatMessages((msgs) => {
        const myUid = getUid();
        if (msgs.length > lastCount) {
          const newOnes = msgs.slice(lastCount);
          newOnes.forEach(m => onMsg(m, myUid));
          lastCount = msgs.length;
        }
      });
      return unsub;
    }
  });

  document.getElementById("btnChat").addEventListener("click", () => chatUI.toggle());
}

/* ---------- Touch controls ---------- */
function bootTouch(){
  if (!isTouchDevice()) return;
  els.touch.classList.remove("hidden");

  touch = setupTouchControls({
    joyEl: els.joy,
    knobEl: els.joyKnob,
    onMove: (x,y) => { touchAxes = { x, y }; },
    onInteract: () => { interactFlag = true; }
  });

  els.btnInteract.addEventListener("click", () => { interactFlag = true; });
}

/* ---------- Game boot ---------- */
function startGameLoop(){
  game = new Game({
    canvas: els.canvas,
    audio,
    net: {
      uid: getUid(),
      writeMyPlayer,
      submitForChapter
    },
    input: { getAxes, consumeInteract }
  });
  game.setNetworkSnapshot({ players: playersSnap, state: stateSnap, isHost });
  game.start();
}

/* ---------- Entry actions ---------- */
els.createBtn.addEventListener("click", async () => {
  try {
    await ensureSignedIn();
    await audio.startMusic();

    const roomId = await createRoomAsHost();
    showGameUI(roomId);
    attachListeners();
    bootChat();
    bootTouch();
    startGameLoop();

  } catch (e) {
    console.error(e);
    setEntryMsg(String(e.message || e), true);
  }
});

els.joinBtn.addEventListener("click", async () => {
  try {
    const code = (els.roomInput.value || "").trim();
    if (!code) return setEntryMsg("Bitte Raumcode eingeben.", true);

    await ensureSignedIn();
    await audio.startMusic();

    const roomId = await joinRoom(code);
    showGameUI(roomId);
    attachListeners();
    bootChat();
    bootTouch();
    startGameLoop();

  } catch (e) {
    console.error(e);
    setEntryMsg(String(e.message || e), true);
  }
});

/* ---------- Room lobby actions ---------- */
els.saveProfileBtn.addEventListener("click", async () => {
  const name = normalizeName(els.nameInput.value);
  await saveMyProfile({ name, avatar: { icon: chosenIcon, color: chosenColor } });
  showToast("Profil gespeichert ✅");
});

els.startBtn.addEventListener("click", async () => {
  if (!isHost) return;
  await hostStartGame();
  showToast("Spiel gestartet!");
  // host ensures assignments shortly after state updates
});

/* ---------- Leave ---------- */
els.leaveBtn.addEventListener("click", async () => {
  await leaveRoom();
  audio.stopMusic();
  game?.destroy?.();
  game = null;
  playersSnap = {};
  stateSnap = null;
  isHost = false;
  showEntryUI();
  showToast("Raum verlassen.");
});

// best effort offline
window.addEventListener("beforeunload", () => {
  try { writeMyPlayer({ online:false }); } catch {}
});
