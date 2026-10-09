// node --test   (dalla root del repo)
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS } from "../assets/js/data.js";
import { addDays, nightsBetween, isRoomFree, quote, quoteRooms, roomsNeeded, seededBookings, validateBooking, createBooking, toICS } from "../assets/js/store.js";

const salvia = ROOMS[0];
const guest = { firstName: "Mario", lastName: "Rossi", email: "mario@example.com", phone: "+39 333 1234567" };
const existing = [{ roomId: "salvia", checkIn: "2027-03-10", checkOut: "2027-03-12", status: "confermata" }];

test("date arithmetic survives the DST switch", () => {
  assert.equal(addDays("2027-03-27", 2), "2027-03-29");
  assert.equal(nightsBetween("2027-03-27", "2027-03-29"), 2);
  assert.equal(nightsBetween("2027-10-30", "2027-11-01"), 2);
});

test("checkout day can be the next guest's check-in", () => {
  assert.equal(isRoomFree("salvia", "2027-03-12", "2027-03-14", existing), true);
  assert.equal(isRoomFree("salvia", "2027-03-08", "2027-03-10", existing), true);
  assert.equal(isRoomFree("salvia", "2027-03-11", "2027-03-13", existing), false);
  assert.equal(isRoomFree("salvia", "2027-03-01", "2027-03-20", existing), false);
  assert.equal(isRoomFree("cipria", "2027-03-11", "2027-03-13", existing), true);
});

test("cancelled bookings free the room", () => {
  const cancelled = [{ ...existing[0], status: "annullata" }];
  assert.equal(isRoomFree("salvia", "2027-03-11", "2027-03-13", cancelled), true);
});

test("quote: direct total and portal comparison", () => {
  const q = quote(salvia, "2027-03-01", "2027-03-04");
  assert.equal(q.nights, 3);
  assert.equal(q.total, 3 * salvia.rate);
  assert.ok(q.portal > q.total && q.saving === q.portal - q.total);
});

test("seeded demo bookings never overlap within a room", () => {
  for (const room of ROOMS) {
    const list = seededBookings().filter((b) => b.roomId === room.id);
    for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].checkOut <= list[i].checkIn, `${room.id} overlap at ${list[i].checkIn}`);
  }
});

test("rooms needed: max 2 guests per room, one cot per room", () => {
  assert.equal(roomsNeeded({ adults: 1 }), 1);
  assert.equal(roomsNeeded({ adults: 2 }), 1);
  assert.equal(roomsNeeded({ adults: 3 }), 2);
  assert.equal(roomsNeeded({ adults: 2, children: 1, infants: 1 }), 2);
  assert.equal(roomsNeeded({ adults: 2, infants: 2 }), 2);
  assert.equal(roomsNeeded({ adults: 4 }), 2);
});

const ok = { roomIds: ["salvia"], checkIn: "2027-03-12", checkOut: "2027-03-14", adults: 2, guest };
const opts = { bookings: existing, today: "2027-01-01" };

test("validation rejects bad input and double bookings", () => {
  assert.deepEqual(validateBooking(ok, opts), {});
  assert.equal(validateBooking({ ...ok, checkIn: "2027-03-11" }, opts).rooms, "roomTaken");
  assert.equal(validateBooking({ ...ok, checkOut: ok.checkIn }, opts).dates, "datesOrder");
  assert.equal(validateBooking({ ...ok, checkIn: "2026-12-01", checkOut: "2026-12-03" }, opts).dates, "datesPast");
  assert.equal(validateBooking({ ...ok, adults: 3 }, opts).rooms, "roomsTooFew");
  assert.equal(validateBooking({ ...ok, roomIds: ["salvia", "salvia"] }, opts).rooms, "rooms");
  assert.equal(validateBooking({ ...ok, guest: { ...guest, email: "nope" } }, opts).email, "email");
  assert.equal(validateBooking({ ...ok, invoice: { company: "ACME", vat: " " } }, opts).vat, "vat");
  assert.throws(() => createBooking({ ...ok, checkIn: "2027-03-11" }, opts), /invalid/);
});

test("family of 4 books two rooms under one code", () => {
  const input = { ...ok, roomIds: ["cipria", "turchese"], adults: 2, children: 1, infants: 1 };
  assert.deepEqual(validateBooking(input, opts), {});
  const result = createBooking(input, { bookings: [], today: "2027-01-01" });
  assert.match(result.code, /^BRG-[A-Z0-9]{4}$/);
  assert.equal(result.bookings.length, 2);
  assert.ok(result.bookings.every((b) => b.code === result.code && b.channel === "Sito web"));
  assert.equal(result.total, quoteRooms(input.roomIds, ok.checkIn, ok.checkOut).total);
  assert.match(toICS(result), /camere Turchese, Cipria|camere Cipria, Turchese/);
});

test("phone accepts common Italian formats, rejects junk", () => {
  for (const phone of ["+39 333 1234567", "333-123-4567", "+39.333.1234567", "(011) 1234567"]) {
    assert.equal(validateBooking({ ...ok, guest: { ...guest, phone } }, opts).phone, undefined, phone);
  }
  for (const phone of ["", "abc", "12-34", "-------"]) {
    assert.ok(validateBooking({ ...ok, guest: { ...guest, phone } }, opts).phone, phone);
  }
});
