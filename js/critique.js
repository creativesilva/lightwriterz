// LWZ weekly critique slider (critique.html?c=<slug>). Officers and advisors only: same Google
// sign-in check as LWZ Admin. Photos and names come from critique/<slug>/data.json.
import { firebaseConfig, SDK } from "./lwz-firebase.js?v=2";
const { initializeApp } = await import(SDK + "firebase-app.js");
const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } = await import(SDK + "firebase-auth.js");
const { getFirestore, collection, getDocs } = await import(SDK + "firebase-firestore.js");
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
const slug = new URLSearchParams(location.search).get("c") || "";

$("cr-signin").addEventListener("click", () => signInWithPopup(auth, new GoogleAuthProvider().setCustomParameters({ prompt: "select_account" })).catch(() => {}));
onAuthStateChanged(auth, async user => {
  if (!user) { $("cr-app").hidden = true; $("cr-login").hidden = false; return; }
  try { await getDocs(collection(db, "admins")); }
  catch (e) { await signOut(auth); $("cr-err").textContent = (user.email || "") + " is not on the LWZ admin list."; $("cr-err").hidden = false; return; }
  $("cr-login").hidden = true; $("cr-app").hidden = false;
  load();
});

const day = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
let data = null, at = -1; // -1 = title card
async function load() {
  if (!/^[a-z0-9-]+$/.test(slug)) { $("cr-title").textContent = "No critique selected"; return; }
  data = await (await fetch(`critique/${slug}/data.json`, { cache: "no-cache" })).json();
  document.title = data.title + " | LWZ Critique";
  $("cr-week").textContent = data.title;
  $("cr-title").textContent = data.title;
  $("cr-dates").textContent = day(data.start) + " to " + day(data.end);
  $("cr-meta").textContent = data.count + " photographs · " + data.students + (data.students === 1 ? " student" : " students");
  $("cr-gridview").innerHTML = data.photos.map((p, i) =>
    `<button type="button" data-i="${i}"><img src="critique/${slug}/${p.file}" alt="" loading="lazy"><span>${String(i + 1).padStart(2, "0")} · ${p.student.replace(/[<>&]/g, "")}</span></button>`).join("");
  $("cr-gridview").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { $("cr-gridview").hidden = true; show(+b.dataset.i); }));
  data.photos.slice(0, 2).forEach(p => { new Image().src = `critique/${slug}/${p.file}`; });
  show(-1);
}
function show(i) {
  if (!data) return;
  at = Math.max(-1, Math.min(data.photos.length - 1, i));
  const cover = at < 0;
  $("cr-cover").hidden = !cover; $("cr-fig").hidden = cover; $("cr-cap").hidden = cover;
  $("cr-prev").hidden = cover; $("cr-next").hidden = at >= data.photos.length - 1 && !cover;
  $("cr-count").textContent = cover ? "" : (at + 1) + " / " + data.photos.length;
  if (cover) return;
  const p = data.photos[at];
  $("cr-img").src = `critique/${slug}/${p.file}`; $("cr-img").alt = (p.title || "Photograph") + " by " + p.student;
  $("cr-student").textContent = p.student;
  $("cr-ptitle").textContent = p.title || "";
  [at + 1, at + 2].forEach(j => { if (data.photos[j]) new Image().src = `critique/${slug}/${data.photos[j].file}`; });
}
$("cr-start").addEventListener("click", () => show(0));
$("cr-prev").addEventListener("click", () => show(at - 1));
$("cr-next").addEventListener("click", () => show(at + 1));
$("cr-grid").addEventListener("click", () => { $("cr-gridview").hidden = !$("cr-gridview").hidden; });
$("cr-full").addEventListener("click", () => {
  const el = document.documentElement;
  if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
});
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); show(at + 1); }
  else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); show(at - 1); }
  else if (e.key === "Home") show(-1);
  else if (e.key === "f" || e.key === "F") $("cr-full").click();
  else if (e.key === "g" || e.key === "G") $("cr-grid").click();
  else if (e.key === "Escape") $("cr-gridview").hidden = true;
});
let sx = 0;
$("cr-stage").addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
$("cr-stage").addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 45) show(at + (dx < 0 ? 1 : -1)); }, { passive: true });
