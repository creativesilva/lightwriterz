// Photo shadow box for any page. Mark an image with data-lb="<group>" to make it open full screen.
// Images sharing a group are browsed together (arrows, keys, swipe); a unique group opens alone.
// Optional: data-full="<larger image>" and data-cap="<caption>" (defaults to the alt text),
// data-bio="<template id>" shows that template's text (bio, link) under the photo.
(function () {
  var imgs = [].slice.call(document.querySelectorAll("img[data-lb]"));
  if (!imgs.length) return;

  var v = document.createElement("div");
  v.className = "viewer";
  v.hidden = true;
  v.setAttribute("role", "dialog");
  v.setAttribute("aria-modal", "true");
  v.setAttribute("aria-label", "Photograph viewer");
  v.innerHTML =
    '<div class="viewer-top"><p class="viewer-count" aria-live="polite"></p>' +
    '<button type="button" class="viewer-close" aria-label="Close">&times;</button></div>' +
    '<div class="viewer-stage">' +
    '<button type="button" class="viewer-nav prev" aria-label="Previous photograph">&#8249;</button>' +
    '<figure class="viewer-fig"><img alt=""></figure>' +
    '<button type="button" class="viewer-nav next" aria-label="Next photograph">&#8250;</button></div>' +
    '<div class="viewer-cap"><p class="viewer-title"></p><p class="viewer-credit"></p><div class="viewer-bio"></div></div>';
  document.body.appendChild(v);

  var vImg = v.querySelector(".viewer-fig img");
  var vCount = v.querySelector(".viewer-count");
  var vTitle = v.querySelector(".viewer-title");
  var vCredit = v.querySelector(".viewer-credit");
  var vBio = v.querySelector(".viewer-bio");
  var vCap = v.querySelector(".viewer-cap");
  var prev = v.querySelector(".prev"), next = v.querySelector(".next");
  var set = [], cur = 0, opener = null;

  function full(img) { return img.getAttribute("data-full") || img.currentSrc || img.src; }
  function show(i) {
    cur = (i + set.length) % set.length;
    var img = set[cur];
    v.classList.add("is-changing");
    var pre = new Image();
    pre.onload = pre.onerror = function () { vImg.src = pre.src; vImg.alt = img.alt; v.classList.remove("is-changing"); };
    pre.src = full(img);
    var parts = (img.getAttribute("data-cap") || img.alt).split("|");
    vTitle.textContent = parts[0].trim();
    vCredit.textContent = (parts[1] || "").trim();
    var bio = document.getElementById(img.getAttribute("data-bio") || "");
    vBio.innerHTML = "";
    if (bio) vBio.appendChild(bio.content.cloneNode(true));
    v.classList.toggle("has-bio", !!bio);
    vCap.scrollTop = 0;
    vCount.textContent = set.length > 1 ? (cur + 1) + " / " + set.length : "";
    prev.hidden = next.hidden = set.length < 2;
    if (set.length > 1) [cur + 1, cur - 1].forEach(function (j) { new Image().src = full(set[(j + set.length) % set.length]); });
  }
  function open(img) {
    opener = img;
    set = imgs.filter(function (x) { return x.getAttribute("data-lb") === img.getAttribute("data-lb"); });
    v.hidden = false;
    document.documentElement.classList.add("modal-open");
    show(set.indexOf(img));
    v.querySelector(".viewer-close").focus();
  }
  function close() {
    v.hidden = true;
    document.documentElement.classList.remove("modal-open");
    vImg.removeAttribute("src");
    if (opener) opener.focus();
  }

  imgs.forEach(function (img) {
    img.classList.add("lb-zoom");
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    img.addEventListener("click", function () { open(img); });
    img.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(img); } });
  });
  v.querySelector(".viewer-close").addEventListener("click", close);
  prev.addEventListener("click", function () { show(cur - 1); });
  next.addEventListener("click", function () { show(cur + 1); });
  v.querySelector(".viewer-stage").addEventListener("click", function (e) { if (e.target === e.currentTarget) close(); });
  document.addEventListener("keydown", function (e) {
    if (v.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight" && set.length > 1) show(cur + 1);
    else if (e.key === "ArrowLeft" && set.length > 1) show(cur - 1);
  });
  var sx = 0, sy = 0;
  var inCap = false;
  v.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; inCap = vCap.contains(e.target); }, { passive: true });
  v.addEventListener("touchend", function (e) {
    if (inCap) return; // scrolling the bio, not swiping
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (set.length > 1 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
  }, { passive: true });
})();
