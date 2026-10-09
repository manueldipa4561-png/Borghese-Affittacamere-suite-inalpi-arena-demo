// Flusso di prenotazione: date → camera → dati → conferma. Tutto simulato in locale.
import { initSite, reducedMotion } from "./site.js";
import { ROOMS, roomById } from "./data.js";
import {
  todayISO, toISO, parseISO, nightsBetween, allBookings, bookedNights, isRoomFree, freeRooms,
  quote, createBooking, fmtEuro, fmtDate, toICS,
} from "./store.js";

initSite();

const MAX_NIGHTS = 30;
const MAX_MONTHS_AHEAD = 18;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const gsap = window.gsap;

const today = todayISO();
const bookings = allBookings();
const nightsByRoom = Object.fromEntries(ROOMS.map((r) => [r.id, bookedNights(r.id, bookings)]));
const wide = matchMedia("(min-width: 721px)");

const firstOfMonth = (iso) => `${iso.slice(0, 8)}01`;
const addMonths = (first, n) => {
  const d = parseISO(first);
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
};
const longDate = (iso) => fmtDate(iso, { weekday: "short", day: "numeric", month: "long" });

const state = { step: 1, maxStep: 1, checkIn: null, checkOut: null, adults: 2, crib: false, roomId: null, view: firstOfMonth(today), done: false };

// ---------- disponibilità (filtrata sulla camera se scelta dal sito)
const nightFull = (iso) => (state.roomId ? nightsByRoom[state.roomId].has(iso) : ROOMS.every((r) => nightsByRoom[r.id].has(iso)));
const rangeOk = (a, b) =>
  nightsBetween(a, b) >= 1 && nightsBetween(a, b) <= MAX_NIGHTS &&
  (state.roomId ? isRoomFree(state.roomId, a, b, bookings) : freeRooms(a, b, bookings).length > 0);

// ---------- precompilazione da URL (?arrivo=&partenza=&adulti=&camera=)
const lastBookable = addMonths(firstOfMonth(today), MAX_MONTHS_AHEAD);
// data reale (niente 2026-13-45 o 30 febbraio) e dentro la finestra prenotabile
const validDate = (s) => ISO_RE.test(s ?? "") && !Number.isNaN(parseISO(s).getTime()) && toISO(parseISO(s)) === s && s >= today && s < lastBookable;

(function readParams() {
  const p = new URLSearchParams(location.search);
  state.roomId = roomById(p.get("camera"))?.id ?? null;
  const adults = Number(p.get("adulti"));
  if (adults === 1 || adults === 2) state.adults = adults;
  const [a, b] = [p.get("arrivo"), p.get("partenza")];
  if (validDate(a) && validDate(b) && rangeOk(a, b)) {
    Object.assign(state, { checkIn: a, checkOut: b, view: firstOfMonth(a) });
  } else if (validDate(a)) {
    state.view = firstOfMonth(a);
  }
})();

// ---------- calendario
const months = $("[data-cal-months]");
const hint = $("[data-cal-hint]");

function renderCalendar() {
  const count = wide.matches ? 2 : 1;
  months.replaceChildren(...Array.from({ length: count }, (_, i) => renderMonth(addMonths(state.view, i))));
  $("[data-cal-prev]").disabled = state.view <= firstOfMonth(today);
  $("[data-cal-next]").disabled = state.view >= addMonths(firstOfMonth(today), MAX_MONTHS_AHEAD);
  renderFilter();
  hint.textContent = !state.checkIn ? "Scegli la data di arrivo"
    : !state.checkOut ? `Arrivo ${longDate(state.checkIn)} — ora la partenza`
    : `${nightsBetween(state.checkIn, state.checkOut)} notti · ${longDate(state.checkIn)} → ${longDate(state.checkOut)}`;
}

function renderMonth(first) {
  const month = document.createElement("div");
  month.className = "month";
  const title = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(parseISO(first));
  month.innerHTML = `<p class="month__title">${title}</p><div class="month__grid"><span>L</span><span>M</span><span>M</span><span>G</span><span>V</span><span>S</span><span>D</span></div>`;
  const grid = $(".month__grid", month);
  const offset = (parseISO(first).getUTCDay() + 6) % 7;
  for (let i = 0; i < offset; i++) grid.append(document.createElement("i"));
  for (let iso = first; iso.slice(0, 7) === first.slice(0, 7); iso = toISO(new Date(parseISO(iso).getTime() + 86_400_000))) {
    grid.append(dayButton(iso));
  }
  return month;
}

