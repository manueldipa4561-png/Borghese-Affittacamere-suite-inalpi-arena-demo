// Contenuti della struttura. Fonti: scheda Booking.com e aggregatori pubblici (ottobre 2026).
// Nomi colore delle camere e tariffe sono una proposta demo: da confermare con il gestore.

export const PROPERTY = {
  name: "Borghese",
  fullName: "Borghese Affittacamere suite inalpi arena",
  address: "Via Gradisca 83, 1° piano",
  city: "10136 Torino",
  district: "Santa Rita",
  checkIn: "15:00 – 20:00",
  checkOut: "08:00 – 10:00",
  cin: "IT001272C2VYPZE827",
  cir: "00127207231",
  rating: 9.4,
  reviews: 116,
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Via+Gradisca+83+10136+Torino",
  reviewsUrl: "https://www.booking.com/hotel/it/borghese-affittacamere-suite-inalpi-arena.html#tab-reviews",
  // ponytail: contatti segnaposto, un solo punto da cambiare. Il gestore deve fornire quelli veri.
  phone: "+39 000 000 0000",
  whatsapp: "390000000000",
  email: "info@esempio.it",
};

// Ospiti per camera: letto queen o due singoli, nessun letto aggiunto (Booking.com). Culla 0–2 anni gratuita.
export const MAX_PER_ROOM = 2;

// Tariffe dimostrative in euro a notte.
export const ROOMS = [
  {
    id: "salvia",
    name: "Salvia",
    type: "Matrimoniale Deluxe con balcone",
    bed: "Letto queen",
    guests: 2,
    rate: 89,
    color: "#c9d8c1",
    deep: "#3f5a3b",
    dark: false,
    blurb: "Verde salvia, boiserie in rovere e una striscia di luce che cambia colore sopra la testiera. Si apre su un balcone sulla via.",
    features: ["Balcone", "Bagno privato in marmo", "Doccia walk-in", "Scrivania"],
    images: ["salvia-1", "salvia-3", "salvia-2"],
    en: { type: "Deluxe double with balcony", features: ["Balcony", "Private marble bathroom", "Walk-in shower", "Desk"] },
  },
  {
    id: "turchese",
    name: "Turchese",
    type: "Doppia twin con balcone",
    bed: "Due letti singoli, unibili",
    guests: 2,
    rate: 85,
    color: "#86cfd8",
    deep: "#0f5560",
    dark: false,
    blurb: "La camera degli amici e dei colleghi: due letti che diventano uno, poltrona in velluto e un muro turchese che si accende la sera.",
    features: ["Balcone", "Letti separabili", "Bagno privato in marmo", "Poltrona"],
    images: ["turchese-1", "turchese-3", "turchese-2"],
    en: { type: "Twin room with balcony", features: ["Balcony", "Beds can be joined", "Private marble bathroom", "Armchair"] },
  },
  {
    id: "cipria",
    name: "Cipria",
    type: "Matrimoniale Superior",
    bed: "Letto queen",
    guests: 2,
    rate: 95,
    color: "#efcfc7",
    deep: "#7a3b33",
    dark: false,
    blurb: "Rosa cipria e legno chiaro, specchi esagonali e luce calda radente. La più luminosa, pensata per le coppie.",
    features: ["Bagno privato in marmo", "Doccia walk-in", "Accappatoi", "Smart TV"],
    images: ["cipria-1", "cipria-3", "cipria-2"],
    en: { type: "Superior double", features: ["Private marble bathroom", "Walk-in shower", "Bathrobes", "Smart TV"] },
  },
  {
    id: "ardesia",
    name: "Ardesia",
    type: "Matrimoniale Deluxe",
    bed: "Letto queen",
    guests: 2,
    rate: 99,
    color: "#3b4349",
    deep: "#e9b48a",
    dark: true,
    blurb: "Grigio ardesia, terracotta e listelli scuri. La camera più raccolta: per chi torna tardi da un concerto e vuole solo buio e silenzio.",
    features: ["Bagno privato in marmo", "Poltrona in velluto", "Scrivania", "Specchi esagonali"],
    images: ["ardesia-1", "ardesia-3", "ardesia-4"],
    en: { type: "Deluxe double", features: ["Private marble bathroom", "Velvet armchair", "Desk", "Hexagon mirrors"] },
  },
];

export const roomById = (id) => ROOMS.find((r) => r.id === id);
