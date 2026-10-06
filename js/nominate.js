// LWZ News: officer nominations. The post card opens the pop-up; a student number that has
// checked in at a meeting (members_public exists) unlocks the form. One name per member.
import { firebaseConfig, SDK } from "./lwz-firebase.js?v=2";

const modal = document.getElementById("nom-modal");
const $ = id => document.getElementById(id);
const { election, closes, role, vote } = modal.dataset;
const views = ["n-about", "n-gate", "n-form", "n-done"];
const show = v => views.forEach(x => { $(x).hidden = x !== v; });
const isClosed = () => Date.now() >= Date.parse(closes);
let db, fs, sid = "", first = "", opener = null;

async function firestore() {
  if (db) return;
  const { initializeApp } = await import(SDK + "firebase-app.js");
  fs = await import(SDK + "firebase-firestore.js");
  db = fs.getFirestore(initializeApp(firebaseConfig));
}

function open(el) {
  opener = el;
  $("n-closed").hidden = !isClosed(); $("n-start").hidden = isClosed();
  show("n-about");
  modal.hidden = false;
  document.documentElement.classList.add("modal-open");
  modal.querySelector(".shirt-modal-close").focus();
}
function close() {
  modal.hidden = true;
  document.documentElement.classList.remove("modal-open");
  if (opener) opener.focus();
}
document.querySelectorAll("[data-nominate]").forEach(el => {
  el.addEventListener("click", e => { if (!e.target.closest("a")) open(el); });
  el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(el); } });
});
modal.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", close));
document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) close(); });
if (new URLSearchParams(location.search).has("nominate")) open(document.querySelector("[data-nominate]"));

// Step 1: student number (6 dots, like the meeting check-in)
const pin = $("n-sid");
const paint = () => modal.querySelectorAll(".ci-dots i").forEach((d, i) => d.classList.toggle("on", i < pin.value.length));
pin.addEventListener("input", () => { pin.value = pin.value.replace(/\D/g, "").slice(0, 6); paint(); $("n-gate-err").hidden = true; });
$("n-start").addEventListener("click", () => { pin.value = ""; paint(); show("n-gate"); pin.focus(); });

const gateErr = m => { $("n-gate-err").textContent = m; $("n-gate-err").hidden = false; };
$("n-gate").addEventListener("submit", async e => {
  e.preventDefault();
  if (!/^\d{6}$/.test(pin.value)) return gateErr("Enter your 6 digit student number.");
  try {
    await firestore();
    const snap = await fs.getDoc(fs.doc(db, "members_public", pin.value));
    if (!snap.exists()) return gateErr("We could not find that number. Only members who have checked in at an LWZ meeting can submit a name.");
    sid = pin.value; first = snap.data().first || "";
    $("n-first").textContent = first;
    $("n-name").value = ""; $("n-reason").value = "";
    modal.querySelector('input[name="who"][value="self"]').checked = true; $("n-name-wrap").hidden = true;
    show("n-form");
  } catch (x) { console.error(x); gateErr("Something went wrong. Please try again."); }
});

// Step 2: who and why
modal.querySelectorAll('input[name="who"]').forEach(r => r.addEventListener("change", () => {
  $("n-name-wrap").hidden = r.value === "self" && r.checked; if (!$("n-name-wrap").hidden) $("n-name").focus();
}));
const formErr = m => { $("n-form-err").textContent = m; $("n-form-err").hidden = false; };
$("n-form").addEventListener("submit", async e => {
  e.preventDefault();
  $("n-form-err").hidden = true;
  if (isClosed()) return formErr("Nominations are closed. The vote is at the meeting.");
  const self = modal.querySelector('input[name="who"]:checked').value === "self";
  const nominee = self ? first : $("n-name").value.trim().replace(/\s+/g, " ");
  if (!self && nominee.split(" ").length < 2) return formErr("Enter their first and last name.");
  $("n-submit").disabled = true;
  try {
    await fs.setDoc(fs.doc(db, "nominations", `${election}_${sid}`), {
      election, sid, first, self, nominee, reason: $("n-reason").value.trim().slice(0, 500), at: fs.serverTimestamp()
    });
    $("n-done-msg").textContent = (self ? "You nominated yourself" : "You nominated " + nominee) + " for " + role + ". The vote is " + vote + " at the LWZ meeting.";
    show("n-done");
  } catch (x) { console.error(x); formErr(isClosed() ? "Nominations are closed." : "Could not submit. Please try again."); }
  $("n-submit").disabled = false;
});
