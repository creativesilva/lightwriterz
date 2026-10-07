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


  // Shirt shadow boxes (black shirt, supporter shirt): native swipe (scroll snap), arrows, keys,
  // dots; X / Esc / backdrop close. Openers use data-open="<modal id>", optional data-slides="0,1"
  // (only those photos are shown, e.g. men's front and back) and data-slide (which one to start on).
  document.querySelectorAll(".shirt-modal").forEach(function (modal) {
    var track = modal.querySelector(".shirt-track");
    var slides = [].slice.call(track.children);
    var prev = modal.querySelector(".shirt-nav.prev");
    var next = modal.querySelector(".shirt-nav.next");
    var dotsWrap = modal.querySelector(".shirt-dots");
    var opener = null;
    var shown = slides.slice();
    var dots = slides.map(function (s, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.setAttribute("role", "tab");
      d.setAttribute("aria-label", s.querySelector("figcaption").textContent);
      d.addEventListener("click", function () { go(shown.indexOf(slides[i])); });
      dotsWrap.appendChild(d);
      return d;
    });
    function current() { return Math.round(track.scrollLeft / track.clientWidth); }
    function go(i, instant) {
      i = Math.max(0, Math.min(shown.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: instant ? "instant" : "smooth" });
    }
    function sync() {
      var cur = shown[current()];
      dots.forEach(function (d, k) { d.setAttribute("aria-selected", slides[k] === cur ? "true" : "false"); });
      prev.disabled = current() === 0;
      next.disabled = current() >= shown.length - 1;
      prev.hidden = next.hidden = shown.length < 2;
    }
    track.addEventListener("scroll", function () { window.requestAnimationFrame(sync); });
    prev.addEventListener("click", function () { go(current() - 1); });
    next.addEventListener("click", function () { go(current() + 1); });
    function open(btn) {
      opener = btn;
      var only = (btn.getAttribute("data-slides") || "").split(",").filter(String).map(Number);
      shown = only.length ? slides.filter(function (s, k) { return only.indexOf(k) > -1; }) : slides.slice();
      slides.forEach(function (s, k) {
        var on = shown.indexOf(s) > -1;
        s.hidden = !on;
        dots[k].hidden = !on || shown.length < 2;
      });
      modal.hidden = false;
      document.documentElement.classList.add("modal-open");
      var start = shown.indexOf(slides[+(btn.getAttribute("data-slide") || 0)]);
      go(start < 0 ? 0 : start, true);
      sync();
      modal.querySelector(".shirt-modal-close").focus();
    }
    function close() {
      modal.hidden = true;
      document.documentElement.classList.remove("modal-open");
      if (opener) opener.focus();
    }
    document.querySelectorAll('[data-open="' + modal.id + '"]').forEach(function (b) {
      b.addEventListener("click", function () { open(b); });
    });
    modal.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(current() + 1);
      else if (e.key === "ArrowLeft") go(current() - 1);
    });
  });

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

  // Header countdown to the next LWZ meeting (Tuesdays 12:25 to 1:05 PM, Pacific time).
  var cd = document.querySelector(".meet-cd");
  if (cd) {
    var cdTime = cd.querySelector(".meet-cd-time"), cdLabel = cd.querySelector(".meet-cd-label");
    var pac = function (d) {
      var p = {};
      new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
        .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      return { wd: p.weekday, y: +p.year, m: +p.month, d: +p.day, mins: (+p.hour % 24) * 60 + (+p.minute) };
    };
    var nextStart = function (now) {
      for (var k = 0; k <= 7; k++) {
        var p = pac(new Date(now.getTime() + k * 86400000));
        if (p.wd !== "Tue") continue;
        var t = new Date(Date.UTC(p.y, p.m - 1, p.d, 19, 25));          // 12:25 PM when Pacific is UTC-7
        t = new Date(t.getTime() + (745 - pac(t).mins) * 60000);        // adjust for UTC-8
        if (t.getTime() + 40 * 60000 > now.getTime()) return t;         // until 1:05 PM that day
      }
    };
    var tickCd = function () {
      var now = new Date(), start = nextStart(now), left = Math.floor((start - now) / 1000);
      if (left <= 0) { cdLabel.textContent = "Meeting now"; cdTime.textContent = "Check-in open"; }
      else {
        var d = Math.floor(left / 86400), h = Math.floor(left % 86400 / 3600), m = Math.floor(left % 3600 / 60);
        cdLabel.textContent = "Next meeting";
        cdTime.textContent = (d ? d + "d " : "") + (d || h ? h + "h " : "") + m + "m";
      }
      cd.hidden = false;
    };
    tickCd(); setInterval(tickCd, 15000);

    // Tapping the countdown opens "Join Light Writerz": who can join, when, where, who to ask.
    var jm = document.createElement("div");
    jm.className = "reveal-modal meet-modal"; jm.hidden = true;
    jm.setAttribute("role", "dialog"); jm.setAttribute("aria-modal", "true"); jm.setAttribute("aria-label", "Join Light Writerz");
    jm.innerHTML =
      '<div class="reveal-backdrop" data-close></div>' +
      '<div class="nom-panel meet-panel">' +
      '<button type="button" class="shirt-modal-close" data-close aria-label="Close">&times;</button>' +
      '<p class="eyebrow">LWZ meetings &middot; Pioneer Valley High School</p>' +
      '<h2>Join Light Writerz</h2>' +
      '<p>Light Writerz is open to any Pioneer Valley High School student. You do not need to be in a photography class, just passionate about the true art of making photographs.</p>' +
      '<dl class="meet-facts">' +
      '<div><dt>When</dt><dd>Every Tuesday at lunch, 12:25 to 1:05 PM</dd></div>' +
      '<div><dt>Where</dt><dd>Room 322</dd></div>' +
      '<div><dt>Next meeting</dt><dd class="meet-modal-cd"></dd></div>' +
      '</dl>' +
      '<p>Questions? Drop in to Room 322 any time during the school day and check in with Mr. Silva or Mrs. Garcia, or reach out to any LWZ officer.</p>' +
      '<a class="btn nom-go" href="officers.html">Meet the officers</a>' +
      '</div>';
    document.body.appendChild(jm);
    var jmOpen = function () {
      jm.querySelector(".meet-modal-cd").textContent = cdLabel.textContent === "Meeting now" ? "Happening now, come by Room 322" : "In " + cdTime.textContent;
      jm.hidden = false; document.documentElement.classList.add("modal-open");
      jm.querySelector(".shirt-modal-close").focus();
    };
    var jmClose = function () { jm.hidden = true; document.documentElement.classList.remove("modal-open"); cd.focus(); };
    cd.addEventListener("click", jmOpen);
    jm.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", jmClose); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !jm.hidden) jmClose(); });
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

  // Contact form: sends to info@lightwriterz.org through the Light Writerz Apps Script (MailApp).
  // Falls back to EmailJS (LWZ Meeting Notes template, sends from creativesilva1@gmail.com), then to the visitor's email app.
  var form = document.getElementById("contactForm");
  if (form) {
    var btn = document.getElementById("contactSubmit");
    var note = document.getElementById("formNote");
    var LWZ_ENDPOINT = "https://script.google.com/macros/s/AKfycbwKgAWHt-MerxhSJN81C-LfuGkqINYlb6VyMTBY11z6pLc7ewpw0ajSX2FE7CXq78tL/exec";
    var EMAILJS = { publicKey: "Z2UjAu1N-IFmF2pbc", service: "service_i53d3dk", template: "template_lwz_notes" };
    function mailtoFallback(f) {
      var subject = "[Light Writerz] " + f.topic.value + " from " + f.name.value;
      var body = f.message.value + "\n\n" + f.name.value + "\n" + f.email.value;
      window.location.href = "mailto:info@lightwriterz.org?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }
    function done() {
      form.reset();
      btn.disabled = false;
      btn.textContent = "Send Message";
      note.className = "note ok";
      note.textContent = "\u2713 Message sent. Thank you! We will get back to you soon.";
    }
    function fail(err) {
      console.error("Contact form:", err);
      btn.disabled = false;
      btn.textContent = "Send Message";
      note.className = "note err";
      note.textContent = "Something went wrong. Please text 805-631-0001 or email info@lightwriterz.org.";
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      var payload = { target: "contact", name: f.name.value.trim(), email: f.email.value.trim(), topic: f.topic.value,
        message: f.message.value.trim(), website: f.website ? f.website.value : "" };
      btn.disabled = true;
      btn.textContent = "Sending\u2026";
      note.className = "note";
      fetch(LWZ_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (out) { if (out.ok) done(); else throw new Error(out.error || "failed"); })
        .catch(function (err) {
          console.warn("Apps Script contact failed, trying EmailJS:", err);
          if (!window.emailjs) { mailtoFallback(f); btn.disabled = false; btn.textContent = "Send Message"; return; }
          window.emailjs.send(EMAILJS.service, EMAILJS.template, {
            to_email: "info@lightwriterz.org", subject: "[Light Writerz] " + payload.topic + " from " + payload.name,
            title: payload.topic + " from " + payload.name, body: payload.message + "\n\n" + payload.name + "\n" + payload.email,
            from_name: payload.name, reply_to: payload.email
          }, { publicKey: EMAILJS.publicKey }).then(done, fail);
        });
    });
  }

})();
