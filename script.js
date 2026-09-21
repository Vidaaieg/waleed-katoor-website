/* =========================================================
   CONFIG: booking automation
   Paste your automation webhook URL here (n8n, Make, Zapier…).
   Each booking is sent as a JSON POST, e.g.:
   { name, email, phone, goal, notes, date: "2026-09-24", time: "09:00",
     start: "2026-09-24T09:00:00+03:00", durationMin: 30,
     timezone: "Asia/Riyadh", source, createdAt }
   ========================================================= */
const BOOKING_CONFIG = {
  webhookUrl: "",                       // ← e.g. "https://your-n8n.app/webhook/book-call"
  timezone: "Asia/Riyadh",
  utcOffset: "+03:00",
  durationMin: 30,
  daysAhead: 45,                        // how far ahead people can book
  closedWeekdays: [5],                  // 0 = Sun … 6 = Sat (5 = Friday)
  slots: ["07:00", "08:00", "09:00", "12:00", "13:00", "17:00", "18:00", "19:00", "20:00"],
  minNoticeHours: 3
};

(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("anim-ready");

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const mqMobile = matchMedia("(max-width: 900px)");
  const hasIO = "IntersectionObserver" in window;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- Split headings into masked words ---------- */
  function splitWords(el) {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(" "); return; }
            const w = document.createElement("span");
            const inner = document.createElement("span");
            w.className = "w";
            inner.className = "w__in";
            inner.style.setProperty("--i", i++);
            inner.textContent = part;
            w.append(inner);
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
  }
  $$("[data-split], .quote").forEach(splitWords);

  /* ---------- Stagger groups ---------- */
  $$("[data-stagger]").forEach(group => {
    [...group.children].forEach((child, idx) => {
      const target = child.matches("[data-reveal]") ? child : child.querySelector("[data-reveal]");
      if (target && !target.style.getPropertyValue("--d")) target.style.setProperty("--d", idx * 90);
    });
  });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$("[data-reveal], [data-split]").filter(el => !el.closest(".hero"));
  function startReveals() {
    if (reduceMotion || !hasIO) {
      revealEls.forEach(el => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------- Preloader → hero intro ---------- */
  const preloader = $(".preloader");
  function heroIn() {
    root.classList.add("is-loaded");
    startReveals();
  }
  if (preloader && !reduceMotion) {
    const countEl = $("[data-preloader-count]");
    const barEl = $("[data-preloader-bar]");
    const heroImg = $(".hero__media img");
    const t0 = performance.now();
    const minTime = 1200;
    const ready = () => heroImg.complete || performance.now() - t0 > 3500;
    const tick = now => {
      const p = Math.min((now - t0) / minTime, 1);
      const value = Math.floor(p * (ready() ? 100 : 88));
      countEl.textContent = value;
      barEl.style.transform = `scaleX(${value / 100})`;
      if (value >= 100) {
        preloader.classList.add("is-done");
        setTimeout(heroIn, 350);
        setTimeout(() => preloader.remove(), 1300);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else {
    if (preloader) preloader.remove();
    heroIn();
  }

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    const end = Number(el.dataset.count);
    const duration = 1800;
    const start = performance.now();
    const step = now => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = Math.round(end * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const counters = $$("[data-count]");
  if (!reduceMotion && hasIO) {
    counters.forEach(el => (el.textContent = "0"));
    const cio = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        cio.unobserve(entry.target);
        countUp(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(el => cio.observe(el));
  }

  /* ---------- Seamless marquees ---------- */
  $$("[data-marquee] .marquee__track").forEach(track => {
    [...track.children].forEach(node => {
      const clone = node.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      if (clone.tagName === "A") clone.tabIndex = -1;
      track.append(clone);
    });
  });

  /* ---------- Nav: menu, scrollspy ---------- */
  const nav = $("[data-nav]");
  const toggle = $("[data-toggle]");
  const menu = $("[data-menu]");
  const setMenu = open => {
    menu.classList.toggle("is-open", open);
    nav.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
  $$("a", menu).forEach(a => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", e => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
  });

  const spyLinks = $$("[data-spy]");
  if (hasIO) {
    const byId = new Map(spyLinks.map(a => [a.getAttribute("href").slice(1), a]));
    const sio = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const link = byId.get(entry.target.id);
        spyLinks.forEach(l => l.classList.toggle("is-active", l === link));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(s => sio.observe(s));
  }

  /* ---------- Scroll-driven effects ---------- */
  const progress = $("[data-progress]");
  const ring = $("[data-totop-ring]");
  const totop = $("[data-totop]");
  const mcta = $("[data-mcta]");
  const hero = $(".hero");
  const book = $("#book");
  const outline = $("[data-hero-outline]");
  const parallax = $$("[data-parallax]");
  const stepsEl = $("[data-steps]");
  const stepItems = $$("[data-step]");
  const RING = 2 * Math.PI * 24;
  let ticking = false;

  function update() {
    ticking = false;
    const y = scrollY;
    const vh = innerHeight;
    const max = root.scrollHeight - vh;
    const p = max > 0 ? clamp(y / max, 0, 1) : 0;

    progress.style.transform = `scaleX(${p})`;
    ring.style.strokeDashoffset = RING * (1 - p);
    totop.classList.toggle("is-visible", y > vh);

    if (!menu.classList.contains("is-open")) nav.classList.toggle("is-scrolled", y > 24);

    // Mobile CTA: visible after the hero, hidden while the booking section is on screen
    const b = book.getBoundingClientRect();
    mcta.classList.toggle("is-visible", y > hero.offsetHeight * 0.7 && !(b.top < vh && b.bottom > 0));

    if (!reduceMotion) {
      if (outline && y < vh * 1.5) outline.style.translate = `${(-y * 0.3).toFixed(1)}px 0`;
      parallax.forEach(img => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const offset = (r.top + r.height / 2 - vh / 2) * Number(img.dataset.parallax);
        img.style.translate = `0 ${offset.toFixed(1)}px`;
      });
    }

    if (stepsEl) {
      const r = stepsEl.getBoundingClientRect();
      const prog = reduceMotion ? 1 : mqMobile.matches
        ? clamp((vh * 0.65 - r.top) / r.height, 0, 1)
        : clamp((vh * 0.85 - r.top) / (vh * 0.4), 0, 1);
      stepsEl.style.setProperty("--progress", prog.toFixed(3));
      stepItems.forEach((s, i) => s.classList.toggle("is-active", prog >= i / (stepItems.length - 1) - 0.02));
    }
  }
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  mqMobile.addEventListener("change", e => { if (!e.matches) setMenu(false); onScroll(); });
  update();

  /* ---------- Pointer effects (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    // 3D tilt on the hero photo
    const tilt = $("[data-tilt]");
    hero.addEventListener("pointermove", e => {
      const r = tilt.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / r.width - 0.5, -0.6, 0.6);
      const y = clamp((e.clientY - r.top) / r.height - 0.5, -0.6, 0.6);
      tilt.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
      tilt.style.setProperty("--rx", `${(-y * 12).toFixed(2)}deg`);
    });
    hero.addEventListener("pointerleave", () => {
      tilt.style.setProperty("--ry", "0deg");
      tilt.style.setProperty("--rx", "0deg");
    });

    // Magnetic buttons
    $$(".btn--magnetic").forEach(btn => {
      btn.addEventListener("pointermove", e => {
        const r = btn.getBoundingClientRect();
        btn.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`;
      });
      btn.addEventListener("pointerleave", () => (btn.style.translate = ""));
    });
  }
  if (finePointer) {
    // Spotlight that follows the cursor on cards
    addEventListener("pointermove", e => {
      const card = e.target.closest && e.target.closest(".spot");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ---------- Rotating quotes ---------- */
  const quotesEl = $("[data-quotes]");
  if (quotesEl) {
    const quotes = $$(".quote", quotesEl);
    const bars = $$(".qbar", quotesEl);
    let current = 0;
    const show = i => {
      quotes[current].classList.remove("is-active");
      bars[current].classList.remove("is-active");
      current = (i + quotes.length) % quotes.length;
      quotes[current].classList.add("is-active");
      void bars[current].offsetWidth;          // restart the progress animation
      bars[current].classList.add("is-active");
    };
    bars.forEach((bar, i) => {
      bar.addEventListener("click", () => show(i));
      bar.firstElementChild.addEventListener("animationend", () => { if (i === current) show(current + 1); });
    });

    if (reduceMotion) {
      quotesEl.classList.add("is-static");
    } else if (hasIO) {
      // Hold the first quote back so it animates in when the band scrolls into view
      quotes[0].classList.remove("is-active");
      bars[0].classList.remove("is-active");
      quotesEl.classList.add("is-paused");
      let started = false;
      new IntersectionObserver(([entry]) => {
        quotesEl.classList.toggle("is-paused", !entry.isIntersecting);
        if (entry.isIntersecting && !started) { started = true; show(0); }
      }, { threshold: 0.35 }).observe(quotesEl);
    }
  }

  /* ---------- FAQ accordion with smooth height ---------- */
  const faqItems = $$(".faq__item");
  function setFaq(item, open) {
    const body = $(".faq__body", item);
    item.classList.toggle("is-open", open);
    if (reduceMotion || !body.animate) { item.open = open; return; }
    body.getAnimations().forEach(a => a.cancel());
    if (open) {
      item.open = true;
      body.animate({ height: ["0px", `${body.scrollHeight}px`], opacity: [0, 1] },
        { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" });
    } else {
      const anim = body.animate({ height: [`${body.scrollHeight}px`, "0px"], opacity: [1, 0] },
        { duration: 380, easing: "cubic-bezier(.65,0,.35,1)" });
      anim.onfinish = () => { if (!item.classList.contains("is-open")) item.open = false; };
    }
  }
  faqItems.forEach(item => {
    $("summary", item).addEventListener("click", e => {
      e.preventDefault();
      const open = !item.classList.contains("is-open");
      if (open) faqItems.forEach(other => { if (other !== item && other.classList.contains("is-open")) setFaq(other, false); });
      setFaq(item, open);
    });
  });

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- Booking calendar ---------- */
  (function booker() {
    const wrap = $("[data-booker]");
    if (!wrap) return;
    const q = sel => wrap.querySelector(sel);
    const views = { pick: q('[data-view="pick"]'), form: q('[data-view="form"]'), done: q('[data-view="done"]') };
    const stepsNav = $$("[data-bstep]", wrap);
    const grid = q("[data-cal-grid]");
    const title = q("[data-cal-title]");
    const prev = q("[data-cal-prev]");
    const next = q("[data-cal-next]");
    const slotsEl = q("[data-slots]");
    const slotsTitle = q("[data-slots-title]");
    const summary = q("[data-summary]");
    const form = q("[data-book-form]");
    const submit = q("[data-submit]");
    const msg = q("[data-msg]");
    const doneText = q("[data-done-text]");
    const gcal = q("[data-gcal]");

    const pad = n => String(n).padStart(2, "0");
    const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const sameDay = (a, b) => Boolean(a && b) && iso(a) === iso(b);
    const offsetH = parseInt(BOOKING_CONFIG.utcOffset, 10);
    const longDate = d => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const label = () => `${longDate(selDate)} at ${selTime}`;

    // "Now" in the business timezone, as plain numbers
    const now = new Intl.DateTimeFormat("en-CA", {
      timeZone: BOOKING_CONFIG.timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date()).reduce((o, part) => ((o[part.type] = Number(part.value)), o), {});
    const today = new Date(now.year, now.month - 1, now.day);
    const lastDay = new Date(today);
    lastDay.setDate(lastDay.getDate() + BOOKING_CONFIG.daysAhead);

    let view = new Date(today.getFullYear(), today.getMonth(), 1);
    let selDate = null;
    let selTime = null;

    const slotsFor = date => {
      if (!sameDay(date, today)) return BOOKING_CONFIG.slots;
      const cutoff = (now.hour + BOOKING_CONFIG.minNoticeHours) * 60 + now.minute;
      return BOOKING_CONFIG.slots.filter(t => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m >= cutoff;
      });
    };
    const bookable = date =>
      date >= today && date <= lastDay &&
      !BOOKING_CONFIG.closedWeekdays.includes(date.getDay()) &&
      slotsFor(date).length > 0;

    function go(name) {
      Object.entries(views).forEach(([key, el]) => (el.hidden = key !== name));
      const idx = ["pick", "form", "done"].indexOf(name);
      stepsNav.forEach((s, i) => {
        s.classList.toggle("is-active", i === idx);
        s.classList.toggle("is-done", i < idx);
      });
    }

    function renderCalendar() {
      title.textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      prev.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
      next.disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > lastDay;
      grid.textContent = "";
      const lead = view.getDay();
      const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (let i = 0; i < lead; i++) grid.append(document.createElement("span"));
      for (let d = 1; d <= days; d++) {
        const date = new Date(view.getFullYear(), view.getMonth(), d);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cal__day";
        btn.textContent = d;
        btn.dataset.date = iso(date);
        btn.style.setProperty("--i", lead + d);
        btn.disabled = !bookable(date);
        btn.setAttribute("aria-label", longDate(date));
        if (sameDay(date, today)) btn.classList.add("is-today");
        if (sameDay(date, selDate)) btn.classList.add("is-selected");
        btn.addEventListener("click", () => pickDate(date));
        grid.append(btn);
      }
    }

    function pickDate(date) {
      selDate = date;
      selTime = null;
      $$(".cal__day", grid).forEach(b => b.classList.toggle("is-selected", b.dataset.date === iso(date)));
      slotsTitle.textContent = date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      slotsEl.textContent = "";
      slotsFor(date).forEach((t, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "slot";
        b.textContent = t;
        b.style.setProperty("--i", i);
        b.addEventListener("click", () => pickTime(t, b));
        slotsEl.append(b);
      });
    }

    function pickTime(t, btn) {
      selTime = t;
      $$(".slot", slotsEl).forEach(b => b.classList.toggle("is-selected", b === btn));
      summary.hidden = false;
      summary.querySelector("span").textContent = `${label()} (Riyadh time)`;
      setTimeout(() => {
        go("form");
        q("[data-autofocus]").focus({ preventScroll: true });
      }, 280);
    }

    function resetSlots() {
      slotsTitle.textContent = "Select a date";
      slotsEl.innerHTML = '<p class="slots__empty">Available times will appear here.</p>';
    }

    function gcalUrl() {
      const [h, m] = selTime.split(":").map(Number);
      const start = new Date(Date.UTC(selDate.getFullYear(), selDate.getMonth(), selDate.getDate(), h - offsetH, m));
      const end = new Date(start.getTime() + BOOKING_CONFIG.durationMin * 60000);
      const fmt = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      return "https://calendar.google.com/calendar/render?" + new URLSearchParams({
        action: "TEMPLATE",
        text: "Discovery Call with Waleed Katoor",
        dates: `${fmt(start)}/${fmt(end)}`,
        details: `Free ${BOOKING_CONFIG.durationMin}-minute discovery call with Waleed Katoor.`,
        ctz: BOOKING_CONFIG.timezone
      });
    }

    prev.addEventListener("click", () => { view.setMonth(view.getMonth() - 1); renderCalendar(); });
    next.addEventListener("click", () => { view.setMonth(view.getMonth() + 1); renderCalendar(); });
    q("[data-back]").addEventListener("click", () => go("pick"));
    q("[data-restart]").addEventListener("click", () => {
      selDate = selTime = null;
      summary.hidden = true;
      view = new Date(today.getFullYear(), today.getMonth(), 1);
      resetSlots();
      renderCalendar();
      go("pick");
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      msg.className = "booker__msg";
      msg.textContent = "";
      const inputs = $$("input", form);
      const invalid = inputs.filter(i => i.required && !i.checkValidity());
      inputs.forEach(i => i.classList.toggle("is-invalid", invalid.includes(i)));
      if (invalid.length) {
        msg.textContent = "Please add your name, a valid email and your WhatsApp number.";
        msg.classList.add("is-err");
        invalid[0].focus();
        return;
      }
      if (!selDate || !selTime) { go("pick"); return; }

      const data = Object.fromEntries(new FormData(form));
      const payload = {
        ...data,
        date: iso(selDate),
        time: selTime,
        start: `${iso(selDate)}T${selTime}:00${BOOKING_CONFIG.utcOffset}`,
        durationMin: BOOKING_CONFIG.durationMin,
        timezone: BOOKING_CONFIG.timezone,
        source: location.href,
        createdAt: new Date().toISOString()
      };

      submit.disabled = true;
      submit.querySelector("span").textContent = "Booking…";
      try {
        if (BOOKING_CONFIG.webhookUrl) {
          const res = await fetch(BOOKING_CONFIG.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } else {
          console.info("[booking] No webhookUrl set yet. Payload that would be sent:", payload);
        }
        doneText.textContent = `Your call is set for ${label()} (Riyadh time). Details will be sent to ${data.email}.`;
        gcal.href = gcalUrl();
        form.reset();
        go("done");
      } catch (err) {
        msg.textContent = "Something went wrong. Please try again, or message me on Instagram.";
        msg.classList.add("is-err");
      } finally {
        submit.disabled = false;
        submit.querySelector("span").textContent = "Confirm Booking";
      }
    });

    renderCalendar();
    go("pick");
  })();
})();
