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
