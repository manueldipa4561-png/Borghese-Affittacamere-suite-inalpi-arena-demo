// Home: loader, hero ad arco, colori delle camere allo scroll, gallerie e contatori.
import { initSite, reducedMotion } from "./site.js";

const { gsap, ScrollTrigger, SplitText } = window;
// l'intro parte dall'hero: niente ripristino della posizione dopo un refresh
history.scrollRestoration = "manual";
if (!location.hash) scrollTo(0, 0);
const { lenis } = initSite();

const SLIDE_MS = 3400;
const ROOM_DOTS = { Salvia: "#7fa874", Turchese: "#2bb3c4", Cipria: "#e79a8c", Ardesia: "#3b4349" };

initQuickbook();
initQuotes();
const slideshow = initSlideshow();
// senza scroll animato le gallerie orizzontali tornano scrollabili a mano (vedi .no-pin nel CSS)
if (!gsap || !ScrollTrigger || reducedMotion) document.documentElement.classList.add("no-pin");

if (!gsap || !ScrollTrigger) {
  // ponytail: senza GSAP (CDN irraggiungibile) il sito resta statico ma completo
  document.querySelector(".loader")?.remove();
  document.querySelectorAll(".bars").forEach((el) => el.classList.add("is-in"));
  slideshow.start();
} else {
  gsap.registerPlugin(ScrollTrigger, ...(SplitText ? [SplitText] : []));
  if (reducedMotion) {
    document.querySelector(".loader")?.remove();
    document.querySelectorAll(".bars").forEach((el) => el.classList.add("is-in"));
    initRoomColors();
  } else {
    gsap.set("[data-hero-media]", { "--rise": 1 });
    runLoader().then(() => {
      introHero();
      slideshow.start();
    });
    heroScroll();
    splitReveals();
    manifestoWords();
    initRoomColors();
    roomParallax();
    detailsTrack();
    terrace();
    counters();
    staggers();
  }
  addEventListener("load", () => ScrollTrigger.refresh());
}

// ---------- loader
function runLoader() {
  const loader = document.querySelector(".loader");
  if (!loader) return Promise.resolve();
  lenis?.stop();
  const count = loader.querySelector("[data-loader-count]");
  const progress = { v: 0 };
  const fontsReady = Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
  return fontsReady.then(() => new Promise((resolve) => {
    gsap.timeline({ onComplete: () => { loader.remove(); lenis?.start(); } })
      .from(".loader__word", { yPercent: 60, opacity: 0, duration: 1.2, ease: "expo.out" }, 0)
      .to(progress, { v: 100, duration: 1.5, ease: "power2.inOut", onUpdate: () => (count.textContent = String(Math.round(progress.v)).padStart(2, "0")) }, 0)
      .fromTo(".loader__led", { scaleX: 0 }, { scaleX: 1, duration: 1.5, ease: "power2.inOut" }, 0)
      .add(resolve, "+=0.05")
      .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, "<");
  }));
}

// ---------- hero (la geometria dell'arco vive nel CSS, qui si animano solo --rise e --open)
function introHero() {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  tl.to("[data-hero-media]", { "--rise": 0, duration: 1.6 }, 0);
  if (SplitText) {
    const split = SplitText.create("[data-hero-word]", { type: "chars", mask: "chars" });
    tl.from(split.chars, { yPercent: 105, duration: 1.4, stagger: 0.045 }, 0.1);
  }
  tl.from(".hero__top > *, .hero__intro > *, .quickbook", { y: 24, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.5);
}

function heroScroll() {
  const hero = document.querySelector("[data-hero]");
  gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "+=110%", pin: true, scrub: 1 } })
    .fromTo(hero.querySelector("[data-hero-media]"), { "--open": 0 }, { "--open": 1, ease: "power2.inOut" }, 0)
    .to("[data-hero-word]", { yPercent: 40, opacity: 0, ease: "power1.in" }, 0)
    .to(".hero__top, .hero__foot", { y: -40, opacity: 0, ease: "power1.in" }, 0);
}

function initSlideshow() {
  const hero = document.querySelector("[data-hero]");
  const slides = [...hero.querySelectorAll("[data-hero-media] img")];
  const name = hero.querySelector("[data-hero-room]");
  const dot = hero.querySelector("[data-hero-dot]");
  let index = 0;
  let timer = null;
  let visible = true;
  const show = (i) => {
    slides[index].classList.remove("is-active");
    index = i % slides.length;
    const slide = slides[index];
    slide.classList.add("is-active");
    name.textContent = slide.dataset.room;
    dot.style.setProperty("--dot", ROOM_DOTS[slide.dataset.room]);
    hero.style.setProperty("--hero-tint", slide.dataset.tint);
  };
  const tick = () => visible && !document.hidden && show(index + 1);
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(hero);
  show(0);
  return { start: () => !reducedMotion && !timer && (timer = setInterval(tick, SLIDE_MS)) };
}

