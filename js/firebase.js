import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getDatabase, ref, set, update, onValue, get, child,
  onDisconnect, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

let app, auth, db;

let uid = null;
let roomId = null;
let playerPath = null;

let unsubPlayers = null;
let unsubState = null;

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

export async function createRoomAsHost(displayName) {
  if (!uid) throw new Error("not signed in");

  let code = makeRoomCode();
  // Kollisionen vermeiden: falls existiert, neu generieren
  for (let tries = 0; tries < 5; tries++) {
    const snap = await get(child(ref(db), `rooms/${code}/state`));
    if (!snap.exists()) break;
    code = makeRoomCode();
  }

  roomId = code;

  // Room state: Host setzt hostUid + Kapitel 0
  await set(ref(db, `rooms/${roomId}/state`), {
    hostUid: uid,
    chapter: 0,
    gates: {},
    createdAt: serverTimestamp()
  });

  await joinRoom(roomId, displayName);
  return roomId;
}

export async function joinRoom(code, displayName) {
  if (!uid) throw new Error("not signed in");
  roomId = code.toUpperCase().trim();

  // prüfen, ob Room existiert
  const stateSnap = await get(child(ref(db), `rooms/${roomId}/state`));
  if (!stateSnap.exists()) throw new Error("Raum existiert nicht.");

  playerPath = `rooms/${roomId}/players/${uid}`;

  const spawn = { x: 120, y: 120 };
  await set(ref(db, playerPath), {
    uid,
    name: displayName,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    progress: {},
    fun: null,
    online: true,
    joinedAt: serverTimestamp(),
    lastSeen: serverTimestamp()
  });

  // Presence: beim Disconnect automatisch offline setzen
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

  // markiere offline
  if (playerPath) {
    await update(ref(db, playerPath), { online: false, lastSeen: serverTimestamp() });
  }

  roomId = null;
  playerPath = null;
}

export function listenPlayers(cb) {
  if (!roomId) throw new Error("not in room");
  const r = ref(db, `rooms/${roomId}/players`);
  const off = onValue(r, (snap) => cb(snap.val() || {}));
  unsubPlayers = off;
  return off;
}

export function listenState(cb) {
  if (!roomId) throw new Error("not in room");
  const r = ref(db, `rooms/${roomId}/state`);
  const off = onValue(r, (snap) => cb(snap.val() || null));
  unsubState = off;
  return off;
}

export async function writeMyPlayer(partial) {
  if (!playerPath) return;
  await update(ref(db, playerPath), {
    ...partial,
    lastSeen: serverTimestamp()
  });
}

export async function markProgress(chapterId, value = true) {
  if (!playerPath) return;
  const patch = {};
  patch[`progress/${chapterId}`] = value;
  await update(ref(db, playerPath), patch);
}

export async function setFunRating(value) {
  if (!playerPath) return;
  await update(ref(db, playerPath), { fun: value });
}

export async function hostUpdateState(partial) {
  if (!roomId) return;
  await update(ref(db, `rooms/${roomId}/state`), partial);
}
