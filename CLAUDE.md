# Light Writerz site: notes for Claude

- Spelling is **Light Writerz** (abbreviated LWZ). Never "Lightwriters".
- Domain: www.lightwriterz.org. Club email: info@lightwriterz.org. Phone: 805-631-0001.
- NEVER use em dashes or en dashes anywhere (copy, comments, commits).
- Static site, no build step. Header and footer are repeated in each of the 5 HTML pages; change all five together.
- Gallery: images go in `gallery/photos/`, entries in `gallery/gallery.json`. Students upload to Google Drive folder LWZ_incoming (https://drive.google.com/drive/folders/1p3IYB6lNez4Byv8yzMs3AsgBV7HzNPOV, owned by creativesilva1@gmail.com); Chris reviews and pings when ready. Student names: first and last are OK (media releases on file).
- Pending content: 2026/2027 officer names and roles, founder quotes (Laura, Joshua, Jeremy), student quotes, club history, social links, Laura's bio (draft, needs her review), financial donations (not accepting money yet).
- Colors live as CSS variables at the top of `css/style.css`.
- Theme: dark mode with soft teal radial and linear gradients for depth (students prefer dark aesthetics). No plain white sections.
- Share image: og-image.png (white logo on black). og:image/og:url use https://creativesilva.github.io/lightwriterz/ for now; switch to https://www.lightwriterz.org/ when the domain is connected.
- Mobile first: most visitors are on iPhones. Phone header is one sticky 64px bar with a full screen menu. Hero photos are CSS classes (.hero-<image>) in style.css with -m.jpg (1080px) versions for phones; content images use srcset with -m.jpg.
- Cache busting: css/js links carry ?v=N. Bump N on all 5 pages whenever style.css or a script changes, or phones keep the old cached copy (Pages caches ~10 min, Safari longer).
- Sticky teal bar on every page; main.js adds .docked when the masthead scrolls away, which fades in the white .dock-logo. Scroll lock for the phone menu goes on <html> only (locking <body> breaks the sticky bar).
- Always spell it "Cameras 4 Kids" (separate words), never Cameras4Kids.
- Header logo (masthead + dock) is the minimal mark logos/lw-minimal-192.png; officer placeholders also use the minimal mark; the full LIGHTWRITERZ badge stays in the footer, gallery empty state, and share image. Phone header: one sticky dark row (minimal logo left, name centered, plain hamburger right, no pill, no label) with the teal bar reduced to a 10px decorative line under it. The .navtoggle lives in the masthead; desktop keeps the full teal nav bar with the docking logo.
- Home page is about the students, not Chris: no portraits of Chris on the home page.
- Contact: text and email only, never call (no tel: links). Contact form posts through EmailJS using creativesilva.com's account (public key 68UkiTjqHIKZMkeCC, service_4mhkbik, template_creativesilva); message is prefixed [Light Writerz] + topic. Falls back to mailto if EmailJS is unavailable.
