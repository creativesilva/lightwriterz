/**
 * Light Writerz Incoming uploader (Google Apps Script web app).
 * LIGHT WRITERZ ONLY: it can reach the LWZ_incoming Drive folder and nothing else.
 * (Creative Silva has its own, completely separate uploader in its own repo.)
 * Two ways in, both saving to LWZ_incoming:
 *   - "lightwriterz": Chris's Curriculum Catalog paperclip row (any file type).
 *   - "lwz-students": the hidden member page www.lightwriterz.org/submit.html
 *     (club code checked here too; JPG only; files prefixed STUDENT with name, series, title;
 *      student ID number goes in the file's Drive description, not its name).
 * Requests are JSON sent as text/plain (avoids a CORS preflight).
 *
 * SETUP (Chris, one time):
 *  1) Extensions ▸ Apps Script (or Drive ▸ New ▸ Apps Script), paste this file, Save.
 *  2) Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me ▸ Who has access: Anyone ▸ Deploy ▸ authorize.
 *  3) Copy the Web app /exec URL and give it to Claude. It goes in two places:
 *     js/submit.js (ENDPOINT) in this repo, and the LWZ Incoming row in the catalog.
 */
const LWZ_INCOMING = "1p3IYB6lNez4Byv8yzMs3AsgBV7HzNPOV";     // LWZ_incoming Drive folder
const STUDENT_INCOMING = "1Ol2-w3AKZDiW6SYTKfyfi6O4h66TQkbD"; // LWZ_incoming/Student_incoming
const TARGETS = {
  lightwriterz:   { folderId: LWZ_INCOMING, key: "lwz-7a538caa4e2f" },
  "lwz-students": { folderId: STUDENT_INCOMING, key: "2010", jpgOnly: true, prefix: "STUDENT" },
};
const MAX_BYTES = 45 * 1024 * 1024; // ~45 MB per file (Apps Script POST payload ceiling is ~50 MB)

function folderFor(t) {
  if (t.folderId) return DriveApp.getFolderById(t.folderId);
  const it = DriveApp.getFoldersByName(t.folderName);
  return it.hasNext() ? it.next() : DriveApp.createFolder(t.folderName);
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const t = TARGETS[d.target];
    if (!t || String(d.key) !== t.key) return out({ ok: false, error: "Not authorized" });
    if (t.jpgOnly && (d.type !== "image/jpeg" || !/\.jpe?g$/i.test(d.name || ""))) return out({ ok: false, error: "JPG only" });
    const bytes = Utilities.base64Decode(d.data);
    if (bytes.length > MAX_BYTES) return out({ ok: false, error: "File over 45 MB" });
    const stamp = Utilities.formatDate(new Date(), "America/Los_Angeles", "yyyy-MM-dd");
    const safe = function (v, n) { return String(v || "").replace(/[^\w.\- ]+/g, "_").trim().slice(0, n); };
    const clean = safe(d.name || "file", 120);
    // Student page: 2026-09-23_STUDENT_Jane-Doe_[Series-Name_]Golden Hour Pier.jpg (file name = title on the site)
    const parts = [stamp, t.prefix, safe(d.student, 40).replace(/ +/g, "-"), safe(d.series, 40).replace(/ +/g, "-"), clean].filter(Boolean);
    const blob = Utilities.newBlob(bytes, d.type || "application/octet-stream", parts.join("_"));
    const file = folderFor(t).createFile(blob);
    const note = [d.student && "Student: " + d.student, d.studentId && "Student ID: " + d.studentId, d.title && "Title: " + d.title, d.series && "Series: " + d.series, d.message && "Note: " + d.message].filter(Boolean).join("\n");
    if (note) file.setDescription(note);
    return out({ ok: true, id: file.getId(), name: file.getName() });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function doGet() {
  return out({ ok: true, service: "Light Writerz incoming", targets: Object.keys(TARGETS) });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
