// Light Writerz shared behavior: mobile menu, footer year, contact form.
(function () {
  var nav = document.querySelector(".mainnav");
  var toggle = document.querySelector(".navtoggle");
  var label = toggle && toggle.querySelector(".navtoggle-label");

  // Dock: once the logo row scrolls away, the sticky teal bar shows the white logo.
  var head = document.querySelector(".masthead");
  if (nav && head && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      nav.classList.toggle("docked", !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(head);
  }

  function setMenu(open) {
    if (open) nav.style.setProperty("--menu-top", Math.max(0, nav.getBoundingClientRect().bottom) + "px");
    nav.classList.toggle("open", open);
    document.documentElement.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (label) label.textContent = open ? "Close" : "Menu";
  }
  if (nav && toggle) {
    toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 760) setMenu(false); });
  }


  // LWZ shirt shadow box: native swipe (scroll snap), arrows, keys, dots; X / Esc / backdrop close.
  var modal = document.getElementById("shirt-modal");
  if (modal) {
    var track = modal.querySelector(".shirt-track");
    var slides = [].slice.call(track.children);
    var prev = modal.querySelector(".shirt-nav.prev");
    var next = modal.querySelector(".shirt-nav.next");
    var dotsWrap = modal.querySelector(".shirt-dots");
    var opener = null;
    var dots = slides.map(function (s, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.setAttribute("role", "tab");
      d.setAttribute("aria-label", s.querySelector("figcaption").textContent);
      d.addEventListener("click", function () { go(i); });
      dotsWrap.appendChild(d);
      return d;
    });
    function current() { return Math.round(track.scrollLeft / track.clientWidth); }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth });
    }
    function sync() {
      var i = current();
      dots.forEach(function (d, k) { d.setAttribute("aria-selected", k === i ? "true" : "false"); });
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
    }
    track.addEventListener("scroll", function () { window.requestAnimationFrame(sync); });
    prev.addEventListener("click", function () { go(current() - 1); });
    next.addEventListener("click", function () { go(current() + 1); });
    function open(btn) {
      opener = btn;
      modal.hidden = false;
      document.documentElement.classList.add("modal-open");
      track.scrollLeft = 0;
      sync();
      modal.querySelector(".shirt-modal-close").focus();
    }
    function close() {
      modal.hidden = true;
      document.documentElement.classList.remove("modal-open");
      if (opener) opener.focus();
    }
    document.querySelectorAll('[data-open="shirt-modal"]').forEach(function (b) {
      b.addEventListener("click", function () { open(b); });
    });
    modal.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(current() + 1);
      else if (e.key === "ArrowLeft") go(current() - 1);
    });
  }

  // Home hero slider: crossfade every 7s; later slides load after the page does.
  var slides = [].slice.call(document.querySelectorAll(".hero-slide"));
  if (slides.length > 1) {
    var sdots = [].slice.call(document.querySelectorAll(".hero-dots button"));
    var at = 0, timer = null;
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var showSlide = function (i) {
      at = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("is-active", k === at); });
      sdots.forEach(function (d, k) { d.setAttribute("aria-selected", k === at ? "true" : "false"); });
    };
    // Each slide holds 7s unless it sets data-hold (the LW light painting holds longer).
    var play = function () {
      clearTimeout(timer);
      if (still) return;
      timer = setTimeout(function () { showSlide(at + 1); play(); }, +(slides[at].getAttribute("data-hold") || 7000));
    };
    sdots.forEach(function (d, k) { d.addEventListener("click", function () { slides.forEach(function (s) { s.classList.remove("pending"); }); showSlide(k); play(); }); });
    var wake = function () { slides.forEach(function (s) { s.classList.remove("pending"); }); play(); };
    if (document.readyState === "complete") wake(); else window.addEventListener("load", wake);
    document.addEventListener("visibilitychange", function () { if (document.hidden) clearTimeout(timer); else play(); });
  }

  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  // Links like "Offer a Camera" preselect a topic on the contact form.
  document.querySelectorAll("[data-topic]").forEach(function (a) {
    a.addEventListener("click", function () {
      var sel = document.getElementById("topic");
      if (sel) sel.value = a.getAttribute("data-topic");
    });
  });

  // Contact form: sends through EmailJS (same account and template as creativesilva.com),
  // tagged [Light Writerz] with the topic. Falls back to the visitor's email app if EmailJS fails.
  var form = document.getElementById("contactForm");
  if (form) {
    var btn = document.getElementById("contactSubmit");
    var note = document.getElementById("formNote");
    var EMAILJS = { publicKey: "68UkiTjqHIKZMkeCC", service: "service_4mhkbik", template: "template_creativesilva" };
    function mailtoFallback(f) {
      var subject = "[Light Writerz] " + f.topic.value + " from " + f.name.value;
      var body = f.message.value + "\n\n" + f.name.value + "\n" + f.email.value;
      window.location.href = "mailto:info@lightwriterz.org?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      if (!window.emailjs) { mailtoFallback(f); return; }
      btn.disabled = true;
      btn.textContent = "Sending\u2026";
      note.className = "note";
      window.emailjs.send(EMAILJS.service, EMAILJS.template, {
        name: f.name.value.trim(),
        email: f.email.value.trim(),
        message: "[Light Writerz] " + f.topic.value + "\n\n" + f.message.value.trim(),
      }, { publicKey: EMAILJS.publicKey }).then(function () {
        form.reset();
        btn.disabled = false;
        btn.textContent = "Send Message";
        note.className = "note ok";
        note.textContent = "\u2713 Message sent. Thank you! We will get back to you soon.";
      }, function (err) {
        console.error("EmailJS error:", err);
        btn.disabled = false;
        btn.textContent = "Send Message";
        note.className = "note err";
        note.textContent = "Something went wrong. Please text 805-631-0001 or try again.";
      });
    });
  }
})();
