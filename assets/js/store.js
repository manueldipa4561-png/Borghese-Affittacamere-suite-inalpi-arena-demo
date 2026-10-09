// Motore prenotazioni simulato: disponibilità, prezzi e salvataggio nel browser (localStorage).
// ponytail: niente backend, le prenotazioni vivono solo in questo browser. Per andare live
// basta sostituire loadLocal/saveLocal con chiamate a un'API (es. Supabase) mantenendo le firme.
import { ROOMS, roomById, PROPERTY } from "./data.js";

const DAY_MS = 86_400_000;
const STORAGE_KEY = "borghese.bookings.v1";
const SEED_START = "2026-01-05";
const SEED_DAYS = 900;
const MAX_NIGHTS = 30;

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
      const checkIn = addDays(cursor, 1 + Math.floor(rand() * 5));
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

// ---------- creazione / annullamento
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateBooking(input, { bookings = allBookings(), today = todayISO() } = {}) {
  const errors = {};
  const room = roomById(input.roomId);
  if (!room) errors.roomId = "Scegli una camera.";
  if (!input.checkIn || !input.checkOut) errors.dates = "Scegli le date di arrivo e partenza.";
  else if (input.checkIn < today) errors.dates = "La data di arrivo è già passata.";
  else {
    const nights = nightsBetween(input.checkIn, input.checkOut);
    if (nights < 1) errors.dates = "La partenza deve essere dopo l'arrivo.";
    else if (nights > MAX_NIGHTS) errors.dates = `Per soggiorni oltre ${MAX_NIGHTS} notti scrivici direttamente.`;
    else if (room && !isRoomFree(room.id, input.checkIn, input.checkOut, bookings)) errors.roomId = "La camera non è più libera in queste date.";
  }
  if (room && !(input.adults >= 1 && input.adults <= room.guests)) errors.adults = `Massimo ${room.guests} adulti per camera.`;
  const g = input.guest ?? {};
  if (!g.firstName?.trim()) errors.firstName = "Inserisci il nome.";
  if (!g.lastName?.trim()) errors.lastName = "Inserisci il cognome.";
  if (!EMAIL_RE.test(g.email ?? "")) errors.email = "Inserisci un'email valida.";
  if (!/^\+?[\d\s().\/-]{7,}$/.test(g.phone ?? "") || (g.phone.match(/\d/g) ?? []).length < 6) errors.phone = "Inserisci un numero di telefono valido.";
  return errors;
}

export function createBooking(input, opts = {}) {
  const errors = validateBooking(input, opts);
  if (Object.keys(errors).length) {
    const err = new Error("Controlla i campi evidenziati.");
    err.fields = errors;
    throw err;
  }
  const room = roomById(input.roomId);
  const { nights, total } = quote(room, input.checkIn, input.checkOut);
  const booking = {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    code: `BRG-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    roomId: room.id,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    adults: input.adults,
    crib: Boolean(input.crib),
    total,
    payment: input.payment ?? "struttura",
    channel: "Sito web",
    status: "confermata",
    createdAt: new Date().toISOString(),
    guest: {
      name: `${input.guest.firstName.trim()} ${input.guest.lastName.trim()}`,
      email: input.guest.email.trim(),
      phone: input.guest.phone.trim(),
      arrival: input.guest.arrival ?? "",
      notes: input.guest.notes?.trim() ?? "",
    },
  };
  if (!saveLocal([...loadLocal(), booking])) throw new Error("Salvataggio non riuscito: memoria del browser non disponibile.");
  return booking;
}

export function cancelBooking(id) {
  saveLocal(loadLocal().map((b) => (b.id === id ? { ...b, status: "annullata" } : b)));
}

export const resetDemo = () => saveLocal([]);

// ---------- formattazione
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const fmtEuro = (n) => euro.format(n);
export const fmtDate = (iso, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat("it-IT", { ...opts, timeZone: "UTC" }).format(parseISO(iso));

export function toICS(b) {
  const room = roomById(b.roomId);
  const d = (iso) => iso.replaceAll("-", "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Borghese Torino//Demo//IT",
    "BEGIN:VEVENT",
    `UID:${b.code}@borghese-demo`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d(b.checkIn)}`,
    `DTEND;VALUE=DATE:${d(b.checkOut)}`,
    `SUMMARY:Soggiorno Borghese — camera ${room.name}`,
    `LOCATION:${PROPERTY.address.replace(",", "\\,")}\\, ${PROPERTY.city}`,
    `DESCRIPTION:Codice ${b.code}. Check-in ${PROPERTY.checkIn}.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
