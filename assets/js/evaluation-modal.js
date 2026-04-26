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
            missing: "Complétez les champs requis.",
            trust: "Paiement sécurisé · Stripe · Données chiffrées"
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
            missing: "Please complete the required fields.",
            trust: "Secure payment · Stripe · Encrypted data"
        }
    };

    var L = T[LOCALE];

    // Aligne la modale sur le design system NEXURADATA (thème sombre + accent menthe + IBM Plex Sans).
    var STYLES = [
        ".nx-eval-overlay{position:fixed;inset:0;background:rgba(5,7,11,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;z-index:9999;overflow-y:auto;padding:24px 16px;animation:nxEvalFade .18s ease-out}",
        ".nx-eval-overlay.is-open{display:flex}",
        "@keyframes nxEvalFade{from{opacity:0}to{opacity:1}}",
        ".nx-eval-dialog{position:relative;background:var(--color-surface-elevated,#141822);color:var(--color-text,#eef1f4);max-width:540px;width:100%;border:1px solid var(--color-line-strong,rgba(238,241,244,.22));border-radius:var(--radius-lg,1rem);box-shadow:0 30px 80px rgba(0,0,0,.55);padding:32px 28px 26px;margin:32px 0;font-family:'IBM Plex Sans',system-ui,sans-serif}",
        ".nx-eval-eyebrow{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--color-accent,#5eead4);margin:0 0 10px}",
        ".nx-eval-dialog h2{margin:0 0 10px;font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:1.45rem;line-height:1.2;font-weight:700;letter-spacing:-0.01em;color:var(--color-text,#eef1f4)}",
        ".nx-eval-lead{margin:0 0 22px;font-size:.95rem;color:var(--color-text-soft,rgba(238,241,244,.78));line-height:1.55}",
        ".nx-eval-field{margin-bottom:16px;display:flex;flex-direction:column}",
        ".nx-eval-field label{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin-bottom:6px;color:var(--color-text-soft,rgba(238,241,244,.78))}",
        ".nx-eval-field input,.nx-eval-field textarea{font:inherit;font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:.95rem;padding:11px 13px;border:1px solid var(--color-line-strong,rgba(238,241,244,.22));border-radius:var(--radius-sm,.5rem);background:var(--color-bg-soft,#11151c);color:var(--color-text,#eef1f4);width:100%;box-sizing:border-box;transition:border-color .15s,box-shadow .15s}",
        ".nx-eval-field input::placeholder,.nx-eval-field textarea::placeholder{color:var(--color-text-muted,rgba(238,241,244,.4))}",
        ".nx-eval-field input:focus,.nx-eval-field textarea:focus{outline:none;border-color:var(--color-accent,#5eead4);box-shadow:0 0 0 3px rgba(94,234,212,.18)}",
        ".nx-eval-field textarea{min-height:96px;resize:vertical}",
        ".nx-eval-consent{display:flex;align-items:flex-start;gap:10px;font-size:.85rem;color:var(--color-text-soft,rgba(238,241,244,.78));line-height:1.5;margin:4px 0 22px;cursor:pointer}",
        ".nx-eval-consent input{margin-top:3px;flex-shrink:0;accent-color:var(--color-accent,#5eead4);width:16px;height:16px}",
        ".nx-eval-honey{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}",
        ".nx-eval-actions{display:flex;gap:12px;flex-wrap:wrap-reverse;justify-content:flex-end;margin-top:6px}",
        ".nx-eval-actions .button{flex:1;min-width:0}",
        ".nx-eval-actions .button-primary{flex:2;min-width:220px}",
        ".nx-eval-actions .button:disabled{opacity:.55;cursor:wait;transform:none}",
        ".nx-eval-error{background:rgba(248,113,113,.12);color:var(--color-error,#f87171);border:1px solid rgba(248,113,113,.35);padding:10px 14px;border-radius:var(--radius-sm,.5rem);font-size:.88rem;margin-bottom:16px;display:none;line-height:1.45}",
        ".nx-eval-error.is-shown{display:block}",
        ".nx-eval-close{position:absolute;top:14px;right:14px;background:transparent;border:0;font-size:1.6rem;cursor:pointer;color:var(--color-text-muted,rgba(238,241,244,.55));line-height:1;padding:4px 10px;border-radius:var(--radius-sm,.5rem);transition:color .15s,background .15s}",
        ".nx-eval-close:hover{color:var(--color-text,#eef1f4);background:rgba(238,241,244,.06)}",
        ".nx-eval-trust{margin:14px 0 0;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-text-muted,rgba(238,241,244,.55));text-align:center}",
        "@media(max-width:520px){.nx-eval-dialog{padding:24px 20px 20px;margin:12px 0;border-radius:var(--radius-md,.75rem)}.nx-eval-dialog h2{font-size:1.2rem}}"
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
            '<p class="nx-eval-eyebrow">NEXURADATA</p>' +
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
            '<button type="button" class="button button-secondary" data-action="cancel">' + L.cancel + '</button>' +
            '<button type="submit" class="button button-primary">' + L.submit + '</button>' +
            '</div>' +
            '<p class="nx-eval-trust">' + L.trust + '</p>' +
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
            submitBtn = overlay.querySelector("button[type='submit']");
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
