# Borghese — Affittacamere & Suite · Torino (demo)

Demo of the website for **Borghese Affittacamere suite inalpi arena** (Via Gradisca 83, 1st floor, 10136 Torino, Santa Rita district). The property has no website of its own and takes bookings mainly through Booking.com. The goal is to show the owner a direct site with an Awwwards/Godly-level design and a **direct booking system**, so he stops paying commission to the portals.

> Visual demo: availability and bookings are **simulated in the browser** (localStorage). No payments, no emails sent, no backend.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Home: loader, hero with an arch mask (Turin's porticoes) and a slideshow of the 4 rooms, distances marquee, manifesto, rooms where the background **takes on the colour of the room in view**, horizontal details gallery, terrace with a clip-path reveal, amenities, area map with the LED route to the Inalpi Arena, reviews, "Prenota diretto" CTA. |
| `prenota.html` | Booking in 4 steps: two-month calendar with availability → room choice by colour → guest details with inline validation → confirmation with a booking code and an `.ics` file for the calendar. Sticky summary showing the saving compared with the portals. Accepts `?arrivo=YYYY-MM-DD&partenza=YYYY-MM-DD&adulti=1-2&camera=salvia\|turchese\|cipria\|ardesia`. |
| `gestione.html` | Owner area: KPIs (arrivals, occupancy, direct revenue, **commissions saved**), 21-day planning board by room and channel, bookings table with cancellation and demo reset. |

## Running it locally

There is no build step. It only needs a static server, because the JS uses ES modules:

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.

Tests for the booking logic (availability, overlaps, prices, validation, daylight-saving time):

```bash
node --test
```

## Structure

```
index.html · prenota.html · gestione.html
assets/
  css/style.css      tokens, home, nav, footer
  css/booking.css    booking + owner area
  js/data.js         property data and rooms (names, types, demo rates, photos)
  js/store.js        simulated booking engine: availability, prices, localStorage, .ics
  js/site.js         Lenis smooth scroll, nav, mobile menu, cursor
  js/home.js         GSAP animations for the home page
  js/booking.js      booking flow
  js/admin.js        owner area
  img/               WebP photos at 800/1600/2400 px
tests/store.test.mjs
docs/ricerca.md      sources, design research, decisions
```

Libraries (CDN, pinned versions): GSAP 3.13 (ScrollTrigger, SplitText), Lenis 1.1.13. Fonts: Instrument Serif, Geist, Geist Mono (Google Fonts). If the CDNs don't respond the site stays readable without animations, and `prefers-reduced-motion` is respected.

## Design concept

- **Four rooms, four colours.** The rooms really are painted sage green, turquoise, powder pink and slate grey. The site uses those colours as its system: while you scroll, the page background becomes the room's colour.
- **The LED strip.** Each headboard has an RGB strip. On the site it becomes the graphic motif: the scroll progress bar, the button outlines, the review bars and the route on the map.
- **The arch.** A nod to Turin's porticoes. It's the hero mask, which opens on scroll, and the shape of some photos.
- **Location as an argument.** The Inalpi Arena is 950 m away, so it gets the marquee, a counter and the map.

## To complete with the owner before going live

- [ ] Phone, WhatsApp, email (currently "to be added" in the footer).
- [ ] Confirm the colour names of the rooms and how they map to the Booking.com types (Deluxe with balcony, Twin with balcony, Superior).
- [ ] Real rates and a cancellation policy. The current rates are demo values, and the "−10% compared with the portals" is a proposal.
- [ ] Official photos or permission to use the ones from the listings. The current photos come from the public listings, and 4 have been upscaled to 4K with Higgsfield.
- [ ] Permission to quote the reviews, or collect new ones directly.
- [ ] Real backend: database (e.g. Supabase) in place of localStorage, payment (Stripe), confirmation emails, iCal sync with Booking.com during the transition period.
- [ ] English version (a large share of the guests are foreign) and the privacy/cookie pages.

## Identification data (from the public listings)

CIN IT001272C2VYPZE827 · CIR 00127207231 · Check-in 15:00–20:00 · Check-out 08:00–10:00 · Rating 9.4/10 (116 reviews).

---
Design & development: Punto Due Studio.
