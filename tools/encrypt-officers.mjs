// Encrypts the officer names so they are not readable in the page source.
// Usage: node tools/encrypt-officers.mjs  (prints the JSON blob for js/officers.js)
// Reveal code is 2010. Change CODE and re-run to use a different code.
import { webcrypto as crypto } from "node:crypto";
const CODE = "2010";
const names = [
  { role: "President", name: "Leo Rodriguez" },
  { role: "Vice President", name: "Ashley Ortega" },
  { role: "Secretary", name: "Revote pending", pending: true },
  { role: "Treasurer", name: "Gloria R." },
  { role: "Public Relations / Media Officer", name: "Wendy Linarez Ortuño" },
  { role: "Creative Director", name: "Robert C." }
];
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", enc.encode(CODE), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(names))));
const b64 = u => Buffer.from(u).toString("base64");
console.log(JSON.stringify({ salt: b64(salt), iv: b64(iv), data: b64(ct), iter: 250000 }));
