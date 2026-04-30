const yearTargets = document.querySelectorAll("[data-year]");
const documentLanguage = document.documentElement.lang?.toLowerCase() || "fr-ca";
const isEnglishDocument = documentLanguage.startsWith("en");

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
};

const publicI18n = isEnglishDocument
  ? {
    locale: "en-CA",
    navOpen: "Open navigation",
    navClose: "Close navigation",
    navMenu: "Menu",
    navCloseLabel: "Close",
    intakeSubjectPrefix: "NEXURADATA inquiry",
    fieldName: "Name",
    fieldEmail: "Email",
    fieldPhone: "Phone",
    fieldSupport: "Support",
    fieldUrgency: "Urgency",
    fieldDescription: "Issue description",
    intakeRequired: "Complete the required fields before opening a case.",
    intakeBusy: "Opening...",
    intakeOpening: "Opening your case...",
    intakeOpenedSent: (caseId) => `Case ${caseId} opened. The access code was sent to the client.`,
    intakeOpenedQueued: (caseId) => `Case ${caseId} opened. The lab can now review the request.`,
    intakeFallback: "The backend is unavailable. Your email application is opening with a prefilled message.",
    intakeError: "The request could not be processed.",
    intakeOffline: "The backend is unreachable. Your email application is opening with a prefilled message.",
    statusRequired: "Enter a valid case number and access code.",
    statusNotFound: "No case matched this access. Check the credentials provided by NEXURADATA or request an update.",
    statusFound: "Case found.",
    statusBusy: "Searching...",
    statusSearching: "Searching for your case...",
    statusOffline: "The status portal is currently unavailable.",
    paymentKindDeposit: "Deposit",
    paymentKindFinal: "Balance",
    paymentKindCustom: "Payment",
    paymentStatusPaid: "Paid",
    paymentStatusExpired: "Expired",
    paymentStatusFailed: "Retry needed",
    paymentStatusOpen: "Open",
    paymentConfirmedOn: (timestamp) => `Payment confirmed on ${timestamp}`,
    paymentAvailableUntil: (timestamp) => `Link available until ${timestamp}`,
    paymentSentOn: (timestamp) => `Link sent on ${timestamp}`,
    paymentReference: (reference) => `Reference ${reference}`,
    paymentAction: "Pay online",
    demoCaseOne: {
      status: "Assessment in progress",
      updatedAt: "April 4, 2026 11:40 AM",
      support: "USB external drive",
      nextStep: "Initial assessment update",
      summary: "The support was received and logged. Initial assessment is in progress before the quote or next steps are sent.",
      steps: [
        { title: "Case received", note: "Support received and logged.", state: "complete" },
        { title: "Assessment in progress", note: "Initial review and case qualification.", state: "active" },
        { title: "Quote", note: "To be issued after assessment.", state: "pending" },
        { title: "Recovery work", note: "Starts after authorization.", state: "pending" }
      ],
      payments: []
    },
    demoCaseTwo: {
      status: "Quote sent",
      updatedAt: "April 4, 2026 10:15 AM",
      support: "RAID / NAS",
      nextStep: "Awaiting client authorization",
      summary: "Initial assessment is complete. The quote and intervention framework were sent to the client for approval.",
      steps: [
        { title: "Case received", note: "Support received and logged.", state: "complete" },
        { title: "Assessment complete", note: "Initial technical review completed.", state: "complete" },
        { title: "Quote sent", note: "Awaiting acceptance.", state: "active" },
        { title: "Recovery work", note: "Begins after authorization.", state: "pending" }
      ],
      payments: [
        {
          paymentRequestId: "PAY-20260404-A1B2C3",
          paymentKind: "deposit",
          status: "open",
          label: "Intervention deposit",
          description: "Opens the recovery work once the intervention is authorized.",
          amountCents: 65000,
          amountFormatted: "$650.00",
          currency: "cad",
          checkoutUrl: "https://checkout.stripe.com/pay/demo",
          createdAt: "2026-04-04T14:10:00.000Z",
          sentAt: "2026-04-04T14:11:00.000Z",
          paidAt: "",
          expiresAt: "2026-04-11T14:10:00.000Z"
        }
      ]
    }
  }
  : {
    locale: "fr-CA",
    navOpen: "Ouvrir la navigation",
    navClose: "Fermer la navigation",
    navMenu: "Menu",
    navCloseLabel: "Fermer",
    intakeSubjectPrefix: "Demande NEXURADATA",
    fieldName: "Nom",
    fieldEmail: "Courriel",
    fieldPhone: "Téléphone",
    fieldSupport: "Support",
    fieldUrgency: "Urgence",
    fieldDescription: "Description du problème",
    intakeRequired: "Complétez les champs requis avant d'ouvrir un dossier.",
    intakeBusy: "Ouverture...",
    intakeOpening: "Ouverture du dossier en cours...",
    intakeOpenedSent: (caseId) => `Dossier ${caseId} ouvert. Le code d'accès a été envoyé au client.`,
    intakeOpenedQueued: (caseId) => `Dossier ${caseId} ouvert. Le laboratoire peut maintenant qualifier le cas.`,
    intakeFallback: "Le backend n'est pas disponible. Votre application courriel s'ouvre avec un message prérempli.",
    intakeError: "La demande n'a pas pu être traitée.",
    intakeOffline: "Le backend n'est pas joignable. Votre application courriel s'ouvre avec un message prérempli.",
    statusRequired: "Entrez un numéro de dossier et un code d'accès valides.",
    statusNotFound: "Aucun dossier n'a été trouvé avec cet accès. Vérifiez les identifiants transmis par NEXURADATA ou demandez une mise à jour.",
    statusFound: "Dossier trouvé.",
    statusBusy: "Recherche...",
    statusSearching: "Recherche du dossier en cours...",
    statusOffline: "Le portail de suivi n'est pas joignable pour le moment.",
    paymentKindDeposit: "Acompte",
    paymentKindFinal: "Solde",
    paymentKindCustom: "Paiement",
    paymentStatusPaid: "Payé",
    paymentStatusExpired: "Expiré",
    paymentStatusFailed: "À reprendre",
    paymentStatusOpen: "Ouvert",
    paymentConfirmedOn: (timestamp) => `Paiement confirmé le ${timestamp}`,
    paymentAvailableUntil: (timestamp) => `Lien disponible jusqu'au ${timestamp}`,
    paymentSentOn: (timestamp) => `Lien transmis le ${timestamp}`,
    paymentReference: (reference) => `Référence ${reference}`,
    paymentAction: "Régler en ligne",
    demoCaseOne: {
      status: "Évaluation en cours",
      updatedAt: "4 avril 2026 à 11 h 40",
      support: "Disque externe USB",
      nextStep: "Communication de l'évaluation initiale",
      summary: "Le support a été reçu et enregistré. L'évaluation initiale est en cours avant l'envoi de la soumission ou des prochaines étapes.",
      steps: [
        { title: "Dossier reçu", note: "Support reçu et pris en charge.", state: "complete" },
        { title: "Évaluation en cours", note: "Lecture initiale et qualification du cas.", state: "active" },
        { title: "Soumission", note: "À transmettre après évaluation.", state: "pending" },
        { title: "Traitement", note: "Commence après autorisation.", state: "pending" }
      ],
      payments: []
    },
    demoCaseTwo: {
      status: "Soumission envoyée",
      updatedAt: "4 avril 2026 à 10 h 15",
      support: "RAID / NAS",
      nextStep: "Attente de l'autorisation client",
      summary: "L'évaluation initiale a été complétée. La soumission et le cadre d'intervention ont été transmis au client pour acceptation.",
      steps: [
        { title: "Dossier reçu", note: "Support reçu et enregistré.", state: "complete" },
        { title: "Évaluation", note: "Analyse initiale terminée.", state: "complete" },
        { title: "Soumission envoyée", note: "En attente d'acceptation.", state: "active" },
        { title: "Traitement", note: "Débute après autorisation.", state: "pending" }
      ],
      payments: [
        {
          paymentRequestId: "PAY-20260404-A1B2C3",
          paymentKind: "deposit",
          status: "open",
          label: "Acompte d'intervention",
          description: "Ouverture du traitement après autorisation et prise en charge du dossier.",
          amountCents: 65000,
          amountFormatted: "650,00 $",
          currency: "cad",
          checkoutUrl: "https://checkout.stripe.com/pay/demo",
          createdAt: "2026-04-04T14:10:00.000Z",
          sentAt: "2026-04-04T14:11:00.000Z",
          paidAt: "",
          expiresAt: "2026-04-11T14:10:00.000Z"
        }
      ]
    }
  };

