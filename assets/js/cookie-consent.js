/* NEXURADATA — Cookie consent (Loi 25 / Quebec) ----------------------------
 * Granular consent: essentials (always on) + analytics (opt-in).
 *
 * Storage: localStorage["nxd_cookie_consent_v2"] = JSON
 *   { essentials:true, analytics:bool, ts:number, v:2 }
 *
 * Backward compat: legacy key "nxd_cookie_consent" ("accept"|"reject")
 * is migrated on load.
 *
 * Public API exposed on window.NxdConsent:
 *   .get()   → { essentials, analytics } | null  (null = no decision yet)
 *   .open()  → reopens the preferences panel
 *   .accept(), .reject()                          (used by the banner buttons)
 *
 * Key compliance points (Loi 25):
 *   - No pre-checked boxes (analytics defaults to OFF in the panel).
 *   - "Refuse" button is as visible as "Accept".
 *   - Granular control via a "Personalize" panel.
 *   - User can change/withdraw via a footer link auto-injected here.
 *   - No analytics fires before consent (trackConversion in site.js checks this).
 * --------------------------------------------------------------------------*/
(function () {
    "use strict";

    var KEY = "nxd_cookie_consent_v2";
    var LEGACY = "nxd_cookie_consent";

    var docLang = (document.documentElement.getAttribute("lang") || "fr").toLowerCase();
    var isEn = docLang.indexOf("en") === 0;

    var fr = {
        head: "Témoins · Cookies",
        title: "Vous gardez le contrôle",
        body: "Nous utilisons des témoins essentiels (sécurité, formulaire de dossier, langue). La mesure d'audience, elle, ne se déclenche qu'avec votre accord. Conforme à la Loi 25 du Québec.",
        privacy: "Politique de confidentialité",
        privacyHref: "/politique-confidentialite.html",
        accept: "Tout accepter",
        reject: "Refuser",
        customize: "Personnaliser",
        save: "Enregistrer",
        back: "Retour",
        catEss: "Témoins essentiels",
        catEssBody: "Indispensables au fonctionnement du site (formulaire de dossier, suivi de panier, préférence linguistique). Toujours activés.",
        catAna: "Mesure d'audience interne",
        catAnaBody: "Compteur de pages anonyme hébergé chez nous (Cloudflare). Aucun témoin publicitaire, aucun partage avec un tiers.",
        always: "Toujours actif",
        footerLink: "Préférences témoins"
    };
    var en = {
        head: "Cookies · Privacy",
        title: "You stay in control",
        body: "We use essential cookies (security, case form, language). Internal audience measurement only fires with your consent. Compliant with Quebec's Law 25.",
        privacy: "Privacy policy",
        privacyHref: "/en/politique-confidentialite.html",
        accept: "Accept all",
        reject: "Decline",
        customize: "Customize",
        save: "Save",
        back: "Back",
        catEss: "Essential cookies",
        catEssBody: "Required for the site to function (case form, cart tracking, language preference). Always on.",
        catAna: "Internal audience measurement",
        catAnaBody: "Anonymous page counter hosted by us (Cloudflare). No advertising cookies, no third-party sharing.",
        always: "Always on",
        footerLink: "Cookie preferences"
    };

    var t = isEn ? en : fr;

    /* ── Storage helpers ──────────────────────────────────────────── */
    function readConsent() {
        try {
            var raw = localStorage.getItem(KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") return parsed;
            }
            // Migrate legacy string key.
            var legacy = localStorage.getItem(LEGACY);
            if (legacy === "accept" || legacy === "reject") {
                var migrated = {
                    essentials: true,
                    analytics: legacy === "accept",
                    ts: Date.now(),
                    v: 2,
                    migrated: true
                };
                localStorage.setItem(KEY, JSON.stringify(migrated));
                return migrated;
            }
        } catch (e) { /* noop */ }
        return null;
    }
    function saveConsent(consent) {
        var payload = {
            essentials: true,
            analytics: !!consent.analytics,
            ts: Date.now(),
            v: 2
        };
        try { localStorage.setItem(KEY, JSON.stringify(payload)); } catch (e) { }
        try {
            window.dispatchEvent(new CustomEvent("nxd:consent", { detail: payload }));
        } catch (e) { /* noop */ }
        return payload;
    }

    /* ── Banner / panel UI ────────────────────────────────────────── */
    var current = null;

    function buildBanner(initialMode) {
        if (current) { current.remove(); current = null; }

        var banner = document.createElement("div");
        banner.className = "nxd-consent";
        banner.setAttribute("role", "dialog");
        banner.setAttribute("aria-modal", "false");
        banner.setAttribute("aria-labelledby", "nxd-consent-head");
        banner.setAttribute("lang", isEn ? "en" : "fr");

        var inner = document.createElement("div");
        inner.className = "nxd-consent-inner";

        var head = document.createElement("p");
        head.className = "nxd-consent-eyebrow";
        head.id = "nxd-consent-head";
        head.innerHTML =
            '<span class="nxd-consent-dot" aria-hidden="true"></span>' +
            '<span class="nxd-consent-prompt">~/privacy</span>' +
            '<span class="nxd-consent-headline">' + t.head + '</span>';
        inner.appendChild(head);

        var view = document.createElement("div");
        view.className = "nxd-consent-view";
        inner.appendChild(view);

        banner.appendChild(inner);
        document.body.appendChild(banner);
        document.body.classList.add("nxd-consent-open");
        requestAnimationFrame(function () { banner.classList.add("is-visible"); });
        current = banner;

        renderView(view, initialMode || "summary");
        return banner;
    }

    function close(consent) {
        if (consent) saveConsent(consent);
        if (!current) return;
        var b = current;
        b.classList.remove("is-visible");
        document.body.classList.remove("nxd-consent-open");
        setTimeout(function () { b.remove(); }, 250);
        current = null;
    }

    function renderView(host, mode) {
        host.replaceChildren();
        if (mode === "panel") return renderPanel(host);
        return renderSummary(host);
    }

    function el(tag, attrs, children) {
        var n = document.createElement(tag);
        if (attrs) {
            for (var k in attrs) {
                if (k === "class") n.className = attrs[k];
                else if (k === "html") n.innerHTML = attrs[k];
                else if (k === "text") n.textContent = attrs[k];
                else n.setAttribute(k, attrs[k]);
            }
        }
        (children || []).forEach(function (c) {
            if (c == null) return;
            n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
        });
        return n;
    }

    function renderSummary(host) {
        host.appendChild(el("p", {
            class: "nxd-consent-body",
            html: '<strong class="nxd-consent-title">' + t.title + ".</strong> " +
                t.body + ' <a href="' + t.privacyHref + '">' + t.privacy + "</a>."
        }));

        var actions = el("div", { class: "nxd-consent-actions" });

        var reject = el("button", { type: "button", class: "nxd-consent-btn nxd-consent-btn--ghost", text: t.reject });
        var custom = el("button", { type: "button", class: "nxd-consent-btn nxd-consent-btn--ghost", text: t.customize });
        var accept = el("button", { type: "button", class: "nxd-consent-btn nxd-consent-btn--primary", text: t.accept });

        reject.addEventListener("click", function () { close({ analytics: false }); });
        custom.addEventListener("click", function () {
            renderView(current.querySelector(".nxd-consent-view"), "panel");
        });
        accept.addEventListener("click", function () { close({ analytics: true }); });

        actions.appendChild(reject);
        actions.appendChild(custom);
        actions.appendChild(accept);
        host.appendChild(actions);
    }

    function renderPanel(host) {
        var existing = readConsent() || { analytics: false };

        var list = el("div", { class: "nxd-consent-list" });

        // Essentials — always on, disabled.
        list.appendChild(buildCategoryRow({
            id: "ess",
            title: t.catEss,
            body: t.catEssBody,
            checked: true,
            disabled: true,
            badge: t.always
        }));

        // Analytics — toggleable, defaults to current saved value (OFF if first visit).
        var anaRow = buildCategoryRow({
            id: "ana",
            title: t.catAna,
            body: t.catAnaBody,
            checked: !!existing.analytics,
            disabled: false
        });
        list.appendChild(anaRow);

        host.appendChild(list);

        var actions = el("div", { class: "nxd-consent-actions" });
        var back = el("button", { type: "button", class: "nxd-consent-btn nxd-consent-btn--ghost", text: t.back });
        var save = el("button", { type: "button", class: "nxd-consent-btn nxd-consent-btn--primary", text: t.save });

        back.addEventListener("click", function () {
            renderView(current.querySelector(".nxd-consent-view"), "summary");
        });
        save.addEventListener("click", function () {
            var input = anaRow.querySelector("input[type=checkbox]");
            close({ analytics: !!(input && input.checked) });
        });

        actions.appendChild(back);
        actions.appendChild(save);
        host.appendChild(actions);
    }

    function buildCategoryRow(opts) {
        var wrap = el("div", { class: "nxd-consent-cat" });
        var headRow = el("div", { class: "nxd-consent-cat-head" });

        var title = el("span", { class: "nxd-consent-cat-title", text: opts.title });
        headRow.appendChild(title);

        if (opts.badge) {
            headRow.appendChild(el("span", { class: "nxd-consent-cat-badge", text: opts.badge }));
        } else {
            var label = el("label", { class: "nxd-consent-toggle" });
            var input = el("input", { type: "checkbox" });
            if (opts.checked) input.setAttribute("checked", "checked");
            if (opts.disabled) input.setAttribute("disabled", "disabled");
            input.dataset.cat = opts.id;
            var slider = el("span", { class: "nxd-consent-slider", "aria-hidden": "true" });
            label.appendChild(input);
            label.appendChild(slider);
            headRow.appendChild(label);
        }

        wrap.appendChild(headRow);
        wrap.appendChild(el("p", { class: "nxd-consent-cat-body", text: opts.body }));
        return wrap;
    }

    /* ── Footer "Cookie preferences" auto-injection ──────────────── */
    function injectFooterLink() {
        document.querySelectorAll(".footer-legal").forEach(function (legal) {
            if (legal.querySelector("[data-nxd-consent-open]")) return;
            var a = document.createElement("a");
            a.href = "#";
            a.dataset.nxdConsentOpen = "true";
            a.textContent = t.footerLink;
            a.addEventListener("click", function (e) {
                e.preventDefault();
                buildBanner("panel");
            });
            legal.appendChild(a);
        });
    }

    /* ── Public API ──────────────────────────────────────────────── */
    window.NxdConsent = {
        get: function () {
            var c = readConsent();
            if (!c) return null;
            return { essentials: true, analytics: !!c.analytics };
        },
        open: function () { buildBanner("panel"); },
        accept: function () { close({ analytics: true }); },
        reject: function () { close({ analytics: false }); }
    };

    /* ── Boot ────────────────────────────────────────────────────── */
    function boot() {
        injectFooterLink();
        if (!readConsent()) buildBanner("summary");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
