import { AudioBus } from "./audio.js";
import { Game } from "./game.js";
import { MISSIONS } from "./missions.js";
import { showToast, setText } from "./ui.js";
import {
  initFirebase, signInAnon,
  createRoomAsHost, joinRoom, leaveRoom,
  listenPlayers, listenState,
  writeMyPlayer, markProgress, hostUpdateState,
  getUid, getRoomId, setFunRating
} from "./firebase.js";

// 1) HIER Firebase Config einfügen (aus Firebase Console)
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
  lobby: document.getElementById("lobby"),
  gameWrap: document.getElementById("gameWrap"),
  nameInput: document.getElementById("nameInput"),
  roomInput: document.getElementById("roomInput"),
  createBtn: document.getElementById("createBtn"),
  joinBtn: document.getElementById("joinBtn"),
  lobbyMsg: document.getElementById("lobbyMsg"),
  leaveBtn: document.getElementById("leaveBtn"),
  roomLabel: document.getElementById("roomLabel"),
  netStatus: document.getElementById("netStatus"),
  canvas: document.getElementById("game")
};

const audio = new AudioBus();

let playersSnap = {};
let stateSnap = null;

let isHost = false;
let game = null;

function setLobbyMsg(msg, isErr = false) {
  els.lobbyMsg.style.color = isErr ? "#ff6e6e" : "#6ee7ff";
  els.lobbyMsg.textContent = msg;
}

function showGameUI(roomId) {
  els.lobby.classList.add("hidden");
  els.gameWrap.classList.remove("hidden");
  els.roomLabel.textContent = `Raum: ${roomId}`;
  setText("chapterLabel", "Kapitel: 1");
}

function showLobbyUI() {
  els.gameWrap.classList.add("hidden");
  els.lobby.classList.remove("hidden");
  setLobbyMsg("");
}

function normalizeName(raw) {
  const n = (raw || "").trim();
  return n.length ? n.slice(0, 18) : "Spieler";
}

async function ensureSignedIn() {
  if (getUid()) return getUid();
  els.netStatus.textContent = "verbinden…";
  const uid = await signInAnon();
  els.netStatus.textContent = "online";
  return uid;
}

function attachListeners() {
  listenPlayers((p) => {
    playersSnap = p || {};
    if (game) game.setNetworkSnapshot({ players: playersSnap, state: stateSnap, isHost });
    if (isHost) hostCheckAdvance();
  });

  listenState((s) => {
    stateSnap = s;
    isHost = (stateSnap?.hostUid && stateSnap.hostUid === getUid());
    if (game) game.setNetworkSnapshot({ players: playersSnap, state: stateSnap, isHost });

    // Gate sound when new gate opens (simple: compare lastState)
    // (leicht gehalten – optional)
  });
}

// Host-Logik: wenn alle online Spieler progress[chapter] true -> Gate öffnen + chapter++
async function hostCheckAdvance() {
  if (!isHost || !stateSnap) return;
  const chap = stateSnap.chapter ?? 0;
  if (chap >= MISSIONS.length) return;

  const onlinePlayers = Object.values(playersSnap || {}).filter(p => p && p.online);
  if (onlinePlayers.length === 0) return;

  const allDone = onlinePlayers.every(p => p.progress && p.progress[chap] === true);
  if (!allDone) return;

  const mission = MISSIONS[chap];
  const gates = stateSnap.gates || {};
  const patch = {
    chapter: chap + 1,
    gates: { ...gates, [mission.unlockGateId]: true }
  };

  await hostUpdateState(patch);
  audio.play("gate", 0.6);
}

els.createBtn.addEventListener("click", async () => {
  try {
    const name = normalizeName(els.nameInput.value);
    await ensureSignedIn();

    // Musik starten (User click)
    await audio.startMusic();

    const roomId = await createRoomAsHost(name);
    setLobbyMsg(`Raum erstellt: ${roomId} (Teile den Code!)`);
    showGameUI(roomId);

    isHost = true;
    attachListeners();

    game = new Game({
      canvas: els.canvas,
      audio,
      net: {
        uid: getUid(),
        writeMyPlayer,
        markProgress,
        setFunRating
      }
    });
    game.setNetworkSnapshot({ players: playersSnap, state: stateSnap, isHost });
    game.start();

  } catch (e) {
    console.error(e);
    setLobbyMsg(String(e.message || e), true);
  }
});

els.joinBtn.addEventListener("click", async () => {
  try {
    const name = normalizeName(els.nameInput.value);
    const code = (els.roomInput.value || "").trim();
    if (!code) return setLobbyMsg("Bitte Raumcode eingeben.", true);

    await ensureSignedIn();

    // Musik starten (User click)
    await audio.startMusic();

    const roomId = await joinRoom(code, name);
    setLobbyMsg(`Beigetreten: ${roomId}`);
    showGameUI(roomId);

    attachListeners();

    game = new Game({
      canvas: els.canvas,
      audio,
      net: {
        uid: getUid(),
        writeMyPlayer,
        markProgress,
        setFunRating
      }
    });
    game.setNetworkSnapshot({ players: playersSnap, state: stateSnap, isHost });
    game.start();

  } catch (e) {
    console.error(e);
    setLobbyMsg(String(e.message || e), true);
  }
});

els.leaveBtn.addEventListener("click", async () => {
  await leaveRoom();
  audio.stopMusic();
  game = null;
  playersSnap = {};
  stateSnap = null;
  isHost = false;
  showLobbyUI();
  showToast("Raum verlassen.");
});

// kleine Qualität: wenn Tab schließt, offline markieren (best effort)
window.addEventListener("beforeunload", () => {
  try { writeMyPlayer({ online: false }); } catch {}
});