if (yearTargets.length) {
  const currentYear = new Date().getFullYear();
  yearTargets.forEach((node) => { node.textContent = currentYear; });
}

const revealElements = document.querySelectorAll("[data-reveal]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const initializeMobileNav = () => {
  const navbars = document.querySelectorAll(".navbar, .site-nav");

  if (navbars.length === 0) {
    return;
  }

  const mobileNavQuery = window.matchMedia("(max-width: 720px)");

  navbars.forEach((navbar, index) => {
    const navLinks = navbar.querySelector(".nav-links");

    if (!navLinks) {
      return;
    }

    const navId = navLinks.id || `site-navigation-${index + 1}`;
    navLinks.id = navId;
    navbar.classList.add("nav-enhanced");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-toggle";
    toggle.setAttribute("aria-controls", navId);

    const setOpen = (open) => {
      const isOpen = Boolean(open) && mobileNavQuery.matches;
      navbar.classList.toggle("is-nav-open", isOpen);
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.setAttribute("aria-label", isOpen ? publicI18n.navClose : publicI18n.navOpen);
      toggle.textContent = isOpen ? publicI18n.navCloseLabel : publicI18n.navMenu;
    };

    setOpen(false);
    navbar.insertBefore(toggle, navLinks);

    toggle.addEventListener("click", () => {
      setOpen(!navbar.classList.contains("is-nav-open"));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (mobileNavQuery.matches) {
          setOpen(false);
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (!mobileNavQuery.matches || !navbar.classList.contains("is-nav-open")) {
        return;
      }

      if (navbar.contains(event.target)) {
        return;
      }

      setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });

    const syncNavState = (event) => {
      if (!event.matches) {
        setOpen(false);
      }
    };

    if (typeof mobileNavQuery.addEventListener === "function") {
      mobileNavQuery.addEventListener("change", syncNavState);
    } else if (typeof mobileNavQuery.addListener === "function") {
      mobileNavQuery.addListener(syncNavState);
    }
  });
};

initializeMobileNav();

// Inject the sticky contact bar on every page that doesn't already have one.
// Provides one-tap call / WhatsApp / chat from anywhere on the site.
const ensureStickyBar = () => {
  if (document.querySelector(".sticky-bar")) return;
  if (document.body.dataset.noStickyBar === "true") return;
  const labels = isEnglishDocument
    ? { call: "Call", wa: "WhatsApp", bot: "AI assistant", aria: "Quick contacts", callAria: "Call the lab", waAria: "Chat on WhatsApp", botAria: "Open the AI assistant" }
    : { call: "Appeler", wa: "WhatsApp", bot: "Assistant IA", aria: "Contacts rapides", callAria: "Appeler le laboratoire", waAria: "Discuter sur WhatsApp", botAria: "Ouvrir l'assistant IA" };
  const waText = isEnglishDocument
    ? "Hi%2C%20I%20need%20an%20assessment%20for%20"
    : "Bonjour%2C%20j%27ai%20besoin%20d%27une%20%C3%A9valuation%20pour%20";
  const bar = document.createElement("div");
  bar.className = "sticky-bar";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", labels.aria);
  bar.innerHTML = `
    <a class="sticky-bar-item sticky-bar-item--call" href="tel:+14388130592" aria-label="${labels.callAria}">
      <span class="sticky-call-dot" aria-hidden="true"></span>
      <span class="sticky-bar-label">${labels.call}</span>
    </a>
    <a class="sticky-bar-item sticky-bar-item--wa" href="https://wa.me/14388130592?text=${waText}" target="_blank" rel="noopener" aria-label="${labels.waAria}">
      <span class="sticky-bar-label">${labels.wa}</span>
    </a>
    <button type="button" class="sticky-bar-item sticky-bar-item--bot" data-open-chat aria-label="${labels.botAria}">
      <span class="sticky-bar-label">${labels.bot}</span>
    </button>`;
  document.body.appendChild(bar);
};

ensureStickyBar();

/* ── Conversion tracking (lightweight, no third-party) ─────────────
 * Loi 25: nothing fires before explicit consent. NxdConsent.get()
 * returns null when the user has not yet decided, and an object with
 * { analytics: bool } once they have. We treat null as "decline".
 * ──────────────────────────────────────────────────────────────── */
const hasAnalyticsConsent = () => {
  try {
    return !!(window.NxdConsent && window.NxdConsent.get() && window.NxdConsent.get().analytics);
  } catch (_) {
    return false;
  }
};

const trackConversion = (event, data = {}) => {
  if (!hasAnalyticsConsent()) return;
  try {
    const payload = { event, ts: Date.now(), path: location.pathname, ...data };
    if (typeof window.gtag === "function") {
      window.gtag("event", event, data);
    }
    if (typeof window.plausible === "function") {
      window.plausible(event, { props: data });
    }
    if ("sendBeacon" in navigator) {
      try {
        navigator.sendBeacon("/api/track", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      } catch (_) { /* noop */ }
    }
  } catch (_) { /* never break the page */ }
};

document.addEventListener("click", (e) => {
  const tap = e.target.closest("[data-track], a[href^='tel:'], a[href*='wa.me']");
  if (!tap) return;
  const label = tap.dataset.track
    || (tap.getAttribute("href")?.startsWith("tel:") ? "call-link" : "whatsapp-link");
  trackConversion(label, { label });
}, { passive: true });

document.addEventListener("submit", (e) => {
  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;
  const name = form.dataset.intakeForm !== undefined ? "intake-submit"
    : form.dataset.newsletter !== undefined ? "newsletter-submit"
      : form.id || "form-submit";
  trackConversion(name);
}, { passive: true, capture: true });

const showAllReveals = () => {
  revealElements.forEach((element) => element.classList.add("is-visible"));
};

if (!("IntersectionObserver" in window) || prefersReducedMotion.matches) {
  showAllReveals();
} else if (revealElements.length > 0) {
  const observer = new IntersectionObserver(
    (entries, activeObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        activeObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  revealElements.forEach((element) => observer.observe(element));
}

/* ── Trust-bar stats: count-up on first viewport entry ─────────────
   Reads the existing strong text (e.g. "2 847", "96,4 %", "4,2 j"),
   animates 0 → final, preserves separators and any trailing unit.
   Skipped when reduced-motion is preferred or IO is missing. */
const animateCountUp = (el, finalText) => {
  const match = finalText.match(/^([\d \u00a0,.]+)(.*)$/);
  if (!match) {
    el.classList.add("is-counted");
    return;
  }
  const [, numPart, suffix] = match;
  const decimalSep = numPart.includes(",") ? "," : (numPart.includes(".") ? "." : "");
  const cleanNum = parseFloat(numPart.replace(/[ \u00a0]/g, "").replace(",", "."));
  if (!Number.isFinite(cleanNum)) {
    el.classList.add("is-counted");
    return;
  }
  const decimals = decimalSep && numPart.split(decimalSep)[1] ? numPart.split(decimalSep)[1].length : 0;
  const duration = 1100;
  const start = performance.now();
  const format = (value) => {
    const fixed = value.toFixed(decimals);
    const [intPart, decPart] = fixed.split(".");
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
    return decimals > 0 ? `${grouped}${decimalSep}${decPart}${suffix}` : `${grouped}${suffix}`;
  };
  el.classList.add("is-counted");
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(cleanNum * eased);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = finalText;
  };
  requestAnimationFrame(step);
};

const trustStats = document.querySelectorAll(".trust-stat");
if (trustStats.length > 0) {
  if (!("IntersectionObserver" in window) || prefersReducedMotion.matches) {
    trustStats.forEach((stat) => stat.classList.add("is-counted"));
  } else {
    const statObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const stat = entry.target;
        const strong = stat.querySelector("strong");
        if (strong) {
          const finalText = strong.textContent.trim();
          // Only count purely numeric stats; non-numeric ones (e.g. "CFE") just fade in.
          if (/^[\d]/.test(finalText)) {
            strong.textContent = "0";
            requestAnimationFrame(() => animateCountUp(strong, finalText));
          } else {
            stat.classList.add("is-counted");
          }
        }
        obs.unobserve(stat);
      });
    }, { threshold: 0.4 });
    trustStats.forEach((stat) => statObserver.observe(stat));
  }
}

