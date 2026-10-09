// node --test   (dalla root del repo)
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS } from "../assets/js/data.js";
import { addDays, nightsBetween, isRoomFree, quote, seededBookings, validateBooking, createBooking } from "../assets/js/store.js";

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

test("validation rejects bad input and double bookings", () => {
  const opts = { bookings: existing, today: "2027-01-01" };
  const ok = { roomId: "salvia", checkIn: "2027-03-12", checkOut: "2027-03-14", adults: 2, guest };
  assert.deepEqual(validateBooking(ok, opts), {});
  assert.ok(validateBooking({ ...ok, checkIn: "2027-03-11" }, opts).roomId);
  assert.ok(validateBooking({ ...ok, checkOut: ok.checkIn }, opts).dates);
  assert.ok(validateBooking({ ...ok, checkIn: "2026-12-01", checkOut: "2026-12-03" }, opts).dates);
  assert.ok(validateBooking({ ...ok, adults: 3 }, opts).adults);
  assert.ok(validateBooking({ ...ok, guest: { ...guest, email: "nope" } }, opts).email);
  assert.throws(() => createBooking({ ...ok, checkIn: "2027-03-11" }, opts), /Controlla/);
});

test("phone accepts common Italian formats, rejects junk", () => {
  const opts = { bookings: [], today: "2027-01-01" };
  const base = { roomId: "salvia", checkIn: "2027-03-12", checkOut: "2027-03-14", adults: 2 };
  for (const phone of ["+39 333 1234567", "333-123-4567", "+39.333.1234567", "(011) 1234567"]) {
    assert.equal(validateBooking({ ...base, guest: { ...guest, phone } }, opts).phone, undefined, phone);
  }
  for (const phone of ["", "abc", "12-34", "-------"]) {
    assert.ok(validateBooking({ ...base, guest: { ...guest, phone } }, opts).phone, phone);
  }
});

test("createBooking returns a confirmed web booking", () => {
  const b = createBooking({ roomId: "cipria", checkIn: "2027-05-02", checkOut: "2027-05-05", adults: 2, guest }, { bookings: [], today: "2027-01-01" });
  assert.match(b.code, /^BRG-[A-Z0-9]{4}$/);
  assert.equal(b.nights, 3);
  assert.equal(b.channel, "Sito web");
});