// ---------- reveals
function splitReveals() {
  if (!SplitText) return;
  document.querySelectorAll("[data-split]").forEach((el) => {
    const split = SplitText.create(el, { type: "lines", mask: "lines", autoSplit: true, onSplit: (self) =>
      gsap.from(self.lines, { yPercent: 110, duration: 1.3, stagger: 0.09, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } }),
    });
    return split;
  });
  document.querySelectorAll(".room__name").forEach((el) => {
    const split = SplitText.create(el, { type: "chars", mask: "chars" });
    gsap.from(split.chars, { yPercent: 100, duration: 1.2, stagger: 0.04, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });
}

function manifestoWords() {
  const text = document.querySelector("[data-words]");
  if (!text) return;
  const trigger = { trigger: text, start: "top 80%", end: "bottom 60%", scrub: true };
  if (SplitText) {
    const split = SplitText.create(text, { type: "words" });
    gsap.fromTo(split.words, { opacity: 0.14 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: trigger });
  }
  gsap.from(text.querySelectorAll(".pill"), { width: 0, ease: "power2.out", scrollTrigger: trigger });
}

function staggers() {
  document.querySelectorAll("[data-stagger]").forEach((list) =>
    gsap.from(list.children, { y: 28, opacity: 0, duration: 1, stagger: 0.05, ease: "expo.out", scrollTrigger: { trigger: list, start: "top 85%" } }),
  );
  document.querySelectorAll("[data-bars]").forEach((bars) =>
    ScrollTrigger.create({ trigger: bars, start: "top 80%", once: true, onEnter: () => bars.classList.add("is-in") }),
  );
}

// ---------- camere: lo sfondo segue la camera in vista
function initRoomColors() {
  const section = document.querySelector("[data-rooms]");
  const rooms = [...section.querySelectorAll(".room")];
  const paint = (bg, fg) =>
    reducedMotion ? (section.style.setProperty("--bg", bg), section.style.setProperty("--fg", fg))
      : gsap.to(section, { "--bg": bg, "--fg": fg, duration: 0.9, ease: "power2.out", overwrite: true });
  rooms.forEach((room) =>
    ScrollTrigger.create({
      trigger: room, start: "top 55%", end: "bottom 55%",
      onToggle: (self) => self.isActive && paint(room.dataset.roomColor, room.dataset.roomFg),
    }),
  );
  ScrollTrigger.create({ trigger: rooms[0], start: "top 55%", onLeaveBack: () => paint("#f3efe6", "#16181a") });
}

function roomParallax() {
  document.querySelectorAll("[data-parallax]").forEach((img) =>
    gsap.fromTo(img, { yPercent: 0 }, { yPercent: -14, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } }),
  );
  document.querySelectorAll(".room__sub:nth-child(3)").forEach((el) =>
    gsap.to(el, { y: -80, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }),
  );
}

// ---------- dettagli: scroll orizzontale su desktop, swipe nativo su mobile
function detailsTrack() {
  const mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", () => {
    const section = document.querySelector("[data-details]");
    const track = section.querySelector("[data-details-track]");
    const distance = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, {
      x: () => -distance(), ease: "none",
      scrollTrigger: { trigger: section, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
    });
  });
}

function terrace() {
  const section = document.querySelector("[data-terrace]");
  const media = section.querySelector("[data-terrace-media]");
  gsap.timeline({ scrollTrigger: { trigger: section, start: "top top", end: "+=90%", pin: true, scrub: 1 } })
    .fromTo(media, { clipPath: "inset(10% 12% round 14px)" }, { clipPath: "inset(0% 0% round 0px)", ease: "power2.inOut" }, 0)
    .fromTo(media.querySelector("img"), { scale: 1.25 }, { scale: 1, ease: "power2.inOut" }, 0)
    .from(section.querySelectorAll(".terrace__copy > *"), { y: 40, opacity: 0, stagger: 0.08, ease: "power2.out" }, 0.45);
}

function counters() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const state = { v: 0 };
    gsap.to(state, {
      v: target, duration: 2, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
      onUpdate: () => (el.textContent = Math.round(state.v)),
    });
  });
  const route = document.querySelector("[data-route]");
  if (route) {
    const len = route.getTotalLength();
    gsap.fromTo(route, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut", scrollTrigger: { trigger: route, start: "top 75%" } });
  }
}

// ---------- recensioni: marquee infinito (duplica le card, nascoste ai lettori di schermo)
function initQuotes() {
  const track = document.querySelector("[data-quotes]");
  if (!track || reducedMotion) return;
  [...track.children].forEach((card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.append(clone);
  });
  track.classList.add("is-running");
}

// ---------- form rapido: date minime coerenti
function initQuickbook() {
  const form = document.querySelector(".quickbook");
  if (!form) return;
  const [arrive, depart] = form.querySelectorAll('input[type="date"]');
  const d = new Date();
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = iso(d);
  arrive.min = today;
  depart.min = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  arrive.addEventListener("change", () => {
    if (!arrive.value) return;
    const [y, m, day] = arrive.value.split("-").map(Number);
    const next = iso(new Date(y, m - 1, day + 1));
    depart.min = next;
    if (!depart.value || depart.value < next) depart.value = next;
  });
}
