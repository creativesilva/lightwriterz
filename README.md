# Light Writerz (LWZ)

Website for Light Writerz, the Pioneer Valley High School photography club.
Live at **https://www.lightwriterz.org** (GitHub Pages, custom domain via GoDaddy DNS).

> Pics are taken. Photographs are made.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home |
| `mission.html` | Mission and artist statement, pic vs. photograph, member quotes |
| `officers.html` | Student officers, advisors, founding four |
| `gallery.html` | Student gallery (reads `gallery/gallery.json`) |
| `contact.html` | Contact form, Cameras 4 Kids camera donations |

Plain HTML, CSS, and JavaScript. No build step.

## Adding photos to the gallery

The gallery is organized into **collections** in `gallery/gallery.json`.

1. Save the photo twice: a 1600px JPG in `gallery/photos/` and a 900px JPG (same name) in `gallery/thumbs/`.
2. Add an entry to the right collection's `photos` list:

```json
{ "file": "light-13.jpg", "w": 1600, "h": 1067, "alt": "What the photo shows", "student": "", "title": "", "year": "2026" }
```

`student` and `title` are optional; without a name the credit reads "Light Writerz member".
A collection's `rows` (for example `[1, 2, 3]`) sets how many photos sit in each row, repeating.
A new collection is another object in `collections` with `id`, `title`, `kicker`, `note`, `rows`, and `photos`.

## Brand

- Dark theme: near black `#0c1111` base with soft teal gradients, white text, PVHS teal `#007474`
- Curriculum accents: light teal `#80e0e0`, orange `#FF6B1A` (Cameras 4 Kids / donate), gold `#f5b301` (earned, honors), purple `#8b5cf6` (reserved)
- Fonts: Oswald (headings), Inter (body)
- Logos in `logos/` (transparent PNG, black / white / teal)

## Preview locally

```
python3 -m http.server 8765
```

Then open http://localhost:8765
