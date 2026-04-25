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
        },

        // ─── Tool 7a : Recovery playbook ──────────────────────────────
        playbook: {
            title: "Protocole de récupération",
            build: function () {
                // Decision matrix: scenario → ordered steps
                var protocols = {
                    hdd_logical: {
                        label: "HDD — suppression / formatage / partition perdue",
                        risk: "Faible", duration: "2 à 6 h",
                        steps: [
                            "Photographier l'étiquette (modèle, S/N, capacité, date) avant tout branchement.",
                            "Brancher via bloqueur d'écriture (WriteBlocker Tableau ou Atola TaskForce).",
                            "Vérifier la santé SMART : <code>smartctl -a /dev/sdX</code>.",
                            "Imager intégralement avec ddrescue (préset « disque sain ») vers <code>/mnt/lab/NX-XXXX/raw.img</code>.",
                            "Calculer SHA-256 de l'image (outil « Empreinte forensique »).",
                            "Travailler exclusivement sur l'image (jamais sur l'original).",
                            "Reconstruction logique avec R-Studio / UFS Explorer / TestDisk selon le système de fichiers.",
                            "Triage des fichiers récupérés vs. liste de priorités du client.",
                            "Livrable chiffré (VeraCrypt ou AES-256 ZIP), SHA-256 du livrable consigné."
                        ]
                    },
                    hdd_mechanical: {
                        label: "HDD — bruit, cliquetis, panne mécanique",
                        risk: "Élevé", duration: "1 à 5 j",
                        steps: [
                            "<strong>NE JAMAIS RÉ-ALIMENTER</strong> sans diagnostic. Chaque démarrage aggrave les dégâts.",
                            "Photographier extérieur. Identifier famille (WD, Seagate, Toshiba) et plate-forme.",
                            "Diagnostic non destructif Atola Insight : alimenter via régulateur, lire bas niveau.",
                            "Décision : tête / moteur / plateaux ? Documenter au journal de session.",
                            "Si têtes HS : commander donneur compatible (HDDZone, ACE Lab marketplace), même firmware family.",
                            "Ouverture en hotte ISO 5 : remplacement HSA, rotation manuelle si plateaux collés.",
                            "Imagerie immédiate avec PC-3000 ou DeepSpar DDI — préset « disque dégradé », passes courtes.",
                            "Si imagerie partielle, imagerie head-by-head pour minimiser usure.",
                            "Reconstruction logique sur image. Triage. Livrable chiffré + SHA-256.",
                            "Retour disque dans sac ESD scellé, étiquette « Hors usage »."
                        ]
                    },
                    ssd_dead: {
                        label: "SSD / NVMe — non détecté",
                        risk: "Très élevé", duration: "3 à 14 j",
                        steps: [
                            "Vérifier alimentation et câble (test croisé sur poste sain).",
                            "Identifier le contrôleur (SandForce, Phison, SMI, Marvell, Samsung).",
                            "Tenter mode « safe » / technicien selon contrôleur (PC-3000 SSD).",
                            "Si contrôleur HS : transplantation NAND requise (procédure destructive sur le boîtier).",
                            "Lecture chip-off des puces NAND : programmateur (PC-3000 Flash, Soft-Center).",
                            "Réassemblage logique : XOR, ECC, désentrelacement selon famille.",
                            "Reconstruction du translation layer (FTL) : tâche la plus chronophage.",
                            "Reconstruction du système de fichiers sur image obtenue.",
                            "Note client : taux de succès 40-65 % selon contrôleur et usure NAND."
                        ]
                    },
                    raid_degraded: {
                        label: "RAID / NAS — dégradé ou plusieurs disques HS",
                        risk: "Élevé", duration: "3 à 10 j",
                        steps: [
                            "<strong>STOP</strong> — Jamais de rebuild automatique. Chaque rebuild échoué corrompt davantage.",
                            "Étiqueter chaque disque avec sa baie d'origine (1, 2, 3…) avant retrait.",
                            "Imager chaque disque individuellement (ddrescue, log distinct) vers stockage 3× la capacité totale.",
                            "Documenter SMART de chaque disque, identifier le(s) plus dégradé(s).",
                            "Pour disques mécaniquement HS : protocole « hdd_mechanical » avant imagerie.",
                            "Détection du niveau RAID, taille de bloc, ordre, parité (UFS Explorer Pro / R-Studio).",
                            "Reconstruction virtuelle du volume à partir des images uniquement.",
                            "Validation : monter en lecture seule, vérifier intégrité de fichiers témoins.",
                            "Triage selon priorités client. Livrable chiffré + SHA-256 par lot."
                        ]
                    },
                    phone_locked: {
                        label: "Téléphone — verrouillé / mot de passe oublié",
                        risk: "Variable", duration: "1 à 7 j",
                        steps: [
                            "Vérifier modèle exact, version OS, état batterie. Photographier IMEI.",
                            "iOS : si compte iCloud connu, exploration backup iCloud avec autorisation écrite + identifiants.",
                            "iOS bypass mot de passe : non garanti, dépend du modèle (checkm8 jusqu'à A11).",
                            "Android : mode bootloader, vérifier si chiffrement FDE/FBE activé.",
                            "Cellebrite UFED ou GrayKey si dossier le justifie (forensique légale uniquement).",
                            "Acquisition logique d'abord (moins invasif), physique si nécessaire et autorisé.",
                            "Extraction SMS, photos, contacts, notes selon mandat.",
                            "Livrable : rapport PDF Cellebrite + dump brut chiffré."
                        ]
                    },
                    phone_water: {
                        label: "Téléphone — liquide, choc, brûlé",
                        risk: "Très élevé", duration: "2 à 10 j",
                        steps: [
                            "<strong>NE PAS ALIMENTER.</strong> Démontage immédiat, batterie débranchée.",
                            "Bain ultrasonique solution alcool isopropylique 99 % (15-20 min).",
                            "Inspection sous microscope : corrosion, brûlures, pads décollés.",
                            "Réparation board-level si nécessaire (microsoudure) avant toute alimentation.",
                            "Si SoC HS : chip-off NAND, lecture sur programmateur, déchiffrement clé Secure Enclave (souvent impossible).",
                            "Extraction logique si l'appareil revient en vie.",
                            "Livrable : rapport honnête sur ce qui a été récupéré ou non.",
                            "Note client : prévenir avant intervention que les chances peuvent être minces."
                        ]
                    }
                };

                var node = el(
                    '<div class="ops-tool ops-tool--playbook">' +
                    '<header class="ops-tool-head"><h2>Protocole de récupération</h2><p>Choisis le scénario : tu obtiens le protocole étape par étape, le risque opérationnel et la durée typique. À imprimer ou journaliser au dossier.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field" style="grid-column:1/-1;"><span>Scénario</span><select data-pb="key">' +
                    Object.keys(protocols).map(function (k) { return '<option value="' + k + '">' + protocols[k].label + '</option>'; }).join("") +
                    '</select></label>' +
                    '<label class="field"><span>Référence dossier</span><input type="text" placeholder="NX-2026-0123" data-pb="ref"></label>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-pb-out></output>' +
                    '</div>'
                );

                function build() {
                    var key = node.querySelector('[data-pb="key"]').value;
                    var ref = node.querySelector('[data-pb="ref"]').value || "—";
                    var p = protocols[key];
                    var listHtml = p.steps.map(function (s, i) { return '<li><span class="ops-pb-num">' + String(i + 1).padStart(2, "0") + '</span><span>' + s + '</span></li>'; }).join("");
                    var listText = p.steps.map(function (s, i) {
                        return (i + 1) + ". " + s.replace(/<[^>]+>/g, "");
                    }).join("\n");
                    var record =
                        "Protocole — " + p.label + "\n" +
                        "Dossier : " + ref + " · Risque : " + p.risk + " · Durée : " + p.duration + "\n" +
                        "Date : " + new Date().toLocaleString("fr-CA") + "\n" +
                        "------------------------------------------------------------\n" +
                        listText + "\n\n" +
                        "Examinateur : Olivier Blanchet, NEXURA DATA";
                    node.querySelector("[data-pb-out]").innerHTML =
                        '<dl class="ops-out-table">' +
                        '<div><dt>Scénario</dt><dd>' + p.label + '</dd></div>' +
                        '<div><dt>Risque</dt><dd>' + p.risk + '</dd></div>' +
                        '<div class="is-total"><dt>Durée typique</dt><dd>' + p.duration + '</dd></div>' +
                        '</dl>' +
                        '<ol class="ops-pb-list">' + listHtml + '</ol>' +
                        '<div class="ops-tool-actions"><button type="button" class="button button-primary" data-pb-copy>Copier le protocole</button><button type="button" class="button button-outline" data-pb-print>Imprimer</button></div>';
                    node.querySelector("[data-pb-copy]").addEventListener("click", function (e) { copyToClipboard(record, e.currentTarget); });
                    node.querySelector("[data-pb-print]").addEventListener("click", function () { window.print(); });
                }
                node.addEventListener("change", build);
                node.addEventListener("input", build);
                setTimeout(build, 0);
                return node;
            }
        },

        // ─── Tool 7b : ddrescue command builder ───────────────────────
        ddrescue: {
            title: "Commande ddrescue",
            build: function () {
                var presets = {
                    healthy: { label: "Disque sain — première passe rapide", flags: "-f -n", note: "Première passe sans relecture, plus rapide. Bon pour SSD sains et HDD non dégradés." },
                    degraded: { label: "Disque dégradé — passes courtes", flags: "-f -n -d -K 1MiB,1MiB", note: "Saute les zones lentes pour récupérer le maximum de données saines avant fatigue." },
                    failing: { label: "Disque mourant — relecture agressive", flags: "-f -d -r3 -K 1MiB,1MiB -c 1", note: "Trois passes de relecture, blocs minimums. À utiliser après la passe « degraded »." },
                    final: { label: "Passe finale — combler les trous", flags: "-f -d -R -r5 -c 1 -b 512", note: "Lit en arrière, secteur par secteur. Très lent. À lancer en dernier recours." }
                };
                var node = el(
                    '<div class="ops-tool ops-tool--ddrescue">' +
                    '<header class="ops-tool-head"><h2>Commande ddrescue</h2><p>Génère la commande exacte selon l\'état du disque et la stratégie. Toujours imager vers un disque distinct, jamais sur le source.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Stratégie</span><select data-dd="preset">' +
                    Object.keys(presets).map(function (k) { return '<option value="' + k + '">' + presets[k].label + '</option>'; }).join("") +
                    '</select></label>' +
                    '<label class="field"><span>Source (device)</span><input type="text" value="/dev/sdb" data-dd="src"></label>' +
                    '<label class="field"><span>Image de destination</span><input type="text" value="/mnt/lab/NX-2026-0123/raw.img" data-dd="img"></label>' +
                    '<label class="field"><span>Fichier de log (mapfile)</span><input type="text" value="/mnt/lab/NX-2026-0123/raw.map" data-dd="map"></label>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-dd-out></output>' +
                    '</div>'
                );
                function build() {
                    var k = node.querySelector('[data-dd="preset"]').value;
                    var src = node.querySelector('[data-dd="src"]').value || "/dev/sdX";
                    var img = node.querySelector('[data-dd="img"]').value || "raw.img";
                    var map = node.querySelector('[data-dd="map"]').value || "raw.map";
                    var p = presets[k];
                    var cmd = "sudo ddrescue " + p.flags + " " + src + " " + img + " " + map;
                    var pre =
                        "# 1. Vérifier que le disque source n'est pas monté\n" +
                        "lsblk " + src + "\n" +
                        "sudo umount " + src + "* 2>/dev/null\n\n" +
                        "# 2. Vérifier l'espace disponible sur la destination\n" +
                        "df -h $(dirname " + img + ")\n\n" +
                        "# 3. Lancer l'imagerie\n" +
                        cmd + "\n\n" +
                        "# 4. Vérifier les zones manquantes\n" +
                        "ddrescuelog -t " + map + "\n\n" +
                        "# 5. Empreinte de l'image\n" +
                        "sha256sum " + img;
                    node.querySelector("[data-dd-out]").innerHTML =
                        '<p class="ops-out-label">Commande</p>' +
                        '<pre class="ops-out-text" data-dd-cmd></pre>' +
                        '<p class="ops-out-note">' + p.note + '</p>' +
                        '<p class="ops-out-label" style="margin-top:1rem;">Bloc complet (vérifications + commande + hash)</p>' +
                        '<pre class="ops-out-text" data-dd-pre></pre>' +
                        '<div class="ops-tool-actions"><button type="button" class="button button-primary" data-dd-copy>Copier le bloc</button></div>';
                    node.querySelector("[data-dd-cmd]").textContent = cmd;
                    node.querySelector("[data-dd-pre]").textContent = pre;
                    node.querySelector("[data-dd-copy]").addEventListener("click", function (e) { copyToClipboard(pre, e.currentTarget); });
                }
                node.addEventListener("input", build);
                node.addEventListener("change", build);
                setTimeout(build, 0);
                return node;
            }
        },

        // ─── Tool 7c : Session log ────────────────────────────────────
        session: {
            title: "Journal de session",
            build: function () {
                var STORAGE = "nxd_session_log";
                var node = el(
                    '<div class="ops-tool ops-tool--session">' +
                    '<header class="ops-tool-head"><h2>Journal de session</h2><p>Horodate chaque action effectuée sur un dossier. Sauvegarde locale (navigateur). Exportable pour la chaîne de possession.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence</span><input type="text" placeholder="NX-2026-0123" data-sl="ref"></label>' +
                    '<label class="field" style="grid-column:1/-1;"><span>Action</span><input type="text" placeholder="Ex. Imagerie ddrescue passe 1 lancée" data-sl="action"></label>' +
                    '</div>' +
                    '<div class="ops-tool-actions">' +
                    '<button type="button" class="button button-primary" data-sl-add>Horodater</button>' +
                    '<button type="button" class="button button-outline" data-sl-export>Exporter (CSV)</button>' +
                    '<button type="button" class="button button-outline" data-sl-clear>Vider</button>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-sl-out></output>' +
                    '</div>'
                );
                function getLog() { try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch (e) { return []; } }
                function saveLog(l) { localStorage.setItem(STORAGE, JSON.stringify(l)); }
                function render() {
                    var log = getLog();
                    if (!log.length) {
                        node.querySelector("[data-sl-out]").innerHTML = '<p class="ops-out-label">Aucune entrée</p><p class="ops-out-note">Saisis une action et clique « Horodater ».</p>';
                        return;
                    }
                    var rows = log.slice().reverse().map(function (e) {
                        return '<div><dt>' + new Date(e.ts).toLocaleString("fr-CA") + ' · <code>' + e.ref + '</code></dt><dd>' + e.action + '</dd></div>';
                    }).join("");
                    node.querySelector("[data-sl-out]").innerHTML = '<dl class="ops-out-table ops-sl-list">' + rows + '</dl>';
                }
                node.querySelector("[data-sl-add]").addEventListener("click", function () {
                    var ref = node.querySelector('[data-sl="ref"]').value.trim();
                    var action = node.querySelector('[data-sl="action"]').value.trim();
                    if (!ref || !action) return;
                    var log = getLog();
                    log.push({ ts: Date.now(), ref: ref, action: action });
                    saveLog(log);
                    node.querySelector('[data-sl="action"]').value = "";
                    render();
                });
                node.querySelector("[data-sl-export]").addEventListener("click", function () {
                    var log = getLog();
                    var csv = "timestamp_iso,reference,action\n" + log.map(function (e) {
                        return new Date(e.ts).toISOString() + "," + e.ref + ",\"" + e.action.replace(/"/g, '""') + "\"";
                    }).join("\n");
                    var blob = new Blob([csv], { type: "text/csv" });
                    var a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "nxd-session-" + new Date().toISOString().slice(0, 10) + ".csv";
                    a.click();
                });
                node.querySelector("[data-sl-clear]").addEventListener("click", function () {
                    if (confirm("Vider tout le journal ?")) { localStorage.removeItem(STORAGE); render(); }
                });
                render();
                return node;
            }
        },

        // ─── Tool 7d : Delivery procedure ─────────────────────────────
        delivery: {
            title: "Procédure d'envoi",
            build: function () {
                var methods = {
                    pickup: { label: "Remise en main propre (laboratoire)", fr: "remise au laboratoire sur rendez-vous", en: "in-person pickup at the lab by appointment" },
                    courier: { label: "Coursier sécurisé (Purolator priorité, signature requise)", fr: "coursier Purolator avec signature à la livraison", en: "Purolator courier, signature required on delivery" },
                    sftp: { label: "Téléversement SFTP chiffré (volumes < 200 Go)", fr: "téléversement SFTP sur lien à usage unique (expire 72 h)", en: "SFTP upload on a single-use link (expires in 72 h)" },
                    encrypted_post: { label: "Disque externe chiffré envoyé par poste recommandée", fr: "disque externe chiffré expédié par Poste Canada — Xpresspost recommandé", en: "encrypted external drive shipped by Canada Post — Xpresspost registered" }
                };
                var node = el(
                    '<div class="ops-tool ops-tool--delivery">' +
                    '<header class="ops-tool-head"><h2>Procédure d\'envoi du livrable</h2><p>Génère les instructions client : transport, chiffrement, transmission du mot de passe par canal séparé, vérification SHA-256.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence</span><input type="text" placeholder="NX-2026-0123" data-d="ref"></label>' +
                    '<label class="field"><span>Client</span><input type="text" placeholder="Marc-André" data-d="client"></label>' +
                    '<label class="field"><span>Volume livré</span><input type="text" placeholder="142 Go · 38 412 fichiers" data-d="vol"></label>' +
                    '<label class="field"><span>SHA-256 du livrable</span><input type="text" placeholder="a3f1…" data-d="sha"></label>' +
                    '<label class="field"><span>Méthode</span><select data-d="method">' +
                    Object.keys(methods).map(function (k) { return '<option value="' + k + '">' + methods[k].label + '</option>'; }).join("") +
                    '</select></label>' +
                    '<label class="field"><span>Langue</span><select data-d="lang"><option value="fr">Français</option><option value="en">English</option></select></label>' +
                    '</div>' +
                    '<output class="ops-tool-out"><pre class="ops-out-text" data-d-out></pre><div class="ops-tool-actions"><button type="button" class="button button-primary" data-d-copy>Copier le courriel</button></div></output>' +
                    '</div>'
                );

                function build() {
                    var ref = node.querySelector('[data-d="ref"]').value || "[RÉF]";
                    var client = node.querySelector('[data-d="client"]').value || "[Client]";
                    var vol = node.querySelector('[data-d="vol"]').value || "—";
                    var sha = node.querySelector('[data-d="sha"]').value || "[SHA-256 à insérer]";
                    var key = node.querySelector('[data-d="method"]').value;
                    var lang = node.querySelector('[data-d="lang"]').value;
                    var m = methods[key];
                    var date = new Date().toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { year: "numeric", month: "long", day: "numeric" });

                    var text;
                    if (lang === "fr") {
                        text =
                            "Objet : Livraison sécurisée — dossier " + ref + "\n\n" +
                            "Bonjour " + client + ",\n\n" +
                            "Votre récupération est terminée. Voici la procédure de transmission sécurisée.\n\n" +
                            "DOSSIER\n" +
                            "  Référence       : " + ref + "\n" +
                            "  Volume livré    : " + vol + "\n" +
                            "  Date            : " + date + "\n\n" +
                            "MÉTHODE DE LIVRAISON\n" +
                            "  " + m.fr.charAt(0).toUpperCase() + m.fr.slice(1) + ".\n\n" +
                            "CHIFFREMENT\n" +
                            "  Le livrable est chiffré en AES-256 (VeraCrypt). Le mot de passe vous sera\n" +
                            "  transmis SÉPARÉMENT par téléphone au numéro inscrit au dossier. Aucune clé\n" +
                            "  n'est jamais transmise par le même canal que les données. Sans exception.\n\n" +
                            "VÉRIFICATION D'INTÉGRITÉ (recommandée avant ouverture)\n" +
                            "  SHA-256 attendu :\n" +
                            "  " + sha + "\n\n" +
                            "  Windows (PowerShell) :\n" +
                            "    Get-FileHash chemin\\livrable.vc -Algorithm SHA256\n\n" +
                            "  macOS / Linux :\n" +
                            "    shasum -a 256 chemin/livrable.vc\n\n" +
                            "  Si l'empreinte ne correspond pas EXACTEMENT, ne saisissez pas le mot de\n" +
                            "  passe et contactez-nous immédiatement.\n\n" +
                            "RÉCEPTION\n" +
                            "  À l'ouverture du livrable, accusez réception par retour de courriel. Le\n" +
                            "  fichier de chaîne de possession (PDF) sera versé au dossier à ce moment.\n\n" +
                            "CONSERVATION\n" +
                            "  Vos données originales sont conservées 30 jours après livraison, dans un\n" +
                            "  conteneur chiffré, sur un volume hors ligne. Passé ce délai, destruction\n" +
                            "  cryptographique automatique. Sur demande écrite, vous pouvez exiger une\n" +
                            "  destruction immédiate avec attestation signée.\n\n" +
                            "Merci,\nOlivier Blanchet\nNEXURA DATA — Examinateur forensique certifié (CFE)\n514 555-0199";
                    } else {
                        text =
                            "Subject: Secure delivery — case " + ref + "\n\n" +
                            "Hello " + client + ",\n\n" +
                            "Your recovery is complete. Here is the secure transmission procedure.\n\n" +
                            "CASE\n" +
                            "  Reference       : " + ref + "\n" +
                            "  Volume          : " + vol + "\n" +
                            "  Date            : " + date + "\n\n" +
                            "DELIVERY METHOD\n" +
                            "  " + m.en.charAt(0).toUpperCase() + m.en.slice(1) + ".\n\n" +
                            "ENCRYPTION\n" +
                            "  The deliverable is AES-256 encrypted (VeraCrypt). The password will be\n" +
                            "  sent SEPARATELY by phone to the number on file. No key is ever sent\n" +
                            "  through the same channel as the data. No exception.\n\n" +
                            "INTEGRITY CHECK (recommended before opening)\n" +
                            "  Expected SHA-256:\n" +
                            "  " + sha + "\n\n" +
                            "  Windows (PowerShell):\n" +
                            "    Get-FileHash path\\deliverable.vc -Algorithm SHA256\n\n" +
                            "  macOS / Linux:\n" +
                            "    shasum -a 256 path/deliverable.vc\n\n" +
                            "  If the hash does NOT match EXACTLY, do not enter the password and contact\n" +
                            "  us immediately.\n\n" +
                            "ACKNOWLEDGEMENT\n" +
                            "  Once the deliverable is open, acknowledge by return email. The chain-of-\n" +
                            "  custody PDF will be added to the case at that time.\n\n" +
                            "RETENTION\n" +
                            "  Your original data is kept for 30 days after delivery, in an encrypted\n" +
                            "  container, on an offline volume. After that, automatic cryptographic\n" +
                            "  destruction. On written request, you may demand immediate destruction\n" +
                            "  with a signed attestation.\n\n" +
                            "Thank you,\nOlivier Blanchet\nNEXURA DATA — Certified Forensic Examiner (CFE)\n514 555-0199";
                    }
                    node.querySelector("[data-d-out]").textContent = text;
                }
                node.addEventListener("input", build);
                node.addEventListener("change", build);
                node.querySelector("[data-d-copy]").addEventListener("click", function (e) {
                    copyToClipboard(node.querySelector("[data-d-out]").textContent, e.currentTarget);
                });
                setTimeout(build, 0);
                return node;
            }
        },

        // ─── Tool 7 : Forensic hash (SHA-256) ─────────────────────────
        hash: {
            title: "Empreinte forensique",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--hash">' +
                    '<header class="ops-tool-head"><h2>Empreinte forensique (SHA-256)</h2><p>Glisse un fichier (image disque, dossier ZIP, livrable). Calcul local en navigateur — aucun envoi serveur. Utilisable pour la chaîne de possession.</p></header>' +
                    '<label class="ops-hash-drop" data-h-drop>' +
                    '<input type="file" data-h-file hidden>' +
                    '<span><strong>Glisser un fichier ici</strong> ou cliquer pour sélectionner</span>' +
                    '<span class="ops-hash-hint">Recommandé : &lt; 2 Go en navigateur. Plus gros : utiliser <code>certutil -hashfile fichier SHA256</code>.</span>' +
                    '</label>' +
                    '<output class="ops-tool-out" data-h-out hidden></output>' +
                    '</div>'
                );
                var drop = node.querySelector("[data-h-drop]");
                var input = node.querySelector("[data-h-file]");
                var out = node.querySelector("[data-h-out]");

                async function hashFile(file) {
                    out.hidden = false;
                    out.innerHTML = '<p class="ops-out-label">Calcul en cours…</p><p class="ops-out-meta">' + file.name + ' · ' + fmtBytes(file.size) + '</p>';
                    var t0 = performance.now();
                    var buf = await file.arrayBuffer();
                    var sha = await crypto.subtle.digest("SHA-256", buf);
                    var md = await crypto.subtle.digest("SHA-1", buf);
                    var hex = function (b) { return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join(""); };
                    var s256 = hex(sha);
                    var s1 = hex(md);
                    var dt = ((performance.now() - t0) / 1000).toFixed(2);
                    var stamp = new Date().toISOString();
                    var record =
                        "Chaîne de possession — empreinte forensique\n" +
                        "----------------------------------------------\n" +
                        "Fichier   : " + file.name + "\n" +
                        "Taille    : " + file.size + " octets (" + fmtBytes(file.size) + ")\n" +
                        "SHA-256   : " + s256 + "\n" +
                        "SHA-1     : " + s1 + "\n" +
                        "Calculé   : " + stamp + "\n" +
                        "Examinateur : Olivier Blanchet, NEXURA DATA";
                    out.innerHTML =
                        '<dl class="ops-out-table">' +
                        '<div><dt>Fichier</dt><dd><code>' + file.name + '</code></dd></div>' +
                        '<div><dt>Taille</dt><dd>' + fmtBytes(file.size) + '</dd></div>' +
                        '<div><dt>SHA-256</dt><dd><code style="word-break:break-all;">' + s256 + '</code> <button type="button" class="ops-tool-copy" data-copy="' + s256 + '">Copier</button></dd></div>' +
                        '<div><dt>SHA-1</dt><dd><code style="word-break:break-all;">' + s1 + '</code> <button type="button" class="ops-tool-copy" data-copy="' + s1 + '">Copier</button></dd></div>' +
                        '<div class="is-total"><dt>Calculé en</dt><dd>' + dt + ' s · ' + stamp + '</dd></div>' +
                        '</dl>' +
                        '<p class="ops-out-label" style="margin-top:1rem;">Bloc chaîne de possession</p>' +
                        '<pre class="ops-out-text" data-h-rec></pre>' +
                        '<div class="ops-tool-actions"><button type="button" class="button button-primary" data-h-copy>Copier le bloc</button></div>';
                    out.querySelector("[data-h-rec]").textContent = record;
                    out.addEventListener("click", function (e) {
                        var t = e.target.closest("[data-copy]");
                        if (t) copyToClipboard(t.getAttribute("data-copy"), t);
                        var c = e.target.closest("[data-h-copy]");
                        if (c) copyToClipboard(record, c);
                    });
                }
                input.addEventListener("change", function () { if (input.files[0]) hashFile(input.files[0]); });
                drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("is-drag"); });
                drop.addEventListener("dragleave", function () { drop.classList.remove("is-drag"); });
                drop.addEventListener("drop", function (e) {
                    e.preventDefault(); drop.classList.remove("is-drag");
                    if (e.dataTransfer.files[0]) hashFile(e.dataTransfer.files[0]);
                });
                return node;
            }
        },

        // ─── Tool 8 : Intake / réception ──────────────────────────────
        intake: {
            title: "Bordereau de réception",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--intake">' +
                    '<header class="ops-tool-head"><h2>Bordereau de réception</h2><p>Procès-verbal d\'entrée imprimable, signé par le client et l\'examinateur. À joindre au dossier physique.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence</span><input type="text" placeholder="NX-2026-0123" data-i="ref"></label>' +
                    '<label class="field"><span>Client</span><input type="text" placeholder="Nom complet ou raison sociale" data-i="client"></label>' +
                    '<label class="field"><span>Téléphone</span><input type="tel" placeholder="514-555-0199" data-i="tel"></label>' +
                    '<label class="field"><span>Courriel</span><input type="email" placeholder="client@exemple.com" data-i="mail"></label>' +
                    '<label class="field"><span>Type d\'appareil</span><input type="text" placeholder="HDD WD 2 To, MacBook Pro 2021…" data-i="dev"></label>' +
                    '<label class="field"><span>Numéro de série</span><input type="text" placeholder="S/N visible" data-i="sn"></label>' +
                    '<label class="field"><span>Capacité</span><input type="text" placeholder="2 To, 512 Go…" data-i="cap"></label>' +
                    '<label class="field"><span>État apparent</span><input type="text" placeholder="Cliquetis, brûlé, intact…" data-i="state"></label>' +
                    '<label class="field" style="grid-column:1/-1;"><span>Données prioritaires demandées</span><input type="text" placeholder="Photos 2018-2024, dossier comptable…" data-i="prio"></label>' +
                    '</div>' +
                    '<div class="ops-tool-actions"><button type="button" class="button button-primary" data-i-build>Générer le bordereau</button><button type="button" class="button button-outline" data-i-print>Imprimer</button></div>' +
                    '<output class="ops-tool-out" data-i-out hidden></output>' +
                    '</div>'
                );
                function build() {
                    var v = {};
                    node.querySelectorAll("[data-i]").forEach(function (el) { v[el.getAttribute("data-i")] = el.value || "—"; });
                    var date = new Date().toLocaleString("fr-CA");
                    var html =
                        '<article class="ops-pv">' +
                        '<header><h3>Procès-verbal de réception · ' + v.ref + '</h3><p>Date : ' + date + ' · Longueuil, Québec</p></header>' +
                        '<dl class="ops-out-table">' +
                        '<div><dt>Client</dt><dd>' + v.client + '</dd></div>' +
                        '<div><dt>Téléphone</dt><dd>' + v.tel + '</dd></div>' +
                        '<div><dt>Courriel</dt><dd>' + v.mail + '</dd></div>' +
                        '<div><dt>Appareil</dt><dd>' + v.dev + '</dd></div>' +
                        '<div><dt>N° de série</dt><dd><code>' + v.sn + '</code></dd></div>' +
                        '<div><dt>Capacité</dt><dd>' + v.cap + '</dd></div>' +
                        '<div><dt>État apparent</dt><dd>' + v.state + '</dd></div>' +
                        '<div class="is-total"><dt>Données prioritaires</dt><dd>' + v.prio + '</dd></div>' +
                        '</dl>' +
                        '<p class="ops-out-note">Le client confirme la remise de l\'appareil ci-dessus à NEXURA DATA aux fins d\'évaluation et, le cas échéant, de récupération de données. Aucun travail facturable n\'est entrepris avant approbation écrite d\'une soumission.</p>' +
                        '<div class="ops-pv-sign">' +
                        '<div><span>Signature client</span><div class="ops-pv-line"></div><small>' + v.client + '</small></div>' +
                        '<div><span>Signature examinateur</span><div class="ops-pv-line"></div><small>Olivier Blanchet, CFE</small></div>' +
                        '</div>' +
                        '</article>';
                    var out = node.querySelector("[data-i-out]");
                    out.hidden = false;
                    out.innerHTML = html;
                }
                node.querySelector("[data-i-build]").addEventListener("click", build);
                node.querySelector("[data-i-print]").addEventListener("click", function () { window.print(); });
                return node;
            }
        },

        // ─── Tool 9 : Status update email ─────────────────────────────
        status: {
            title: "Mise à jour client",
            build: function () {
                var templates = {
                    received: { fr: "Bonne nouvelle : votre appareil est arrivé au laboratoire et a été enregistré sous la référence indiquée. Nous procédons à l'évaluation préliminaire dans les 24-48 h ouvrables.", en: "Good news: your device has arrived at the lab and has been logged under the reference shown. We will run the preliminary assessment within the next 24-48 business hours." },
                    quoted: { fr: "Notre évaluation est terminée. Vous trouverez en pièce jointe la soumission détaillée. Aucun travail n'est entrepris avant votre approbation écrite.", en: "Our assessment is complete. Please find the detailed quote attached. No work begins until your written approval." },
                    progress: { fr: "Le travail est en cours. La phase d'imagerie est complétée et nous procédons à la reconstruction logique. Prochain point d'étape sous 48 h.", en: "Work is in progress. Imaging is complete and we are now performing logical reconstruction. Next checkpoint within 48 hours." },
                    success: { fr: "Récupération réussie. Vos données sont prêtes et chiffrées. Nous attendons le règlement final pour transmettre la clé de déchiffrement et organiser la livraison sécurisée.", en: "Recovery successful. Your data is ready and encrypted. Awaiting final payment to release the decryption key and arrange secure delivery." },
                    failed: { fr: "Malgré nos efforts, la récupération n'a pas été possible. Conformément à notre engagement, aucun frais ne vous sera facturé. L'appareil vous sera retourné dans les délais convenus.", en: "Despite our efforts, recovery was not possible. As per our commitment, no fees will be charged. The device will be returned within the agreed timeframe." }
                };
                var node = el(
                    '<div class="ops-tool ops-tool--status">' +
                    '<header class="ops-tool-head"><h2>Mise à jour client</h2><p>Génère un courriel de suivi clair, à coller dans Outlook ou Resend.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence</span><input type="text" placeholder="NX-2026-0123" data-s="ref"></label>' +
                    '<label class="field"><span>Client</span><input type="text" placeholder="Marc-André" data-s="client"></label>' +
                    '<label class="field"><span>Étape</span><select data-s="step">' +
                    '<option value="received">1. Reçu</option>' +
                    '<option value="quoted">2. Soumission émise</option>' +
                    '<option value="progress">3. En cours</option>' +
                    '<option value="success">4. Récupération réussie</option>' +
                    '<option value="failed">5. Récupération impossible</option>' +
                    '</select></label>' +
                    '<label class="field"><span>Langue</span><select data-s="lang"><option value="fr">Français</option><option value="en">English</option></select></label>' +
                    '</div>' +
                    '<output class="ops-tool-out"><pre class="ops-out-text" data-s-out></pre><div class="ops-tool-actions"><button type="button" class="button button-primary" data-s-copy>Copier</button></div></output>' +
                    '</div>'
                );
                function build() {
                    var ref = node.querySelector('[data-s="ref"]').value || "[RÉF]";
                    var client = node.querySelector('[data-s="client"]').value || (node.querySelector('[data-s="lang"]').value === "fr" ? "[Client]" : "[Client]");
                    var step = node.querySelector('[data-s="step"]').value;
                    var lang = node.querySelector('[data-s="lang"]').value;
                    var subject = lang === "fr" ? "Mise à jour dossier " + ref : "Case update " + ref;
                    var greet = lang === "fr" ? "Bonjour " + client + ",\n\n" : "Hello " + client + ",\n\n";
                    var body = templates[step][lang];
                    var portal = lang === "fr"
                        ? "\n\nVous pouvez consulter l'état de votre dossier en tout temps : https://nexuradata.ca/suivi-dossier-client-montreal.html?ref=" + ref
                        : "\n\nYou can check the status of your case at any time: https://nexuradata.ca/en/suivi-dossier-client-montreal.html?ref=" + ref;
                    var sign = lang === "fr"
                        ? "\n\nMerci,\nOlivier Blanchet\nNEXURA DATA — Examinateur forensique certifié (CFE)\n514 555-0199"
                        : "\n\nThank you,\nOlivier Blanchet\nNEXURA DATA — Certified Forensic Examiner (CFE)\n514 555-0199";
                    node.querySelector("[data-s-out]").textContent = "Objet : " + subject + "\n\n" + greet + body + portal + sign;
                }
                node.addEventListener("input", build);
                node.addEventListener("change", build);
                node.querySelector("[data-s-copy]").addEventListener("click", function (e) {
                    copyToClipboard(node.querySelector("[data-s-out]").textContent, e.currentTarget);
                });
                setTimeout(build, 0);
                return node;
            }
        },

        // ─── Tool 10 : Interac request ────────────────────────────────
        interac: {
            title: "Demande Interac",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--interac">' +
                    '<header class="ops-tool-head"><h2>Demande Interac (e-Transfer)</h2><p>Génère le message à coller dans la demande Interac, avec question secrète prête.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence</span><input type="text" placeholder="NX-2026-0123" data-e="ref"></label>' +
                    '<label class="field"><span>Montant CAD</span><input type="number" min="0" step="0.01" value="850" data-e="amt"></label>' +
                    '<label class="field"><span>Type</span><select data-e="type"><option value="acompte">Acompte</option><option value="solde">Solde final</option><option value="complet">Paiement complet</option></select></label>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-e-out></output>' +
                    '</div>'
                );
                function build() {
                    var ref = node.querySelector('[data-e="ref"]').value || "NX-XXXX";
                    var amt = parseFloat(node.querySelector('[data-e="amt"]').value) || 0;
                    var type = node.querySelector('[data-e="type"]').value;
                    // generate secret answer: 6-digit code from ref hash + amount cents
                    var seed = ref + Math.round(amt * 100);
                    var code = 0;
                    for (var i = 0; i < seed.length; i++) code = (code * 31 + seed.charCodeAt(i)) >>> 0;
                    var answer = String(code % 1000000).padStart(6, "0");
                    var question = "Référence dossier sans tirets, suivie du montant en cents (ex. NX20260123 + 85000)";
                    var msg = "Paiement " + type + " — dossier " + ref + " · NEXURA DATA";
                    node.querySelector("[data-e-out]").innerHTML =
                        '<dl class="ops-out-table">' +
                        '<div><dt>Destinataire</dt><dd><code>paiements@nexuradata.ca</code> <button type="button" class="ops-tool-copy" data-copy="paiements@nexuradata.ca">Copier</button></dd></div>' +
                        '<div><dt>Montant</dt><dd>' + fmtCAD(amt) + '</dd></div>' +
                        '<div><dt>Message</dt><dd><code>' + msg + '</code> <button type="button" class="ops-tool-copy" data-copy="' + msg + '">Copier</button></dd></div>' +
                        '<div><dt>Question secrète</dt><dd><code>' + question + '</code> <button type="button" class="ops-tool-copy" data-copy="' + question + '">Copier</button></dd></div>' +
                        '<div class="is-total"><dt>Réponse (à transmettre par téléphone)</dt><dd><code>' + answer + '</code> <button type="button" class="ops-tool-copy" data-copy="' + answer + '">Copier</button></dd></div>' +
                        '</dl>' +
                        '<p class="ops-out-note">Ne jamais transmettre la réponse par le même canal que la demande Interac. Toujours par téléphone ou SMS séparé.</p>';
                    node.querySelector("[data-e-out]").addEventListener("click", function (e) {
                        var t = e.target.closest("[data-copy]");
                        if (t) copyToClipboard(t.getAttribute("data-copy"), t);
                    });
                }
                node.addEventListener("input", build);
                node.addEventListener("change", build);
                setTimeout(build, 0);
                return node;
            }
        },

        // ─── Tool 11 : Stripe payment link ────────────────────────────
        stripe: {
            title: "Lien de paiement Stripe",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--stripe">' +
                    '<header class="ops-tool-head"><h2>Lien de paiement Stripe</h2><p>Construit l\'URL d\'un Payment Link Stripe avec montant pré-rempli, et le courriel client prêt à envoyer. À créer côté Stripe Dashboard ou via l\'API.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence</span><input type="text" placeholder="NX-2026-0123" data-p="ref"></label>' +
                    '<label class="field"><span>Client</span><input type="text" placeholder="Marc-André" data-p="client"></label>' +
                    '<label class="field"><span>Montant CAD (HT)</span><input type="number" min="0" step="0.01" value="850" data-p="amt"></label>' +
                    '<label class="field"><span>ID Payment Link Stripe</span><input type="text" placeholder="plink_1Nx…" data-p="plink"></label>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-p-out></output>' +
                    '</div>'
                );
                function build() {
                    var ref = node.querySelector('[data-p="ref"]').value || "NX-XXXX";
                    var client = node.querySelector('[data-p="client"]').value || "Client";
                    var amt = parseFloat(node.querySelector('[data-p="amt"]').value) || 0;
                    var plink = node.querySelector('[data-p="plink"]').value || "plink_PLACEHOLDER";
                    var TPS = amt * 0.05, TVQ = amt * 0.09975;
                    var total = amt + TPS + TVQ;
                    var url = "https://buy.stripe.com/" + plink + "?client_reference_id=" + encodeURIComponent(ref) + "&prefilled_email=";
                    var msg =
                        "Objet : Paiement sécurisé — dossier " + ref + "\n\n" +
                        "Bonjour " + client + ",\n\n" +
                        "Voici le lien de paiement sécurisé pour votre dossier " + ref + " :\n\n" +
                        url + "\n\n" +
                        "Détail :\n" +
                        "  Sous-total HT  : " + fmtCAD(amt) + "\n" +
                        "  TPS (5 %)      : " + fmtCAD(TPS) + "\n" +
                        "  TVQ (9,975 %)  : " + fmtCAD(TVQ) + "\n" +
                        "  Total TTC      : " + fmtCAD(total) + "\n\n" +
                        "Le paiement est traité par Stripe (PCI-DSS). Le reçu officiel est généré automatiquement.\n\n" +
                        "Merci,\nOlivier Blanchet\nNEXURA DATA";
                    node.querySelector("[data-p-out]").innerHTML =
                        '<dl class="ops-out-table">' +
                        '<div><dt>URL</dt><dd><code style="word-break:break-all;">' + url + '</code> <button type="button" class="ops-tool-copy" data-copy="' + url + '">Copier</button></dd></div>' +
                        '<div class="is-total"><dt>Total TTC</dt><dd>' + fmtCAD(total) + '</dd></div>' +
                        '</dl>' +
                        '<p class="ops-out-label" style="margin-top:1rem;">Courriel prêt</p>' +
                        '<pre class="ops-out-text" data-p-msg></pre>' +
                        '<div class="ops-tool-actions"><button type="button" class="button button-primary" data-p-copy>Copier le courriel</button></div>';
                    node.querySelector("[data-p-msg]").textContent = msg;
                    var out = node.querySelector("[data-p-out]");
                    out.addEventListener("click", function (e) {
                        var t = e.target.closest("[data-copy]");
                        if (t) copyToClipboard(t.getAttribute("data-copy"), t);
                        var c = e.target.closest("[data-p-copy]");
                        if (c) copyToClipboard(msg, c);
                    });
                }
                node.addEventListener("input", build);
                node.addEventListener("change", build);
                setTimeout(build, 0);
                return node;
            }
        },
        crypto: {
            title: "Facture crypto",
            build: function () {
                // Wallet addresses — TO REPLACE WITH REAL WALLETS BEFORE GO-LIVE
                var wallets = {
                    btc: "bc1qexamplenexuradatabtcwalletaddressxxxxxxxxxx",
                    usdc_eth: "0xExampleNexuradataUsdcEthereumWalletAddress00",
                    usdc_pol: "0xExampleNexuradataUsdcPolygonWalletAddress000",
                    usdc_sol: "ExampleNexuradataUsdcSolanaWalletAddressXXXXXX"
                };
                var node = el(
                    '<div class="ops-tool ops-tool--crypto">' +
                    '<header class="ops-tool-head"><h2>Facture crypto (BTC / USDC)</h2><p>Génère une demande de paiement avec adresse, QR, montant converti et message client prêt à envoyer. Taux récupéré en direct.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence dossier</span><input type="text" placeholder="NX-2026-0123" data-c="ref"></label>' +
                    '<label class="field"><span>Montant CAD (TTC)</span><input type="number" min="0" step="0.01" value="1250" data-c="cad"></label>' +
                    '<label class="field"><span>Devise</span><select data-c="cur">' +
                    '<option value="btc">Bitcoin (BTC)</option>' +
                    '<option value="usdc_eth">USDC — Ethereum</option>' +
                    '<option value="usdc_pol">USDC — Polygon</option>' +
                    '<option value="usdc_sol">USDC — Solana</option>' +
                    '</select></label>' +
                    '<label class="field"><span>Fenêtre (min)</span><input type="number" min="5" max="120" value="30" data-c="win"></label>' +
                    '</div>' +
                    '<div class="ops-tool-actions">' +
                    '<button type="button" class="button button-primary" data-c-gen>Récupérer le taux et générer</button>' +
                    '<span class="ops-c-status" data-c-status></span>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-c-out hidden></output>' +
                    '</div>'
                );

                var status = node.querySelector("[data-c-status]");
                var out = node.querySelector("[data-c-out]");

                function curLabel(c) {
                    return { btc: "BTC", usdc_eth: "USDC (Ethereum)", usdc_pol: "USDC (Polygon)", usdc_sol: "USDC (Solana)" }[c];
                }
                function curId(c) { return c === "btc" ? "bitcoin" : "usd-coin"; }
                function uri(c, addr, amount) {
                    if (c === "btc") return "bitcoin:" + addr + "?amount=" + amount;
                    if (c === "usdc_eth") return "ethereum:" + addr + "?value=" + amount;
                    if (c === "usdc_pol") return "polygon:" + addr + "?value=" + amount;
                    if (c === "usdc_sol") return "solana:" + addr + "?amount=" + amount;
                    return addr;
                }
                function qr(text) {
                    return "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=" + encodeURIComponent(text);
                }

                async function gen() {
                    var ref = node.querySelector('[data-c="ref"]').value || "NX-XXXX-XXXX";
                    var cad = parseFloat(node.querySelector('[data-c="cad"]').value) || 0;
                    var cur = node.querySelector('[data-c="cur"]').value;
                    var win = parseInt(node.querySelector('[data-c="win"]').value, 10) || 30;
                    if (!cad) { status.textContent = "Saisir un montant."; return; }
                    status.textContent = "Récupération du taux en cours…";
                    status.style.color = "rgba(26,26,24,0.55)";
                    var rate = 0;
                    try {
                        var r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=" + curId(cur) + "&vs_currencies=cad");
                        var j = await r.json();
                        rate = j[curId(cur)].cad;
                    } catch (e) {
                        status.textContent = "Échec API. Saisir le taux manuellement dans le message.";
                        status.style.color = "#b94a3b";
                        return;
                    }
                    var amount = cad / rate;
                    var displayAmt = cur === "btc" ? amount.toFixed(8) : amount.toFixed(2);
                    var addr = wallets[cur];
                    var expiresAt = new Date(Date.now() + win * 60000).toLocaleString("fr-CA");
                    var paymentUri = uri(cur, addr, displayAmt);

                    var msg =
                        "Objet : Demande de paiement — dossier " + ref + "\n\n" +
                        "Bonjour,\n\n" +
                        "Voici les coordonnées de paiement pour le dossier " + ref + " :\n\n" +
                        "Montant : " + displayAmt + " " + curLabel(cur) + "\n" +
                        "Équivalent : " + cad.toFixed(2) + " CAD (taux d'émission : 1 " + (cur === "btc" ? "BTC" : "USDC") + " = " + rate.toFixed(2) + " CAD)\n" +
                        "Adresse : " + addr + "\n" +
                        "Fenêtre de paiement : " + win + " minutes (jusqu'à " + expiresAt + ")\n\n" +
                        "Un reçu officiel en CAD vous sera transmis dès la confirmation du règlement sur le réseau " +
                        "(1 confirmation pour USDC, 2 confirmations pour BTC).\n\n" +
                        "Merci,\nNEXURA DATA — Laboratoire de récupération de données et forensique numérique\nLongueuil, Québec";

                    out.hidden = false;
                    status.textContent = "Taux verrouillé · " + new Date().toLocaleTimeString("fr-CA");
                    status.style.color = "#2e7a4a";
                    out.innerHTML =
                        '<div class="ops-c-grid">' +
                        '<div class="ops-c-qr"><img src="' + qr(paymentUri) + '" alt="QR de paiement" loading="lazy"></div>' +
                        '<div class="ops-c-info">' +
                        '<dl class="ops-out-table">' +
                        '<div><dt>Devise</dt><dd>' + curLabel(cur) + '</dd></div>' +
                        '<div><dt>Montant</dt><dd><code>' + displayAmt + '</code> <button type="button" class="ops-tool-copy" data-copy="' + displayAmt + '">Copier</button></dd></div>' +
                        '<div><dt>Équivalent CAD</dt><dd>' + fmtCAD(cad) + '</dd></div>' +
                        '<div><dt>Taux</dt><dd>1 = ' + fmtCAD(rate) + '</dd></div>' +
                        '<div><dt>Adresse</dt><dd><code>' + addr + '</code> <button type="button" class="ops-tool-copy" data-copy="' + addr + '">Copier</button></dd></div>' +
                        '<div><dt>URI</dt><dd><button type="button" class="ops-tool-copy" data-copy="' + paymentUri + '">Copier le lien de paiement</button></dd></div>' +
                        '<div class="is-total"><dt>Expire à</dt><dd>' + expiresAt + '</dd></div>' +
                        '</dl>' +
                        '</div>' +
                        '</div>' +
                        '<p class="ops-out-label" style="margin-top:1.25rem;">Message client prêt à envoyer</p>' +
                        '<pre class="ops-out-text" data-c-msg></pre>' +
                        '<div class="ops-tool-actions"><button type="button" class="button button-primary" data-c-copy>Copier le message</button></div>' +
                        '<p class="ops-out-note">Adresses de portefeuille à remplacer dans <code>ops-tools.js</code> avant la première facturation réelle. Conserver les clés privées hors ligne. Conversion CAD inscrite à la valeur du moment, conformément ARC / Revenu Québec.</p>';
                    out.querySelector("[data-c-msg]").textContent = msg;
                    out.addEventListener("click", function (e) {
                        var t = e.target.closest("[data-copy]");
                        if (t) copyToClipboard(t.getAttribute("data-copy"), t);
                        var c = e.target.closest("[data-c-copy]");
                        if (c) copyToClipboard(out.querySelector("[data-c-msg]").textContent, c);
                    });
                }
                node.querySelector("[data-c-gen]").addEventListener("click", gen);
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