/* ── Live lab-status indicator (open/closed badge) ───────────────── */
// Reads current time in Montreal (America/Toronto), shows a green dot when
// the lab is within opening hours (9-18 every day per JSON-LD), otherwise
// a muted dot with the next opening hint. Progressive enhancement only —
// the static markup in HTML serves as the no-JS fallback.
const updateLabStatus = () => {
  const nodes = document.querySelectorAll("[data-lab-status]");
  if (!nodes.length) return;
  let hour = new Date().getHours();
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      hour: "2-digit",
      hour12: false,
    });
    hour = parseInt(fmt.format(new Date()), 10);
    if (Number.isNaN(hour)) hour = new Date().getHours();
  } catch (_e) {
    /* fall back to local time */
  }
  const isOpen = hour >= 9 && hour < 18;
  const en = isEnglishDocument;
  const labels = isOpen
    ? (en ? "Lab open · response under 1 h" : "Labo ouvert · réponse < 1 h")
    : (en ? "Lab closed · reply tomorrow morning" : "Labo fermé · réponse demain matin");
  nodes.forEach((node) => {
    node.classList.toggle("is-open", isOpen);
    node.classList.toggle("is-closed", !isOpen);
    const textNode = node.querySelector("[data-lab-status-text]") || node;
    textNode.textContent = labels;
  });
};
updateLabStatus();
// Refresh hourly so a session that crosses 18:00 updates without reload.
setInterval(updateLabStatus, 60 * 60 * 1000);

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const href = anchor.getAttribute("href");

    if (!href || href === "#") {
      return;
    }

    const target = document.querySelector(href);

    if (!target) {
      return;
    }

    event.preventDefault();

    target.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  });
});

const paymentFeedback = document.querySelector("[data-payment-feedback]");

if (paymentFeedback) {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get("caseId") || "";
  const paymentRequestId = params.get("paymentRequestId") || "";
  const caseTarget = paymentFeedback.querySelector("[data-payment-feedback-case]");
  const requestTarget = paymentFeedback.querySelector("[data-payment-feedback-request]");
  const followLink = paymentFeedback.querySelector("[data-payment-feedback-follow]");
  const mailLink = paymentFeedback.querySelector("[data-payment-feedback-mail]");

  if (caseTarget) {
    caseTarget.textContent = caseId || "Non précisé";
  }

  if (requestTarget) {
    requestTarget.textContent = paymentRequestId || "Non précisée";
  }

  if (followLink && caseId) {
    followLink.href = `suivi-dossier-client-montreal.html?caseId=${encodeURIComponent(caseId)}`;
  }

  if (mailLink) {
    const subject = caseId
      ? `Dossier ${caseId} - suivi paiement`
      : "Suivi paiement NEXURADATA";
    const body = [
      caseId ? `Numéro de dossier: ${caseId}` : "",
      paymentRequestId ? `Référence de paiement: ${paymentRequestId}` : "",
      "",
      "Message:"
    ].filter(Boolean).join("\n");

    mailLink.href = `mailto:contact@nexuradata.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}

const setMessage = (target, state, text) => {
  if (!target) {
    return;
  }

  target.dataset.state = state;
  target.textContent = text;
};

const setButtonBusy = (button, busy, busyLabel) => {
  if (!button) {
    return;
  }

  if (busy) {
    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent || "";
    }

    if (busyLabel) {
      button.textContent = busyLabel;
    }

    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    return;
  }

  if (button.dataset.defaultLabel) {
    button.textContent = button.dataset.defaultLabel;
  }

  button.disabled = false;
  button.removeAttribute("aria-busy");
};

const parseJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const formatTimestamp = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(publicI18n.locale, {
    dateStyle: "long",
    timeStyle: "short"
  }).format(date);
};

const formatCurrency = (amountCents, currency = "cad") =>
  new Intl.NumberFormat(publicI18n.locale, {
    style: "currency",
    currency: `${currency || "cad"}`.toUpperCase()
  }).format((Number(amountCents) || 0) / 100);

const buildIntakeMailto = (formData) => {
  const subject = `${publicI18n.intakeSubjectPrefix} - ${formData.get("support")} - ${formData.get("urgence")}`;
  const bodyLines = [
    `${publicI18n.fieldName}: ${formData.get("nom") || ""}`,
    `${publicI18n.fieldEmail}: ${formData.get("courriel") || ""}`,
    `${publicI18n.fieldPhone}: ${formData.get("telephone") || ""}`,
    `${publicI18n.fieldSupport}: ${formData.get("support") || ""}`,
    `${publicI18n.fieldUrgency}: ${formData.get("urgence") || ""}`,
    "",
    `${publicI18n.fieldDescription}:`,
    `${formData.get("message") || ""}`
  ];

  return `mailto:contact@nexuradata.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
};

const createStatusStep = (step) => {
  const article = document.createElement("article");
  article.className = `status-step status-step-${step.state}`;

  const title = document.createElement("p");
  title.className = "status-step-title";
  title.textContent = step.title;

  const note = document.createElement("p");
  note.className = "status-step-note";
  note.textContent = step.note;

  article.append(title, note);
  return article;
};

const formatPaymentKindLabel = (paymentKind) => {
  if (paymentKind === "deposit") {
    return publicI18n.paymentKindDeposit;
  }

  if (paymentKind === "final") {
    return publicI18n.paymentKindFinal;
  }

  return publicI18n.paymentKindCustom;
};

const formatPaymentStatusLabel = (status) => {
  if (status === "paid") {
    return publicI18n.paymentStatusPaid;
  }

  if (status === "expired") {
    return publicI18n.paymentStatusExpired;
  }

  if (status === "failed") {
    return publicI18n.paymentStatusFailed;
  }

  return publicI18n.paymentStatusOpen;
};

const createStatusPayment = (payment) => {
  const article = document.createElement("article");
  article.className = "status-payment";

  const head = document.createElement("div");
  head.className = "status-payment-head";

  const title = document.createElement("p");
  title.className = "status-payment-title";
  title.textContent = payment.label;

  const badge = document.createElement("span");
  badge.className = `status-payment-badge is-${payment.status || "open"}`;
  badge.textContent = formatPaymentStatusLabel(payment.status);

  head.append(title, badge);

  const meta = document.createElement("p");
  meta.className = "status-payment-meta";
  meta.textContent = `${payment.amountFormatted || formatCurrency(payment.amountCents, payment.currency)} · ${formatPaymentKindLabel(payment.paymentKind)}`;

  const note = document.createElement("p");
  note.className = "status-payment-note";
  note.textContent = payment.description;

  const details = document.createElement("p");
  details.className = "status-payment-meta";
  details.textContent =
    payment.status === "paid" && payment.paidAt
      ? publicI18n.paymentConfirmedOn(formatTimestamp(payment.paidAt))
      : payment.status === "open" && payment.expiresAt
        ? publicI18n.paymentAvailableUntil(formatTimestamp(payment.expiresAt))
        : payment.sentAt
          ? publicI18n.paymentSentOn(formatTimestamp(payment.sentAt))
          : publicI18n.paymentReference(payment.paymentRequestId);

  article.append(head, meta, note);

  if (payment.checkoutUrl) {
    const actions = document.createElement("div");
    actions.className = "status-payment-actions";

    const link = document.createElement("a");
    link.className = "button button-primary button-small";
    link.href = payment.checkoutUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = publicI18n.paymentAction;

    actions.append(link);
    article.append(actions);
  }

  article.append(details);
  return article;
};

const renderStatusRecord = (record, statusPanel) => {
  if (!statusPanel) {
    return;
  }

  statusPanel.hidden = false;
  const caseTarget = statusPanel.querySelector("[data-status-case]");
  const badgeTarget = statusPanel.querySelector("[data-status-badge]");
  const updatedTarget = statusPanel.querySelector("[data-status-updated]");
  const supportTarget = statusPanel.querySelector("[data-status-support]");
  const nextTarget = statusPanel.querySelector("[data-status-next]");
  const summaryTarget = statusPanel.querySelector("[data-status-summary]");
  const timelineTarget = statusPanel.querySelector("[data-status-timeline]");
  const paymentsSection = statusPanel.querySelector("[data-status-payments-section]");
  const paymentsTarget = statusPanel.querySelector("[data-status-payments]");

  if (caseTarget) caseTarget.textContent = record.caseId;
  if (badgeTarget) badgeTarget.textContent = record.status;
  if (updatedTarget) updatedTarget.textContent = formatTimestamp(record.updatedAt);
  if (supportTarget) supportTarget.textContent = record.support;
  if (nextTarget) nextTarget.textContent = record.nextStep;
  if (summaryTarget) summaryTarget.textContent = record.summary;

  if (paymentsSection && paymentsTarget) {
    const payments = Array.isArray(record.payments) ? record.payments : [];

    paymentsSection.hidden = payments.length === 0;

    if (payments.length > 0) {
      paymentsTarget.replaceChildren(...payments.map(createStatusPayment));
    } else {
      paymentsTarget.replaceChildren();
    }
  }

  if (timelineTarget) {
    timelineTarget.replaceChildren(...(record.steps || []).map(createStatusStep));
  }
};

const intakeForm = document.querySelector("[data-intake-form]");

if (intakeForm) {
  const statusTarget = intakeForm.querySelector("[data-form-status]");
  const submitButton = intakeForm.querySelector('button[type="submit"]');
  const endpoint = intakeForm.getAttribute("data-intake-endpoint") || "/api/intake";

  intakeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!intakeForm.checkValidity()) {
      intakeForm.reportValidity();
      setMessage(statusTarget, "error", publicI18n.intakeRequired);
      return;
    }

    const formData = new FormData(intakeForm);
    const payload = {
      nom: `${formData.get("nom") || ""}`.trim(),
      courriel: `${formData.get("courriel") || ""}`.trim(),
      telephone: `${formData.get("telephone") || ""}`.trim(),
      support: `${formData.get("support") || ""}`.trim(),
      urgence: `${formData.get("urgence") || ""}`.trim(),
      message: `${formData.get("message") || ""}`.trim(),
      consentement: formData.get("consentement") === "on",
      website: `${formData.get("website") || ""}`.trim(),
      sourcePath: window.location.pathname
    };

    setButtonBusy(submitButton, true, publicI18n.intakeBusy);

    setMessage(statusTarget, "success", publicI18n.intakeOpening);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await parseJsonResponse(response);

      if (response.ok && data?.ok) {
        intakeForm.reset();
        setMessage(
          statusTarget,
          "success",
          data?.delivery?.client === "sent"
            ? publicI18n.intakeOpenedSent(data.caseId)
            : publicI18n.intakeOpenedQueued(data.caseId)
        );
        return;
      }

      if (data?.fallback === "mailto" || response.status >= 500) {
        window.location.href = buildIntakeMailto(formData);
        setMessage(
          statusTarget,
          "success",
          publicI18n.intakeFallback
        );
        return;
      }

      setMessage(statusTarget, "error", data?.message || publicI18n.intakeError);
    } catch {
      window.location.href = buildIntakeMailto(formData);
      setMessage(
        statusTarget,
        "success",
        publicI18n.intakeOffline
      );
    } finally {
      setButtonBusy(submitButton, false);
    }
  });
}

