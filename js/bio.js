// Advisor bio pop-up: any element with data-bio="<template id>" opens that bio.
(function () {
  var modal = document.getElementById("bio-modal");
  if (!modal) return;
  var body = modal.querySelector(".bio-body");
  var opener = null;
  function open(el) {
    var t = document.getElementById(el.getAttribute("data-bio"));
    if (!t) return;
    opener = el;
    body.innerHTML = "";
    body.appendChild(t.content.cloneNode(true));
    modal.hidden = false;
    document.documentElement.classList.add("modal-open");
    modal.querySelector(".shirt-modal-close").focus();
  }
  function close() {
    modal.hidden = true;
    document.documentElement.classList.remove("modal-open");
    if (opener) opener.focus();
  }
  document.querySelectorAll("[data-bio]").forEach(function (el) {
    el.addEventListener("click", function () { open(el); });
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(el); } });
  });
  modal.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", close); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });
})();
