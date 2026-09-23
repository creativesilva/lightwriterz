// Student gallery: curated collections from gallery/gallery.json.
// Add a photo: put a 1600px JPG in gallery/photos/, a 900px copy in gallery/thumbs/,
// and an entry (file, w, h, alt, optional student / title / year) in its collection.
// "rows" sets the layout rhythm (photos per row); it repeats if there are more photos.
(function () {
  var host = document.getElementById("gal-collections");
  var empty = document.getElementById("empty");
  var meta = document.getElementById("gal-meta");
  var index = document.getElementById("gal-index");
  var all = [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function credit(p) {
    return [p.student || "Light Writerz member", p.year].filter(Boolean).join(" · ");
  }

  function build(data) {
    var cols = (data.collections || []).filter(function (c) { return c.photos && c.photos.length; });
    if (!cols.length) { empty.hidden = false; return; }
    var total = 0;
    cols.forEach(function (c, ci) {
      var sec = el("section", "gal-col");
      sec.id = c.id;
      var head = el("header", "gal-head wrap");
      head.appendChild(el("p", "gal-col-kicker", (c.kicker || "Collection " + (ci + 1)) + " · " + c.photos.length + " photographs"));
      head.appendChild(el("h2", "gal-col-title", c.title));
      if (c.note) head.appendChild(el("p", "gal-col-note", c.note));
      sec.appendChild(head);

      var wrap = el("div", "gal-rows wrap");
      var rows = c.rows && c.rows.length ? c.rows : [3];
      var i = 0, r = 0;
      while (i < c.photos.length) {
        var n = rows[r % rows.length];
        var chunk = c.photos.slice(i, i + n);
        // Collections with labelRows show the photographer's name above their row.
        if (c.labelRows && chunk[0].student) wrap.appendChild(el("p", "gal-row-label", chunk[0].student));
        // "cols" = fixed grid: every photo the same size, a short last row centered.
        var row = el("div", "gal-row" + (c.cols ? " is-fixed" : chunk.length === 1 ? " is-solo" : ""));
        if (c.cols) row.style.setProperty("--cols", c.cols);
        chunk.forEach(function (p) {
          var k = all.length;
          p._col = c.title;
          p._n = c.photos.indexOf(p) + 1;
          p._of = c.photos.length;
          all.push(p);
          var ar = p.w / p.h;
          var item = el("button", "gal-item" + (ar < 1 ? " is-tall" : ""));
          item.type = "button";
          item.style.flexGrow = ar.toFixed(4);
          item.style.aspectRatio = p.w + " / " + p.h;
          item.style.background = p.bg || "#0b0f0f";
          // A photo alone on its row fits within the screen height instead of running past it.
          if (chunk.length === 1 && !c.cols) item.style.maxWidth = "calc(78vh * " + ar.toFixed(4) + ")";
          item.setAttribute("aria-label", "View photograph: " + p.alt);
          var img = el("img");
          img.src = "gallery/thumbs/" + p.file;
          img.alt = p.alt;
          img.loading = "lazy";
          img.decoding = "async";
          img.width = p.w; img.height = p.h;
          img.addEventListener("load", function () { item.classList.add("is-loaded"); });
          if (img.complete) item.classList.add("is-loaded");
          var num = el("span", "gal-num", ("0" + p._n).slice(-2));
          item.appendChild(img);
          item.appendChild(num);
          item.addEventListener("click", function () { openViewer(k, item); });
          row.appendChild(item);
        });
        wrap.appendChild(row);
        i += n; r++;
      }
      sec.appendChild(wrap);
      host.appendChild(sec);
      total += c.photos.length;

      var a = el("a", "", c.title);
      a.href = "#" + c.id;
      index.appendChild(a);
    });
    meta.textContent = total + " photographs · " + cols.length + " collection" + (cols.length === 1 ? "" : "s");
    meta.hidden = false;
    index.hidden = cols.length < 2;
    reveal();
  }

  // Quiet fade-up as rows scroll into view.
  function reveal() {
    var items = document.querySelectorAll(".gal-row, .gal-head");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach(function (n) { n.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (n) { io.observe(n); });
  }

  // ---------- Viewer ----------
  var v = document.getElementById("viewer");
  var vImg = v.querySelector(".viewer-fig img");
  var vCount = v.querySelector(".viewer-count");
  var vTitle = v.querySelector(".viewer-title");
  var vCredit = v.querySelector(".viewer-credit");
  var cur = 0, opener = null;

  function show(k) {
    cur = (k + all.length) % all.length;
    var p = all[cur];
    v.classList.add("is-changing");
    var next = new Image();
    next.onload = next.onerror = function () {
      vImg.src = next.src;
      vImg.alt = p.alt;
      v.classList.remove("is-changing");
    };
    next.src = "gallery/photos/" + p.file;
    vCount.textContent = p._col + "  ·  " + p._n + " / " + p._of;
    vTitle.textContent = p.title || p.alt;
    vCredit.textContent = credit(p);
    [cur + 1, cur - 1].forEach(function (j) { new Image().src = "gallery/photos/" + all[(j + all.length) % all.length].file; });
  }
  function openViewer(k, btn) {
    opener = btn;
    v.hidden = false;
    document.documentElement.classList.add("modal-open");
    show(k);
    v.querySelector(".viewer-close").focus();
  }
  function closeViewer() {
    v.hidden = true;
    document.documentElement.classList.remove("modal-open");
    vImg.removeAttribute("src");
    if (opener) opener.focus();
  }
  v.querySelector(".viewer-close").addEventListener("click", closeViewer);
  v.querySelector(".prev").addEventListener("click", function () { show(cur - 1); });
  v.querySelector(".next").addEventListener("click", function () { show(cur + 1); });
  v.querySelector(".viewer-stage").addEventListener("click", function (e) { if (e.target === e.currentTarget) closeViewer(); });
  document.addEventListener("keydown", function (e) {
    if (v.hidden) return;
    if (e.key === "Escape") closeViewer();
    else if (e.key === "ArrowRight") show(cur + 1);
    else if (e.key === "ArrowLeft") show(cur - 1);
  });
  // Swipe left / right on phones.
  var sx = 0, sy = 0;
  v.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  v.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) closeViewer();
  }, { passive: true });

  fetch("gallery/gallery.json", { cache: "no-cache" })
    .then(function (r) { return r.json(); })
    .then(build)
    .catch(function () { empty.hidden = false; });
})();
