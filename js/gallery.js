// Student gallery. Photos and captions live in gallery/gallery.json.
// To add a photo: put the file in gallery/photos/ and add an entry to the JSON.
(function () {
  var grid = document.getElementById("grid");
  var filters = document.getElementById("filters");
  var empty = document.getElementById("empty");
  var box = document.getElementById("lightbox");
  var boxImg = box.querySelector("img");
  var boxCap = box.querySelector("p");

  function caption(p) {
    return [p.title, p.student, p.year].filter(Boolean).join(" · ");
  }

  function render(photos, cat) {
    grid.innerHTML = "";
    photos.filter(function (p) { return !cat || p.category === cat; }).forEach(function (p) {
      var fig = document.createElement("figure");
      var img = document.createElement("img");
      img.src = "gallery/photos/" + p.file;
      img.alt = p.alt || (p.title + " by " + p.student);
      img.loading = "lazy";
      var cap = document.createElement("figcaption");
      var b = document.createElement("b");
      b.textContent = p.title || "Untitled";
      cap.appendChild(b);
      cap.appendChild(document.createTextNode([p.student, p.year].filter(Boolean).join(" · ")));
      fig.appendChild(img);
      fig.appendChild(cap);
      fig.addEventListener("click", function () {
        boxImg.src = img.src;
        boxImg.alt = img.alt;
        boxCap.textContent = caption(p);
        box.classList.add("open");
      });
      grid.appendChild(fig);
    });
  }

  function close() { box.classList.remove("open"); boxImg.src = ""; }
  box.addEventListener("click", function (e) { if (e.target !== boxImg) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  fetch("gallery/gallery.json", { cache: "no-cache" })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var photos = data.photos || [];
      if (!photos.length) { empty.hidden = false; return; }
      var cats = photos.map(function (p) { return p.category; })
        .filter(function (c, i, a) { return c && a.indexOf(c) === i; });
      if (cats.length > 1) {
        filters.hidden = false;
        ["All"].concat(cats).forEach(function (c, i) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = c;
          btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
          btn.addEventListener("click", function () {
            filters.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
            btn.setAttribute("aria-pressed", "true");
            render(photos, c === "All" ? null : c);
          });
          filters.appendChild(btn);
        });
      }
      render(photos, null);
    })
    .catch(function () { empty.hidden = false; });
})();
