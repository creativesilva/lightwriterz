// LWZ meeting check-in (public page opened from the QR on the officer iPad).
import { firebaseConfig, SDK, CLASSES, GRAD_YEARS, inMeetingWindow, nextMeetingLabel, pacificParts, maskPhone, maskEmail } from "./lwz-firebase.js";
const { initializeApp } = await import(SDK + "firebase-app.js");
const { getFirestore, doc, getDoc, setDoc, serverTimestamp } = await import(SDK + "firebase-firestore.js");
const db = getFirestore(initializeApp(firebaseConfig));

const $ = id => document.getElementById(id);
const views = ["v-closed", "v-sid", "v-confirm", "v-form", "v-present", "v-done"];
function show(v) { views.forEach(x => { $(x).hidden = x !== v; }); }
const fmtTime = d => d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", second: "2-digit" });

let testUntil = 0;
try { const s = await getDoc(doc(db, "settings", "checkin")); if (s.exists() && s.data().testUntil) testUntil = s.data().testUntil.toMillis(); } catch (e) {}
const isOpen = () => inMeetingWindow() || Date.now() < testUntil;

function tick() {
  const now = new Date();
  $("clock").textContent = fmtTime(now);
  $("bigclock").textContent = fmtTime(now);
  $("today").textContent = now.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" });
}
tick(); setInterval(tick, 1000);

$("f-grad").innerHTML = GRAD_YEARS.map(y => `<option value="${y}">${y}</option>`).join("");
$("f-cls").innerHTML = CLASSES.map(c => `<option>${c}</option>`).join("");

let sid = "", pub = null;
function start() {
  if (!isOpen()) { $("next").textContent = nextMeetingLabel(); show("v-closed"); return; }
  $("sid").value = ""; show("v-sid"); $("sid").focus();
}
start();
setInterval(() => { if (!$("v-closed").hidden && isOpen()) start(); }, 15000);

$("v-sid").addEventListener("submit", async e => {
  e.preventDefault();
  const v = $("sid").value.trim();
  if (!/^\d{6}$/.test(v)) { $("sid-err").hidden = false; return; }
  $("sid-err").hidden = true; sid = v;
  const snap = await getDoc(doc(db, "members_public", sid));
  if (snap.exists()) {
    pub = snap.data();
    $("c-first").textContent = pub.first;
    $("c-grad").textContent = pub.gradYear;
    $("c-cls").textContent = pub.cls;
    $("c-phone").textContent = pub.phoneMask || "Not on file";
    $("c-email").textContent = pub.emailMask || "Not on file";
    show("v-confirm");
  } else { pub = null; openForm(false); }
});

function openForm(editing) {
  $("f-err").hidden = true;
  $("f-title").textContent = editing ? "Update your info" : "Create your profile";
  $("f-note").textContent = editing ? "Change what is different. Fields left blank keep what is on file." : "First time checking in. This builds your LWZ member profile.";
  $("f-last").value = ""; $("f-phone").value = ""; $("f-email").value = "";
  $("f-last").placeholder = editing ? "Leave blank to keep" : "";
  $("f-phone").placeholder = editing ? (pub.phoneMask || "Optional") : "Optional";
  $("f-email").placeholder = editing ? (pub.emailMask || "Optional") : "Optional";
  $("f-first").value = editing ? pub.first : "";
  $("f-grad").value = editing ? pub.gradYear : GRAD_YEARS[0];
  $("f-cls").value = editing ? pub.cls : CLASSES[0];
  $("f-consent-wrap").hidden = editing;
  $("f-consent").checked = false;
  $("f-save").textContent = editing ? "Update" : "Save";
  $("v-form").dataset.mode = editing ? "edit" : "new";
  show("v-form");
}
$("c-edit").addEventListener("click", () => openForm(true));
$("c-ok").addEventListener("click", () => toPresent(pub.first));
$("f-cancel").addEventListener("click", () => (pub ? show("v-confirm") : start()));

$("v-form").addEventListener("submit", async e => {
  e.preventDefault();
  const editing = $("v-form").dataset.mode === "edit";
  const last = $("f-last").value.trim(), first = $("f-first").value.trim();
  const phone = $("f-phone").value.trim(), email = $("f-email").value.trim();
  const err = m => { $("f-err").textContent = m; $("f-err").hidden = false; };
  if (!first || (!editing && !last)) return err("Please enter your first and last name.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("That email does not look right.");
  if (!editing && !$("f-consent").checked) return err("Please check the box to continue.");
  const gradYear = +$("f-grad").value, cls = $("f-cls").value;
  const full = { sid, first, gradYear, cls, updatedAt: serverTimestamp() };
  const pubDoc = { first, gradYear, cls, updatedAt: serverTimestamp(),
    phoneMask: phone ? maskPhone(phone) : (editing ? pub.phoneMask || "" : ""),
    emailMask: email ? maskEmail(email) : (editing ? pub.emailMask || "" : "") };
  if (last) full.last = last;
  if (phone || !editing) full.phone = phone;
  if (email || !editing) full.email = email;
  if (!editing) { full.consent = true; full.createdAt = serverTimestamp(); }
  $("f-save").disabled = true;
  try {
    await setDoc(doc(db, "members", sid), full, { merge: true });
    await setDoc(doc(db, "members_public", sid), pubDoc);
    pub = pubDoc;
    toPresent(first);
  } catch (x) {
    console.error(x);
    err(isOpen() ? "Could not save. Please try again or ask an officer." : "Check-in just closed for today.");
  } finally { $("f-save").disabled = false; }
});

function toPresent(first) { $("p-first").textContent = first; $("p-err").hidden = true; show("v-present"); }

$("p-mark").addEventListener("click", async () => {
  const date = pacificParts().date;
  $("p-mark").disabled = true;
  try {
    await setDoc(doc(db, "attendance", `${date}_${sid}`), { sid, date, at: serverTimestamp() });
    $("d-time").textContent = "Marked present at " + new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" }) + ".";
    show("v-done");
    setTimeout(start, 8000);
  } catch (x) {
    console.error(x);
    $("p-err").textContent = isOpen() ? "You are already checked in for today." : "Check-in just closed for today.";
    $("p-err").hidden = false;
  } finally { $("p-mark").disabled = false; }
});
