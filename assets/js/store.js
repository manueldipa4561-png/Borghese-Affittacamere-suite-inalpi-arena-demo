// Motore prenotazioni simulato: disponibilità, prezzi e salvataggio nel browser (localStorage).
// ponytail: niente backend, le prenotazioni vivono solo in questo browser. Per andare live
// basta sostituire loadLocal/saveLocal con chiamate a un'API (es. Supabase) mantenendo le firme.
import { ROOMS, roomById, PROPERTY, MAX_PER_ROOM } from "./data.js";

const DAY_MS = 86_400_000;
const STORAGE_KEY = "borghese.bookings.v1";
const SEED_START = "2026-01-05";
const SEED_DAYS = 900;
const MAX_NIGHTS = 30;
const LONG_GAP_CHANCE = 0.22;

export const DIRECT_DISCOUNT = 0.1; // il prezzo diretto è ~10% sotto quello dei portali (proposta)
export const OTA_COMMISSION = 0.15; // commissione media stimata dei portali

// ---------- date (sempre "YYYY-MM-DD" in UTC, così l'ora legale non sposta i giorni)
export const toISO = (d) => d.toISOString().slice(0, 10);
export const parseISO = (iso) => new Date(`${iso}T00:00:00Z`);
export const addDays = (iso, n) => toISO(new Date(parseISO(iso).getTime() + n * DAY_MS));
export const nightsBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / DAY_MS);
export const todayISO = () => {
  const d = new Date();
  return toISO(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
};
export const eachNight = (checkIn, checkOut) =>
  Array.from({ length: Math.max(0, nightsBetween(checkIn, checkOut)) }, (_, i) => addDays(checkIn, i));

// ---------- prenotazioni di esempio (deterministiche: stesso risultato a ogni caricamento)
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_GUESTS = ["Giulia R.", "Marco T.", "Lena S.", "Paolo B.", "Chiara M.", "Tom H.", "Sofia L.", "Andrea F.", "Marta G.", "Luca P.", "Ana C.", "Yuki T."];

let seededCache = null;
export function seededBookings() {
  if (seededCache) return seededCache;
  const rand = mulberry32(83);
  const list = [];
  for (const room of ROOMS) {
    let cursor = SEED_START;
    const end = addDays(SEED_START, SEED_DAYS);
    while (cursor < end) {
      // ogni tanto una finestra libera lunga, così anche i soggiorni di 1–3 settimane trovano posto
      const gap = rand() < LONG_GAP_CHANCE ? 8 + Math.floor(rand() * 16) : 1 + Math.floor(rand() * 5);
      const checkIn = addDays(cursor, gap);
      const nights = 1 + Math.floor(rand() * 4);
      const checkOut = addDays(checkIn, nights);
      list.push({
        id: `seed-${room.id}-${checkIn}`,
        code: `BRG-${checkIn.slice(2).replaceAll("-", "")}${room.id[0].toUpperCase()}`,
        roomId: room.id,
        checkIn,
        checkOut,
        nights,
        adults: 1 + Math.floor(rand() * 2),
        total: nights * room.rate,
        channel: rand() < 0.65 ? "Booking.com" : "Telefono",
        status: "confermata",
        guest: { name: DEMO_GUESTS[Math.floor(rand() * DEMO_GUESTS.length)] },
        seeded: true,
      });
      cursor = checkOut;
    }
  }
  seededCache = list;
  return list;
}

// ---------- persistenza locale
export function loadLocal() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? "[]");
  } catch (err) {
    console.warn("Prenotazioni locali illeggibili, riparto da zero.", err);
    return [];
  }
}

function saveLocal(list) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.warn("Impossibile salvare la prenotazione in questo browser.", err);
    return false;
  }
}

export const allBookings = () => [...seededBookings(), ...loadLocal()];
const isActive = (b) => b.status !== "annullata";

// ---------- disponibilità
export const isRoomFree = (roomId, checkIn, checkOut, bookings = allBookings()) =>
  !bookings.some((b) => isActive(b) && b.roomId === roomId && b.checkIn < checkOut && checkIn < b.checkOut);

export function bookedNights(roomId, bookings = allBookings()) {
  const nights = new Set();
  for (const b of bookings) if (isActive(b) && b.roomId === roomId) eachNight(b.checkIn, b.checkOut).forEach((n) => nights.add(n));
  return nights;
}

export const freeRooms = (checkIn, checkOut, bookings = allBookings()) =>
  ROOMS.filter((r) => isRoomFree(r.id, checkIn, checkOut, bookings));

// ---------- prezzi
export function quote(room, checkIn, checkOut) {
  const nights = nightsBetween(checkIn, checkOut);
  const total = nights * room.rate;
  const portal = Math.round(total / (1 - DIRECT_DISCOUNT));
  return { nights, rate: room.rate, total, portal, saving: portal - total };
}

// ---------- ospiti → camere necessarie (max 2 persone per camera, una culla per camera)
export const roomsNeeded = ({ adults = 1, children = 0, infants = 0 } = {}) =>
  Math.max(1, Math.ceil((adults + children) / MAX_PER_ROOM), infants);