const statusForm = document.querySelector("[data-status-form]");

if (statusForm) {
  const messageTarget = statusForm.querySelector("[data-status-form-message]");
  const statusPanel = document.querySelector("[data-status-panel]");
  const endpoint = statusForm.getAttribute("data-status-endpoint") || "/api/status";
  const submitButton = statusForm.querySelector('button[type="submit"]');
  const isLocalPreview = window.location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(window.location.hostname);

  const demoCases = {
    "NX-2026-0412|MONTREAL24": {
      caseId: "NX-2026-0412",
      ...publicI18n.demoCaseOne
    },
    "NX-2026-0419|RAIDSECURE": {
      caseId: "NX-2026-0419",
      ...publicI18n.demoCaseTwo
    }
  };

  const caseIdField = statusForm.querySelector('[name="dossier"]');
  const accessCodeField = statusForm.querySelector('[name="code"]');
  const params = new URLSearchParams(window.location.search);
  const presetCaseId = `${params.get("caseId") || ""}`.trim().toUpperCase();

  if (caseIdField && presetCaseId) {
    caseIdField.value = presetCaseId;
  }

  if (accessCodeField && presetCaseId && !accessCodeField.value) {
    accessCodeField.focus();
  }

  statusForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!statusForm.checkValidity()) {
      statusForm.reportValidity();
      setMessage(messageTarget, "error", publicI18n.statusRequired);
      return;
    }

    const formData = new FormData(statusForm);
    const dossier = `${formData.get("dossier") || ""}`.trim().toUpperCase();
    const code = `${formData.get("code") || ""}`.trim().toUpperCase();
    const key = `${dossier}|${code}`;

    if (isLocalPreview) {
      const record = demoCases[key];

      if (!record) {
        if (statusPanel) {
          statusPanel.hidden = true;
        }

        setMessage(
          messageTarget,
          "error",
          publicI18n.statusNotFound
        );
        return;
      }

      renderStatusRecord(record, statusPanel);
      setMessage(messageTarget, "success", publicI18n.statusFound);
      return;
    }

    setButtonBusy(submitButton, true, publicI18n.statusBusy);
    setMessage(messageTarget, "success", publicI18n.statusSearching);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json"
        },
        body: JSON.stringify({
          caseId: dossier,
          accessCode: code
        })
      });
      const data = await parseJsonResponse(response);

      if (response.ok && data?.ok) {
        renderStatusRecord(data, statusPanel);
        setMessage(messageTarget, "success", publicI18n.statusFound);
        return;
      }

      if (statusPanel) {
        statusPanel.hidden = true;
      }

      setMessage(
        messageTarget,
        "error",
        data?.message || publicI18n.statusNotFound
      );
    } catch {
      if (statusPanel) {
        statusPanel.hidden = true;
      }

      setMessage(messageTarget, "error", publicI18n.statusOffline);
    } finally {
      setButtonBusy(submitButton, false);
    }
  });
}

const operationsRoot = document.querySelector("[data-ops-app]");

