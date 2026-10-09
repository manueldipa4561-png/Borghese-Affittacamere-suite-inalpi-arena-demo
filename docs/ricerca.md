# Research & decisions — Borghese demo

October 2026 · Punto Due Studio

## 1. Property data (sources)

| Data | Value | Source |
| --- | --- | --- |
| Name | Borghese Affittacamere suite inalpi arena | Booking.com |
| Address | Via Gradisca 83, 1st floor, 10136 Torino (Santa Rita) | Booking.com IT, Trivago |
| Coordinates | 45.0473, 7.6434 | OpenStreetMap Nominatim |
| Room types | Deluxe Double with balcony · Twin with balcony · Superior Double | Booking.com |
| Rating | 9.4/10, 116 reviews | hotelspiedmont.com aggregator |
| Category scores | Staff 9.8 · Cleanliness 9.7 · Comfort 9.6 · Facilities 9.5 · Location 9.4 · Value for money 9.3 · Wi‑Fi 10 | Booking.com |
| Check-in / check-out | 15:00–20:00 / 08:00–10:00 | Booking.com |
| Facilities | A/C, soundproofing, terrace, balcony, kettle, bathrobes, washing machine, paid airport shuttle, free cot 0–2 years, no pets, no smoking, no parties | Booking.com, hotelspiedmont |
| Licence | CIN IT001272C2VYPZE827 · CIR 00127207231 | Booking.com |
| Distances | Inalpi Arena 950 m · Mombasiglio bus stop 350 m · Museo dello Sport 5 min · Lingotto Fiere 2.6 km · Porta Susa 3.3 km · Valentino 3.6 km · Airport 20 km | hotelspiedmont, Booking.com |

**Photos.** There are 42 photos on the aggregator at 1080×700, plus 8 from Booking.com at up to 1620 px. Four key shots (Turchese and Cipria rooms, terrace, bathroom) were **upscaled to 4K with Higgsfield** (bytedance upscale, 2 credits each). Everything is converted to WebP at 800, 1600 and 2400 px.

**The four rooms (inferred from the photos).** There are four distinct colours: sage, turquoise (twin beds that can be pushed together), powder pink and slate/terracotta. Booking.com lists three types, so the mapping should be confirmed with the owner.

## 2. Design research (Awwwards / Siteinspire, hospitality 2024–2026)

These 12 sites were analysed: Son Daven, Units, Vakantiehuis Coquelicots, Vander Hotel, KUBE Saint‑Tropez, Tandjung Sari, The Pop‑Up Hotel, Palazzo Sogni, Relais Rossar, Here & Away, Moke Valley Cabin and Hotel Bella Grande. Godly now redirects to recent.design and has no hotel filter.

Most frequent patterns, with how each was applied here:

1. **Booking pill fixed in the header (12/12).** Added as "Prenota diretto" with an animated LED border, plus a sticky bottom bar on mobile.
2. **Smooth scroll with Lenis (9/12) and ease-out-expo reveals.** Lenis is used with `cubic-bezier(.19,1,.22,1)`.
3. **Custom cursor with a label (7/12).** Shows "Prenota" or the room name, desktop only.
4. **Serif display face plus a neutral sans, with words in italic (6/12).** Instrument Serif with Geist, for example "Prenota il tuo *colore.*"
5. **Background colour that changes by section (Coquelicots, Bella Grande).** This is the core idea here: each room section takes on its own colour.
6. **Content driven by events and location (Pop‑Up Hotel, Units).** Used as "950 m dall'Inalpi Arena" in the marquee, a counter and the map.
7. **Full-bleed hero with a short headline.** Here the hero opens on scroll from an arch to full screen.
8. **Shaped image masks, including an arch (Palazzo Sogni).** The arch here is also a nod to Turin's porticoes.
9. **Direct-booking incentive (Vander "best price direct").** Shown as "−10% compared with the portals" and the "Prenotando qui risparmi €X" saving line.
10. **Text preloader with a counter (3/12).** Added.

**Booking UX.** The model is a Coquelicots-style inline two-month calendar, a side summary card and a 4-step progress bar. The home page has a Relais Rossar-style quick date bar that pre-fills the booking page.

Two suggestions from the generic design database were discarded: a "navy and gold, liquid glass" palette, and Playfair with Karla. Neither had anything to do with a colourful, LED-lit guesthouse.

## 3. Tools used

- **TinyFish / WebSearch.** Collecting data, reviews and photos from Booking.com, Agoda, hotelspiedmont and Trivago.
- **Research agent.** Analysing the Awwwards and Siteinspire sites in a browser, including reading their fonts, easings and libraries.
- **Higgsfield.** 4K upscales of the hero photos.
- **Skills.** `punto-due-studio-workflow` (process), `frontend-design-direction` (art direction), `ui-ux-pro-max` (accessibility and performance checklist).
- **Claude Browser.** Visual QA at desktop 1440×900 and mobile 375×812, plus an end-to-end test of the booking flow.
- **`node --test`.** Tests for the booking logic.

## 4. Next steps (proposal for the owner)

1. Validate the content: room names, rates, contacts and official photos.
2. Real backend: Supabase for bookings and availability, Stripe for deposits, transactional emails.
3. iCal sync with Booking.com so that during the transition there are no double bookings.
4. EN version, privacy/cookie pages, deployment on a custom domain.
