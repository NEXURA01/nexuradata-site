/* NEXURADATA — Instant quote estimator -------------------------------------
 * Pricing matrix (CAD) for Montreal market, 2026.
 * Bilingual via document.documentElement.lang.
 * --------------------------------------------------------------------------*/
(function () {
    "use strict";
    var form = document.getElementById("quote-form");
    if (!form) return;

    var resultEl = document.getElementById("quote-result");
    var ctaEl = document.getElementById("quote-cta");
    var lang = (document.documentElement.lang || "fr").toLowerCase().slice(0, 2);
    var isFR = lang === "fr";

    // Base price ranges [min, max] in CAD per device × issue
    var matrix = {
        phone: {
            logical: [275, 475],
            not_detected: [400, 750],
            mechanical: [550, 950],
            liquid: [475, 875],
            encrypted: [600, 1100],
            raid_fail: [400, 750]
        },
        laptop: {
            logical: [275, 525],
            not_detected: [475, 950],
            mechanical: [650, 1300],
            liquid: [675, 1350],
            encrypted: [700, 1400],
            raid_fail: [800, 1500]
        },
        hdd: {
            logical: [300, 550],
            not_detected: [550, 1100],
            mechanical: [800, 1600],
            liquid: [850, 1700],
            encrypted: [700, 1400],
            raid_fail: [950, 1900]
        },
        ssd: {
            logical: [350, 650],
            not_detected: [700, 1400],
            mechanical: [900, 1800],
            liquid: [950, 1900],
            encrypted: [800, 1600],
            raid_fail: [1000, 2000]
        },
        usb: {
            logical: [225, 425],
            not_detected: [375, 750],
            mechanical: [475, 900],
            liquid: [475, 925],
            encrypted: [550, 1050],
            raid_fail: [400, 800]
        },
        raid: {
            logical: [950, 1850],
            not_detected: [1500, 2900],
            mechanical: [1900, 3800],
            liquid: [2200, 4400],
            encrypted: [1700, 3400],
            raid_fail: [1800, 3600]
        }
    };

    var urgencyMul = { standard: 1.0, priority: 1.55, emergency: 2.25 };

    var labels = {
        fr: {
            delay: { standard: "5 à 10 jours ouvrables", priority: "2 à 3 jours ouvrables", emergency: "24 à 48 heures, 7j/7" },
            success: { phone: "82–94 %", laptop: "88–96 %", hdd: "90–97 %", ssd: "78–92 %", usb: "92–98 %", raid: "85–95 %" },
            heading: "Estimation pour votre cas",
            rangePrefix: "Fourchette",
            delayLabel: "Délai estimé",
            successLabel: "Taux de succès historique",
            noteLabel: "À retenir",
            notes: {
                liquid: "Ne pas rallumer l'appareil. Apporter immédiatement.",
                mechanical: "Cesser toute manipulation. Risque d'aggravation.",
                raid_fail: "Ne pas reconstruire le RAID avant analyse.",
                encrypted: "Ne pas formater. Conserver les notes de rançon.",
                logical: "Ne plus utiliser l'appareil pour éviter d'écraser les données.",
                not_detected: "Ne pas multiplier les redémarrages."
            },
            ctaCase: "Ouvrir mon dossier",
            ctaUrgent: "Joindre le labo · 24 h"
        },
        en: {
            delay: { standard: "5 to 10 business days", priority: "2 to 3 business days", emergency: "24 to 48 hours, 7 days/week" },
            success: { phone: "82–94%", laptop: "88–96%", hdd: "90–97%", ssd: "78–92%", usb: "92–98%", raid: "85–95%" },
            heading: "Estimate for your case",
            rangePrefix: "Range",
            delayLabel: "Estimated turnaround",
            successLabel: "Historical success rate",
            noteLabel: "Important",
            notes: {
                liquid: "Do not power the device back on. Bring it in immediately.",
                mechanical: "Stop using the device. Further use causes damage.",
                raid_fail: "Do not rebuild the RAID before analysis.",
                encrypted: "Do not reformat. Keep the ransom notes.",
                logical: "Stop using the device to avoid overwriting data.",
                not_detected: "Do not keep restarting it."
            },
            ctaCase: "Open my case",
            ctaUrgent: "Reach the lab · 24 h"
        }
    };

    var L = labels[isFR ? "fr" : "en"];

    function formatCAD(n) {
        return n.toLocaleString(isFR ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
    }

    function selectedValue(name) {
        var el = form.querySelector('input[name="' + name + '"]:checked');
        return el ? el.value : null;
    }

    function render() {
        var device = selectedValue("device");
        var issue = selectedValue("issue");
        var urgency = selectedValue("urgency") || "standard";

        if (!device || !issue) {
            // keep placeholder
            return;
        }

        var base = matrix[device] && matrix[device][issue];
        if (!base) return;

        var mul = urgencyMul[urgency] || 1;
        var min = Math.round(base[0] * mul / 25) * 25;
        var max = Math.round(base[1] * mul / 25) * 25;

        var note = L.notes[issue] || "";

        resultEl.innerHTML =
            '<p class="quote-result-eyebrow"><span class="quote-result-prompt">~/estimate</span> ' + L.heading + '</p>' +
            '<p class="quote-result-range"><span class="quote-result-currency">' + formatCAD(min) + '</span><span class="quote-result-sep">—</span><span class="quote-result-currency">' + formatCAD(max) + '</span></p>' +
            '<dl class="quote-result-meta">' +
            '<div><dt>' + L.delayLabel + '</dt><dd>' + L.delay[urgency] + '</dd></div>' +
            '<div><dt>' + L.successLabel + '</dt><dd>' + L.success[device] + '</dd></div>' +
            '</dl>' +
            (note ? '<p class="quote-result-note"><strong>' + L.noteLabel + ' :</strong> ' + note + '</p>' : '');

        if (ctaEl) {
            ctaEl.textContent = urgency === "emergency" ? L.ctaUrgent : L.ctaCase;
            ctaEl.setAttribute("href", "#contact");
        }
    }

    form.addEventListener("change", render);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
})();