if (operationsRoot) {
  const searchForm = document.querySelector("[data-ops-search-form]");
  const searchStatus = document.querySelector("[data-ops-search-status]");
  const resultsTarget = document.querySelector("[data-ops-results]");
  const casePanel = document.querySelector("[data-ops-case-panel]");
  const caseForm = document.querySelector("[data-ops-case-form]");
  const caseStatus = document.querySelector("[data-ops-case-status]");
  const searchEndpoint = operationsRoot.getAttribute("data-ops-endpoint") || "/api/ops/cases";
  const detailTitle = operationsRoot.querySelector("[data-ops-case-title]");
  const metaCreated = operationsRoot.querySelector("[data-ops-meta-created]");
  const metaUpdated = operationsRoot.querySelector("[data-ops-meta-updated]");
  const metaClient = operationsRoot.querySelector("[data-ops-meta-client]");
  const metaEmail = operationsRoot.querySelector("[data-ops-meta-email]");
  const metaSupport = operationsRoot.querySelector("[data-ops-meta-support]");
  const metaUrgency = operationsRoot.querySelector("[data-ops-meta-urgency]");
  const metaSource = operationsRoot.querySelector("[data-ops-meta-source]");
  const metaAccessSent = operationsRoot.querySelector("[data-ops-meta-access-sent]");
  const metaStatusSent = operationsRoot.querySelector("[data-ops-meta-status-sent]");
  const messageTarget = operationsRoot.querySelector("[data-ops-message]");
  const stepsTarget = operationsRoot.querySelector("[data-ops-steps]");
  const historyTarget = operationsRoot.querySelector("[data-ops-history]");
  const accessResult = operationsRoot.querySelector("[data-ops-access-result]");
  const paymentForm = operationsRoot.querySelector("[data-ops-payment-form]");
  const paymentStatus = operationsRoot.querySelector("[data-ops-payment-status]");
  const paymentsTarget = operationsRoot.querySelector("[data-ops-payments]");
  const addStepButton = operationsRoot.querySelector("[data-ops-add-step]");
  const sendUpdateButton = operationsRoot.querySelector("[data-ops-send-update]");
  const sendAccessButton = operationsRoot.querySelector("[data-ops-send-access]");
  const regenerateButton = operationsRoot.querySelector("[data-ops-regenerate-access]");
  const currentCaseIdInput = operationsRoot.querySelector("[data-ops-current-case-id]");
  const searchSubmitButton = searchForm?.querySelector('button[type="submit"]');
  const caseSubmitButton = caseForm?.querySelector('button[type="submit"]');
  const paymentSubmitButton = paymentForm?.querySelector('button[type="submit"]');
  const metaAcquisition = operationsRoot.querySelector("[data-ops-meta-acquisition]");
  const quoteStatusDisplay = operationsRoot.querySelector("[data-ops-quote-status]");
  const quoteAmountDisplay = operationsRoot.querySelector("[data-ops-quote-amount]");
  const quotePreapprovalDisplay = operationsRoot.querySelector("[data-ops-quote-preapproval]");
  const quoteSentAtDisplay = operationsRoot.querySelector("[data-ops-quote-sent-at]");
  const quoteApprovedAtDisplay = operationsRoot.querySelector("[data-ops-quote-approved-at]");
  const quoteResult = operationsRoot.querySelector("[data-ops-quote-result]");
  const quoteSendButton = operationsRoot.querySelector("[data-ops-quote-send]");
  const quoteApproveButton = operationsRoot.querySelector("[data-ops-quote-approve]");
  const quoteExpireButton = operationsRoot.querySelector("[data-ops-quote-expire]");
  const quoteDeclineButton = operationsRoot.querySelector("[data-ops-quote-decline]");
  const reminderTypeSelect = operationsRoot.querySelector("[data-ops-reminder-type]");
  const reminderMessageInput = operationsRoot.querySelector("[data-ops-reminder-message]");
  const logReminderButton = operationsRoot.querySelector("[data-ops-log-reminder]");
  const reminderResult = operationsRoot.querySelector("[data-ops-reminder-result]");

  const createStepRow = (step = { title: "", note: "", state: "pending" }) => {
    const wrapper = document.createElement("div");
    wrapper.className = "ops-step-row";
    wrapper.dataset.opsStepRow = "true";
    const titleField = document.createElement("label");
    titleField.className = "field";

    const titleLabel = document.createElement("span");
    titleLabel.textContent = "Titre";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.required = true;
    titleInput.dataset.opsStepTitle = "true";
    titleInput.value = step.title || "";

    titleField.append(titleLabel, titleInput);

    const stateField = document.createElement("label");
    stateField.className = "field";

    const stateLabel = document.createElement("span");
    stateLabel.textContent = "État";

    const stateSelect = document.createElement("select");
    stateSelect.dataset.opsStepState = "true";

    [
      ["pending", "En attente"],
      ["active", "Actif"],
      ["complete", "Complété"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      stateSelect.append(option);
    });

    stateSelect.value = step.state || "pending";
    stateField.append(stateLabel, stateSelect);

    const noteField = document.createElement("label");
    noteField.className = "field field-full";

    const noteLabel = document.createElement("span");
    noteLabel.textContent = "Note";

    const noteInput = document.createElement("textarea");
    noteInput.rows = 3;
    noteInput.required = true;
    noteInput.dataset.opsStepNote = "true";
    noteInput.value = step.note || "";

    noteField.append(noteLabel, noteInput);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "button button-secondary button-small";
    removeButton.dataset.opsRemoveStep = "true";
    removeButton.textContent = "Retirer l'étape";
    removeButton.addEventListener("click", () => {
      wrapper.remove();
    });

    wrapper.append(titleField, stateField, noteField, removeButton);

    return wrapper;
  };

  const collectSteps = () =>
    Array.from(stepsTarget?.querySelectorAll("[data-ops-step-row]") || []).map((row) => ({
      title: row.querySelector("[data-ops-step-title]")?.value.trim() || "",
      state: row.querySelector("[data-ops-step-state]")?.value || "pending",
      note: row.querySelector("[data-ops-step-note]")?.value.trim() || ""
    }));

  const quoteStatusLabels = {
    none: "Aucune",
    draft: "Brouillon",
    sent: "Envoyée",
    approved: "Approuvée",
    expired: "Expirée",
    declined: "Refusée"
  };

  const renderHistory = (history) => {
    if (!historyTarget) {
      return;
    }

    if (!history || history.length === 0) {
      historyTarget.innerHTML = "<p class=\"form-note\">Aucun événement enregistré pour ce dossier.</p>";
      return;
    }

    historyTarget.replaceChildren(
      ...history.map((entry) => {
        const article = document.createElement("article");
        article.className = "ops-history-entry";

        const title = document.createElement("p");
        title.className = "ops-history-title";
        title.textContent = entry.title;

        const meta = document.createElement("p");
        meta.className = "ops-history-meta";
        meta.textContent = `${formatTimestamp(entry.createdAt)} · ${entry.createdBy} · ${entry.kind}`;

        const note = document.createElement("p");
        note.className = "ops-history-note";
        note.textContent = entry.note;

        article.append(title, meta, note);
        return article;
      })
    );
  };

  const renderPayments = (payments) => {
    if (!paymentsTarget) {
      return;
    }

    if (!payments || payments.length === 0) {
      paymentsTarget.innerHTML = "<p class=\"form-note\">Aucune demande de paiement pour ce dossier.</p>";
      return;
    }

    paymentsTarget.replaceChildren(
      ...payments.map((payment) => {
        const article = document.createElement("article");
        article.className = "ops-payment-entry";

        const head = document.createElement("div");
        head.className = "ops-payment-head";

        const title = document.createElement("p");
        title.className = "ops-payment-title";
        title.textContent = payment.label;

        const badge = document.createElement("span");
        badge.className = `ops-payment-badge is-${payment.status || "open"}`;
        badge.textContent =
          payment.status === "paid"
            ? "Payé"
            : payment.status === "expired"
              ? "Expiré"
              : payment.status === "failed"
                ? "Échec"
                : "Ouvert";

        head.append(title, badge);

        const meta = document.createElement("p");
        meta.className = "ops-payment-meta";
        meta.textContent = `${payment.amountFormatted || formatCurrency(payment.amountCents, payment.currency)} · ${payment.paymentKind} · créé ${formatTimestamp(payment.createdAt)}`;

        const note = document.createElement("p");
        note.className = "ops-payment-note";
        note.textContent = payment.description;

        const actions = document.createElement("div");
        actions.className = "ops-payment-actions";

        if (payment.checkoutUrl) {
          const link = document.createElement("a");
          link.className = "button button-secondary button-small";
          link.href = payment.checkoutUrl;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = "Ouvrir le lien Stripe";
          actions.append(link);
        }

        const details = document.createElement("p");
        details.className = "ops-payment-meta";
        details.textContent =
          payment.paidAt
            ? `Confirmé ${formatTimestamp(payment.paidAt)}`
            : payment.sentAt
              ? `Lien envoyé ${formatTimestamp(payment.sentAt)}`
              : `Lien non envoyé automatiquement`;

        article.append(head, meta, note, actions, details);
        return article;
      })
    );
  };

  const fillCaseDetail = (record) => {
    if (casePanel) {
      casePanel.hidden = false;
    }

    if (detailTitle) detailTitle.textContent = record.caseId;
    if (metaCreated) metaCreated.textContent = formatTimestamp(record.createdAt);
    if (metaUpdated) metaUpdated.textContent = formatTimestamp(record.updatedAt);
    if (metaClient) metaClient.textContent = record.name;
    if (metaEmail) metaEmail.textContent = record.email;
    if (metaSupport) metaSupport.textContent = record.support;
    if (metaUrgency) metaUrgency.textContent = record.urgency;
    if (metaSource) metaSource.textContent = record.sourcePath || "/";
    if (metaAcquisition) metaAcquisition.textContent = record.acquisitionSource || "—";
    if (metaAccessSent) metaAccessSent.textContent = record.accessCodeLastSentAt ? formatTimestamp(record.accessCodeLastSentAt) : "Pas encore";
    if (metaStatusSent) metaStatusSent.textContent = record.statusEmailLastSentAt ? formatTimestamp(record.statusEmailLastSentAt) : "Pas encore";
    if (messageTarget) messageTarget.textContent = record.message;
    if (currentCaseIdInput) currentCaseIdInput.value = record.caseId;

    if (caseForm) {
      const statusInput = caseForm.querySelector('[name="status"]');
      const nextStepInput = caseForm.querySelector('[name="nextStep"]');
      const summaryInput = caseForm.querySelector('[name="clientSummary"]');
      const notifyInput = caseForm.querySelector('[name="notifyClient"]');
      const qualInput = caseForm.querySelector('[name="qualificationSummary"]');
      const notesInput = caseForm.querySelector('[name="internalNotes"]');
      const flagsInput = caseForm.querySelector('[name="handlingFlags"]');
      const acqInput = caseForm.querySelector('[name="acquisitionSource"]');
      const quoteAmtInput = caseForm.querySelector('[name="quoteAmount"]');
      const preapprovalInput = caseForm.querySelector('[name="preapprovalConfirmed"]');

      if (statusInput) statusInput.value = record.status;
      if (nextStepInput) nextStepInput.value = record.nextStep;
      if (summaryInput) summaryInput.value = record.clientSummary;
      if (notifyInput) notifyInput.checked = false;
      if (qualInput) qualInput.value = record.qualificationSummary || "";
      if (notesInput) notesInput.value = record.internalNotes || "";
      if (flagsInput) flagsInput.value = record.handlingFlags || "";
      if (acqInput) acqInput.value = record.acquisitionSource || "";
      if (quoteAmtInput) quoteAmtInput.value = record.quoteAmountCents ? (record.quoteAmountCents / 100).toFixed(2) : "";
      if (preapprovalInput) preapprovalInput.checked = Boolean(record.preapprovalConfirmed);
    }

    if (quoteStatusDisplay) quoteStatusDisplay.textContent = quoteStatusLabels[record.quoteStatus] || record.quoteStatus || "Aucune";
    if (quoteAmountDisplay) quoteAmountDisplay.textContent = record.quoteAmountCents ? formatCurrency(record.quoteAmountCents, "cad") : "—";
    if (quotePreapprovalDisplay) quotePreapprovalDisplay.textContent = record.preapprovalConfirmed ? "Oui" : "Non";
    if (quoteSentAtDisplay) quoteSentAtDisplay.textContent = record.quoteSentAt ? formatTimestamp(record.quoteSentAt) : "—";
    if (quoteApprovedAtDisplay) quoteApprovedAtDisplay.textContent = record.quoteApprovedAt ? formatTimestamp(record.quoteApprovedAt) : "—";

    if (stepsTarget) {
      stepsTarget.replaceChildren(...(record.steps || []).map(createStepRow));
    }

    renderPayments(record.payments || []);

    if (accessResult) {
      accessResult.textContent = "";
      accessResult.dataset.state = "";
    }

    if (paymentStatus) {
      paymentStatus.textContent = "";
      paymentStatus.dataset.state = "";
    }

    if (quoteResult) {
      quoteResult.textContent = "";
      quoteResult.dataset.state = "";
    }

    if (reminderResult) {
      reminderResult.textContent = "";
      reminderResult.dataset.state = "";
    }

    renderHistory(record.history || []);
    setMessage(caseStatus, "success", "Dossier chargé.");
  };

  const loadCaseDetail = async (caseId) => {
    setMessage(searchStatus, "success", "Chargement du dossier...");

    const response = await fetch(`${searchEndpoint}?caseId=${encodeURIComponent(caseId)}`, {
      headers: {
        accept: "application/json"
      }
    });
    const data = await parseJsonResponse(response);

    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "Impossible de charger ce dossier.");
    }

    fillCaseDetail(data.case);
    setMessage(searchStatus, "success", "Dossier chargé.");
  };

  const renderSearchResults = (items) => {
    if (!resultsTarget) {
      return;
    }

    if (!items || items.length === 0) {
      resultsTarget.innerHTML = "<p class=\"form-note\">Aucun dossier correspondant.</p>";
      return;
    }

    resultsTarget.replaceChildren(
      ...items.map((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ops-result";

        const caseLabel = document.createElement("strong");
        caseLabel.textContent = item.case_id;

        const clientLabel = document.createElement("span");
        clientLabel.textContent = item.name;

        const supportLabel = document.createElement("span");
        supportLabel.textContent = `${item.support} · ${item.status}${item.quote_status && item.quote_status !== "none" ? ` · Soum: ${quoteStatusLabels[item.quote_status] || item.quote_status}` : ""}`;

        const nextLabel = document.createElement("span");
        nextLabel.className = "ops-result-next";
        nextLabel.textContent = item.next_step || "";

        const emailLabel = document.createElement("span");
        emailLabel.textContent = item.email;

        const updatedLabel = document.createElement("time");
        updatedLabel.dateTime = item.updated_at || "";
        updatedLabel.textContent = `Mis à jour ${formatTimestamp(item.updated_at)}`;

        button.append(caseLabel, clientLabel, supportLabel, nextLabel, emailLabel, updatedLabel);
        button.addEventListener("click", () => {
          loadCaseDetail(item.case_id).catch((error) => {
            setMessage(searchStatus, "error", error.message);
          });
        });
        return button;
      })
    );
  };

  if (searchForm) {
    searchForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const query = searchForm.querySelector('[name="query"]')?.value.trim() || "";
      const filterStatus = searchForm.querySelector('[name="filterStatus"]')?.value || "";
      const filterQuoteStatus = searchForm.querySelector('[name="filterQuoteStatus"]')?.value || "";
      const filterUrgency = searchForm.querySelector('[name="filterUrgency"]')?.value || "";
      setButtonBusy(searchSubmitButton, true, "Recherche...");
      setMessage(searchStatus, "success", "Recherche en cours...");

      try {
        const params = new URLSearchParams();
        if (query) params.set("query", query);
        if (filterStatus) params.set("status", filterStatus);
        if (filterQuoteStatus) params.set("quoteStatus", filterQuoteStatus);
        if (filterUrgency) params.set("urgency", filterUrgency);

        const response = await fetch(`${searchEndpoint}?${params.toString()}`, {
          headers: {
            accept: "application/json"
          }
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Recherche impossible.");
        }

        renderSearchResults(data.items || []);
        setMessage(searchStatus, "success", `${(data.items || []).length} dossier(s) chargé(s).`);
      } catch (error) {
        setMessage(searchStatus, "error", error instanceof Error ? error.message : "Recherche impossible.");
      } finally {
        setButtonBusy(searchSubmitButton, false);
      }
    });
  }

  if (addStepButton) {
    addStepButton.addEventListener("click", () => {
      if (stepsTarget) {
        stepsTarget.append(createStepRow());
      }
    });
  }

  if (caseForm) {
    caseForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(caseStatus, "error", "Chargez d'abord un dossier.");
        return;
      }

      setMessage(caseStatus, "success", "Enregistrement en cours...");
      setButtonBusy(caseSubmitButton, true, "Enregistrement...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "update",
            caseId,
            status: caseForm.querySelector('[name="status"]')?.value.trim() || "",
            nextStep: caseForm.querySelector('[name="nextStep"]')?.value.trim() || "",
            clientSummary: caseForm.querySelector('[name="clientSummary"]')?.value.trim() || "",
            qualificationSummary: caseForm.querySelector('[name="qualificationSummary"]')?.value.trim() || "",
            internalNotes: caseForm.querySelector('[name="internalNotes"]')?.value.trim() || "",
            handlingFlags: caseForm.querySelector('[name="handlingFlags"]')?.value.trim() || "",
            acquisitionSource: caseForm.querySelector('[name="acquisitionSource"]')?.value.trim() || "",
            quoteAmount: caseForm.querySelector('[name="quoteAmount"]')?.value.trim() || "",
            preapprovalConfirmed: Boolean(caseForm.querySelector('[name="preapprovalConfirmed"]')?.checked),
            notifyClient: Boolean(caseForm.querySelector('[name="notifyClient"]')?.checked),
            steps: collectSteps()
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "La mise à jour a échoué.");
        }

        fillCaseDetail(data.case);
        setMessage(caseStatus, "success", data.delivery === "sent" ? "Dossier enregistré et client notifié." : "Dossier enregistré.");
      } catch (error) {
        setMessage(caseStatus, "error", error instanceof Error ? error.message : "La mise à jour a échoué.");
      } finally {
        setButtonBusy(caseSubmitButton, false);
      }
    });
  }

  if (sendUpdateButton) {
    sendUpdateButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(caseStatus, "error", "Chargez d'abord un dossier.");
        return;
      }

      setMessage(caseStatus, "success", "Envoi de la mise à jour client...");
      setButtonBusy(sendUpdateButton, true, "Envoi...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "send-update",
            caseId
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "L'envoi a échoué.");
        }

        fillCaseDetail(data.case);
        setMessage(caseStatus, "success", data.delivery === "sent" ? "Mise à jour envoyée au client." : `Envoi non effectué: ${data.delivery}`);
      } catch (error) {
        setMessage(caseStatus, "error", error instanceof Error ? error.message : "L'envoi a échoué.");
      } finally {
        setButtonBusy(sendUpdateButton, false);
      }
    });
  }

  if (sendAccessButton) {
    sendAccessButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(caseStatus, "error", "Chargez d'abord un dossier.");
        return;
      }

      if (accessResult) {
        accessResult.textContent = "Renvoi du code en cours...";
        accessResult.dataset.state = "success";
      }
      setButtonBusy(sendAccessButton, true, "Renvoi...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "send-access",
            caseId
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Le renvoi du code a échoué.");
        }

        await loadCaseDetail(caseId);

        if (accessResult) {
          accessResult.textContent = data.delivery === "sent" ? "Code d'accès renvoyé au client." : `Envoi non effectué: ${data.delivery}`;
          accessResult.dataset.state = data.delivery === "sent" ? "success" : "error";
        }
      } catch (error) {
        if (accessResult) {
          accessResult.textContent = error instanceof Error ? error.message : "Le renvoi du code a échoué.";
          accessResult.dataset.state = "error";
        }
      } finally {
        setButtonBusy(sendAccessButton, false);
      }
    });
  }

  if (regenerateButton) {
    regenerateButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(caseStatus, "error", "Chargez d'abord un dossier.");
        return;
      }

      if (accessResult) {
        accessResult.textContent = "Génération d'un nouveau code...";
        accessResult.dataset.state = "success";
      }
      setButtonBusy(regenerateButton, true, "Génération...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "regenerate-access",
            caseId
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "La régénération du code a échoué.");
        }

        await loadCaseDetail(caseId);

        if (accessResult) {
          accessResult.textContent =
            data.delivery === "sent"
              ? `Nouveau code généré et envoyé: ${data.accessCode}`
              : `Nouveau code généré: ${data.accessCode}. Envoi non effectué (${data.delivery}).`;
          accessResult.dataset.state = data.delivery === "sent" ? "success" : "error";
        }
      } catch (error) {
        if (accessResult) {
          accessResult.textContent = error instanceof Error ? error.message : "La régénération du code a échoué.";
          accessResult.dataset.state = "error";
        }
      } finally {
        setButtonBusy(regenerateButton, false);
      }
    });
  }

  const quoteActionHandler = (button, action, label) => {
    if (!button) return;
    button.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";
      if (!caseId) {
        setMessage(quoteResult, "error", "Chargez d'abord un dossier.");
        return;
      }

      setMessage(quoteResult, "success", `${label}...`);
      setButtonBusy(button, true, label + "...");

      try {
        const body = { action, caseId };
        if (action === "quote-send") {
          const amt = caseForm?.querySelector('[name="quoteAmount"]')?.value.trim() || "";
          if (amt) body.quoteAmount = amt;
        }

        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body)
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "L'action a échoué.");
        }

        fillCaseDetail(data.case);
        setMessage(quoteResult, "success", `${label} effectuée.`);
      } catch (error) {
        setMessage(quoteResult, "error", error instanceof Error ? error.message : "L'action a échoué.");
      } finally {
        setButtonBusy(button, false);
      }
    });
  };

  quoteActionHandler(quoteSendButton, "quote-send", "Envoi de la soumission");
  quoteActionHandler(quoteApproveButton, "quote-approve", "Approbation");
  quoteActionHandler(quoteExpireButton, "quote-expire", "Expiration");
  quoteActionHandler(quoteDeclineButton, "quote-decline", "Refus");

  if (logReminderButton) {
    logReminderButton.addEventListener("click", async () => {
      const caseId = currentCaseIdInput?.value || "";
      if (!caseId) {
        setMessage(reminderResult, "error", "Chargez d'abord un dossier.");
        return;
      }

      const reminderType = reminderTypeSelect?.value || "general_follow_up";
      const message = reminderMessageInput?.value.trim() || "";

      setMessage(reminderResult, "success", "Enregistrement de la relance...");
      setButtonBusy(logReminderButton, true, "Enregistrement...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ action: "log-reminder", caseId, reminderType, message })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Relance non enregistrée.");
        }

        fillCaseDetail(data.case);
        if (reminderMessageInput) reminderMessageInput.value = "";
        setMessage(reminderResult, "success", "Relance enregistrée.");
      } catch (error) {
        setMessage(reminderResult, "error", error instanceof Error ? error.message : "Relance non enregistrée.");
      } finally {
        setButtonBusy(logReminderButton, false);
      }
    });
  }

  if (paymentForm) {
    paymentForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const caseId = currentCaseIdInput?.value || "";

      if (!caseId) {
        setMessage(paymentStatus, "error", "Chargez d'abord un dossier.");
        return;
      }

      if (!paymentForm.checkValidity()) {
        paymentForm.reportValidity();
        setMessage(paymentStatus, "error", "Complétez les champs de paiement.");
        return;
      }

      setMessage(paymentStatus, "success", "Création du lien de paiement...");
      setButtonBusy(paymentSubmitButton, true, "Création...");

      try {
        const response = await fetch(searchEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            action: "create-payment",
            caseId,
            paymentKind: paymentForm.querySelector('[name="paymentKind"]')?.value || "custom",
            amount: paymentForm.querySelector('[name="amount"]')?.value.trim() || "",
            label: paymentForm.querySelector('[name="label"]')?.value.trim() || "",
            description: paymentForm.querySelector('[name="description"]')?.value.trim() || "",
            sendEmail: Boolean(paymentForm.querySelector('[name="sendEmail"]')?.checked)
          })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "Impossible de créer la demande de paiement.");
        }

        if (data.case) {
          fillCaseDetail(data.case);
        }

        setMessage(
          paymentStatus,
          data.delivery === "sent" ? "success" : "error",
          data.delivery === "sent"
            ? "Demande de paiement créée et envoyée au client."
            : `Demande créée. Envoi automatique non effectué: ${data.delivery}.`
        );
      } catch (error) {
        setMessage(paymentStatus, "error", error instanceof Error ? error.message : "Impossible de créer la demande de paiement.");
      } finally {
        setButtonBusy(paymentSubmitButton, false);
      }
    });
  }

  if (searchForm) {
    searchForm.requestSubmit();
  }
}

