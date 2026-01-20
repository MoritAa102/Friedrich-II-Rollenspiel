import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getDatabase, ref, set, update, onValue, get, child,
  onDisconnect, serverTimestamp, push, query, limitToLast
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

let app, auth, db;
let uid = null;
let roomId = null;
let playerPath = null;

let unsubPlayers = null;
let unsubState = null;
let unsubChat = null;

export function getUid() { return uid; }
export function getRoomId() { return roomId; }

export function initFirebase(firebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
}

export async function signInAnon() {
  const cred = await signInAnonymously(auth);
  uid = cred.user.uid;
  return uid;
}

function makeRoomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createRoomAsHost() {
  if (!uid) throw new Error("not signed in");

  let code = makeRoomCode();
  for (let tries = 0; tries < 5; tries++) {
    const snap = await get(child(ref(db), `rooms/${code}/state`));
    if (!snap.exists()) break;
    code = makeRoomCode();
  }

  roomId = code;

  await set(ref(db, `rooms/${roomId}/state`), {
    hostUid: uid,
    phase: "room_lobby",   // NEU
    chapter: 0,
    gates: {},
    assignments: {},       // NEU: chapter -> {uid: roleIndex}
    createdAt: serverTimestamp()
  });

  await joinRoom(roomId);
  return roomId;
}

export async function joinRoom(code) {
  if (!uid) throw new Error("not signed in");
  roomId = code.toUpperCase().trim();

  const stateSnap = await get(child(ref(db), `rooms/${roomId}/state`));
  if (!stateSnap.exists()) throw new Error("Raum existiert nicht.");

  playerPath = `rooms/${roomId}/players/${uid}`;

  const spawn = { x: 120, y: 120 };

  // zuerst mit Default-Profil rein (Lobby wird später editiert)
  await set(ref(db, playerPath), {
    uid,
    name: "Spieler",
    avatar: { icon: "🧭", color: "#6ee7ff" },
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    online: true,
    submissions: {},
    joinedAt: serverTimestamp(),
    lastSeen: serverTimestamp()
  });

  await onDisconnect(ref(db, playerPath)).update({
    online: false,
    lastSeen: serverTimestamp()
  });

  return roomId;
}

export async function leaveRoom() {
  if (!roomId || !uid) return;
  if (unsubPlayers) { unsubPlayers(); unsubPlayers = null; }
  if (unsubState) { unsubState(); unsubState = null; }
  if (unsubChat) { unsubChat(); unsubChat = null; }

  if (playerPath) {
    await update(ref(db, playerPath), { online: false, lastSeen: serverTimestamp() });
  }
  roomId = null;
  playerPath = null;
}

export function listenPlayers(cb) {
  if (!roomId) throw new Error("not in room");
  const r = ref(db, `rooms/${roomId}/players`);
  unsubPlayers = onValue(r, (snap) => cb(snap.val() || {}));
  return unsubPlayers;
}

export function listenState(cb) {
  if (!roomId) throw new Error("not in room");
  const r = ref(db, `rooms/${roomId}/state`);
  unsubState = onValue(r, (snap) => cb(snap.val() || null));
  return unsubState;
}

export async function writeMyPlayer(partial) {
  if (!playerPath) return;
  await update(ref(db, playerPath), { ...partial, lastSeen: serverTimestamp() });
}

export async function saveMyProfile({ name, avatar }) {
  await writeMyPlayer({ name, avatar });
}

export async function submitForChapter(chapterId, value) {
  if (!playerPath) return;
  const patch = {};
  patch[`submissions/${chapterId}`] = { value: String(value), ts: Date.now() };
  await update(ref(db, playerPath), patch);
}

export async function hostUpdateState(partial) {
  if (!roomId) return;
  await update(ref(db, `rooms/${roomId}/state`), partial);
}

export async function hostSetAssignments(chapterId, map) {
  const patch = {};
  patch[`assignments/${chapterId}`] = map;
  await hostUpdateState(patch);
}

export async function hostStartGame() {
  await hostUpdateState({ phase: "playing", startedAt: serverTimestamp() });
}

/* Chat */
export async function sendChatMessage({ fromName, toUid, text }) {
  if (!roomId || !uid) return;
  const msgRef = push(ref(db, `rooms/${roomId}/chat`));
  await set(msgRef, {
    fromUid: uid,
    fromName: fromName || "Spieler",
    toUid: toUid || "all",
    text: String(text || "").slice(0, 180),
    ts: Date.now()
  });
}

export function listenChatMessages(cb) {
  if (!roomId) throw new Error("not in room");
  const q = query(ref(db, `rooms/${roomId}/chat`), limitToLast(60));
  unsubChat = onValue(q, (snap) => {
    const data = snap.val() || {};
    // sort by ts
    const msgs = Object.values(data).sort((a,b) => (a.ts||0)-(b.ts||0));
    cb(msgs);
  });
  return unsubChat;
}
