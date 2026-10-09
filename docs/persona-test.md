# Test with 15 simulated customers (October 2026)

We ran 15 customer personas through the site, each searching for accommodation in Turin. Three agents tested 5 personas each in a real browser (desktop and mobile), read the code, and attempted bookings. **This is a qualitative simulation, not data from real users**: use it as a list of hypotheses to check.

## Personas and outcome before the fixes

| # | Persona | Goal | Before | Main blocker |
| --- | --- | --- | --- | --- |
| 1 | Giulia, 27, iPhone | 3 friends, concert at the Arena, late return | Booked only 2 | max 2 guests, one room |
| 2 | Tom, UK | ATP Finals, 4 nights | Went to Booking | Italian only, dates dropped |
| 3 | Rossi family | 2 adults + 6-year-old + toddler | Couldn't book | no children, one room |
| 4 | Lena, Berlin | City break, getting to the centre | Left | no transport, breakfast unclear |
| 5 | Marco, 68 | By car, wants to phone | Left | no phone number, parking unknown |
| 6 | Sara, consultant | 3 nights, invoice | Booked with workarounds | no invoice fields |
| 7 | Andrea, student | Price, slow 4G | Went to Booking | loader 6 s, no CTA on mobile |
| 8 | Chen, Shanghai | Lands at 22:30 | Went to Booking | Italian only, late arrival |
| 9 | Paolo, engineer | 14 nights | Couldn't book | at most 5 free nights in a row |
| 10 | Elena | Tonight, last minute | Went to Booking | no contact |
| 11 | Davide, screen reader | 2 nights | Booked with difficulty | calendar and errors not accessible |
| 12 | Maria, wheelchair | Accessibility | Went to Booking | no information |
| 13 | Couple with a dog | Pet policy | Went to Booking | no house rules |
| 14 | Francesca, skeptical | Trust | Left | no contact or cancellation terms |
| 15 | 4 friends | 2 rooms, one booking | Gave up | one room per booking |

## What was fixed

**Booking (prenota.html)**
- **Guests:** adults, children 2–12 and infants 0–2 (cot). The page works out how many rooms are needed (max 2 people per room) and lets you book **up to 4 rooms under a single booking code**.
- **Calendar:**
  - Shows straight away the furthest possible departure date.
  - No longer silently resets the arrival date; explains why a date isn't valid.
  - Adds a legend entry for "not available as departure" and a "Cambia date" button.
  - Full keyboard support: arrows, Home/End, PgUp/PgDn.
- **Unavailable dates from a link or quick search:** shows a message with 3 alternatives that can be booked in one click.
- **English:** full EN/IT version (`?lang=en` or the button in the header), including room types, dates and errors.
- **Details step:**
  - Arrival time with no default and late slots up to after 22:00, with an express check-in note.
  - Airport shuttle request with landing time.
  - Invoice: company name, VAT number or tax code, SDI/PEC.
  - Cancellation, payment and house-rule terms before confirming.
- **Accessibility:** errors linked to their fields (`aria-describedby`), an error summary and focus on the first invalid field.
- **Confirmation:** address, contacts, late-arrival and shuttle instructions, cancellation terms. A visible "Demo" link to the owner panel.
- **Mobile:** steps on one line; a fixed bar with the total that moves you to the next step.

**Home (index.html)**
- **New "Info pratiche" section** (also in the menu): late arrival, coming back late after a concert, parking, breakfast, centre/airport, children, groups, accessibility, pets and rules, cancellation, invoice. It also includes a short English block with a "Book in English" link.
- **Real contact links** (`tel:`, WhatsApp, email) in the menu, footer, info section and CTA, all driven from `data.js`.
- **Clearer copy:**
  - Nothing implies breakfast is included.
  - The location copy names the ATP Finals and adds Museo Egizio and Politecnico to the distances.
  - The reviews link to Booking.com so they can be checked.
- **Mobile:**
  - The "Prenota diretto" bar is visible from the first screen.
  - The hero is no longer pinned on scroll.
  - The loader is skipped on slow connections or when the page is already slow to load.
  - Minimum text size raised (at least 12–14 px).
- **Pause buttons** for the slideshow and the reviews marquee (WCAG 2.2.2).

**Demo data:** the simulated bookings now leave windows of 1–3 weeks free, so long stays can be tested.

## Still to confirm with the owner (do not invent)

Real phone, WhatsApp and email (placeholders in `assets/js/data.js`). Also confirm:
- Whether there is a lift and step-free access.
- Late check-in procedure and keys.
- Parking nearby.
- Breakfast (assumed not included).
- Airport shuttle price.
- Tourist tax amount.
- Real cancellation policy (48 h is a proposal).
- Real portal price for the "Sui portali" comparison (currently estimated at −10%).
- Weekly rate for long stays.
