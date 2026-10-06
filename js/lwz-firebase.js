// Firebase setup shared by checkin.html and admin.html (project: lightwriterz-lwz).
// These web keys are public by design; the Firestore security rules (firebase/firestore.rules) protect the data.
export const firebaseConfig = {
  apiKey: "AIzaSyCry9ylESz30A2VF0oP41D9EdHReAb2FSs",
  authDomain: "lightwriterz-lwz.firebaseapp.com",
  projectId: "lightwriterz-lwz",
  storageBucket: "lightwriterz-lwz.firebasestorage.app",
  messagingSenderId: "1072039375978",
  appId: "1:1072039375978:web:6de8af70bc4e1237218613"
};
export const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
export const OWNERS = ["creativesilva1@gmail.com", "lg.artistic1@gmail.com"];
export const CLASSES = ["Photography 1", "Photography 2", "Not taking photography"];
export const GRAD_YEARS = [2027, 2028, 2029, 2030];
export const CHECKIN_URL = "https://www.lightwriterz.org/checkin.html";

// Pacific time helpers (the meeting is Tuesdays 12:25 to 1:05 PM).
export function pacificParts(d = new Date()) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { weekday: p.weekday, date: `${p.year}-${p.month}-${p.day}`, mins: (+p.hour % 24) * 60 + (+p.minute) };
}
export function inMeetingWindow(d = new Date()) {
  const p = pacificParts(d);
  return p.weekday === "Tue" && p.mins >= 12 * 60 + 25 && p.mins < 13 * 60 + 5;
}
export function nextMeetingLabel(d = new Date()) {
  const p = pacificParts(d);
  const days = { Sun: 2, Mon: 1, Tue: 0, Wed: 6, Thu: 5, Fri: 4, Sat: 3 }[p.weekday];
  let add = days;
  if (p.weekday === "Tue" && p.mins >= 13 * 60 + 5) add = 7;
  const n = new Date(d.getTime() + add * 86400000);
  return n.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" });
}
export function maskPhone(p) {
  const d = String(p || "").replace(/\D/g, "");
  return d.length >= 4 ? `(***) ***-**${d.slice(-2)}` : "";
}
export function maskEmail(e) {
  const s = String(e || "").trim();
  const i = s.indexOf("@");
  if (i < 1) return "";
  return s.slice(0, Math.min(2, i)) + "***" + s.slice(i);
}
