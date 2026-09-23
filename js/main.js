// Light Writerz shared behavior: mobile nav, footer year, contact form.
(function () {
  var nav = document.querySelector(".mainnav");
  var toggle = document.querySelector(".navtoggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
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

  // Contact form: no server needed. Opens the visitor's email app
  // addressed to the club inbox with their message filled in.
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      var subject = "[LWZ] " + f.topic.value + " from " + f.name.value;
      var body = f.message.value + "\n\n" + f.name.value + "\n" + f.email.value;
      window.location.href = "mailto:info@lightwriterz.org?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  }
})();
