# Light Writerz task queue

## QUEUED: Site audit overhaul (start after usage reset, Sat Oct 3 2026, 7:00 PM)

Audit done 2026-09-30. Approved to run as one pass. Read CLAUDE.md first (no em dashes, no "shoot/shot", cache-bust ?v= on changes, test at 390px and 1440px with tools/dev/shot.mjs).

### Claude does (one pass)
- D1 Wide screens: let content widen to ~1320px at 1600px+; scale hero headline.
- D2 / M3 Small text: tile subtitles, Spirit Box caption, photo captions, news cards, footer links up to 14-15px.
- D3 Hero slide 1 (LW light painting): move focal point right on desktop so the face is not under the headline.
- M1 Gallery on phones: 2-up grid for light paintings and multiples; sticky "jump to collection" bar.
- S1 sitemap.xml (5 public pages; exclude submit.html).
- S2 robots.txt (allow all, Sitemap line, Disallow /submit.html).
- S3 JSON-LD Organization on every page: name Light Writerz, alternateName LWZ / LightWriterz / Light Writers, foundingDate 2010, founders (Laura Garcia, Chris Silva, Joshua Duffy, Jeremy Wirth), parentOrganization Pioneer Valley High School, Santa Maria CA, email info@lightwriterz.org, logo, url.
- S5 Pre-render the gallery into gallery.html at publish time (script reads gallery/gallery.json) so crawlers see photos, titles, names. Keep the JS viewer.
- S6 Home H1 includes "Light Writerz" (keep current visual).
- S7 rel=canonical on every page (https://www.lightwriterz.org/...).
- S8 llms.txt: short plain-text summary of the club, pages, contact.
- S9 Titles add location: "... | Light Writerz | Santa Maria, CA".

### Waiting on Chris
- D4 Advisors cards: balance bio lengths (Chris vs Laura)?
- D5 / M2 Home page trim: drop the stats band or shrink Club News?
- S4 + Y6 FAQ: meeting day, time, room (OK to publish?). Then add FAQ section + FAQPage JSON-LD.
- Y1 Google Search Console: verify domain (GoDaddy TXT), submit sitemap. Walk Chris through step by step.
- Y2 Bing Webmaster Tools: same (feeds ChatGPT search, Copilot, DuckDuckGo).
- Y3 Ask PVHS clubs page, ASB list, Canvas, chrisandlaura.com to link lightwriterz.org.
- Y4 DONE 2026-10-05: Instagram @light_writerz linked in footer + contact page. Still add to JSON-LD sameAs (S3).
- Y5 Local news / school newsletter story.
