/* NEXURADATA — Ops instant tools loader -----------------------------------
 * Lazy-loads tool widgets into the staging area on demand.
 * No external dependencies. All computations happen in-browser.
 * --------------------------------------------------------------------------*/
(function () {
    "use strict";
    var stage = document.querySelector("[data-tools-stage]");
    var menu = document.querySelectorAll(".ops-tools-item");
    if (!stage || !menu.length) return;

    // ─── Helpers ───────────────────────────────────────────────────────────
    function el(html) {
        var t = document.createElement("template");
        t.innerHTML = html.trim();
        return t.content.firstChild;
    }
    function fmtCAD(n) {
        return n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });
    }
    function fmtBytes(n) {
        var u = ["o", "Ko", "Mo", "Go", "To", "Po"];
        var i = 0;
        while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
        return n.toFixed(n >= 100 || i === 0 ? 0 : 2) + " " + u[i];
    }
    function fmtDuration(seconds) {
        if (seconds < 60) return seconds.toFixed(0) + " s";
        if (seconds < 3600) return (seconds / 60).toFixed(1) + " min";
        if (seconds < 86400) return (seconds / 3600).toFixed(1) + " h";
        return (seconds / 86400).toFixed(1) + " j";
    }
    function copyToClipboard(text, btn) {
        navigator.clipboard.writeText(text).then(function () {
            var prev = btn.textContent;
            btn.textContent = "Copié ✓";
            btn.classList.add("is-copied");
            setTimeout(function () { btn.textContent = prev; btn.classList.remove("is-copied"); }, 1600);
        });
    }

    // ─── Tool 1 : Quote estimator ─────────────────────────────────────────
    var matrix = {
        phone: { logical: [275, 475], not_detected: [400, 750], mechanical: [550, 950], liquid: [475, 875], encrypted: [600, 1100], raid_fail: [400, 750] },
        laptop: { logical: [275, 525], not_detected: [475, 950], mechanical: [650, 1300], liquid: [675, 1350], encrypted: [700, 1400], raid_fail: [800, 1500] },
        hdd: { logical: [300, 550], not_detected: [550, 1100], mechanical: [800, 1600], liquid: [850, 1700], encrypted: [700, 1400], raid_fail: [950, 1900] },
        ssd: { logical: [350, 650], not_detected: [700, 1400], mechanical: [900, 1800], liquid: [950, 1900], encrypted: [800, 1600], raid_fail: [1000, 2000] },
        usb: { logical: [225, 425], not_detected: [375, 750], mechanical: [475, 900], liquid: [475, 925], encrypted: [550, 1050], raid_fail: [400, 800] },
        raid: { logical: [950, 1850], not_detected: [1500, 2900], mechanical: [1900, 3800], liquid: [2200, 4400], encrypted: [1700, 3400], raid_fail: [1800, 3600] }
    };
    var urgencyMul = { standard: 1.0, priority: 1.55, emergency: 2.25 };
    var urgencyDelay = { standard: "5 à 10 jours ouvrables", priority: "2 à 3 jours ouvrables", emergency: "24 à 48 h" };
    var deviceLbl = { phone: "Téléphone / tablette", laptop: "Portable / ordinateur", hdd: "HDD", ssd: "SSD / NVMe", usb: "Clé USB / SD", raid: "RAID / NAS / serveur" };
    var issueLbl = { logical: "Suppression / formatage", not_detected: "Non détecté", mechanical: "Panne mécanique", liquid: "Liquide / feu / choc", encrypted: "Chiffré / rançongiciel", raid_fail: "RAID dégradé" };

    var tools = {
        quote: {
            title: "Estimation devis",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--quote">' +
                    '<header class="ops-tool-head"><h2>Estimation devis</h2><p>Sélectionnez l\'appareil, le problème et l\'urgence pour obtenir une fourchette à communiquer au client.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Appareil</span><select data-q="device">' +
                    Object.keys(deviceLbl).map(function (k) { return '<option value="' + k + '">' + deviceLbl[k] + '</option>'; }).join("") +
                    '</select></label>' +
                    '<label class="field"><span>Problème</span><select data-q="issue">' +
                    Object.keys(issueLbl).map(function (k) { return '<option value="' + k + '">' + issueLbl[k] + '</option>'; }).join("") +
                    '</select></label>' +
                    '<label class="field"><span>Urgence</span><select data-q="urgency"><option value="standard">Standard</option><option value="priority">Prioritaire</option><option value="emergency">Urgence</option></select></label>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-q-out></output>' +
                    '</div>'
                );
                function refresh() {
                    var d = node.querySelector('[data-q="device"]').value;
                    var i = node.querySelector('[data-q="issue"]').value;
                    var u = node.querySelector('[data-q="urgency"]').value;
                    var base = matrix[d][i];
                    var mul = urgencyMul[u];
                    var min = Math.round(base[0] * mul / 25) * 25;
                    var max = Math.round(base[1] * mul / 25) * 25;
                    node.querySelector("[data-q-out]").innerHTML =
                        '<p class="ops-out-label">Fourchette à communiquer</p>' +
                        '<p class="ops-out-value">' + fmtCAD(min) + ' — ' + fmtCAD(max) + '</p>' +
                        '<p class="ops-out-meta">Délai : <strong>' + urgencyDelay[u] + '</strong> · Multiplicateur ×' + mul.toFixed(2) + '</p>';
                }
                node.addEventListener("change", refresh);
                setTimeout(refresh, 0);
                return node;
            }
        },

        // ─── Tool 2 : RAID calculator ─────────────────────────────────────
        raid: {
            title: "Calculateur RAID",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--raid">' +
                    '<header class="ops-tool-head"><h2>Calculateur RAID</h2><p>Capacité utile et tolérance aux pannes selon le niveau et le nombre de disques.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Niveau</span><select data-r="level">' +
                    ['0', '1', '5', '6', '10', '50', '60'].map(function (l) { return '<option value="' + l + '">RAID ' + l + '</option>'; }).join("") +
                    '</select></label>' +
                    '<label class="field"><span>Nombre de disques</span><input type="number" min="2" max="64" value="4" data-r="n"></label>' +
                    '<label class="field"><span>Taille par disque (To)</span><input type="number" min="0.1" step="0.1" value="4" data-r="size"></label>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-r-out></output>' +
                    '</div>'
                );
                function calc() {
                    var lvl = node.querySelector('[data-r="level"]').value;
                    var n = parseInt(node.querySelector('[data-r="n"]').value, 10) || 0;
                    var s = parseFloat(node.querySelector('[data-r="size"]').value) || 0;
                    var usable = 0, tol = 0, minD = 2, note = "";
                    switch (lvl) {
                        case "0": usable = n * s; tol = 0; minD = 2; note = "Aucune redondance. Une panne = perte totale."; break;
                        case "1": usable = (n / 2) * s; tol = 1; minD = 2; note = "Miroir. Tolère 1 panne par paire."; break;
                        case "5": usable = (n - 1) * s; tol = 1; minD = 3; note = "Parité distribuée. Tolère 1 panne."; break;
                        case "6": usable = (n - 2) * s; tol = 2; minD = 4; note = "Double parité. Tolère 2 pannes."; break;
                        case "10": usable = (n / 2) * s; tol = Math.floor(n / 2); minD = 4; note = "Miroir + entrelacement. n doit être pair."; break;
                        case "50": usable = (n - 2) * s; tol = 2; minD = 6; note = "Deux groupes RAID 5 entrelacés."; break;
                        case "60": usable = (n - 4) * s; tol = 4; minD = 8; note = "Deux groupes RAID 6 entrelacés."; break;
                    }
                    var ok = n >= minD && (lvl !== "10" || n % 2 === 0);
                    node.querySelector("[data-r-out]").innerHTML =
                        '<p class="ops-out-label">Capacité utile</p>' +
                        '<p class="ops-out-value">' + (ok ? usable.toFixed(2) + " To" : "Configuration invalide") + '</p>' +
                        '<p class="ops-out-meta">Tolérance aux pannes : <strong>' + tol + ' disque(s)</strong> · Minimum requis : ' + minD + ' disques</p>' +
                        '<p class="ops-out-note">' + note + '</p>';
                }
                node.addEventListener("input", calc);
                node.addEventListener("change", calc);
                setTimeout(calc, 0);
                return node;
            }
        },

        // ─── Tool 3 : Transfer time ───────────────────────────────────────
        transfer: {
            title: "Durée de transfert",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--transfer">' +
                    '<header class="ops-tool-head"><h2>Durée de transfert</h2><p>Estime le temps d\'imagerie ou de copie selon la taille et le débit soutenu.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Taille</span><input type="number" min="1" value="500" data-t="size"></label>' +
                    '<label class="field"><span>Unité</span><select data-t="unit"><option value="GB">Go</option><option value="TB">To</option><option value="MB">Mo</option></select></label>' +
                    '<label class="field"><span>Débit soutenu</span><input type="number" min="1" value="180" data-t="rate"></label>' +
                    '<label class="field"><span>Unité débit</span><select data-t="rateUnit"><option value="MBs">Mo/s</option><option value="MBps">Mio/s</option><option value="Gbps">Gb/s</option></select></label>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-t-out></output>' +
                    '</div>'
                );
                function calc() {
                    var size = parseFloat(node.querySelector('[data-t="size"]').value) || 0;
                    var unit = node.querySelector('[data-t="unit"]').value;
                    var rate = parseFloat(node.querySelector('[data-t="rate"]').value) || 0;
                    var rUnit = node.querySelector('[data-t="rateUnit"]').value;
                    var bytes = size * (unit === "TB" ? 1099511627776 : unit === "GB" ? 1073741824 : 1048576);
                    var Bps = rate * (rUnit === "Gbps" ? 125000000 : rUnit === "MBps" ? 1048576 : 1000000);
                    var sec = Bps > 0 ? bytes / Bps : 0;
                    node.querySelector("[data-t-out]").innerHTML =
                        '<p class="ops-out-label">Durée estimée</p>' +
                        '<p class="ops-out-value">' + (sec ? fmtDuration(sec) : "—") + '</p>' +
                        '<p class="ops-out-meta">Volume : <strong>' + fmtBytes(bytes) + '</strong></p>' +
                        '<p class="ops-out-note">Prévoyez +20–40 % pour secteurs défectueux ou imagerie en mode lent.</p>';
                }
                node.addEventListener("input", calc);
                node.addEventListener("change", calc);
                setTimeout(calc, 0);
                return node;
            }
        },

        // ─── Tool 4 : Quebec taxes ────────────────────────────────────────
        tax: {
            title: "Taxes Québec",
            build: function () {
                var TPS = 0.05, TVQ = 0.09975;
                var node = el(
                    '<div class="ops-tool ops-tool--tax">' +
                    '<header class="ops-tool-head"><h2>Taxes Québec (TPS + TVQ)</h2><p>TPS 5 % + TVQ 9,975 %. Bascule HT ↔ TTC.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Mode</span><select data-x="mode"><option value="ht">À partir du prix HT</option><option value="ttc">À partir du prix TTC</option></select></label>' +
                    '<label class="field"><span>Montant</span><input type="number" min="0" step="0.01" value="850" data-x="amt"></label>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-x-out></output>' +
                    '</div>'
                );
                function calc() {
                    var amt = parseFloat(node.querySelector('[data-x="amt"]').value) || 0;
                    var mode = node.querySelector('[data-x="mode"]').value;
                    var ht, tps, tvq, ttc;
                    if (mode === "ht") {
                        ht = amt; tps = ht * TPS; tvq = ht * TVQ; ttc = ht + tps + tvq;
                    } else {
                        ttc = amt; ht = ttc / (1 + TPS + TVQ); tps = ht * TPS; tvq = ht * TVQ;
                    }
                    node.querySelector("[data-x-out]").innerHTML =
                        '<dl class="ops-out-table">' +
                        '<div><dt>Sous-total HT</dt><dd>' + fmtCAD(ht) + '</dd></div>' +
                        '<div><dt>TPS (5 %)</dt><dd>' + fmtCAD(tps) + '</dd></div>' +
                        '<div><dt>TVQ (9,975 %)</dt><dd>' + fmtCAD(tvq) + '</dd></div>' +
                        '<div class="is-total"><dt>Total TTC</dt><dd>' + fmtCAD(ttc) + '</dd></div>' +
                        '</dl>';
                }
                node.addEventListener("input", calc);
                node.addEventListener("change", calc);
                setTimeout(calc, 0);
                return node;
            }
        },

        // ─── Tool 5 : Case reference generator ────────────────────────────
        reference: {
            title: "Référence dossier",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--ref">' +
                    '<header class="ops-tool-head"><h2>Référence dossier</h2><p>Génère un identifiant unique <code>NX-AAAA-NNNN</code> et un jeton de suivi à transmettre au client.</p></header>' +
                    '<div class="ops-tool-actions"><button type="button" class="button button-primary" data-ref-gen>Générer</button></div>' +
                    '<output class="ops-tool-out" data-ref-out></output>' +
                    '</div>'
                );
                function pad(n, l) { return String(n).padStart(l, "0"); }
                function token(len) {
                    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I
                    var arr = new Uint32Array(len);
                    crypto.getRandomValues(arr);
                    var s = "";
                    for (var i = 0; i < len; i++) s += alphabet[arr[i] % alphabet.length];
                    return s.slice(0, 4) + "-" + s.slice(4, 8);
                }
                function gen() {
                    var year = new Date().getFullYear();
                    var rnd = new Uint32Array(1);
                    crypto.getRandomValues(rnd);
                    var num = rnd[0] % 10000;
                    var ref = "NX-" + year + "-" + pad(num, 4);
                    var tok = token(8);
                    node.querySelector("[data-ref-out]").innerHTML =
                        '<dl class="ops-out-table">' +
                        '<div><dt>Référence</dt><dd><code>' + ref + '</code> <button type="button" class="ops-tool-copy" data-copy="' + ref + '">Copier</button></dd></div>' +
                        '<div><dt>Jeton de suivi</dt><dd><code>' + tok + '</code> <button type="button" class="ops-tool-copy" data-copy="' + tok + '">Copier</button></dd></div>' +
                        '<div><dt>URL portail</dt><dd><code>nexuradata.ca/suivi?ref=' + ref + '</code> <button type="button" class="ops-tool-copy" data-copy="https://nexuradata.ca/suivi-dossier-client-montreal.html?ref=' + ref + '">Copier</button></dd></div>' +
                        '</dl>';
                }
                node.querySelector("[data-ref-gen]").addEventListener("click", gen);
                node.addEventListener("click", function (e) {
                    var t = e.target.closest("[data-copy]");
                    if (t) copyToClipboard(t.getAttribute("data-copy"), t);
                });
                setTimeout(gen, 0);
                return node;
            }
        },

        // ─── Tool 6 : NDA express ─────────────────────────────────────────
        nda: {
            title: "NDA express",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--nda">' +
                    '<header class="ops-tool-head"><h2>NDA express</h2><p>Génère un texte d\'entente de confidentialité prêt à copier-coller dans un courriel ou un PDF.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Nom du client</span><input type="text" placeholder="Ex. Cabinet Tremblay & Associés" data-n="party"></label>' +
                    '<label class="field"><span>Référence dossier</span><input type="text" placeholder="NX-2026-0123" data-n="ref"></label>' +
                    '<label class="field"><span>Langue</span><select data-n="lang"><option value="fr">Français</option><option value="en">English</option></select></label>' +
                    '</div>' +
                    '<output class="ops-tool-out"><pre class="ops-out-text" data-n-out></pre><div class="ops-tool-actions"><button type="button" class="button button-primary" data-n-copy>Copier le texte</button></div></output>' +
                    '</div>'
                );
                function build() {
                    var party = node.querySelector('[data-n="party"]').value || "[CLIENT]";
                    var ref = node.querySelector('[data-n="ref"]').value || "[RÉF]";
                    var lang = node.querySelector('[data-n="lang"]').value;
                    var date = new Date().toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { year: "numeric", month: "long", day: "numeric" });
                    var text;
                    if (lang === "fr") {
                        text =
                            "ENTENTE DE CONFIDENTIALITÉ — " + ref + "\n" +
                            "Date : " + date + "\n\n" +
                            "Entre : NEXURA DATA (le « Laboratoire »)\n" +
                            "Et : " + party + " (le « Client »)\n\n" +
                            "1. Objet — Le Laboratoire s'engage à traiter les supports, données et renseignements remis par le Client " +
                            "dans le cadre du dossier " + ref + " avec la plus stricte confidentialité.\n\n" +
                            "2. Engagements — Le Laboratoire (a) restreint l'accès aux personnes habilitées; (b) ne communique aucune " +
                            "donnée à un tiers sans autorisation écrite, sauf obligation légale; (c) maintient une chaîne de possession " +
                            "documentée; (d) détruit ou retourne les supports et copies à la fin du mandat selon les instructions du Client.\n\n" +
                            "3. Durée — Les obligations de confidentialité demeurent en vigueur sans limitation de temps.\n\n" +
                            "4. Droit applicable — La présente entente est régie par les lois du Québec et du Canada.\n\n" +
                            "Pour le Laboratoire : Olivier Blanchet, examinateur forensique\n" +
                            "Pour le Client : ____________________________";
                    } else {
                        text =
                            "NON-DISCLOSURE AGREEMENT — " + ref + "\n" +
                            "Date: " + date + "\n\n" +
                            "Between: NEXURA DATA (the \"Lab\")\n" +
                            "And: " + party + " (the \"Client\")\n\n" +
                            "1. Purpose — The Lab undertakes to handle the media, data and information provided by the Client in connection with " +
                            "case " + ref + " under strict confidentiality.\n\n" +
                            "2. Undertakings — The Lab shall (a) restrict access to authorized personnel; (b) disclose no data to any third party " +
                            "without the Client's written authorization, save where required by law; (c) maintain a documented chain of custody; " +
                            "(d) destroy or return media and copies at mandate completion per the Client's instructions.\n\n" +
                            "3. Term — Confidentiality obligations remain in effect without time limit.\n\n" +
                            "4. Governing law — This agreement is governed by the laws of Quebec and Canada.\n\n" +
                            "For the Lab: Olivier Blanchet, Forensic Examiner\n" +
                            "For the Client: ____________________________";
                    }
                    node.querySelector("[data-n-out]").textContent = text;
                }
                node.addEventListener("input", build);
                node.addEventListener("change", build);
                node.querySelector("[data-n-copy]").addEventListener("click", function (e) {
                    copyToClipboard(node.querySelector("[data-n-out]").textContent, e.currentTarget);
                });
                setTimeout(build, 0);
                return node;
            }
        }
    };

    // ─── Loader ────────────────────────────────────────────────────────────
    function load(name) {
        var t = tools[name];
        if (!t) return;
        stage.innerHTML = "";
        stage.appendChild(t.build());
    }

    menu.forEach(function (btn) {
        btn.addEventListener("click", function () {
            menu.forEach(function (b) { b.classList.remove("is-active"); });
            btn.classList.add("is-active");
            load(btn.getAttribute("data-tool"));
        });
    });

    // initial
    load("quote");
})();
