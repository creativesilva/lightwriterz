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
| `contact.html` | Contact form, Cameras4Kids camera donations |

Plain HTML, CSS, and JavaScript. No build step.

## Adding photos to the gallery

1. Put the image in `gallery/photos/` (JPG, long edge about 2000px).
2. Add an entry to `gallery/gallery.json`:

```json
{
  "photos": [
    {
      "file": "jane-doe-shadows.jpg",
      "title": "Shadows",
      "student": "Jane Doe",
      "year": "2026",
      "category": "Portraits",
      "alt": "A black and white portrait lit by window light"
    }
  ]
}
```

Category filter buttons appear automatically once there are two or more categories.

## Brand

- Black `#0d0d0d`, white, PVHS teal `#007474`
- Curriculum accents: light teal `#80e0e0`, orange `#FF6B1A` (Cameras4Kids / donate), gold `#f5b301` (earned, honors), purple `#8b5cf6` (reserved)
- Fonts: Oswald (headings), Inter (body)
- Logos in `logos/` (transparent PNG, black / white / teal)

## Preview locally

```
python3 -m http.server 8765
```

Then open http://localhost:8765
