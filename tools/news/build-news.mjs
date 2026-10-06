// Builds news.html and the home page "Club News" cards from tools/news/news.json.
// Usage (from the repo root): node tools/news/build-news.mjs
// Newest posts first. Home shows the latest 3. Accents: teal (default), gold, orange.
import { readFileSync, writeFileSync } from "node:fs";

const { posts } = JSON.parse(readFileSync("tools/news/news.json", "utf8"));
posts.sort((a, b) => b.date.localeCompare(a.date));
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const day = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const top = p => (p.accent && p.accent !== "teal" ? ` ${p.accent}-top` : "");
const link = (href, text) => `<p class="news-link"><a href="${esc(href)}">${esc(text)}</a></p>`;

// news.html: page shell copied from mission.html so the head, nav and footer always match.
const shell = readFileSync("mission.html", "utf8");
const head = shell.slice(0, shell.indexOf('  <main id="main">'));
const foot = shell.slice(shell.indexOf("  </main>"));
const desc = "News from Light Writerz, the Pioneer Valley High School photography club: elections, guest speakers, events, and club happenings.";
const articles = posts.map(p => `        <article class="card news-post${top(p)}" id="${esc(p.id)}">
          <p class="date"><time datetime="${p.date}">${day(p.date)}</time> &middot; ${esc(p.tag)}</p>
          <h2>${esc(p.title)}</h2>
          ${p.body.map(t => `<p>${esc(t)}</p>`).join("\n          ")}${p.link ? "\n          " + link(p.link.href, p.link.text) : ""}
        </article>`).join("\n");
let page = head
  .replace(/<title>[^<]*<\/title>/, "<title>LWZ News | Light Writerz</title>")
  .replace(/(<meta name="description" content=")[^"]*/, "$1" + desc)
  .replace(/(<meta property="og:title" content=")[^"]*/, "$1LWZ News | Light Writerz")
  .replace(/(<meta property="og:description" content=")[^"]*/, "$1" + desc)
  .replace("https://www.lightwriterz.org/mission.html", "https://www.lightwriterz.org/news.html")
  .replace('<a href="mission.html" aria-current="page">', '<a href="mission.html">')
  .replace('<a href="news.html">', '<a href="news.html" aria-current="page">') +
`  <main id="main">

    <section class="hero page hero-landscapes-1">
      <div class="wrap">
        <p class="eyebrow">What is happening in LWZ</p>
        <h1>LWZ News</h1>
      </div>
    </section>

    <section class="band">
      <div class="wrap news-list">
${articles}
      </div>
    </section>
` + foot;
writeFileSync("news.html", page);

// Home page: latest 3 between the NEWS markers.
const cards = posts.slice(0, 3).map(p => `          <article class="card${top(p)}">
            <p class="date">${day(p.date)}</p>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.summary)}</p>
            <p style="margin-top:14px"><a href="news.html#${esc(p.id)}">Read more</a></p>
          </article>`).join("\n");
const idx = readFileSync("index.html", "utf8");
const a = idx.indexOf("<!-- NEWS:START -->"), b = idx.indexOf("<!-- NEWS:END -->");
if (a < 0 || b < 0) throw new Error("NEWS markers missing in index.html");
writeFileSync("index.html", idx.slice(0, a) + "<!-- NEWS:START -->\n" + cards + "\n          " + idx.slice(b));
console.log(`news.html: ${posts.length} posts; home: ${Math.min(3, posts.length)} cards`);
