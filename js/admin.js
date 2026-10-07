// LWZ admin panel: Google sign-in (approved list), attendance, members, notes, check-in QR, admins.
import { firebaseConfig, SDK, OWNERS, CHECKIN_URL, pacificParts, nextMeetingLabel, nextMeetingStart, inMeetingWindow } from "./lwz-firebase.js?v=2";
const { initializeApp } = await import(SDK + "firebase-app.js");
const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } = await import(SDK + "firebase-auth.js");
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy, getDoc, onSnapshot, where } = await import(SDK + "firebase-firestore.js");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);

// EmailJS for "Save & Email" (template set up for LWZ notes). Falls back to the email app if blank.
// LWZ Meeting Notes template on the EmailJS "CreativeSilva" service (sends from creativesilva1@gmail.com).
const EMAILJS = { publicKey: "Z2UjAu1N-IFmF2pbc", service: "service_i53d3dk", template: "template_lwz_notes" };
const NOTE_RECIPIENTS = ["info@lightwriterz.org", "creativesilva1@gmail.com", "lg.artistic1@gmail.com"];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const t = d => d ? d.toDate().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" }) : "";
const dateLabel = s => new Date(s + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
let me = null, isOwner = false, members = {}, attendance = [], titles = {};

// ---------- Sign in ----------
$("signin").addEventListener("click", async () => {
  $("login-err").hidden = true;
  try { await signInWithPopup(auth, new GoogleAuthProvider().setCustomParameters({ prompt: "select_account" })); }
  catch (e) {
    const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
    $("login-err").textContent = e.code === "auth/popup-closed-by-user" ? "Sign-in was closed before it finished. Please try again."
      : standalone || e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment"
        ? "Google sign-in could not open here. Open lightwriterz.org/admin.html in Safari or Chrome and try again."
        : "Sign-in did not finish. Please try again.";
    $("login-err").hidden = false;
  }
});
$("signout").addEventListener("click", () => signOut(auth));
$("signout-m").addEventListener("click", () => { setMenu(false); signOut(auth); });

// Phone menu: the tab bar folds into a hamburger (same look as the public site menu).
function setMenu(open) {
  if (open) $("ad-nav").style.setProperty("--menu-top", Math.max(0, $("ad-nav").getBoundingClientRect().bottom) + "px");
  $("ad-nav").classList.toggle("open", open);
  document.documentElement.classList.toggle("menu-open", open);
  $("ad-menu-btn").setAttribute("aria-expanded", open ? "true" : "false");
  $("ad-menu-btn").setAttribute("aria-label", open ? "Close menu" : "Open menu");
}
$("ad-menu-btn").addEventListener("click", () => setMenu(!$("ad-nav").classList.contains("open")));
$("ad-current").addEventListener("click", () => setMenu(!$("ad-nav").classList.contains("open")));
document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
window.addEventListener("resize", () => { if (window.innerWidth > 760) setMenu(false); });

onAuthStateChanged(auth, async user => {
  if (!user) { stopLive(); $("v-app").hidden = true; $("v-login").hidden = false; return; }
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
  watchLive();
  showTab("notes");
});

// ---------- Tabs ----------
document.querySelectorAll(".ad-tabs button[data-tab]").forEach(b => b.addEventListener("click", () => { setMenu(false); showTab(b.dataset.tab); window.scrollTo(0, 0); }));
function showTab(name) {
  document.querySelectorAll(".ad-tabs button[data-tab]").forEach(b => {
    const on = b.dataset.tab === name;
    if (on) $("ad-current").textContent = b.textContent;
    b.setAttribute("aria-selected", on ? "true" : "false");
    if (on) b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  });
  document.querySelectorAll(".ad-pane").forEach(p => { p.hidden = p.id !== "p-" + name; });
  if (name === "attendance") renderAttendance();
  if (name === "members") renderMembers();
  if (name === "notes") loadNotes();
  if (name === "qr") renderQR();
  if (name === "admins") loadAdmins();
  if (name === "nominations") loadNominations();
}

// ---------- Data ----------
async function loadData() {
  const [m, a, ad] = await Promise.all([getDocs(collection(db, "members")), getDocs(collection(db, "attendance")), getDocs(collection(db, "admins"))]);
  members = {}; m.forEach(d => { members[d.id] = d.data(); });
  // Officer titles: an admin entry with a student number shows its title next to that member.
  titles = {}; ad.forEach(d => { const x = d.data(); if (x.sid) titles[x.sid] = x.name || "Officer"; });
  attendance = a.docs.map(d => ({ id: d.id, ...d.data() }));
  const keep = $("att-date").value, today = pacificParts().date;
  const dates = [...new Set([today, ...attendance.map(x => x.date)])].sort().reverse();
  $("att-date").innerHTML = dates.map(d => `<option value="${d}">${dateLabel(d)}${d === today ? " (today)" : ""}</option>`).join("");
  if (keep && dates.includes(keep)) $("att-date").value = keep;
}
$("att-date").addEventListener("change", renderAttendance);

function attRows() {
  const d = $("att-date").value;
  return attendance.filter(x => x.date === d).sort((a, b) => (a.at?.toMillis() || 0) - (b.at?.toMillis() || 0))
    .map(x => ({ time: t(x.at), ...(members[x.sid] || { last: "", first: x.name || "?" }), sid: x.sid, title: titles[x.sid] || "", id: x.id, manual: !!x.manual }));
}
function renderAttendance() {
  const rows = attRows();
  $("att-count").textContent = rows.length + " present";
  // Stat cards: present at the selected meeting, members on file, average across meetings held.
  const held = new Set(attendance.map(x => x.date));
  $("st-present").textContent = rows.length;
  $("st-present-sub").textContent = "on " + dateLabel($("att-date").value);
  $("st-members").textContent = Object.keys(members).length;
  $("st-avg").textContent = held.size ? (Math.round(attendance.length / held.size * 10) / 10) : 0;
  $("st-avg-sub").textContent = held.size + (held.size === 1 ? " meeting so far" : " meetings so far");
  $("att-empty").hidden = rows.length > 0;
  $("att-table").querySelector("tbody").innerHTML = rows.map(r =>
    `<tr>${cardName(`${r.first} ${r.last}`.trim(), r.title)}${td("Time", esc(r.time) + (r.manual ? ` <span class="ad-hand" title="Added by hand">added</span> <button class="ad-link" data-unmark="${esc(r.id)}">Remove</button>` : ""))}<td class="ad-tbl">${esc(r.first)}</td><td class="ad-tagcol ad-tbl">${tag(r.title)}</td><td class="ad-tbl">${esc(r.last)}</td>${td("Student #", esc(r.sid))}${td("Grad", esc(r.gradYear))}${td("Class", esc(r.cls))}</tr>`).join("");
}
$("att-table").addEventListener("click", async e => {
  const id = e.target.dataset && e.target.dataset.unmark;
  if (!id || !confirm("Remove this check-in?")) return;
  await deleteDoc(doc(db, "attendance", id)); await loadData(); renderAttendance();
});

// ---------- Live updates ----------
// Today's check-ins and member profiles stream in as students mark themselves present,
// so the QR screen counter and the Attendance list update without a refresh.
let liveDay = "", liveUnsubs = [];
function stopLive() { liveUnsubs.forEach(u => u()); liveUnsubs = []; liveDay = ""; }
function watchLive() {
  stopLive();
  const today = liveDay = pacificParts().date;
  liveUnsubs.push(onSnapshot(collection(db, "members"), snap => {
    snap.docChanges().forEach(c => { if (c.type === "removed") delete members[c.doc.id]; else members[c.doc.id] = c.doc.data(); });
    if (!$("p-attendance").hidden) renderAttendance();
  }, e => console.error("members live", e)));
  liveUnsubs.push(onSnapshot(query(collection(db, "attendance"), where("date", "==", today)), snap => {
    attendance = attendance.filter(a => a.date !== today).concat(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLiveCount(snap.size);
    if (!$("p-attendance").hidden) renderAttendance();
  }, e => { console.error("attendance live", e); $("qr-live").classList.add("is-off"); }));
}
// New day (for example the iPad left open overnight): follow the new date.
setInterval(() => { if (me && liveDay && pacificParts().date !== liveDay) watchLive(); }, 60000);
let shownCount = -1;
function setLiveCount(n) {
  $("qr-count").textContent = n;
  $("qr-count-label").textContent = n === 1 ? "checked in today" : "checked in today";
  if (shownCount >= 0 && n > shownCount) { const el = $("qr-live"); el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  shownCount = n;
}

// ---------- Mark present (by hand) ----------
const mp = $("mp-modal");
$("att-add").addEventListener("click", () => {
  $("mp-date").textContent = "For the meeting on " + dateLabel($("att-date").value);
  ["mp-sid", "mp-name"].forEach(i => { $(i).value = ""; $(i).disabled = false; });
  $("mp-unknown").checked = false; $("mp-found").hidden = $("mp-err").hidden = true;
  mp.hidden = false; $("mp-sid").focus();
});
mp.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => { mp.hidden = true; }));
$("mp-unknown").addEventListener("change", () => {
  $("mp-sid").disabled = $("mp-unknown").checked; if ($("mp-unknown").checked) $("mp-sid").value = "";
  $("mp-found").hidden = true; $("mp-name").focus();
});
$("mp-sid").addEventListener("input", () => {
  const v = $("mp-sid").value = $("mp-sid").value.replace(/\D/g, "").slice(0, 6);
  const m = members[v];
  $("mp-found").hidden = !m;
  if (m) { $("mp-found").textContent = "Member on file: " + m.first + " " + m.last; $("mp-name").value = m.first + " " + m.last; }
});
$("mp-form").addEventListener("submit", async e => {
  e.preventDefault();
  const date = $("att-date").value, unknown = $("mp-unknown").checked;
  const sid = unknown ? "??????" : $("mp-sid").value, name = $("mp-name").value.trim();
  const err = m => { $("mp-err").textContent = m; $("mp-err").hidden = false; };
  if (!unknown && !/^\d{6}$/.test(sid)) return err("Enter the 6 digit student number, or check Number unknown.");
  if (!name && !members[sid]) return err("Enter their name.");
  const id = unknown ? `${date}_x${Date.now().toString(36)}` : `${date}_${sid}`;
  if (!unknown && attendance.some(a => a.id === id)) return err("Already marked present for this meeting.");
  $("mp-save").disabled = true;
  try {
    await setDoc(doc(db, "attendance", id), { sid, date, at: serverTimestamp(), name, manual: true, addedBy: me.email.toLowerCase() });
    mp.hidden = true; await loadData(); renderAttendance();
  } catch (x) { console.error(x); err("Could not save. Try again."); }
  $("mp-save").disabled = false;
});
const tag = title => title ? `<span class="ad-tag">${esc(title)}</span>` : "";
// Phones and iPad portrait show each row as a card: .ad-cardname is the card's header,
// cells marked .ad-tbl only show in the wide table, the rest get a label from data-label.
const cardName = (name, title, extra = "") => `<td class="ad-cardname"><strong>${esc(name)}</strong>${extra}${tag(title)}</td>`;
const td = (label, html) => `<td data-label="${label}">${html === "" || html == null ? "" : `<span>${html}</span>`}</td>`;
const tel = p => p ? `<a href="tel:${esc(String(p).replace(/[^\d+]/g, ""))}">${esc(p)}</a>` : "";
const mailLink = e => e ? `<a href="mailto:${esc(e)}">${esc(e).replace("@", "<wbr>@")}</a>` : "";

let sortKey = "first", sortDir = 1;
// Officers list first, in rank order (same order as the Officers page).
const RANK = ["President", "Vice President", "Secretary", "Treasurer", "PR / Media Officer", "Creative Director", "Management Assistant"];
const rank = title => { const i = RANK.indexOf(title); return i < 0 ? RANK.length : i; };
document.querySelectorAll("#mem-table th[data-k]").forEach(th => th.addEventListener("click", () => {
  sortDir = sortKey === th.dataset.k ? -sortDir : 1; sortKey = th.dataset.k; renderMembers();
}));
$("mem-q").addEventListener("input", renderMembers);
function memRows() {
  const q = $("mem-q").value.trim().toLowerCase();
  return Object.values(members).map(m => {
    const mine = attendance.filter(a => a.sid === m.sid).map(a => a.date).sort();
    return { ...m, title: titles[m.sid] || "", visits: mine.length, lastSeen: mine[mine.length - 1] || "" };
  }).filter(m => !q || `${m.last} ${m.first} ${m.sid}`.toLowerCase().includes(q))
    .sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir);
}
function renderMembers() {
  const rows = memRows();
  const officers = rows.filter(m => m.title).sort((a, b) => rank(a.title) - rank(b.title));
  const others = rows.filter(m => !m.title);
  const row = m => `<tr>${cardName(`${m.first} ${m.last}`, m.title)}<td class="ad-tbl">${esc(m.first)}</td><td class="ad-tagcol ad-tbl">${tag(m.title)}</td><td class="ad-tbl">${esc(m.last)}</td>${td("Student #", esc(m.sid))}${td("Grad", esc(m.gradYear))}${td("Class", esc(m.cls))}${td("Cell", tel(m.phone))}${td("Email", mailLink(m.email))}${td("Meetings", m.visits)}${td("Last seen", m.lastSeen ? dateLabel(m.lastSeen) : "")}</tr>`;
  const group = (name, list) => list.length ? `<tr class="ad-group"><th colspan="10">${name} <span>${list.length}</span></th></tr>` + list.map(row).join("") : "";
  $("mem-count").textContent = rows.length + " members";
  $("mem-table").querySelector("tbody").innerHTML = group("Officers", officers) + group("Members", others);
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
  ["Date", "Time", "First", "Last", "Officer title", "Student #", "Grad year", "Class"],
  attRows().map(r => [$("att-date").value, r.time, r.first, r.last, r.title, r.sid, r.gradYear, r.cls])));