/* ── Ops filtered view pages (quotes, payments, follow-up) ── */

const opsViewRoot = document.querySelector("[data-ops-view]");

if (opsViewRoot) {
  const viewName = opsViewRoot.getAttribute("data-ops-view");
  const viewEndpoint = opsViewRoot.getAttribute("data-ops-endpoint") || "/api/ops/cases";
  const viewFilters = document.querySelector("[data-ops-view-filters]");
  const viewStatus = document.querySelector("[data-ops-view-status]");
  const viewTbody = document.querySelector("[data-ops-view-tbody]");
  const viewSubmitButton = viewFilters?.querySelector('button[type="submit"]');

  const quoteStatusLabelsView = {
    none: "Aucune",
    draft: "Brouillon",
    sent: "Envoyée",
    approved: "Approuvée",
    expired: "Expirée",
    declined: "Refusée"
  };

  const paymentStatusLabelsView = {
    open: "Ouvert",
    paid: "Payé",
    expired: "Expiré",
    failed: "Échoué",
    cancelled: "Annulé"
  };

  const paymentKindLabelsView = {
    deposit: "Acompte",
    final: "Solde final",
    custom: "Ponctuel"
  };

  const caseLink = (caseId) => {
    if (!caseId) return "index.html";
    return `index.html?caseId=${encodeURIComponent(caseId)}`;
  };

  const renderQuotesTable = (items) => {
    if (!viewTbody) return;

    if (!items || items.length === 0) {
      viewTbody.innerHTML = '<tr><td colspan="8" class="ops-view-empty">Aucune soumission correspondante.</td></tr>';
      return;
    }

    viewTbody.replaceChildren(
      ...items.map((item) => {
        const tr = document.createElement("tr");
        tr.className = "ops-view-row";
        const reminderLabel = item.reminderDue === "urgente"
          ? '<span class="ops-view-badge is-reminder-urgent">Urgente</span>'
          : item.reminderDue === "suggérée"
            ? '<span class="ops-view-badge is-reminder-suggested">Suggérée</span>'
            : '—';
        tr.innerHTML = `
          <td><a href="${caseLink(item.caseId)}" class="ops-view-link">${escapeHtml(item.caseId)}</a></td>
          <td>${escapeHtml(item.clientName)}</td>
          <td>${item.quoteAmountFormatted || "—"}</td>
          <td><span class="ops-view-badge is-quote-${item.quoteStatus}">${quoteStatusLabelsView[item.quoteStatus] || item.quoteStatus}</span></td>
          <td>${escapeHtml(item.caseStatus)}</td>
          <td class="ops-view-muted">${item.quoteSentAt ? formatTimestamp(item.quoteSentAt) : "—"}</td>
          <td>${reminderLabel}</td>
          <td class="ops-view-muted">${escapeHtml(item.nextStep || "")}</td>
        `;
        return tr;
      })
    );
  };

  const renderPaymentsTable = (items) => {
    if (!viewTbody) return;

    if (!items || items.length === 0) {
      viewTbody.innerHTML = '<tr><td colspan="9" class="ops-view-empty">Aucun paiement correspondant.</td></tr>';
      return;
    }

    viewTbody.replaceChildren(
      ...items.map((item) => {
        const tr = document.createElement("tr");
        tr.className = "ops-view-row";
        tr.innerHTML = `
          <td><a href="${caseLink(item.caseId)}" class="ops-view-link">${escapeHtml(item.caseId)}</a></td>
          <td>${escapeHtml(item.clientName || "")}</td>
          <td class="ops-view-mono">${escapeHtml(item.paymentRequestId)}</td>
          <td>${paymentKindLabelsView[item.paymentKind] || item.paymentKind}</td>
          <td>${item.amountFormatted || "—"}</td>
          <td><span class="ops-view-badge is-payment-${item.status}">${paymentStatusLabelsView[item.status] || item.status}</span></td>
          <td class="ops-view-muted">${formatTimestamp(item.createdAt)}</td>
          <td class="ops-view-muted">${item.expiresAt ? formatTimestamp(item.expiresAt) : "—"}</td>
          <td class="ops-view-muted">${item.paidAt ? formatTimestamp(item.paidAt) : "—"}</td>
        `;
        return tr;
      })
    );
  };

  const renderFollowUpTable = (items) => {
    if (!viewTbody) return;

    if (!items || items.length === 0) {
      viewTbody.innerHTML = '<tr><td colspan="9" class="ops-view-empty">Aucun dossier à relancer.</td></tr>';
      return;
    }

    viewTbody.replaceChildren(
      ...items.map((item) => {
        const tr = document.createElement("tr");
        tr.className = "ops-view-row";
        const paymentLabel = item.latestPaymentStatus && item.latestPaymentStatus !== "none"
          ? `<span class="ops-view-badge is-payment-${item.latestPaymentStatus}">${paymentStatusLabelsView[item.latestPaymentStatus] || item.latestPaymentStatus}</span>`
          : "—";
        tr.innerHTML = `
          <td><a href="${caseLink(item.caseId)}" class="ops-view-link">${escapeHtml(item.caseId)}</a></td>
          <td>${escapeHtml(item.clientName)}</td>
          <td>${escapeHtml(item.status)}</td>
          <td><span class="ops-view-badge is-quote-${item.quoteStatus}">${quoteStatusLabelsView[item.quoteStatus] || item.quoteStatus || "—"}</span></td>
          <td>${paymentLabel}</td>
          <td class="ops-view-muted">${item.lastClientContactAt ? formatTimestamp(item.lastClientContactAt) : "Aucun"}</td>
          <td class="ops-view-muted">${item.lastReminderSentAt ? formatTimestamp(item.lastReminderSentAt) : "—"}</td>
          <td class="ops-view-muted">${escapeHtml(item.nextStep || "")}</td>
        `;
        return tr;
      })
    );
  };

  const viewRenderers = {
    quotes: renderQuotesTable,
    payments: renderPaymentsTable,
    "follow-up": renderFollowUpTable
  };

  const loadView = async () => {
    if (!viewFilters) return;

    const params = new URLSearchParams();
    const formData = new FormData(viewFilters);

    for (const [key, value] of formData.entries()) {
      const trimmed = `${value}`.trim();
      if (trimmed) params.set(key, trimmed);
    }

    setMessage(viewStatus, "success", "Chargement...");
    if (viewSubmitButton) setButtonBusy(viewSubmitButton, true, "Chargement...");

    try {
      const response = await fetch(`${viewEndpoint}?${params.toString()}`, {
        headers: { accept: "application/json" }
      });
      const data = await parseJsonResponse(response);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "Impossible de charger les données.");
      }

      const renderer = viewRenderers[viewName];
      if (renderer) renderer(data.items || []);

      setMessage(viewStatus, "success", `${(data.items || []).length} résultat(s).`);
    } catch (error) {
      setMessage(viewStatus, "error", error instanceof Error ? error.message : "Erreur de chargement.");
    } finally {
      if (viewSubmitButton) setButtonBusy(viewSubmitButton, false);
    }
  };

  if (viewFilters) {
    viewFilters.addEventListener("submit", (event) => {
      event.preventDefault();
      loadView();
    });

    loadView();
  }
}