function dayButton(iso) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "day";
  btn.dataset.date = iso;
  btn.textContent = Number(iso.slice(8));
  const { checkIn, checkOut } = state;
  const asCheckout = checkIn && !checkOut && iso > checkIn && rangeOk(checkIn, iso);
  const full = nightFull(iso);
  const past = iso < today;
  btn.disabled = past || (full && !asCheckout);
  btn.classList.toggle("is-full", full && !past);
  btn.classList.toggle("is-today", iso === today);
  btn.classList.toggle("is-start", iso === checkIn);
  btn.classList.toggle("is-end", iso === checkOut);
  btn.classList.toggle("is-range", Boolean(checkIn && checkOut && iso > checkIn && iso < checkOut));
  btn.classList.toggle("is-blocked", Boolean(checkIn && !checkOut && iso > checkIn && !asCheckout));
  btn.setAttribute("aria-pressed", String(iso === checkIn || iso === checkOut));
  btn.setAttribute("aria-label", `${longDate(iso)}${full ? ", tutto esaurito" : ""}${iso === checkIn ? ", arrivo" : ""}${iso === checkOut ? ", partenza" : ""}`);
  return btn;
}

function renderFilter() {
  let filter = $("[data-cal-filter]");
  if (!state.roomId || state.step !== 1) return filter?.remove();
  if (!filter) {
    filter = document.createElement("p");
    filter.className = "cal__filter";
    filter.dataset.calFilter = "";
    months.before(filter);
  }
  const room = roomById(state.roomId);
  filter.innerHTML = `<i style="background:${room.color}"></i>Disponibilità della camera <b>${room.name}</b> <button type="button">mostra tutte le camere</button>`;
  $("button", filter).addEventListener("click", () => {
    state.roomId = null;
    renderAll();
  });
}

function pick(iso) {
  const { checkIn, checkOut } = state;
  if (checkIn && !checkOut && iso > checkIn && rangeOk(checkIn, iso)) state.checkOut = iso;
  else if (!nightFull(iso)) Object.assign(state, { checkIn: iso, checkOut: null });
  state.maxStep = 1;
  renderAll();
  $(`[data-date="${iso}"]`)?.focus();
}

months.addEventListener("click", (e) => {
  const day = e.target.closest(".day");
  if (day && !day.disabled) pick(day.dataset.date);
});
months.addEventListener("pointerover", (e) => {
  const day = e.target.closest(".day");
  if (!day || !state.checkIn || state.checkOut) return;
  const end = day.dataset.date;
  const ok = end > state.checkIn && rangeOk(state.checkIn, end);
  $$(".day", months).forEach((d) => d.classList.toggle("is-preview", ok && d.dataset.date > state.checkIn && d.dataset.date <= end));
});
$("[data-cal-prev]").addEventListener("click", () => { state.view = addMonths(state.view, -1); renderCalendar(); });
$("[data-cal-next]").addEventListener("click", () => { state.view = addMonths(state.view, 1); renderCalendar(); });
wide.addEventListener("change", renderCalendar);

// ---------- ospiti
$$("[data-adults]").forEach((btn) =>
  btn.addEventListener("click", () => {
    state.adults = Math.min(2, Math.max(1, state.adults + Number(btn.dataset.adults)));
    renderAll();
  }),
);
$("[data-crib]").addEventListener("change", (e) => { state.crib = e.target.checked; renderSummary(); });

// ---------- camere
const roomsWrap = $("[data-rooms-pick]");

