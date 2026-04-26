/* NEXURADATA — Evaluation modal
 * Wires CTAs marked [data-track^="cta-evaluation"] to a self-contained modal
 * that POSTs to /api/checkout/evaluation and redirects to Stripe Checkout.
 * Bilingual: detects locale from <html lang> attribute (fr/en).
 */
(function () {
  "use strict";

  if (window.__nxEvaluationModalReady) return;
  window.__nxEvaluationModalReady = true;

  var docLang = (document.documentElement.lang || "fr").toLowerCase().slice(0, 2);
  var LOCALE = docLang === "en" ? "en" : "fr";

  var T = {
    fr: {
      title: "Réserver une évaluation diagnostique",
      lead: "75 $ CAD — créditée intégralement sur le mandat de récupération si vous décidez d'aller de l'avant. Paiement sécurisé par Stripe.",
      name: "Nom complet",
      email: "Adresse courriel",
      phone: "Téléphone",
      message: "Décrivez brièvement le problème",
      messagePh: "Ex. SSD ne s'allume plus, données critiques pour mon entreprise.",
      consent: "J'accepte d'être contacté par NEXURADATA au sujet de mon dossier.",
      submit: "Continuer vers le paiement sécurisé — 75 $",
      submitting: "Création de la session sécurisée…",
      cancel: "Annuler",
      close: "Fermer",
      genericError: "Une erreur est survenue. Réessayez ou écrivez-nous à dossiers@nexuradata.ca.",
      networkError: "Connexion instable. Vérifiez votre réseau et réessayez.",
      missing: "Complétez les champs requis."
    },
    en: {
      title: "Book a diagnostic evaluation",
      lead: "$75 CAD — fully credited toward your recovery mandate if you proceed. Secure payment via Stripe.",
      name: "Full name",
      email: "Email address",
      phone: "Phone",
      message: "Briefly describe the problem",
      messagePh: "E.g. SSD no longer powers on, business-critical data.",
      consent: "I agree to be contacted by NEXURADATA regarding my case.",
      submit: "Continue to secure payment — $75",
      submitting: "Creating secure session…",
      cancel: "Cancel",
      close: "Close",
      genericError: "Something went wrong. Try again or email us at dossiers@nexuradata.ca.",
      networkError: "Network issue. Check your connection and retry.",
      missing: "Please complete the required fields."
    }
  };

  var L = T[LOCALE];

  var STYLES = [
    ".nx-eval-overlay{position:fixed;inset:0;background:rgba(8,12,20,.72);display:none;align-items:flex-start;justify-content:center;z-index:9999;overflow-y:auto;padding:24px 16px;animation:nxEvalFade .15s ease-out}",
    ".nx-eval-overlay.is-open{display:flex}",
    "@keyframes nxEvalFade{from{opacity:0}to{opacity:1}}",
    ".nx-eval-dialog{background:#fff;color:#0c1320;max-width:520px;width:100%;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:28px 26px 24px;margin:24px 0;font-family:Inter,system-ui,sans-serif}",
    ".nx-eval-dialog h2{margin:0 0 8px;font-size:1.4rem;line-height:1.25;font-weight:700;color:#0c1320}",
    ".nx-eval-lead{margin:0 0 18px;font-size:.95rem;color:#3b4658;line-height:1.5}",
    ".nx-eval-field{margin-bottom:14px;display:flex;flex-direction:column}",
    ".nx-eval-field label{font-size:.82rem;font-weight:600;margin-bottom:6px;color:#1f2a3d}",
    ".nx-eval-field input,.nx-eval-field textarea{font:inherit;padding:10px 12px;border:1px solid #cbd2dc;border-radius:8px;background:#fff;color:#0c1320;width:100%;box-sizing:border-box}",
    ".nx-eval-field input:focus,.nx-eval-field textarea:focus{outline:2px solid #0a66ff;outline-offset:1px;border-color:#0a66ff}",
    ".nx-eval-field textarea{min-height:90px;resize:vertical}",
    ".nx-eval-consent{display:flex;align-items:flex-start;gap:8px;font-size:.85rem;color:#3b4658;margin:6px 0 18px}",
    ".nx-eval-consent input{margin-top:3px;flex-shrink:0}",
    ".nx-eval-honey{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}",
    ".nx-eval-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:8px}",
    ".nx-eval-btn{font:inherit;font-weight:600;border-radius:8px;padding:11px 18px;border:0;cursor:pointer;transition:transform .1s,opacity .15s}",
    ".nx-eval-btn-primary{background:#0a66ff;color:#fff;flex:1;min-width:200px}",
    ".nx-eval-btn-primary:hover{background:#084fcc}",
    ".nx-eval-btn-primary:disabled{opacity:.6;cursor:wait}",
    ".nx-eval-btn-ghost{background:transparent;color:#3b4658;border:1px solid #cbd2dc}",
    ".nx-eval-btn-ghost:hover{background:#f3f5f9}",
    ".nx-eval-error{background:#fdecec;color:#9a1414;padding:10px 12px;border-radius:8px;font-size:.88rem;margin-bottom:12px;display:none}",
    ".nx-eval-error.is-shown{display:block}",
    ".nx-eval-close{position:absolute;top:10px;right:12px;background:transparent;border:0;font-size:1.5rem;cursor:pointer;color:#7a8597;line-height:1}",
    ".nx-eval-dialog{position:relative}"
  ].join("");

  function injectStyles() {
    if (document.getElementById("nx-eval-styles")) return;
    var s = document.createElement("style");
    s.id = "nx-eval-styles";
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  function buildModal() {
    var overlay = document.createElement("div");
    overlay.className = "nx-eval-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "nx-eval-title");
    overlay.innerHTML =
      '<form class="nx-eval-dialog" novalidate>' +
        '<button type="button" class="nx-eval-close" aria-label="' + L.close + '">×</button>' +
        '<h2 id="nx-eval-title">' + L.title + '</h2>' +
        '<p class="nx-eval-lead">' + L.lead + '</p>' +
        '<div class="nx-eval-error" role="alert"></div>' +
        '<div class="nx-eval-field"><label for="nx-eval-name">' + L.name + ' *</label><input id="nx-eval-name" name="nom" type="text" autocomplete="name" required maxlength="120"></div>' +
        '<div class="nx-eval-field"><label for="nx-eval-email">' + L.email + ' *</label><input id="nx-eval-email" name="courriel" type="email" autocomplete="email" required maxlength="160"></div>' +
        '<div class="nx-eval-field"><label for="nx-eval-phone">' + L.phone + '</label><input id="nx-eval-phone" name="telephone" type="tel" autocomplete="tel" maxlength="40"></div>' +
        '<div class="nx-eval-field"><label for="nx-eval-msg">' + L.message + ' *</label><textarea id="nx-eval-msg" name="message" required maxlength="3000" placeholder="' + L.messagePh + '"></textarea></div>' +
        '<input class="nx-eval-honey" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<label class="nx-eval-consent"><input type="checkbox" name="consentement" required><span>' + L.consent + ' *</span></label>' +
        '<div class="nx-eval-actions">' +
          '<button type="button" class="nx-eval-btn nx-eval-btn-ghost" data-action="cancel">' + L.cancel + '</button>' +
          '<button type="submit" class="nx-eval-btn nx-eval-btn-primary">' + L.submit + '</button>' +
        '</div>' +
      '</form>';
    document.body.appendChild(overlay);
    return overlay;
  }

  var overlay, form, errorBox, submitBtn, submitOriginalLabel, lastFocus;

  function open(sourcePath) {
    if (!overlay) {
      injectStyles();
      overlay = buildModal();
      form = overlay.querySelector("form");
      errorBox = overlay.querySelector(".nx-eval-error");
      submitBtn = overlay.querySelector(".nx-eval-btn-primary");
      submitOriginalLabel = submitBtn.textContent;

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close();
      });
      overlay.querySelector(".nx-eval-close").addEventListener("click", close);
      overlay.querySelector("[data-action='cancel']").addEventListener("click", close);
      form.addEventListener("submit", onSubmit);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
      });
    }
    form.dataset.sourcePath = sourcePath || location.pathname;
    errorBox.classList.remove("is-shown");
    errorBox.textContent = "";
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    lastFocus = document.activeElement;
    setTimeout(function () { form.querySelector("#nx-eval-name").focus(); }, 50);
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add("is-shown");
  }

  function onSubmit(e) {
    e.preventDefault();
    errorBox.classList.remove("is-shown");

    var data = new FormData(form);
    var payload = {
      nom: (data.get("nom") || "").toString().trim(),
      courriel: (data.get("courriel") || "").toString().trim(),
      telephone: (data.get("telephone") || "").toString().trim(),
      message: (data.get("message") || "").toString().trim(),
      consentement: data.get("consentement") === "on",
      website: (data.get("website") || "").toString(),
      sourcePath: form.dataset.sourcePath || location.pathname,
      locale: LOCALE
    };

    if (!payload.nom || !payload.courriel || !payload.message || !payload.consentement) {
      showError(L.missing);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = L.submitting;

    fetch("/api/checkout/evaluation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (j) { return { status: res.status, json: j }; });
      })
      .then(function (r) {
        if (r.status === 200 && r.json && r.json.url) {
          window.location.href = r.json.url;
          return;
        }
        showError((r.json && r.json.message) || L.genericError);
        submitBtn.disabled = false;
        submitBtn.textContent = submitOriginalLabel;
      })
      .catch(function () {
        showError(L.networkError);
        submitBtn.disabled = false;
        submitBtn.textContent = submitOriginalLabel;
      });
  }

  function bindCtas() {
    var nodes = document.querySelectorAll('[data-track^="cta-evaluation"]');
    Array.prototype.forEach.call(nodes, function (node) {
      node.addEventListener("click", function (e) {
        e.preventDefault();
        open(location.pathname);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindCtas);
  } else {
    bindCtas();
  }
})();