export function quoteRooms(roomIds, checkIn, checkOut) {
  const lines = roomIds.map((id) => ({ room: roomById(id), ...quote(roomById(id), checkIn, checkOut) }));
  const sum = (k) => lines.reduce((n, l) => n + l[k], 0);
  return { lines, nights: nightsBetween(checkIn, checkOut), total: sum("total"), portal: sum("portal"), saving: sum("saving") };
}

// ---------- creazione / annullamento
// Gli errori sono codici (non testo): la pagina li traduce in italiano o inglese.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isCount = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

export function validateBooking(input, { bookings = allBookings(), today = todayISO() } = {}) {
  const errors = {};
  const roomIds = input.roomIds ?? [];
  const party = { adults: input.adults, children: input.children ?? 0, infants: input.infants ?? 0 };
  if (!isCount(party.adults, 1, ROOMS.length * MAX_PER_ROOM) || !isCount(party.children, 0, ROOMS.length * MAX_PER_ROOM) || !isCount(party.infants, 0, ROOMS.length)) errors.guests = "guests";
  if (!roomIds.length || new Set(roomIds).size !== roomIds.length || roomIds.some((id) => !roomById(id))) errors.rooms = "rooms";
  else if (!errors.guests && roomIds.length < roomsNeeded(party)) errors.rooms = "roomsTooFew";
  if (!input.checkIn || !input.checkOut) errors.dates = "dates";
  else if (input.checkIn < today) errors.dates = "datesPast";
  else {
    const nights = nightsBetween(input.checkIn, input.checkOut);
    if (nights < 1) errors.dates = "datesOrder";
    else if (nights > MAX_NIGHTS) errors.dates = "datesLong";
    else if (!errors.rooms && roomIds.some((id) => !isRoomFree(id, input.checkIn, input.checkOut, bookings))) errors.rooms = "roomTaken";
  }
  const g = input.guest ?? {};
  if (!g.firstName?.trim()) errors.firstName = "firstName";
  if (!g.lastName?.trim()) errors.lastName = "lastName";
  if (!EMAIL_RE.test(g.email ?? "")) errors.email = "email";
  if (!/^\+?[\d\s().\/-]{7,}$/.test(g.phone ?? "") || (g.phone.match(/\d/g) ?? []).length < 6) errors.phone = "phone";
  if (input.invoice && !input.invoice.vat?.trim()) errors.vat = "vat";
  return errors;
}

// Una prenotazione = un codice; una riga per camera (così planning e disponibilità restano per camera).
export function createBooking(input, opts = {}) {
  const errors = validateBooking(input, opts);
  if (Object.keys(errors).length) {
    const err = new Error("invalid");
    err.fields = errors;
    throw err;
  }
  const code = `BRG-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const party = { adults: input.adults, children: input.children ?? 0, infants: input.infants ?? 0 };
  const guest = {
    name: `${input.guest.firstName.trim()} ${input.guest.lastName.trim()}`,
    email: input.guest.email.trim(),
    phone: input.guest.phone.trim(),
    arrival: input.guest.arrival ?? "",
    notes: input.guest.notes?.trim() ?? "",
  };
  const bookings = input.roomIds.map((roomId) => {
    const { nights, total } = quote(roomById(roomId), input.checkIn, input.checkOut);
    return {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${roomId}`,
      code, roomId, checkIn: input.checkIn, checkOut: input.checkOut, nights, total,
      adults: party.adults, party, rooms: input.roomIds.length,
      payment: input.payment ?? "struttura", invoice: input.invoice ?? null,
      channel: "Sito web", status: "confermata", createdAt, guest,
    };
  });
  if (!saveLocal([...loadLocal(), ...bookings])) throw new Error("storage");
  return { code, bookings, total: bookings.reduce((n, b) => n + b.total, 0) };
}

export function cancelBooking(id) {
  saveLocal(loadLocal().map((b) => (b.id === id ? { ...b, status: "annullata" } : b)));
}

export const resetDemo = () => saveLocal([]);

// ---------- formattazione
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const fmtEuro = (n) => euro.format(n);
export const fmtDate = (iso, opts = { weekday: "short", day: "numeric", month: "short" }, locale = "it-IT") =>
  new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(parseISO(iso));

// result = { code, bookings } restituito da createBooking (anche più camere)
export function toICS({ code, bookings }) {
  const b = bookings[0];
  const names = bookings.map((x) => roomById(x.roomId).name).join(", ");
  const d = (iso) => iso.replaceAll("-", "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Borghese Torino//Demo//IT",
    "BEGIN:VEVENT",
    `UID:${code}@borghese-demo`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d(b.checkIn)}`,
    `DTEND;VALUE=DATE:${d(b.checkOut)}`,
    `SUMMARY:Soggiorno Borghese — ${bookings.length > 1 ? "camere" : "camera"} ${names}`,
    `LOCATION:${PROPERTY.address.replace(",", "\\,")}\\, ${PROPERTY.city}`,
    `DESCRIPTION:Codice ${code}. Check-in ${PROPERTY.checkIn}.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