$("mem-csv").addEventListener("click", () => csv(`LWZ-members-${pacificParts().date}.csv`,
  ["First", "Last", "Officer title", "Student #", "Grad year", "Class", "Cell", "Personal email", "Meetings attended", "Last seen"],
  [...memRows().filter(m => m.title).sort((a, b) => rank(a.title) - rank(b.title)), ...memRows().filter(m => !m.title)].map(m => [m.first, m.last, m.title, m.sid, m.gradYear, m.cls, m.phone, m.email, m.visits, m.lastSeen])));

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
  // During the meeting: live clock. Otherwise: countdown to the next meeting
  // (days and hours until meeting day, then hours:minutes:seconds).
  const tick = () => {
    const now = new Date();
    $("qr-clock").classList.toggle("is-long", !inMeetingWindow(now) && pacificParts(nextMeetingStart(now)).date !== pacificParts(now).date);
    if (inMeetingWindow(now)) {
      $("qr-label").textContent = "Check-in open";
      $("qr-clock").textContent = now.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", second: "2-digit" });
      return;
    }
    const start = nextMeetingStart(now), left = Math.max(0, Math.floor((start - now) / 1000));
    const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
    $("qr-label").textContent = "Next meeting in";
    if (pacificParts(start).date !== pacificParts(now).date) {
      const days = Math.floor(left / 86400), hours = Math.floor(left % 86400 / 3600), mins = Math.floor(left % 3600 / 60);
      $("qr-clock").textContent = (days ? plural(days, "day") + " " : "") + plural(hours, "hour") + " " + plural(mins, "minute");
    } else {
      const h = Math.floor(left / 3600), m = Math.floor(left % 3600 / 60), s = left % 60;
      $("qr-clock").textContent = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
  };
  tick(); clearInterval(qrClock); qrClock = setInterval(tick, 1000);
}
$("qr-full").hidden = !(document.fullscreenEnabled || document.webkitFullscreenEnabled);
$("qr-full").addEventListener("click", () => {
  const el = $("qr-box");
  (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
});

// ---------- Nominations (from LWZ News) ----------
let noms = [];
async function loadNominations() {
  const s = await getDocs(collection(db, "nominations"));
  noms = s.docs.map(d => d.data()).sort((a, b) => (b.at?.toMillis() || 0) - (a.at?.toMillis() || 0)).map(n => {
    const m = members[n.sid], by = m ? `${m.first} ${m.last}` : n.first;
    return { ...n, by, nomineeFull: n.self ? by : n.nominee,
      when: n.at ? n.at.toDate().toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "" };
  });
  $("nom-count").textContent = noms.length + (noms.length === 1 ? " nomination" : " nominations");
  $("nom-empty").hidden = noms.length > 0;
  $("nom-table").querySelector("tbody").innerHTML = noms.map(n =>
    `<tr>${cardName(n.nomineeFull, "", n.self ? ' <span class="ad-tag">self</span>' : "")}<td class="ad-tbl">${esc(n.nomineeFull)}${n.self ? ' <span class="ad-tag">self</span>' : ""}</td>${td("Submitted by", esc(n.by))}<td class="ad-tagcol" data-label="Officer">${tag(titles[n.sid])}</td>${td("Student #", esc(n.sid))}${td("When", esc(n.when))}<td class="nom-why" data-label="Why">${n.reason ? `<span>${esc(n.reason)}</span>` : ""}</td></tr>`).join("");
}
$("nom-csv").addEventListener("click", () => csv(`LWZ-nominations-${pacificParts().date}.csv`,
  ["Nominee", "Self nomination", "Submitted by", "Student #", "When", "Why"],
  noms.map(n => [n.nomineeFull, n.self ? "yes" : "no", n.by, n.sid, n.when, n.reason])));

// ---------- Admins (advisors only) ----------
async function loadAdmins() {
  const s = await getDocs(collection(db, "admins"));
  $("adm-list").innerHTML = s.docs.map(d => `<li><span>${esc(d.id)}${d.data().name ? " &middot; " + esc(d.data().name) : ""}${d.data().sid ? " &middot; #" + esc(d.data().sid) : ' &middot; <em class="note">no student #</em>'}</span><button class="ad-link" data-rm="${esc(d.id)}">Remove</button></li>`).join("") || '<li class="note">No officers added yet.</li>';
  $("adm-list").querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Remove " + b.dataset.rm + " from LWZ admins?")) return;
    await deleteDoc(doc(db, "admins", b.dataset.rm)); loadAdmins();
  }));
}
$("adm-form").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("adm-email").value.trim().toLowerCase(), sid = $("adm-sid").value.trim();
  if (sid && !/^\d{6}$/.test(sid)) { alert("Student number must be 6 digits."); return; }
  await setDoc(doc(db, "admins", email), { name: $("adm-name").value.trim(), ...(sid ? { sid } : {}), addedBy: me.email, addedAt: serverTimestamp() });
  $("adm-email").value = ""; $("adm-name").value = ""; $("adm-sid").value = ""; loadAdmins(); loadData();
});
