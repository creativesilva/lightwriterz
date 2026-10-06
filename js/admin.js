// LWZ admin panel: Google sign-in (approved list), attendance, members, notes, check-in QR, admins.
import { firebaseConfig, SDK, OWNERS, CHECKIN_URL, pacificParts, nextMeetingLabel } from "./lwz-firebase.js";
const { initializeApp } = await import(SDK + "firebase-app.js");
const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } = await import(SDK + "firebase-auth.js");
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy } = await import(SDK + "firebase-firestore.js");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);

// EmailJS for "Save & Email" (template set up for LWZ notes). Falls back to the email app if blank.
const EMAILJS = { publicKey: "", service: "", template: "" };
const NOTE_RECIPIENTS = ["info@lightwriterz.org", "creativesilva1@gmail.com", "lg.artistic1@gmail.com"];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const t = d => d ? d.toDate().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" }) : "";
const dateLabel = s => new Date(s + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
let me = null, isOwner = false, members = {}, attendance = [];

// ---------- Sign in ----------
$("signin").addEventListener("click", async () => {
  $("login-err").hidden = true;
  try { await signInWithPopup(auth, new GoogleAuthProvider().setCustomParameters({ prompt: "select_account" })); }
  catch (e) { $("login-err").textContent = "Sign-in did not finish. Please try again."; $("login-err").hidden = false; }
});
$("signout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  if (!user) { $("v-app").hidden = true; $("v-login").hidden = false; return; }
  const email = (user.email || "").toLowerCase();
  isOwner = OWNERS.includes(email);
  try { await getDocs(collection(db, "admins")); }
  catch (e) {
    await signOut(auth);
    $("login-err").textContent = email + " is not on the LWZ admin list. Ask Mr. Silva or Mrs. Garcia to add you.";
    $("login-err").hidden = false; return;
  }
  me = user;
  $("who").textContent = user.displayName || email;
  $("tab-admins").hidden = !isOwner;
  $("v-login").hidden = true; $("v-app").hidden = false;
  await loadData();
  showTab("notes");
});

// ---------- Tabs ----------
document.querySelectorAll(".ad-tabs button").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
function showTab(name) {
  document.querySelectorAll(".ad-tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === name ? "true" : "false"));
  document.querySelectorAll(".ad-pane").forEach(p => { p.hidden = p.id !== "p-" + name; });
  if (name === "attendance") renderAttendance();
  if (name === "members") renderMembers();
  if (name === "notes") loadNotes();
  if (name === "qr") renderQR();
  if (name === "admins") loadAdmins();
}

// ---------- Data ----------
async function loadData() {
  const [m, a] = await Promise.all([getDocs(collection(db, "members")), getDocs(collection(db, "attendance"))]);
  members = {}; m.forEach(d => { members[d.id] = d.data(); });
  attendance = a.docs.map(d => d.data());
  const today = pacificParts().date;
  const dates = [...new Set([today, ...attendance.map(x => x.date)])].sort().reverse();
  $("att-date").innerHTML = dates.map(d => `<option value="${d}">${dateLabel(d)}${d === today ? " (today)" : ""}</option>`).join("");
}
$("att-date").addEventListener("change", renderAttendance);

function attRows() {
  const d = $("att-date").value;
  return attendance.filter(x => x.date === d).sort((a, b) => (a.at?.toMillis() || 0) - (b.at?.toMillis() || 0))
    .map(x => ({ time: t(x.at), ...(members[x.sid] || { last: "?", first: "?" }), sid: x.sid }));
}
function renderAttendance() {
  const rows = attRows();
  $("att-count").textContent = rows.length + " present";
  $("att-empty").hidden = rows.length > 0;
  $("att-table").querySelector("tbody").innerHTML = rows.map(r =>
    `<tr><td>${esc(r.time)}</td><td>${esc(r.last)}</td><td>${esc(r.first)}</td><td>${esc(r.sid)}</td><td>${esc(r.gradYear)}</td><td>${esc(r.cls)}</td></tr>`).join("");
}

let sortKey = "last", sortDir = 1;
document.querySelectorAll("#mem-table th[data-k]").forEach(th => th.addEventListener("click", () => {
  sortDir = sortKey === th.dataset.k ? -sortDir : 1; sortKey = th.dataset.k; renderMembers();
}));
$("mem-q").addEventListener("input", renderMembers);
function memRows() {
  const q = $("mem-q").value.trim().toLowerCase();
  return Object.values(members).map(m => {
    const mine = attendance.filter(a => a.sid === m.sid).map(a => a.date).sort();
    return { ...m, visits: mine.length, lastSeen: mine[mine.length - 1] || "" };
  }).filter(m => !q || `${m.last} ${m.first} ${m.sid}`.toLowerCase().includes(q))
    .sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir);
}
function renderMembers() {
  const rows = memRows();
  $("mem-count").textContent = rows.length + " members";
  $("mem-table").querySelector("tbody").innerHTML = rows.map(m =>
    `<tr><td>${esc(m.last)}</td><td>${esc(m.first)}</td><td>${esc(m.sid)}</td><td>${esc(m.gradYear)}</td><td>${esc(m.cls)}</td><td>${esc(m.phone)}</td><td>${esc(m.email)}</td><td>${m.visits}</td><td>${m.lastSeen ? dateLabel(m.lastSeen) : ""}</td></tr>`).join("");
}