/* ─── Sticky mobile CTA — auto-injects on public pages without one ── */
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;

  var PHONE = "+14388130592";
  var WA_NUMBER = "14388130592";
  var WA_BODY_FR = "Bonjour%2C%20j%27ai%20besoin%20d%27une%20%C3%A9valuation%20pour%20";
  var WA_BODY_EN = "Hi%2C%20I%20need%20an%20assessment%20for%20";

  function init() {
    var path = window.location.pathname || "";
    if (/\/operations\//.test(path) || /\/dossier\//.test(path)) return;
    if (document.body && document.body.dataset && document.body.dataset.noStickyCta) return;
    if (document.querySelector(".sticky-bar")) return; // existing one wins

    var lang = (document.documentElement.lang || "fr").toLowerCase();
    var isFR = lang.indexOf("fr") === 0;
    var labels = isFR
      ? { call: "Appeler", wa: "WhatsApp", bot: "Assistant IA", aria: "Contacts rapides", ariaCall: "Appeler le laboratoire", ariaWa: "Discuter sur WhatsApp", ariaBot: "Ouvrir l'assistant IA" }
      : { call: "Call", wa: "WhatsApp", bot: "AI Assistant", aria: "Quick contacts", ariaCall: "Call the lab", ariaWa: "Chat on WhatsApp", ariaBot: "Open the AI assistant" };
    var waBody = isFR ? WA_BODY_FR : WA_BODY_EN;

    var bar = document.createElement("div");
    bar.className = "sticky-bar";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", labels.aria);
    bar.innerHTML =
      '<a class="sticky-bar-item sticky-bar-item--call" href="tel:' + PHONE + '" aria-label="' + labels.ariaCall + '">' +
      '<span class="sticky-call-dot" aria-hidden="true"></span>' +
      '<span class="sticky-bar-label">' + labels.call + '</span></a>' +
      '<a class="sticky-bar-item sticky-bar-item--wa" href="https://wa.me/' + WA_NUMBER + '?text=' + waBody + '" target="_blank" rel="noopener" aria-label="' + labels.ariaWa + '">' +
      '<span class="sticky-bar-label">' + labels.wa + '</span></a>' +
      '<button type="button" class="sticky-bar-item sticky-bar-item--bot" data-open-chat aria-label="' + labels.ariaBot + '">' +
      '<span class="sticky-bar-label">' + labels.bot + '</span></button>';

    document.body.appendChild(bar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