function renderRooms() {
  if (!state.checkIn || !state.checkOut) return;
  const free = freeRooms(state.checkIn, state.checkOut, bookings).map((r) => r.id);
  if (state.roomId && !free.includes(state.roomId)) state.roomId = null;
  $("[data-rooms-lead]").textContent = `${free.length} ${free.length === 1 ? "camera libera" : "camere libere"} dal ${longDate(state.checkIn)} al ${longDate(state.checkOut)}.`;
  roomsWrap.innerHTML = ROOMS.map((room) => {
    const isFree = free.includes(room.id);
    const q = quote(room, state.checkIn, state.checkOut);
    return `<label class="pick${isFree ? "" : " is-disabled"}" style="--room:${room.color};--room-deep:${room.deep}">
      <input type="radio" name="room" value="${room.id}"${isFree ? "" : " disabled"}${state.roomId === room.id ? " checked" : ""}>
      <span class="pick__img"><img src="assets/img/${room.images[0]}-800.webp" alt="" loading="lazy"></span>
      <span class="pick__body">
        <span class="pick__name">${room.name}</span>
        <span class="pick__type mono">${room.type}</span>
        <span class="pick__status mono">${isFree ? "Libera" : "Occupata in queste date"}</span>
      </span>
      <span class="pick__price"><b>${fmtEuro(q.total)}</b><small>${q.nights} ${q.nights === 1 ? "notte" : "notti"} · ${fmtEuro(room.rate)}/notte</small></span>
    </label>`;
  }).join("");
}

roomsWrap.addEventListener("change", (e) => {
  state.roomId = e.target.value;
  state.maxStep = 2;
  renderAll();
  roomsWrap.querySelector("input:checked")?.focus(); // il re-render distrugge il radio a fuoco
});

// ---------- riepilogo
function renderSummary() {
  const room = roomById(state.roomId);
  const media = $("[data-sum-media]");
  if (room) {
    const img = new Image();
    img.src = `assets/img/${room.images[0]}-800.webp`;
    img.alt = `Camera ${room.name}`;
    media.replaceChildren(img);
  } else {
    media.innerHTML = '<span class="mono">Nessuna camera scelta</span>';
  }
  $("[data-summary]").style.setProperty("--room", room?.color ?? "var(--paper-2)");
  document.body.style.setProperty("--accent", room?.color ?? "#f3efe6");
  $("[data-sum-type]").textContent = room ? room.type : "Il tuo soggiorno";
  $("[data-sum-room]").textContent = room ? room.name : "Scegli date e camera";
  $("[data-sum-in]").textContent = state.checkIn ? longDate(state.checkIn) : "—";
  $("[data-sum-out]").textContent = state.checkOut ? longDate(state.checkOut) : "—";
  $("[data-sum-guests]").textContent = `${state.adults} ${state.adults === 1 ? "adulto" : "adulti"}${state.crib ? " + culla" : ""}`;
  const price = $("[data-sum-price]");
  const mobileTotal = $("[data-mobile-total]");
  price.hidden = !(room && state.checkIn && state.checkOut);
  mobileTotal.hidden = price.hidden || state.done;
  if (price.hidden) return;
  const q = quote(room, state.checkIn, state.checkOut);
  $("[data-mt-label]").textContent = `${room.name} · ${q.nights} ${q.nights === 1 ? "notte" : "notti"} · risparmi ${fmtEuro(q.saving)}`;
  $("[data-mt-total]").textContent = fmtEuro(q.total);
  $("[data-sum-nights]").textContent = `${q.nights} ${q.nights === 1 ? "notte" : "notti"} × ${fmtEuro(q.rate)}`;
  $("[data-sum-sub]").textContent = fmtEuro(q.total);
  $("[data-sum-portal]").textContent = fmtEuro(q.portal);
  $("[data-sum-total]").textContent = fmtEuro(q.total);
  $("[data-sum-save]").textContent = `Prenotando qui risparmi ${fmtEuro(q.saving)}`;
}

// ---------- passi
function goTo(step) {
  if (step > state.maxStep) return;
  state.step = step;
  $$("[data-step]").forEach((s) => (s.hidden = Number(s.dataset.step) !== step));
  renderAll();
  const current = $(`[data-step="${step}"]`);
  if (gsap && !reducedMotion) gsap.from(current, { y: 24, opacity: 0, duration: 0.8, ease: "expo.out" });
  const top = $(".stepper").getBoundingClientRect().top + scrollY - 90;
  if (scrollY > top) scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
  (step === 4 ? current : $("h2", current))?.focus?.({ preventScroll: true });
}

function renderStepper() {
  $$(".stepper button").forEach((btn) => {
    const n = Number(btn.dataset.goto);
    btn.disabled = state.done ? n !== 4 : n > state.maxStep;
    btn.toggleAttribute("aria-current", n === state.step);
    if (n === state.step) btn.setAttribute("aria-current", "step");
  });
  $('[data-next="2"]').disabled = !(state.checkIn && state.checkOut);
  $('[data-next="3"]').disabled = !state.roomId;
  $("[data-adults-out]").textContent = state.adults;
}

