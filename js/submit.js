// Hidden member upload page (linked from the footer logo on the gallery page).
// The code is checked here AND by the Apps Script, so uploads without it are refused.
// ENDPOINT: the Apps Script web app /exec URL (same deployment as the Curriculum Catalog uploader).
(function () {
  var ENDPOINT = "";
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
  try { var saved = sessionStorage.getItem("lwz-code"); if (saved === "2010") unlock(saved); } catch (e) {}
  gate.addEventListener("submit", function (e) {
    e.preventDefault();
    var c = document.getElementById("gate-code").value.trim();
    if (c === "2010") {
      try { sessionStorage.setItem("lwz-code", c); } catch (err) {}
      unlock(c);
    } else {
      document.getElementById("gate-err").hidden = false;
      document.getElementById("gate-code").select();
    }
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
      meta.textContent = f.file.name + " · " + fmt(f.file.size);
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
    var skipped = 0;
    Array.prototype.forEach.call(fl || [], function (file) {
      if (!/^image\//.test(file.type) || file.size > MAX) { skipped++; return; }
      files.push({ file: file });
    });
    render();
    status(skipped ? skipped + " file" + (skipped === 1 ? "" : "s") + " skipped (images up to 30 MB only)." : "", skipped ? "err" : "");
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
      title: document.getElementById("sub-title").value.trim(),
      category: document.getElementById("sub-col").value,
      message: document.getElementById("sub-msg").value.trim()
    };
    if (!fields.student) { document.getElementById("sub-name").focus(); return; }
    send.disabled = true;
    var todo = files.filter(function (f) { return !f.state || f.state === "fail"; });
    var ok = 0, bad = 0;
    for (var i = 0; i < todo.length; i++) {
      var f = todo[i];
      f.state = "busy"; render();
      status("Sending " + (i + 1) + " of " + todo.length + "…");
      try {
        var data = await toBase64(f.file);
        var res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ target: TARGET, key: code, name: f.file.name, type: f.file.type, data: data,
            student: fields.student, title: fields.title, category: fields.category, message: fields.message })
        });
        var out = await res.json();
        if (out.ok) { f.state = "done"; ok++; } else { f.state = "fail"; bad++; console.warn("Upload:", out.error); }
      } catch (err) { f.state = "fail"; bad++; console.warn("Upload:", err); }
      render();
    }
    status(bad ? ok + " sent, " + bad + " failed. Tap Send to try the failed ones again."
               : "✓ " + ok + " photograph" + (ok === 1 ? "" : "s") + " sent. Thank you, " + fields.student.split(" ")[0] + "!",
           bad ? "err" : "ok");
  });
})();