// ---------- CSV ----------
function csv(name, header, rows) {
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const text = [header.map(q).join(","), ...rows.map(r => r.map(q).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
$("att-csv").addEventListener("click", () => csv(`LWZ-attendance-${$("att-date").value}.csv`,
  ["Date", "Time", "Last", "First", "Student #", "Grad year", "Class"],
  attRows().map(r => [$("att-date").value, r.time, r.last, r.first, r.sid, r.gradYear, r.cls])));
$("mem-csv").addEventListener("click", () => csv(`LWZ-members-${pacificParts().date}.csv`,
  ["Last", "First", "Student #", "Grad year", "Class", "Cell", "Personal email", "Meetings attended", "Last seen"],
  memRows().map(m => [m.last, m.first, m.sid, m.gradYear, m.cls, m.phone, m.email, m.visits, m.lastSeen])));

// ---------- Notes ----------
let notes = [], current = null, saveTimer = null;
function template() {
  const today = pacificParts().date;
  const count = attendance.filter(a => a.date === today).length;
  return {
    meeting: today,
    title: "Meeting, " + dateLabel(today),
    body: `ATTENDANCE COUNT\n${count} present\n\nAGENDA\n- \n\nDECISIONS\n- \n\nACTION ITEMS\n- \n\nNEXT MEETING\n${nextMeetingLabel(new Date(Date.now() + 86400000))}, 12:25 to 1:05 PM\n`
  };
}
async function loadNotes() {
  const s = await getDocs(query(collection(db, "notes"), orderBy("updatedAt", "desc")));
  notes = s.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!current) {
    // Default: today's meeting note. On a Tuesday it is created from the template if missing.
    const tpl = template();
    let n = notes.find(x => x.meeting === tpl.meeting || x.title === tpl.title);
    if (!n && pacificParts().weekday === "Tue") n = await createNote(tpl);
    current = n || notes.find(x => x.meeting) || notes[0] || null;
  }
  renderNoteList();
  if (current) openNote(current);
}
async function createNote(data) {
  const ref = await addDoc(collection(db, "notes"), { ...data, createdBy: me.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: me.email });
  const n = { id: ref.id, ...data }; notes.unshift(n); return n;
}
function renderNoteList() {
  $("nt-items").innerHTML = notes.map(n => `<li><button data-id="${n.id}" ${current && current.id === n.id ? 'aria-current="true"' : ""}>${esc(n.title || "Untitled")}<small>${n.updatedAt ? n.updatedAt.toDate().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</small></button></li>`).join("");
  $("nt-items").querySelectorAll("button").forEach(b => b.addEventListener("click", () => openNote(notes.find(n => n.id === b.dataset.id))));
}
function openNote(n) { current = n; $("nt-title").value = n.title || ""; $("nt-body").value = n.body || ""; $("nt-status").textContent = "Saved"; renderNoteList(); }
// "Start new note": a blank side note (the meeting note is made automatically).
$("nt-new").addEventListener("click", async () => {
  const label = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  openNote(await createNote({ title: "Side note, " + label, body: "" })); $("nt-body").focus();
});
async function saveNote() {
  if (!current) return;
  current.title = $("nt-title").value; current.body = $("nt-body").value;
  await setDoc(doc(db, "notes", current.id), { title: current.title, body: current.body, updatedAt: serverTimestamp(), updatedBy: me.email }, { merge: true });
  $("nt-status").textContent = "Saved " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
["nt-title", "nt-body"].forEach(id => $(id).addEventListener("input", () => {
  if (!current) return;
  $("nt-status").textContent = "Saving...";
  clearTimeout(saveTimer); saveTimer = setTimeout(saveNote, 900);
}));

// Save & Email
const mail = $("mail-modal");
$("nt-email").addEventListener("click", async () => {
  if (!current) return;
  clearTimeout(saveTimer); await saveNote();
  $("mail-to").value = NOTE_RECIPIENTS.join("\n"); $("mail-err").hidden = true; mail.hidden = false;
});
mail.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => { mail.hidden = true; }));
$("mail-form").addEventListener("submit", async e => {
  e.preventDefault();
  const to = $("mail-to").value.split(/[\s,;]+/).filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  if (!to.length) { $("mail-err").textContent = "Add at least one email address."; $("mail-err").hidden = false; return; }
  const subject = "[LWZ Notes] " + current.title;
  if (!EMAILJS.template || !window.emailjs) {
    location.href = `mailto:${to.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(current.body)}`;
    mail.hidden = true; return;
  }
  $("mail-send").disabled = true; $("mail-send").textContent = "Sending...";
  try {
    await window.emailjs.send(EMAILJS.service, EMAILJS.template,
      { to_email: to.join(","), subject, title: current.title, body: current.body, from_name: me.displayName || me.email, reply_to: me.email },
      { publicKey: EMAILJS.publicKey });
    mail.hidden = true; $("nt-status").textContent = "Saved and emailed to " + to.length;
  } catch (x) { console.error(x); $("mail-err").textContent = "Email did not send. Try again."; $("mail-err").hidden = false; }
  finally { $("mail-send").disabled = false; $("mail-send").textContent = "Send"; }
});

// ---------- QR ----------
let qrClock = null;
function renderQR() {
  if (!$("qr").firstChild) { const q = qrcode(0, "M"); q.addData(CHECKIN_URL); q.make(); $("qr").innerHTML = q.createSvgTag({ cellSize: 8, margin: 2 }); }
  const tick = () => { $("qr-clock").textContent = new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", second: "2-digit" }); };
  tick(); clearInterval(qrClock); qrClock = setInterval(tick, 1000);
}
$("qr-full").addEventListener("click", () => {
  const el = $("qr-box");
  (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
});

// ---------- Admins (advisors only) ----------
async function loadAdmins() {
  const s = await getDocs(collection(db, "admins"));
  $("adm-list").innerHTML = s.docs.map(d => `<li><span>${esc(d.id)}${d.data().name ? " &middot; " + esc(d.data().name) : ""}</span><button class="ad-link" data-rm="${esc(d.id)}">Remove</button></li>`).join("") || '<li class="note">No officers added yet.</li>';
  $("adm-list").querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Remove " + b.dataset.rm + " from LWZ admins?")) return;
    await deleteDoc(doc(db, "admins", b.dataset.rm)); loadAdmins();
  }));
}
$("adm-form").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("adm-email").value.trim().toLowerCase();
  await setDoc(doc(db, "admins", email), { name: $("adm-name").value.trim(), addedBy: me.email, addedAt: serverTimestamp() });
  $("adm-email").value = ""; $("adm-name").value = ""; loadAdmins();
});
