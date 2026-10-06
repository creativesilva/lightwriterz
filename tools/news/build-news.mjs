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
const articles = posts.map(p => `        <article class="card news-post${top(p)}${p.nominate ? " is-nominate" : ""}" id="${esc(p.id)}"${p.nominate ? ' data-nominate tabindex="0" role="button" aria-label="' + esc(p.title) + '. Read more and submit a name"' : ""}>
          <p class="date"><time datetime="${p.date}">${day(p.date)}</time> &middot; ${esc(p.tag)}</p>
          <h2>${esc(p.title)}</h2>
          ${p.body.map(t => `<p>${esc(t)}</p>`).join("\n          ")}${p.link ? "\n          " + link(p.link.href, p.link.text) : ""}${p.nominate ? '\n          <p class="news-link"><span class="btn orange nom-cta">Submit a name</span></p>' : ""}
        </article>`).join("\n");
// Nomination pop-up (members only, gated by student number) for a post with "nominate".
const nom = posts.find(p => p.nominate);
const nomModal = !nom ? "" : `
  <div class="reveal-modal nom-modal" id="nom-modal" hidden role="dialog" aria-modal="true" aria-label="${esc(nom.nominate.role)} nominations"
    data-election="${esc(nom.nominate.election)}" data-closes="${esc(nom.nominate.closes)}" data-role="${esc(nom.nominate.role)}" data-vote="${esc(nom.nominate.vote)}">
    <div class="reveal-backdrop" data-close></div>
    <div class="nom-panel">
      <button type="button" class="shirt-modal-close" data-close aria-label="Close">&times;</button>
      <section id="n-about">
        <p class="eyebrow">Election &middot; Vote ${esc(nom.nominate.vote)}</p>
        <h2>${esc(nom.nominate.role)}</h2>
        ${nom.body.map(t => `<p>${esc(t)}</p>`).join("\n        ")}
        <p class="nom-closed" id="n-closed" hidden>Nominations are closed. The vote is at the meeting.</p>
        <button type="button" class="btn orange nom-go" id="n-start">Submit a name</button>
      </section>
      <form id="n-gate" hidden autocomplete="off">
        <p class="eyebrow">Members only</p>
        <h2>Your student number</h2>
        <p>Only members who have checked in at an LWZ meeting can submit a name.</p>
        <div class="ci-pin"><input id="n-sid" inputmode="numeric" maxlength="6" aria-label="Student number"><span class="ci-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
        <p class="nom-err" id="n-gate-err" hidden></p>
        <button type="submit" class="btn nom-go">Continue</button>
      </form>
      <form id="n-form" hidden autocomplete="off">
        <p class="eyebrow">${esc(nom.nominate.role)} nomination</p>
        <h2>Hi, <span id="n-first"></span></h2>
        <fieldset class="nom-who"><legend>Who are you nominating?</legend>
          <label><input type="radio" name="who" value="self" checked> Myself</label>
          <label><input type="radio" name="who" value="other"> Another member</label>
        </fieldset>
        <label class="nom-field" id="n-name-wrap" hidden>Their first and last name<input id="n-name" autocapitalize="words"></label>
        <label class="nom-field">Why would they be great? <span class="opt">(optional)</span><textarea id="n-reason" rows="3" maxlength="500"></textarea></label>
        <p class="nom-note">You can submit one name. Submitting again replaces your earlier choice.</p>
        <p class="nom-err" id="n-form-err" hidden></p>
        <button type="submit" class="btn orange nom-go" id="n-submit">Submit</button>
      </form>
      <section id="n-done" hidden>
        <p class="nom-check" aria-hidden="true">&#10003;</p>
        <h2>Thank you</h2>
        <p id="n-done-msg"></p>
      </section>
    </div>
  </div>
  <script type="module" src="js/nominate.js?v=1"></script>
`;
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
` + foot.replace("</body>", nomModal + "</body>");
writeFileSync("news.html", page);

// Home page: latest 3 between the NEWS markers.
const cards = posts.slice(0, 3).map(p => `          <article class="card is-link${top(p)}">
            <p class="date">${day(p.date)}</p>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.summary)}</p>
            <p style="margin-top:14px"><a class="card-link" href="news.html${p.nominate ? "?nominate=1" : ""}#${esc(p.id)}">${p.nominate ? "Read more and submit a name" : "Read more"}</a></p>
          </article>`).join("\n");
const idx = readFileSync("index.html", "utf8");
const a = idx.indexOf("<!-- NEWS:START -->"), b = idx.indexOf("<!-- NEWS:END -->");
if (a < 0 || b < 0) throw new Error("NEWS markers missing in index.html");
writeFileSync("index.html", idx.slice(0, a) + "<!-- NEWS:START -->\n" + cards + "\n          " + idx.slice(b));
console.log(`news.html: ${posts.length} posts; home: ${Math.min(3, posts.length)} cards`);
