// Officer reveal. Names live encrypted in window.LWZ_OFFICERS (made by tools/encrypt-officers.mjs);
// the club code decrypts them in the browser. It is a reveal moment, not real security.
(function () {
  var btn = document.getElementById("reveal-btn");
  var modal = document.getElementById("reveal-modal");
  var form = document.getElementById("reveal-form");
  var input = document.getElementById("reveal-code");
  var err = document.getElementById("reveal-err");
  var data = window.LWZ_OFFICERS;
  if (!btn || !modal || !data) return;

  var b64 = function (s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); };
  async function decrypt(code) {
    var enc = new TextEncoder();
    var base = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveKey"]);
    var key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(data.salt), iterations: data.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    var out = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(data.iv) }, key, b64(data.data));
    return JSON.parse(new TextDecoder().decode(out));
  }

  function show(list, animate) {
    list.forEach(function (o, i) {
      var card = document.querySelector('.officer[data-i="' + i + '"]');
      if (!card) return;
      card.querySelector(".role").textContent = o.role;
      var h = card.querySelector(".off-name");
      setTimeout(function () {
        h.textContent = o.name;
        card.classList.toggle("is-pending", !!o.pending);
        card.classList.add("is-revealed");
      }, animate ? 180 * i : 0);
    });
    document.getElementById("officers-sub").textContent = "Your 2026 / 2027 student leadership";
    btn.hidden = true;
  }

  function open() { modal.hidden = false; document.documentElement.classList.add("modal-open"); err.hidden = true; input.value = ""; input.focus(); }
  function close() { modal.hidden = true; document.documentElement.classList.remove("modal-open"); btn.focus(); }
  btn.addEventListener("click", open);
  modal.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", close); });
  document.addEventListener("keydown", function (e) { if (!modal.hidden && e.key === "Escape") close(); });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    try {
      var list = await decrypt(input.value.trim());
      try { sessionStorage.setItem("lwz-officers", input.value.trim()); } catch (x) {}
      modal.hidden = true;
      document.documentElement.classList.remove("modal-open");
      show(list, true);
    } catch (x) {
      err.hidden = false;
      input.select();
    }
  });

  // Stay revealed for the rest of the visit.
  try {
    var saved = sessionStorage.getItem("lwz-officers");
    if (saved) decrypt(saved).then(function (l) { show(l, false); }).catch(function () {});
  } catch (x) {}
})();
