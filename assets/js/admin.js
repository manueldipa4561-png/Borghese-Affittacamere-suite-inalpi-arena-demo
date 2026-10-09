// Area gestore: KPI, planning a barre e tabella prenotazioni (demo, dati locali).
import { initSite } from "./site.js";
import { ROOMS, roomById } from "./data.js";
import { allBookings, cancelBooking, resetDemo, todayISO, addDays, nightsBetween, eachNight, fmtEuro, fmtDate, parseISO, OTA_COMMISSION } from "./store.js";

initSite();

const PLAN_DAYS = 21;
const KPI_DAYS = 30;
const UPCOMING_DAYS = 14;
const $ = (sel) => document.querySelector(sel);

// piccolo helper DOM: i dati dei clienti passano sempre da textContent
function h(tag, props = {}, ...children) {
  const { style, ...rest } = props;
  const el = Object.assign(document.createElement(tag), rest);
  Object.entries(style ?? {}).forEach(([k, v]) => el.style.setProperty(k, v));
  el.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}
const roomVars = (room) => ({ "--room": room.color, "--room-fg": room.dark ? "#f3efe6" : "#16181a" });
const isWeb = (b) => b.channel === "Sito web";

function render() {
  const today = todayISO();
  const bookings = allBookings();
  const active = bookings.filter((b) => b.status !== "annullata");
  renderKpis(active, today);
  renderPlan(active, today);
  renderTable(bookings, today);
}

function renderKpis(active, today) {
  const end = addDays(today, KPI_DAYS);
  const arrivals = active.filter((b) => b.checkIn >= today && b.checkIn < end).length;
  const nights = active.reduce((sum, b) => sum + eachNight(b.checkIn, b.checkOut).filter((n) => n >= today && n < end).length, 0);
  const occupancy = Math.round((nights / (ROOMS.length * KPI_DAYS)) * 100);
  const webRevenue = active.filter(isWeb).reduce((sum, b) => sum + b.total, 0);
  const saved = Math.round(webRevenue * OTA_COMMISSION);
  const kpi = (label, value, note, led) =>
    h("article", { className: `kpi${led ? " kpi--led" : ""}` }, led ? h("span", { className: "led" }) : null,
      h("p", { className: "eyebrow", textContent: label }), h("b", { textContent: value }), h("small", { textContent: note }));
  $("[data-kpis]").replaceChildren(
    kpi("Arrivi", String(arrivals), `nei prossimi ${KPI_DAYS} giorni`),
    kpi("Occupazione", `${occupancy}%`, `${nights} notti vendute su ${ROOMS.length * KPI_DAYS}`),
    kpi("Incasso dal sito", fmtEuro(webRevenue), `${active.filter(isWeb).length} prenotazioni dirette`),
    kpi("Commissioni risparmiate", fmtEuro(saved), `stima al ${Math.round(OTA_COMMISSION * 100)}% rispetto ai portali`, true),
  );
}

function renderPlan(active, today) {
  const end = addDays(today, PLAN_DAYS);
  const days = Array.from({ length: PLAN_DAYS }, (_, i) => addDays(today, i));
  const weekend = (iso) => [0, 6].includes(parseISO(iso).getUTCDay());
  const grid = h("div", { className: "plan__grid", style: { "--days": String(PLAN_DAYS) } });
  grid.append(h("div", { className: "plan__corner", textContent: "Camera" }));
  days.forEach((iso) =>
    grid.append(h("div", { className: `plan__day${weekend(iso) ? " is-weekend" : ""}${iso === today ? " is-today" : ""}` },
      fmtDate(iso, { weekday: "short" }), h("b", { textContent: String(Number(iso.slice(8))) }))),
  );
  ROOMS.forEach((room, r) => {
    const row = r + 2;
    grid.append(h("div", { className: "plan__room", style: { ...roomVars(room), "grid-row": String(row), "grid-column": "1" } }, h("i"), room.name));
    days.forEach((iso, i) =>
      grid.append(h("div", { className: `plan__cell${weekend(iso) ? " is-weekend" : ""}`, style: { "grid-row": String(row), "grid-column": String(i + 2) } })),
    );
    active
      .filter((b) => b.roomId === room.id && b.checkIn < end && b.checkOut > today)
      .forEach((b) => {
        const start = b.checkIn < today ? today : b.checkIn;
        const stop = b.checkOut > end ? end : b.checkOut;
        const variant = b.channel === "Booking.com" ? " plan__bar--ota" : isWeb(b) ? " plan__bar--web" : "";
        grid.append(h("div", {
          className: `plan__bar${variant}`,
          title: `${b.guest.name} · ${b.channel} · ${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)}`,
          style: { ...roomVars(room), "grid-row": String(row), "grid-column": `${nightsBetween(today, start) + 2} / span ${nightsBetween(start, stop)}` },
        }, b.guest.name, h("small", { textContent: b.channel })));
      });
  });
  $("[data-plan]").replaceChildren(grid);
}

function renderTable(bookings, today) {
  const soon = addDays(today, UPCOMING_DAYS);
  const rows = bookings
    .filter((b) => isWeb(b) || (b.checkOut >= today && b.checkIn < soon))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  if (!rows.length) return $("[data-table]").replaceChildren(h("p", { className: "empty", textContent: "Nessuna prenotazione in arrivo." }));
  const head = h("tr", {}, ...["Codice", "Ospite", "Camera", "Arrivo", "Partenza", "Notti", "Totale", "Canale", ""].map((t) => h("th", { scope: "col", textContent: t })));
  const body = rows.map((b) => {
    const room = roomById(b.roomId);
    const cancelled = b.status === "annullata";
    const action = cancelled ? h("span", { className: "badge", textContent: "Annullata" })
      : isWeb(b) ? h("button", { className: "link-btn", type: "button", textContent: "Annulla", onclick: () => onCancel(b) })
      : h("span", { className: "badge", textContent: "Confermata" });
    return h("tr", { className: cancelled ? "is-cancelled" : "" },
      h("td", { textContent: b.code }),
      h("td", { textContent: b.guest.name }),
      h("td", {}, h("span", { className: "swatch", style: roomVars(room) }), room.name),
      h("td", { textContent: fmtDate(b.checkIn) }),
      h("td", { textContent: fmtDate(b.checkOut) }),
      h("td", { textContent: String(b.nights) }),
      h("td", { textContent: fmtEuro(b.total) }),
      h("td", {}, h("span", { className: `badge${isWeb(b) ? " badge--web" : ""}`, textContent: b.channel })),
      h("td", {}, action));
  });
  $("[data-table]").replaceChildren(h("table", { className: "table" }, h("thead", {}, head), h("tbody", {}, ...body)));
}

function onCancel(b) {
  if (!confirm(`Annullare la prenotazione ${b.code} di ${b.guest.name}?`)) return;
  cancelBooking(b.id);
  render();
}

$("[data-reset]").addEventListener("click", () => {
  if (!confirm("Cancellare tutte le prenotazioni fatte dal sito in questo browser?")) return;
  resetDemo();
  render();
});

addEventListener("storage", render); // aggiorna se si prenota da un'altra scheda
render();
