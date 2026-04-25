/* NEXURADATA — Cookie consent (Loi 25 / Quebec) ----------------------------
 * Single-language notice based on <html lang>. Stores choice in localStorage
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

    var docLang = (document.documentElement.getAttribute("lang") || "fr").toLowerCase();
    var isEn = docLang.indexOf("en") === 0;

    var fr = {
        title: "Témoins essentiels uniquement",
        body: "Sécurité, formulaire de dossier, préférence linguistique. Aucun témoin publicitaire, aucun traceur tiers. Conformément à la Loi 25 du Québec, vous gardez le contrôle.",
        link: "Politique de confidentialité",
        href: "/politique-confidentialite.html",
        accept: "Accepter",
        reject: "Refuser",
        head: "Témoins · Cookies"
    };
    var en = {
        title: "Essential cookies only",
        body: "Security, case form, language preference. No advertising cookies, no third-party trackers. Under Quebec's Law 25, the choice remains yours.",
        link: "Privacy policy",
        href: "/en/politique-confidentialite.html",
        accept: "Accept",
        reject: "Decline",
        head: "Cookies · Privacy"
    };

    var t = isEn ? en : fr;

    function mount() {
        var banner = document.createElement("div");
        banner.className = "nxd-consent";
        banner.setAttribute("role", "dialog");
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

        var body = document.createElement("p");
        body.className = "nxd-consent-body";
        body.innerHTML =
            '<strong class="nxd-consent-title">' + t.title + '.</strong> ' +
            t.body + ' <a href="' + t.href + '">' + t.link + '</a>.';
        inner.appendChild(body);

        var actions = document.createElement("div");
        actions.className = "nxd-consent-actions";

        var reject = document.createElement("button");
        reject.type = "button";
        reject.className = "nxd-consent-btn nxd-consent-btn--ghost";
        reject.textContent = t.reject;

        var accept = document.createElement("button");
        accept.type = "button";
        accept.className = "nxd-consent-btn nxd-consent-btn--primary";
        accept.textContent = t.accept;

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