function renderAll() {
  if (state.checkIn && state.checkOut) state.maxStep = Math.max(state.maxStep, 2);
  if (state.roomId && state.maxStep >= 2 && state.step >= 2) state.maxStep = Math.max(state.maxStep, 3);
  renderCalendar();
  renderRooms();
  renderSummary();
  renderStepper();
}

document.addEventListener("click", (e) => {
  const next = e.target.closest("[data-next]");
  const back = e.target.closest("[data-goto]");
  if (next && !next.disabled) {
    const n = Number(next.dataset.next);
    state.maxStep = Math.max(state.maxStep, n);
    goTo(n);
  } else if (back && !back.disabled) {
    goTo(Number(back.dataset.goto));
  }
});

// ---------- dati + conferma
const form = $("[data-form]");
form.addEventListener("input", (e) => {
  e.target.removeAttribute("aria-invalid");
  const msg = $(`[data-error="${e.target.name}"]`, form);
  if (msg) msg.textContent = "";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  $$("[data-error]", form).forEach((el) => (el.textContent = ""));
  const data = Object.fromEntries(new FormData(form));
  try {
    const booking = createBooking({
      roomId: state.roomId, checkIn: state.checkIn, checkOut: state.checkOut,
      adults: state.adults, crib: state.crib, payment: data.payment,
      guest: { firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, arrival: data.arrival, notes: data.notes },
    });
    showDone(booking, data.firstName.trim());
  } catch (err) {
    if (!err.fields) {
      console.error("Prenotazione non riuscita", err);
      $('[data-error="dates"]', form).textContent = "Qualcosa è andato storto. Riprova tra un attimo.";
      return;
    }
    const fields = err.fields;
    if (fields.roomId || fields.adults) fields.dates = [fields.dates, fields.roomId, fields.adults].filter(Boolean).join(" ");
    Object.entries(fields).forEach(([name, message]) => {
      const msg = $(`[data-error="${name}"]`, form);
      if (msg) msg.textContent = message;
      form.elements[name]?.setAttribute("aria-invalid", "true");
    });
    form.querySelector('[aria-invalid="true"]')?.focus();
  }
});

function showDone(booking, firstName) {
  const room = roomById(booking.roomId);
  state.done = true;
  state.maxStep = 4;
  $("[data-done-title]").textContent = `Grazie, ${firstName}.`;
  const rows = [
    ["Camera", `${room.name} — ${room.type}`],
    ["Arrivo", `${longDate(booking.checkIn)}, dalle 15:00`],
    ["Partenza", `${longDate(booking.checkOut)}, entro le 10:00`],
    ["Ospiti", `${booking.adults} ${booking.adults === 1 ? "adulto" : "adulti"}${booking.crib ? " + culla" : ""}`],
    ["Totale", `${fmtEuro(booking.total)} · ${booking.payment === "bonifico" ? "bonifico anticipato" : "in struttura"}`],
  ];
  const ticket = $("[data-ticket]");
  ticket.style.setProperty("--room", room.color);
  const code = Object.assign(document.createElement("p"), { className: "ticket__code", textContent: booking.code });
  const dl = document.createElement("dl");
  rows.forEach(([k, v]) => {
    const row = document.createElement("div");
    row.append(Object.assign(document.createElement("dt"), { textContent: k }), Object.assign(document.createElement("dd"), { textContent: v }));
    dl.append(row);
  });
  const note = Object.assign(document.createElement("p"), { className: "ticket__note", textContent: `Conferma inviata a ${booking.guest.email} (simulazione: nessuna email reale).` });
  ticket.replaceChildren(Object.assign(document.createElement("span"), { className: "led" }), code, dl, note);
  const ics = $("[data-ics]");
  ics.href = URL.createObjectURL(new Blob([toICS(booking)], { type: "text/calendar" }));
  ics.download = `borghese-${booking.code}.ics`;
  goTo(4);
  if (gsap && !reducedMotion) gsap.from(ticket, { rotate: -3, y: 60, opacity: 0, duration: 1.2, ease: "expo.out", delay: 0.1 });
}

// ---------- avvio
if (state.checkIn && state.checkOut) state.maxStep = 2;
renderAll();
