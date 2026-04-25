/* NEXURADATA — Cookie consent (Loi 25 / Quebec) ----------------------------
 * Bilingual notice (FR + EN side-by-side). Stores choice in localStorage
 * ("nxd_cookie_consent" = "accept" | "reject"). No third-party tracking.
 * --------------------------------------------------------------------------*/
(function () {
    "use strict";
    var KEY = "nxd_cookie_consent";
    try {
        if (localStorage.getItem(KEY)) return;
    } catch (e) {
        return;
    }

    var fr = {
        label: "FR",
        title: "Témoins essentiels uniquement",
        body: "Sécurité, formulaire de dossier, préférence linguistique. Aucun témoin publicitaire, aucun traceur tiers. Conformément à la Loi 25 du Québec, vous gardez le contrôle.",
        link: "Politique de confidentialité",
        href: "/politique-confidentialite.html"
    };
    var en = {
        label: "EN",
        title: "Essential cookies only",
        body: "Security, case form, language preference. No advertising cookies, no third-party trackers. Under Quebec's Law 25, the choice remains yours.",
        link: "Privacy policy",
        href: "/en/politique-confidentialite.html"
    };

    function column(t, langCode) {
        var col = document.createElement("div");
        col.className = "nxd-consent-col";
        col.setAttribute("lang", langCode);
        col.innerHTML =
            '<p class="nxd-consent-lang">' + t.label + '</p>' +
            '<p class="nxd-consent-title">' + t.title + '</p>' +
            '<p class="nxd-consent-body">' + t.body + ' <a href="' + t.href + '">' + t.link + '</a>.</p>';
        return col;
    }

    function mount() {
        var banner = document.createElement("div");
        banner.className = "nxd-consent";
        banner.setAttribute("role", "dialog");
        banner.setAttribute("aria-labelledby", "nxd-consent-head");

        var inner = document.createElement("div");
        inner.className = "nxd-consent-inner";

        var head = document.createElement("p");
        head.className = "nxd-consent-eyebrow";
        head.id = "nxd-consent-head";
        head.innerHTML =
            '<span class="nxd-consent-dot" aria-hidden="true"></span>' +
            '<span class="nxd-consent-prompt">~/privacy</span>' +
            '<span class="nxd-consent-headline">Témoins · Cookies</span>';
        inner.appendChild(head);

        var cols = document.createElement("div");
        cols.className = "nxd-consent-cols";
        cols.appendChild(column(fr, "fr"));
        cols.appendChild(column(en, "en"));
        inner.appendChild(cols);

        var actions = document.createElement("div");
        actions.className = "nxd-consent-actions";

        var reject = document.createElement("button");
        reject.type = "button";
        reject.className = "nxd-consent-btn nxd-consent-btn--ghost";
        reject.innerHTML = '<span lang="fr">Refuser</span><span class="nxd-consent-btn-sep" aria-hidden="true">·</span><span lang="en">Decline</span>';

        var accept = document.createElement("button");
        accept.type = "button";
        accept.className = "nxd-consent-btn nxd-consent-btn--primary";
        accept.innerHTML = '<span lang="fr">Accepter</span><span class="nxd-consent-btn-sep" aria-hidden="true">·</span><span lang="en">Accept</span>';

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
