/* NEXURADATA — Cookie consent (Loi 25 / Quebec) ----------------------------
 * Affiche un bandeau au premier chargement.
 * Stocke le choix dans localStorage ("nxd_cookie_consent" = "accept" | "reject").
 * Bilingue selon <html lang>. Aucune dépendance, aucun tracking par défaut.
 * --------------------------------------------------------------------------*/
(function () {
    "use strict";
    var KEY = "nxd_cookie_consent";
    try {
        if (localStorage.getItem(KEY)) return;
    } catch (e) {
        return;
    }

    var lang = (document.documentElement.lang || "fr").toLowerCase().slice(0, 2);
    var isFR = lang === "fr";

    var t = isFR
        ? {
            prompt: "~/privacy",
            title: "Témoins essentiels uniquement",
            body:
                "Sécurité, formulaire de dossier, préférence linguistique. Aucun pixel publicitaire, aucun traceur tiers. Conformément à la Loi 25 du Québec, vous gardez le contrôle.",
            accept: "Accepter",
            reject: "Refuser",
            link: "Politique de confidentialité",
            href: "/politique-confidentialite.html"
        }
        : {
            prompt: "~/privacy",
            title: "Essential cookies only",
            body:
                "Security, case form, language preference. No advertising pixels, no third-party trackers. Under Quebec's Law 25, the choice is yours.",
            link: "Privacy policy",
            href: "/en/politique-confidentialite.html"
        };

    function el(tag, props, children) {
        var node = document.createElement(tag);
        if (props) for (var k in props) {
            if (k === "class") node.className = props[k];
            else if (k === "html") node.innerHTML = props[k];
            else node.setAttribute(k, props[k]);
        }
        if (children) children.forEach(function (c) { node.appendChild(c); });
        return node;
    }

    function mount() {
        var banner = el("div", { class: "nxd-consent", role: "dialog", "aria-labelledby": "nxd-consent-title", "aria-describedby": "nxd-consent-body" });
        var inner = el("div", { class: "nxd-consent-inner" });
        var eyebrow = el("p", { class: "nxd-consent-eyebrow", id: "nxd-consent-title" });
        eyebrow.innerHTML = '<span class="nxd-consent-dot" aria-hidden="true"></span><span class="nxd-consent-prompt">' + t.prompt + '</span><span class="nxd-consent-title">' + t.title + '</span>';
        inner.appendChild(eyebrow);

        var actions = el("div", { class: "nxd-consent-actions" });
        var reject = el("button", { type: "button", class: "nxd-consent-btn nxd-consent-btn--ghost", html: t.reject });
        var accept = el("button", { type: "button", class: "nxd-consent-btn nxd-consent-btn--primary", html: t.accept });
        actions.appendChild(reject);
        actions.appendChild(accept);
        inner.appendChild(actions);
        banner.appendChild(inner);
        document.body.appendChild(banner);
        requestAnimationFrame(function () { banner.classList.add("is-visible"); });

        function close(choice) {
            try { localStorage.setItem(KEY, choice); } catch (e) { }
            banner.classList.remove("is-visible");
            setTimeout(function () { banner.remove(); }, 250);
        }
        accept.addEventListener("click", function () { close("accept"); });
        reject.addEventListener("click", function () { close("reject"); });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }
})();
