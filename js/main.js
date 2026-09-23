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
