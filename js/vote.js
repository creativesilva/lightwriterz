// LWZ officer election ballot (opened from the voting QR on the officer iPad).
// Student number (6 dots) -> ballot -> confirm -> done. The database checks that the student
// checked in at today's meeting, that voting is open, and that each number votes only once.
import { firebaseConfig, SDK, pacificParts } from "./lwz-firebase.js?v=2";
const { initializeApp } = await import(SDK + "firebase-app.js");
const { getFirestore, doc, getDoc, writeBatch, serverTimestamp, onSnapshot } = await import(SDK + "firebase-firestore.js");
const db = getFirestore(initializeApp(firebaseConfig));

const ELECTION = "management-assistant-2026";
const OPENS = Date.parse("2026-10-13T19:25:00Z"), CLOSES = Date.parse("2026-10-13T20:05:00Z");
const $ = id => document.getElementById(id);
const views = ["v-closed", "v-sid", "v-ballot", "v-confirm", "v-done"];
const show = v => views.forEach(x => { $(x).hidden = x !== v; });

let testUntil = 0;
try { const s = await getDoc(doc(db, "settings", "checkin")); if (s.exists() && s.data().testUntil) testUntil = s.data().testUntil.toMillis(); } catch (e) {}
// Voting starts when an officer presses Open voting (after attendance fills in) and ends on Close
// voting or at 1:05 PM. The page follows the switch live.
let switchOn = false, everOpened = false;
const inTime = () => (Date.now() >= OPENS && Date.now() < CLOSES) || Date.now() < testUntil;
const isOpen = () => switchOn && inTime();

const fmt = d => d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", second: "2-digit" });
setInterval(() => { $("clock").textContent = fmt(new Date()); }, 1000); $("clock").textContent = fmt(new Date());

let sid = "", first = "", choice = "";
function start() {
  if (!isOpen()) {
    $("closed-msg").textContent = Date.now() >= CLOSES || (everOpened && !switchOn) ? "Voting has ended. Thank you, Light Writers. Results will be announced by the officers."
      : "Voting has not started yet. Check in at today's meeting first. This page opens the ballot by itself when the officers start the vote.";
    show("v-closed"); return;
  }
  $("sid").value = ""; paint(); $("sid-err").hidden = true; show("v-sid"); $("sid").focus();
}
function paint() { const n = $("sid").value.length; document.querySelectorAll(".ci-dots i").forEach((d, i) => d.classList.toggle("on", i < n)); }
$("sid").addEventListener("input", () => { $("sid").value = $("sid").value.replace(/\D/g, "").slice(0, 6); paint(); $("sid-err").hidden = true; });
onSnapshot(doc(db, "settings", "vote"), s => {
  const was = isOpen(); switchOn = !!(s.exists() && s.data().open); if (switchOn) everOpened = true;
  if (isOpen() !== was && $("v-done").hidden) start();
}, () => {});
start();
setInterval(() => { if ((!$("v-closed").hidden && isOpen()) || (!isOpen() && $("v-done").hidden && $("v-closed").hidden)) start(); }, 15000);

const sidErr = m => { $("sid-err").textContent = m; $("sid-err").hidden = false; };
$("v-sid").addEventListener("submit", async e => {
  e.preventDefault();
  const v = $("sid").value;
  if (!/^\d{6}$/.test(v)) return sidErr("Enter your 6 digit student number.");
  $("sid-go").disabled = true;
  try {
    const [pub, voted] = await Promise.all([getDoc(doc(db, "members_public", v)), getDoc(doc(db, "voted", `${ELECTION}_${v}`))]);
    if (!pub.exists()) return sidErr("We could not find that number. Check in at today's meeting first (scan the check-in QR), then vote.");
    if (voted.exists()) return sidErr("This student number has already voted. Each member votes once.");
    sid = v; first = pub.data().first || "";
    $("b-first").textContent = first; show("v-ballot");
  } catch (x) { console.error(x); sidErr("Something went wrong. Please try again."); }
  finally { $("sid-go").disabled = false; }
});

document.querySelectorAll(".vt-choice").forEach(b => b.addEventListener("click", () => {
  choice = b.dataset.choice; $("c-pick").textContent = choice; $("c-err").hidden = true; show("v-confirm");
}));
$("c-back").addEventListener("click", () => show("v-ballot"));
$("c-vote").addEventListener("click", async () => {
  if (!isOpen()) { start(); return; }
  $("c-vote").disabled = true;
  const id = `${ELECTION}_${sid}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "votes", id), { election: ELECTION, sid, date: pacificParts().date, first, choice, at: serverTimestamp() });
    batch.set(doc(db, "voted", id), { at: serverTimestamp() });
    await batch.commit();
    $("d-msg").textContent = "Thank you, " + first + ". Your vote for Management Assistant has been counted.";
    show("v-done");
    setTimeout(start, 10000);
  } catch (x) {
    console.error(x);
    $("c-err").textContent = !isOpen() ? "Voting just closed." : "Your vote could not be counted. You may have already voted, or you have not checked in at today's meeting yet. Check in with the meeting QR, then try again.";
    $("c-err").hidden = false;
  } finally { $("c-vote").disabled = false; }
});
