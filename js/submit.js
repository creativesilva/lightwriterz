// Hidden member upload page (linked from the footer logo on the gallery page).
// The code is checked here AND by the Apps Script, so uploads without it are refused.
// ENDPOINT: the Apps Script web app /exec URL (same deployment as the Curriculum Catalog uploader).
(function () {
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbwKgAWHt-MerxhSJN81C-LfuGkqINYlb6VyMTBY11z6pLc7ewpw0ajSX2FE7CXq78tL/exec";
  var TARGET = "lwz-students";
  var MAX = 30 * 1024 * 1024;

  var gate = document.getElementById("gate");
  var form = document.getElementById("sub-form");
  var code = "";

  function unlock(c) {
    code = c;
    gate.hidden = true;
    form.hidden = false;
    if (!ENDPOINT) status("Uploads are not switched on yet. Check back soon.", "err");
    document.getElementById("sub-name").focus();
  }
  // Members unlock with their own 6 digit student number (checked against the LWZ member list,
  // the same list the meeting check-in uses). Advisors can still use the club code.
  var CLUB = "2010";
  // Advisor test account for trying uploads. Lives only here, never in the member list.
  var TEST = { sid: "123456", name: "Ariella Silva" };
  var MEMBER_URL = "https://firestore.googleapis.com/v1/projects/lightwriterz-lwz/databases/(default)/documents/members_public/";
  function memberUnlock(sid, first) {
    unlock(CLUB);
    var id = document.getElementById("sub-id");
    id.value = sid; id.readOnly = true;
    if (first && !document.getElementById("sub-name").value) document.getElementById("sub-name").value = first + " ";
  }
  try {
    var saved = sessionStorage.getItem("lwz-code"), sid = sessionStorage.getItem("lwz-sid");
    if (saved === CLUB) { if (sid) memberUnlock(sid, sessionStorage.getItem("lwz-first")); else unlock(saved); }
  } catch (e) {}
  gate.addEventListener("submit", async function (e) {
    e.preventDefault();
    var c = document.getElementById("gate-code").value.trim();
    var err = document.getElementById("gate-err");
    if (c === CLUB) { try { sessionStorage.setItem("lwz-code", c); } catch (x) {} unlock(c); return; }
    if (c === TEST.sid) {
      try { sessionStorage.setItem("lwz-code", CLUB); sessionStorage.setItem("lwz-sid", c); sessionStorage.setItem("lwz-first", TEST.name); } catch (x) {}
      memberUnlock(c, TEST.name); document.getElementById("sub-name").value = TEST.name; return;
    }
    if (/^\d{6}$/.test(c)) {
      try {
        var r = await fetch(MEMBER_URL + c);
        if (r.ok) {
          var d = await r.json(), first = d.fields && d.fields.first ? d.fields.first.stringValue : "";
          try { sessionStorage.setItem("lwz-code", CLUB); sessionStorage.setItem("lwz-sid", c); sessionStorage.setItem("lwz-first", first); } catch (x) {}
          memberUnlock(c, first); return;
        }
      } catch (x) { console.warn("member check", x); }
    }
    err.hidden = false;
    document.getElementById("gate-code").select();
  });

  var input = document.getElementById("sub-files");
  var drop = document.getElementById("sub-drop");
  var list = document.getElementById("sub-list");
  var send = document.getElementById("sub-send");
  var files = [];

  function status(msg, kind) {
    var s = document.getElementById("sub-status");
    s.textContent = msg;
    s.className = "note" + (kind ? " " + kind : "");
  }
  // JPG goes straight through; any other photo the browser can read (PNG, WebP, HEIC on iPhone)
  // is converted to a full size, high quality JPG before sending.
  function isJpg(file) {
    return /\.(jpe?g)$/i.test(file.name) && (!file.type || file.type === "image/jpeg");
  }
  function isImage(file) { return isJpg(file) || /^image\//.test(file.type) || /\.(png|webp|heic|heif|gif|tiff?|bmp)$/i.test(file.name); }
  function toJpg(file) {
    if (isJpg(file)) return Promise.resolve(file);
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (!b) return rej(new Error("convert failed"));
          res(new File([b], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.95);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("This browser cannot open that HEIC photo. Send it from your iPhone, or save it as JPG first.")); };
      img.src = url;
    });
  }
  // The file name (without the extension) is the photo's title on the site.
  function titleOf(name) {
    return name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function fmt(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.round(n / 1024) + " KB"; }
  function render() {
    list.innerHTML = "";
    files.forEach(function (f, i) {
      var li = document.createElement("li");
      var img = document.createElement("img");
      img.src = URL.createObjectURL(f.file);
      img.alt = "";
      var meta = document.createElement("span");
      meta.className = "sub-meta";
      meta.textContent = "“" + titleOf(f.file.name) + "” · " + fmt(f.file.size);
      var st = document.createElement("span");
      st.className = "sub-state " + (f.state || "");
      st.textContent = f.state === "done" ? "✓ Sent" : f.state === "fail" ? "Failed" : f.state === "busy" ? "Sending…" : "";
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "sub-rm";
      rm.setAttribute("aria-label", "Remove " + f.file.name);
      rm.textContent = "×";
      rm.hidden = !!f.state;
      rm.addEventListener("click", function () { files.splice(i, 1); render(); });
      li.appendChild(img); li.appendChild(meta); li.appendChild(st); li.appendChild(rm);
      list.appendChild(li);
    });
    send.disabled = !files.some(function (f) { return !f.state || f.state === "fail"; });
  }
  function add(fl) {
    var skipped = [];
    Array.prototype.forEach.call(fl || [], function (file) {
      if (!isImage(file) || file.size > MAX) { skipped.push(file.name); return; }
      files.push({ file: file });
    });
    render();
    var warn = document.getElementById("sub-warn");
    warn.textContent = skipped.length ? "Not added (JPG, JPEG, PNG or HEIC only, up to 30 MB each): " + skipped.join(", ") : "";
    warn.hidden = !skipped.length;
  }
  drop.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () { add(input.files); input.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { e.preventDefault(); add(e.dataTransfer.files); });

  function toBase64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(",")[1]); };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!ENDPOINT) { status("Uploads are not switched on yet. Check back soon.", "err"); return; }
    var fields = {
      student: document.getElementById("sub-name").value.trim(),
      studentId: document.getElementById("sub-id").value.trim(),
      series: document.getElementById("sub-series").value.trim(),
      message: document.getElementById("sub-msg").value.trim()
    };
    if (!fields.student) { document.getElementById("sub-name").focus(); return; }
    if (!/^[0-9]{4,10}$/.test(fields.studentId)) { status("Enter your student ID number (numbers only).", "err"); document.getElementById("sub-id").focus(); return; }
    send.disabled = true;
    var todo = files.filter(function (f) { return !f.state || f.state === "fail"; });
    var ok = 0, bad = 0;
    for (var i = 0; i < todo.length; i++) {
      var f = todo[i];
      f.state = "busy"; render();
      status("Sending " + (i + 1) + " of " + todo.length + "…");
      try {
        var jpg = await toJpg(f.file);
        var data = await toBase64(jpg);
        var res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ target: TARGET, key: code, name: jpg.name, type: "image/jpeg", data: data,
            student: fields.student, studentId: fields.studentId, series: fields.series, title: titleOf(f.file.name), message: fields.message })
        });
        var out = await res.json();
        if (out.ok) { f.state = "done"; ok++; } else { f.state = "fail"; bad++; console.warn("Upload:", out.error); }
      } catch (err) { f.state = "fail"; bad++; console.warn("Upload:", err); if (err && err.message) status(err.message, "err"); }
      render();
    }
    status(bad ? ok + " sent, " + bad + " failed. Tap Send to try the failed ones again."
               : "✓ " + ok + " photograph" + (ok === 1 ? "" : "s") + " sent. Thank you, " + fields.student.split(" ")[0] + "!",
           bad ? "err" : "ok");
  });
})();
