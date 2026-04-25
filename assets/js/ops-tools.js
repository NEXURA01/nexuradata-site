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

        // ─── Tool 7g : PhotoRec / file carving ────────────────────────
        photorec: {
            title: "PhotoRec / carving",
            build: function () {
                var families = [
                    { id: "jpg", l: "Photos JPEG", types: "jpg" },
                    { id: "raw", l: "Photos RAW (Canon, Nikon, Sony)", types: "cr2,cr3,nef,arw,raf,dng" },
                    { id: "video", l: "Vidéos (MP4, MOV, AVI, MKV)", types: "mp4,mov,avi,mkv" },
                    { id: "doc", l: "Documents Office", types: "doc,docx,xls,xlsx,ppt,pptx,odt,ods" },
                    { id: "pdf", l: "PDF", types: "pdf" },
                    { id: "archive", l: "Archives (ZIP, RAR, 7Z)", types: "zip,rar,7z,tar,gz" },
                    { id: "email", l: "Courriels (PST, MBOX, EML)", types: "pst,mbox,eml" },
                    { id: "audio", l: "Audio (MP3, WAV, FLAC)", types: "mp3,wav,flac,m4a" },
                    { id: "db", l: "Bases de données (SQLite, MDB)", types: "sqlite,mdb,accdb" }
                ];
                var node = el(
                    '<div class="ops-tool ops-tool--photorec">' +
                    '<header class="ops-tool-head"><h2>PhotoRec / file carving</h2><p>Récupération par signature de fichiers (sans table de partition). Idéal pour cartes SD formatées, partitions perdues, suppressions sur FAT/exFAT. Toujours travailler sur l\'image, pas sur l\'original.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Image source</span><input type="text" value="/mnt/lab/NX-2026-0123/raw.img" data-pr="src"></label>' +
                    '<label class="field"><span>Dossier de sortie</span><input type="text" value="/mnt/lab/NX-2026-0123/recovered" data-pr="dst"></label>' +
                    '<label class="field"><span>Mode</span><select data-pr="mode"><option value="free">Espace libre uniquement (rapide)</option><option value="whole">Disque entier (complet)</option></select></label>' +
                    '<fieldset class="field ops-pr-types" style="grid-column:1/-1;"><legend>Types de fichiers</legend>' +
                    families.map(function (f, i) {
                        return '<label><input type="checkbox" data-pr-fam="' + f.id + '"' + (i < 3 ? ' checked' : '') + '> ' + f.l + '</label>';
                    }).join("") +
                    '</fieldset>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-pr-out></output>' +
                    '</div>'
                );
                function build() {
                    var src = node.querySelector('[data-pr="src"]').value || "raw.img";
                    var dst = node.querySelector('[data-pr="dst"]').value || "recovered";
                    var mode = node.querySelector('[data-pr="mode"]').value;
                    var checked = families.filter(function (f) { return node.querySelector('[data-pr-fam="' + f.id + '"]').checked; });
                    var typeList = checked.map(function (f) { return f.types; }).join(",").split(",").filter(Boolean);
                    var typeOpts = typeList.map(function (t) { return t + ",enable"; }).join(",");
                    var script =
                        "# 1. Préparer le dossier de sortie\n" +
                        "mkdir -p " + dst + "\n\n" +
                        "# 2. Lancer PhotoRec en non interactif\n" +
                        "sudo photorec /d " + dst + "/recup_dir /cmd " + src + " options,paranoid_yes,keep_corrupted_no,expert_yes,lowmem_no," +
                        (mode === "free" ? "freespace" : "wholespace") +
                        ",fileopt,everything,disable," + typeOpts + ",search\n\n" +
                        "# 3. Tri par type après extraction\n" +
                        "cd " + dst + "/recup_dir.1 && ls | awk -F. '{print $NF}' | sort | uniq -c | sort -rn\n\n" +
                        "# 4. Empreinte du dossier complet (manifeste)\n" +
                        "find " + dst + " -type f -print0 | sort -z | xargs -0 sha256sum > " + dst + "/manifest.sha256";
                    var note = checked.length === 0
                        ? "⚠ Sélectionne au moins un type de fichier."
                        : "Types ciblés : " + typeList.join(", ") + ". Mode : " + (mode === "free" ? "espace libre uniquement (rapide)" : "disque entier (complet)") + ".";
                    node.querySelector("[data-pr-out]").innerHTML =
                        '<p class="ops-out-label">Bloc complet</p>' +
                        '<pre class="ops-out-text" data-pr-pre></pre>' +
                        '<p class="ops-out-note">' + note + '</p>' +
                        '<div class="ops-tool-actions"><button type="button" class="button button-primary" data-pr-copy>Copier le bloc</button></div>';
                    node.querySelector("[data-pr-pre]").textContent = script;
                    node.querySelector("[data-pr-copy]").addEventListener("click", function (e) { copyToClipboard(script, e.currentTarget); });
                }
                node.addEventListener("input", build);
                node.addEventListener("change", build);
                build();
                return node;
            }
        },

        // ─── Tool 7h : Chain of custody PV ────────────────────────────
        custody: {
            title: "Chaîne de possession",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--custody">' +
                    '<header class="ops-tool-head"><h2>Chaîne de possession</h2><p>Procès-verbal à imprimer et faire signer. Indispensable pour tout dossier forensique destiné à la cour ou à un assureur.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence dossier</span><input type="text" placeholder="NX-2026-0123" data-cu="ref"></label>' +
                    '<label class="field"><span>Date d\'ouverture</span><input type="date" data-cu="date"></label>' +
                    '<label class="field"><span>Mandant</span><input type="text" placeholder="Étude Tremblay & Associés" data-cu="client"></label>' +
                    '<label class="field"><span>Personne remettant</span><input type="text" placeholder="Marie Tremblay, avocate" data-cu="from"></label>' +
                    '<label class="field"><span>Numéro de pièce</span><input type="text" placeholder="P-1" data-cu="exhibit"></label>' +
                    '<label class="field"><span>Description</span><input type="text" placeholder="HDD Seagate 2 To, S/N WFL1234A" data-cu="desc"></label>' +
                    '<label class="field"><span>SHA-256 image source</span><input type="text" placeholder="a3f1…" data-cu="sha"></label>' +
                    '<label class="field"><span>Méthode d\'imagerie</span><input type="text" value="ddrescue 1.27 (préset degraded)" data-cu="method"></label>' +
                    '<label class="field" style="grid-column:1/-1;"><span>Observations</span><textarea rows="3" placeholder="Sceau d\'origine intact à la réception. Étiquette inventaire P-1 apposée…" data-cu="obs"></textarea></label>' +
                    '</div>' +
                    '<output class="ops-tool-out"><div class="ops-cu-doc" data-cu-out></div><div class="ops-tool-actions"><button type="button" class="button button-primary" data-cu-print>Imprimer / PDF</button></div></output>' +
                    '</div>'
                );
                node.querySelector('[data-cu="date"]').valueAsDate = new Date();
                function build() {
                    var v = function (k) { return (node.querySelector('[data-cu="' + k + '"]').value || "—"); };
                    var html =
                        '<header class="ops-cu-head"><h3>Procès-verbal — Chaîne de possession</h3><p>NEXURA DATA · Examinateur forensique certifié (CFE)</p></header>' +
                        '<dl class="ops-cu-fields">' +
                        '<div><dt>Référence dossier</dt><dd>' + v("ref") + '</dd></div>' +
                        '<div><dt>Date</dt><dd>' + v("date") + '</dd></div>' +
                        '<div><dt>Mandant</dt><dd>' + v("client") + '</dd></div>' +
                        '<div><dt>Remis par</dt><dd>' + v("from") + '</dd></div>' +
                        '<div><dt>Pièce</dt><dd>' + v("exhibit") + '</dd></div>' +
                        '<div><dt>Description</dt><dd>' + v("desc") + '</dd></div>' +
                        '<div><dt>Méthode d\'imagerie</dt><dd>' + v("method") + '</dd></div>' +
                        '<div><dt>SHA-256 image</dt><dd><code>' + v("sha") + '</code></dd></div>' +
                        '<div><dt>Observations</dt><dd>' + v("obs").replace(/\n/g, "<br>") + '</dd></div>' +
                        '</dl>' +
                        '<table class="ops-cu-log"><thead><tr><th>Date / heure</th><th>Action</th><th>Personne</th><th>Signature</th></tr></thead><tbody>' +
                        '<tr><td>' + v("date") + '</td><td>Réception de la pièce, sceau intact, étiquette apposée</td><td>Olivier Blanchet</td><td>&nbsp;</td></tr>' +
                        '<tr><td>&nbsp;</td><td>Imagerie forensique, SHA-256 calculé</td><td>Olivier Blanchet</td><td>&nbsp;</td></tr>' +
                        '<tr><td>&nbsp;</td><td>Stockage en coffre-fort, accès journalisé</td><td>Olivier Blanchet</td><td>&nbsp;</td></tr>' +
                        '<tr><td>&nbsp;</td><td>Restitution / destruction</td><td>&nbsp;</td><td>&nbsp;</td></tr>' +
                        '</tbody></table>' +
                        '<div class="ops-cu-sign"><div><span class="ops-cu-line"></span><p>Signature — examinateur</p></div><div><span class="ops-cu-line"></span><p>Signature — mandant / témoin</p></div></div>' +
                        '<footer class="ops-cu-foot"><p>Document généré localement · NEXURA DATA · Région de Longueuil (Québec)</p></footer>';
                    node.querySelector("[data-cu-out]").innerHTML = html;
                }
                node.addEventListener("input", build);
                node.addEventListener("change", build);
                node.querySelector("[data-cu-print]").addEventListener("click", function () { window.print(); });
                build();
                return node;
            }
        },

        // ─── Tool 7e : SMART analyzer ─────────────────────────────────
        smart: {
            title: "Analyseur SMART",
            build: function () {
                var critical = {
                    5: { name: "Reallocated Sectors Count", threshold: 1, level: "critical" },
                    187: { name: "Reported Uncorrectable Errors", threshold: 1, level: "critical" },
                    188: { name: "Command Timeout", threshold: 1, level: "warn" },
                    197: { name: "Current Pending Sectors", threshold: 1, level: "critical" },
                    198: { name: "Offline Uncorrectable", threshold: 1, level: "critical" },
                    194: { name: "Temperature", threshold: 55, level: "warn" },
                    9: { name: "Power-On Hours", threshold: 0, level: "info" },
                    241: { name: "Total LBAs Written", threshold: 0, level: "info" }
                };
                var node = el(
                    '<div class="ops-tool ops-tool--smart">' +
                    '<header class="ops-tool-head"><h2>Analyseur SMART</h2><p>Colle la sortie complète de <code>smartctl -a /dev/sdX</code>. Verdict immédiat sur les attributs critiques. Aucun envoi serveur.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field" style="grid-column:1/-1;"><span>Sortie smartctl -a</span><textarea data-sm="raw" rows="10" placeholder="Device Model:     ST2000DM008-2FR102&#10;Serial Number:    WFL1234A&#10;...&#10;ID# ATTRIBUTE_NAME          FLAG     VALUE WORST THRESH TYPE      UPDATED  WHEN_FAILED RAW_VALUE&#10;  5 Reallocated_Sector_Ct   0x0033   100   100   010    Pre-fail  Always       -       0&#10;..."></textarea></label>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-sm-out></output>' +
                    '</div>'
                );
                function parse(raw) {
                    var lines = raw.split(/\r?\n/);
                    var found = {}, model = null, serial = null, ata = false;
                    for (var i = 0; i < lines.length; i++) {
                        var l = lines[i].trim();
                        if (/^Device Model:/i.test(l)) model = l.split(":").slice(1).join(":").trim();
                        if (/^Serial Number:/i.test(l)) serial = l.split(":").slice(1).join(":").trim();
                        var m = l.match(/^(\d{1,3})\s+(\S+)\s+0x[0-9a-fA-F]+\s+\d+\s+\d+\s+\d+\s+\S+\s+\S+\s+\S+\s+(.+)$/);
                        if (m) {
                            var id = parseInt(m[1], 10);
                            var rawval = m[3].trim().split(/\s+/)[0];
                            var num = parseInt(rawval, 10);
                            if (!isNaN(num)) { found[id] = { name: m[2], raw: num }; ata = true; }
                        }
                    }
                    return { model: model, serial: serial, attrs: found, ata: ata };
                }
                function build() {
                    var raw = node.querySelector('[data-sm="raw"]').value;
                    var out = node.querySelector("[data-sm-out]");
                    if (!raw.trim()) { out.innerHTML = '<p class="ops-out-label">En attente de la sortie smartctl…</p>'; return; }
                    var p = parse(raw);
                    if (!p.ata) { out.innerHTML = '<p class="ops-out-label">Impossible de lire la table SMART. Colle la sortie complète de <code>smartctl -a</code>.</p>'; return; }
                    var verdict = "healthy", reasons = [], rows = [];
                    Object.keys(critical).forEach(function (idStr) {
                        var id = parseInt(idStr, 10), a = p.attrs[id], def = critical[id];
                        if (!a) return;
                        var flag = "ok";
                        if (def.level === "critical" && a.raw >= def.threshold && a.raw > 0) {
                            flag = "critical"; verdict = "critical";
                            reasons.push(def.name + " = " + a.raw);
                        } else if (def.level === "warn" && a.raw >= def.threshold) {
                            flag = "warn"; if (verdict !== "critical") verdict = "warn";
                            reasons.push(def.name + " = " + a.raw);
                        }
                        rows.push('<div data-flag="' + flag + '"><dt>' + id + ' · ' + def.name + '</dt><dd>' + a.raw.toLocaleString("fr-CA") + '</dd></div>');
                    });
                    var verdictMap = {
                        healthy: { label: "Disque sain", note: "Aucun attribut critique en alerte. Imagerie standard (préset « Disque sain » de l'outil ddrescue)." },
                        warn: { label: "Surveillance requise", note: "Au moins un attribut en alerte basse. Imagerie immédiate avant manipulation client (préset « degraded »). Documenter au journal de session." },
                        critical: { label: "Disque mourant — agir vite", note: "Attributs critiques actifs. NE PAS RÉ-ALIMENTER inutilement. Imagerie d'urgence avec préset « failing », passes courtes, jamais d'écriture sur l'original." }
                    };
                    var v = verdictMap[verdict];
                    out.innerHTML =
                        '<dl class="ops-out-table">' +
                        (p.model ? '<div><dt>Modèle</dt><dd>' + p.model + '</dd></div>' : '') +
                        (p.serial ? '<div><dt>S/N</dt><dd>' + p.serial + '</dd></div>' : '') +
                        '<div class="is-total ops-sm-verdict ops-sm-verdict--' + verdict + '"><dt>Verdict</dt><dd>' + v.label + '</dd></div>' +
                        '</dl>' +
                        '<dl class="ops-out-table ops-sm-attrs">' + rows.join("") + '</dl>' +
                        '<p class="ops-out-note"><strong>Action :</strong> ' + v.note + '</p>' +
                        (reasons.length ? '<p class="ops-out-note">Motifs : ' + reasons.join(" · ") + '</p>' : '');
                }
                node.addEventListener("input", build);
                build();
                return node;
            }
        },

        // ─── Tool 7f : Symptom triage ─────────────────────────────────
        triage: {
            title: "Triage symptômes",
            build: function () {
                var questions = [
                    {
                        id: "device", label: "Type d'appareil", type: "select", options: [
                            { v: "hdd", l: "HDD (disque mécanique)" },
                            { v: "ssd", l: "SSD / NVMe" },
                            { v: "raid", l: "RAID / NAS" },
                            { v: "phone", l: "Téléphone / tablette" },
                            { v: "usb", l: "USB / carte SD" }
                        ]
                    },
                    {
                        id: "detected", label: "Détecté par le système ?", type: "radio", options: [
                            { v: "yes", l: "Oui" }, { v: "intermittent", l: "Par intermittence" }, { v: "no", l: "Non" }
                        ]
                    },
                    {
                        id: "noise", label: "Bruit anormal ?", type: "radio", options: [
                            { v: "none", l: "Aucun" }, { v: "click", l: "Cliquetis / claquements" }, { v: "buzz", l: "Bourdonnement / rotation lente" }, { v: "silent", l: "Aucune rotation" }
                        ]
                    },
                    {
                        id: "trauma", label: "Traumatisme récent ?", type: "radio", options: [
                            { v: "none", l: "Aucun" }, { v: "drop", l: "Chute / choc" }, { v: "liquid", l: "Liquide" }, { v: "fire", l: "Feu / surchauffe" }, { v: "power", l: "Surtension électrique" }
                        ]
                    }
                ];

                function diagnose(a) {
                    var d = a.device, det = a.detected, n = a.noise, t = a.trauma;
                    var go = "go", risk = "moyen", protocol = "hdd_logical", cause = "Cause indéterminée", actions = [];
                    if (d === "hdd") {
                        if (n === "click" || n === "silent") {
                            cause = "Panne mécanique probable (têtes ou moteur)";
                            protocol = "hdd_mechanical"; risk = "élevé"; go = "stop";
                            actions.push("NE PAS rebrancher le disque");
                            actions.push("Diagnostic en hotte ISO 5 requis");
                        } else if (t === "drop") {
                            cause = "Choc mécanique, têtes potentiellement déplacées";
                            protocol = "hdd_mechanical"; risk = "élevé"; go = "stop";
                        } else if (t === "liquid" || t === "fire") {
                            cause = "Dégât physique — inspection PCB et plateaux requise";
                            protocol = "hdd_mechanical"; risk = "très élevé"; go = "stop";
                        } else if (det === "yes") {
                            cause = "Disque détecté — problème logique probable";
                            protocol = "hdd_logical"; risk = "faible"; go = "go";
                        } else if (det === "intermittent") {
                            cause = "Disque dégradé, secteurs défectueux probables";
                            protocol = "hdd_mechanical"; risk = "moyen"; go = "caution";
                            actions.push("Imagerie ddrescue préset « degraded » immédiate");
                        } else {
                            cause = "Disque non détecté — PCB ou firmware probable";
                            protocol = "hdd_mechanical"; risk = "élevé"; go = "caution";
                        }
                    } else if (d === "ssd") {
                        if (det === "no") {
                            cause = "Contrôleur SSD probablement HS — chip-off NAND requis";
                            protocol = "ssd_dead"; risk = "très élevé"; go = "caution";
                            actions.push("Identifier le contrôleur (SandForce, Phison, SMI…)");
                            actions.push("Prévenir le client : taux de succès 40-65 %");
                        } else if (t === "power") {
                            cause = "Surtension — contrôleur probablement endommagé";
                            protocol = "ssd_dead"; risk = "très élevé"; go = "stop";
                        } else {
                            cause = "Problème logique — TRIM peut avoir effacé les données";
                            protocol = "hdd_logical"; risk = "moyen"; go = "caution";
                            actions.push("Vérifier si TRIM était actif (réduit fortement les chances)");
                        }
                    } else if (d === "raid") {
                        cause = "Volume RAID dégradé — ne JAMAIS lancer de rebuild automatique";
                        protocol = "raid_degraded"; risk = "élevé"; go = "stop";
                        actions.push("Étiqueter chaque disque avec sa baie d'origine");
                        actions.push("Imager chaque disque individuellement avant toute reconstruction");
                    } else if (d === "phone") {
                        if (t === "liquid" || t === "fire") {
                            cause = "Dégât physique — réparation board-level possible";
                            protocol = "phone_water"; risk = "très élevé"; go = "stop";
                            actions.push("NE PAS alimenter — démontage immédiat, batterie débranchée");
                        } else if (det === "no") {
                            cause = "Téléphone HS — extraction NAND / Cellebrite";
                            protocol = "phone_water"; risk = "élevé"; go = "caution";
                        } else {
                            cause = "Téléphone fonctionnel — verrou ou extraction logique";
                            protocol = "phone_locked"; risk = "moyen"; go = "go";
                        }
                    } else if (d === "usb") {
                        if (n === "none" && det === "yes") {
                            cause = "Récupération logique standard";
                            protocol = "hdd_logical"; risk = "faible"; go = "go";
                        } else {
                            cause = "Contrôleur USB ou NAND endommagé — chip-off possible";
                            protocol = "ssd_dead"; risk = "élevé"; go = "caution";
                        }
                    }
                    return { cause: cause, protocol: protocol, risk: risk, go: go, actions: actions };
                }

                var formHtml = questions.map(function (q) {
                    if (q.type === "select") {
                        return '<label class="field"><span>' + q.label + '</span><select data-tg="' + q.id + '">' +
                            q.options.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join("") +
                            '</select></label>';
                    }
                    return '<fieldset class="field ops-tg-radio"><legend>' + q.label + '</legend>' +
                        q.options.map(function (o, i) {
                            return '<label><input type="radio" name="tg-' + q.id + '" value="' + o.v + '"' + (i === 0 ? ' checked' : '') + '> ' + o.l + '</label>';
                        }).join("") +
                        '</fieldset>';
                }).join("");

                var node = el(
                    '<div class="ops-tool ops-tool--triage">' +
                    '<header class="ops-tool-head"><h2>Triage symptômes</h2><p>Réponds aux 4 questions à l\'intake. Diagnostic, risque et protocole à utiliser apparaissent immédiatement. Filet de sécurité pour ne rien oublier.</p></header>' +
                    '<div class="ops-tool-grid">' + formHtml + '</div>' +
                    '<output class="ops-tool-out" data-tg-out></output>' +
                    '</div>'
                );

                function readAnswers() {
                    var a = {};
                    questions.forEach(function (q) {
                        if (q.type === "select") {
                            a[q.id] = node.querySelector('[data-tg="' + q.id + '"]').value;
                        } else {
                            var checked = node.querySelector('input[name="tg-' + q.id + '"]:checked');
                            a[q.id] = checked ? checked.value : q.options[0].v;
                        }
                    });
                    return a;
                }
                var goLabels = {
                    go: { label: "GO — récupération en autonomie", css: "go" },
                    caution: { label: "PRUDENCE — prévenir le client avant", css: "warn" },
                    stop: { label: "STOP — diagnostic en hotte / spécialisé", css: "stop" }
                };
                function build() {
                    var a = readAnswers();
                    var r = diagnose(a);
                    var g = goLabels[r.go];
                    node.querySelector("[data-tg-out]").innerHTML =
                        '<dl class="ops-out-table">' +
                        '<div><dt>Diagnostic présumé</dt><dd>' + r.cause + '</dd></div>' +
                        '<div><dt>Risque opérationnel</dt><dd>' + r.risk + '</dd></div>' +
                        '<div><dt>Protocole</dt><dd><code>' + r.protocol + '</code> — voir outil « Protocole de récupération »</dd></div>' +
                        '<div class="is-total ops-tg-go ops-tg-go--' + g.css + '"><dt>Décision</dt><dd>' + g.label + '</dd></div>' +
                        '</dl>' +
                        (r.actions.length ? '<p class="ops-out-label">Actions immédiates</p><ul class="ops-tg-actions">' + r.actions.map(function (x) { return '<li>' + x + '</li>'; }).join("") + '</ul>' : '');
                }
                node.addEventListener("change", build);
                build();
                return node;
            }
        },

        // ─── Tool 8 : Forfaits express (productized add-ons) ──────────
        forfaits: {
            title: "Forfaits express",
            build: function () {
                var packs = [
                    { id: "express24", label: "Surcharge urgence 24 h", price: 250, desc: "Traitement prioritaire, examen débuté dans les 24 h ouvrables." },
                    { id: "weekend", label: "Astreinte fin de semaine", price: 350, desc: "Réception et examen samedi/dimanche, livraison lundi matin." },
                    { id: "afterhours", label: "Astreinte hors-heures (soir)", price: 175, desc: "Examen débuté entre 18 h et 23 h, livraison à 8 h le lendemain." },
                    { id: "diag", label: "Diagnostic à distance", price: 99, desc: "Analyse SMART + rapport écrit + estimation ferme. Crédité sur le mandat si vous procédez." },
                    { id: "encrypted_usb", label: "Livraison USB chiffré (256 Go)", price: 49, desc: "Clé USB Kingston IronKey, livrable AES-256 préchargé." },
                    { id: "second_copy", label: "Copie additionnelle chiffrée", price: 79, desc: "Deuxième livrable identique sur support distinct, pour archivage." },
                    { id: "courier_mtl", label: "Coursier Grand Montréal (A/R)", price: 89, desc: "Pickup et retour à votre adresse, signature requise." },
                    { id: "rush_court", label: "Rapport pour la cour (rush)", price: 450, desc: "Rapport d'expert détaillé, livré sous 5 jours ouvrables, signé CFE." }
                ];
                var node = el(
                    '<div class="ops-tool ops-tool--forfaits">' +
                    '<header class="ops-tool-head"><h2>Forfaits express</h2><p>Add-ons productisés à prix fixe. Sélectionne, génère le courriel client avec lien Stripe pré-rempli. Prêt à envoyer.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence dossier</span><input type="text" placeholder="NX-2026-0123" data-fx="ref"></label>' +
                    '<label class="field"><span>Courriel client</span><input type="email" placeholder="client@exemple.ca" data-fx="email"></label>' +
                    '<label class="field"><span>Lien Stripe (template)</span><input type="text" value="https://buy.stripe.com/votreLink?prefilled_email={EMAIL}&client_reference_id={REF}" data-fx="link"></label>' +
                    '<fieldset class="field ops-fx-list" style="grid-column:1/-1;"><legend>Forfaits à inclure</legend>' +
                    packs.map(function (p) {
                        return '<label class="ops-fx-row"><input type="checkbox" data-fx-pack="' + p.id + '"> ' +
                            '<span class="ops-fx-l">' + p.label + '</span>' +
                            '<span class="ops-fx-p">' + fmtCAD(p.price) + '</span>' +
                            '<span class="ops-fx-d">' + p.desc + '</span></label>';
                    }).join("") +
                    '</fieldset>' +
                    '</div>' +
                    '<output class="ops-tool-out" data-fx-out></output>' +
                    '</div>'
                );
                function build() {
                    var ref = node.querySelector('[data-fx="ref"]').value || "[RÉF]";
                    var email = node.querySelector('[data-fx="email"]').value || "client@exemple.ca";
                    var linkTpl = node.querySelector('[data-fx="link"]').value;
                    var selected = packs.filter(function (p) { return node.querySelector('[data-fx-pack="' + p.id + '"]').checked; });
                    if (!selected.length) {
                        node.querySelector("[data-fx-out]").innerHTML = '<p class="ops-out-label">Sélectionne au moins un forfait.</p>';
                        return;
                    }
                    var subTotal = selected.reduce(function (s, p) { return s + p.price; }, 0);
                    var gst = subTotal * 0.05;
                    var qst = subTotal * 0.09975;
                    var total = subTotal + gst + qst;
                    var link = linkTpl.replace("{EMAIL}", encodeURIComponent(email)).replace("{REF}", encodeURIComponent(ref));
                    var lines = selected.map(function (p) { return "  • " + p.label + " — " + fmtCAD(p.price); }).join("\n");
                    var mail =
                        "Objet : Devis additionnel — dossier " + ref + "\n\n" +
                        "Bonjour,\n\n" +
                        "Voici le détail des prestations additionnelles demandées sur votre dossier " + ref + " :\n\n" +
                        lines + "\n\n" +
                        "Sous-total : " + fmtCAD(subTotal) + "\n" +
                        "TPS (5,000 %) : " + fmtCAD(gst) + "\n" +
                        "TVQ (9,975 %) : " + fmtCAD(qst) + "\n" +
                        "─────────────────────────────\n" +
                        "TOTAL : " + fmtCAD(total) + "\n\n" +
                        "Paiement sécurisé en un clic :\n" +
                        link + "\n\n" +
                        "Le travail démarre dès la confirmation du paiement. Une facture officielle vous sera transmise.\n\n" +
                        "Merci,\nOlivier Blanchet\nNEXURA DATA — Examinateur forensique certifié (CFE)";
                    node.querySelector("[data-fx-out]").innerHTML =
                        '<dl class="ops-out-table">' +
                        '<div><dt>Sous-total</dt><dd>' + fmtCAD(subTotal) + '</dd></div>' +
                        '<div><dt>TPS</dt><dd>' + fmtCAD(gst) + '</dd></div>' +
                        '<div><dt>TVQ</dt><dd>' + fmtCAD(qst) + '</dd></div>' +
                        '<div class="is-total"><dt>Total à facturer</dt><dd>' + fmtCAD(total) + '</dd></div>' +
                        '</dl>' +
                        '<p class="ops-out-label">Courriel prêt à envoyer</p>' +
                        '<pre class="ops-out-text" data-fx-mail></pre>' +
                        '<div class="ops-tool-actions"><button type="button" class="button button-primary" data-fx-copy>Copier le courriel</button><a class="button button-outline" data-fx-mailto>Ouvrir dans courriel</a></div>';
                    node.querySelector("[data-fx-mail]").textContent = mail;
                    node.querySelector("[data-fx-copy]").addEventListener("click", function (e) { copyToClipboard(mail, e.currentTarget); });
                    node.querySelector("[data-fx-mailto]").href = "mailto:" + email + "?subject=" + encodeURIComponent("Devis additionnel — dossier " + ref) + "&body=" + encodeURIComponent(mail);
                }
                node.addEventListener("input", build);
                node.addEventListener("change", build);
                build();
                return node;
            }
        },

        // ─── Tool 9 : Relances de paiement ────────────────────────────
        relances: {
            title: "Relances de paiement",
            build: function () {
                var STORAGE = "nxd_unpaid_invoices";
                function getList() { try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch (e) { return []; } }
                function saveList(l) { localStorage.setItem(STORAGE, JSON.stringify(l)); }

                var node = el(
                    '<div class="ops-tool ops-tool--relances">' +
                    '<header class="ops-tool-head"><h2>Relances de paiement</h2><p>Liste des factures impayées (sauvegarde locale). Tonalité de relance qui monte selon l\'âge : J+3 amical, J+7 ferme, J+14 mise en demeure douce.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence</span><input type="text" placeholder="NX-2026-0123" data-rl="ref"></label>' +
                    '<label class="field"><span>Client</span><input type="text" placeholder="Marc-André Lavoie" data-rl="client"></label>' +
                    '<label class="field"><span>Courriel</span><input type="email" placeholder="client@exemple.ca" data-rl="email"></label>' +
                    '<label class="field"><span>Montant (CAD, taxes incl.)</span><input type="number" min="0" step="0.01" placeholder="1450.00" data-rl="amount"></label>' +
                    '<label class="field"><span>Date d\'émission</span><input type="date" data-rl="date"></label>' +
                    '<label class="field"><span>Lien de paiement Stripe</span><input type="text" placeholder="https://buy.stripe.com/…" data-rl="link"></label>' +
                    '</div>' +
                    '<div class="ops-tool-actions"><button type="button" class="button button-primary" data-rl-add>Ajouter / mettre à jour</button></div>' +
                    '<output class="ops-tool-out" data-rl-out></output>' +
                    '</div>'
                );
                node.querySelector('[data-rl="date"]').valueAsDate = new Date();

                function tone(daysOverdue) {
                    if (daysOverdue < 7) return { label: "Rappel amical", css: "ok" };
                    if (daysOverdue < 14) return { label: "Relance ferme", css: "warn" };
                    return { label: "Mise en demeure douce", css: "stop" };
                }
                function template(invoice, daysOverdue) {
                    var t = tone(daysOverdue);
                    if (daysOverdue < 7) {
                        return "Objet : Petit rappel — facture " + invoice.ref + "\n\n" +
                            "Bonjour " + invoice.client + ",\n\n" +
                            "Petit suivi amical : la facture " + invoice.ref + " (" + fmtCAD(invoice.amount) + ") émise le " + invoice.date + " est en attente.\n\n" +
                            "Vous pouvez régler en un clic ici :\n" + (invoice.link || "[lien Stripe à insérer]") + "\n\n" +
                            "Si le paiement est déjà parti, ignorez ce message — Stripe peut prendre 24-48 h à confirmer.\n\n" +
                            "Merci,\nOlivier";
                    }
                    if (daysOverdue < 14) {
                        return "Objet : Facture " + invoice.ref + " — paiement requis\n\n" +
                            "Bonjour " + invoice.client + ",\n\n" +
                            "La facture " + invoice.ref + " au montant de " + fmtCAD(invoice.amount) + " émise le " + invoice.date + " demeure impayée après " + daysOverdue + " jours.\n\n" +
                            "Lien de paiement direct :\n" + (invoice.link || "[lien Stripe à insérer]") + "\n\n" +
                            "Si vous rencontrez une difficulté, répondez à ce courriel — j\'accepte aussi Interac, BTC, USDC.\n" +
                            "Sans nouvelles d\'ici 7 jours, le dossier sera transmis aux étapes formelles de recouvrement.\n\n" +
                            "Cordialement,\nOlivier Blanchet\nNEXURA DATA";
                    }
                    return "Objet : Mise en demeure — facture " + invoice.ref + "\n\n" +
                        "Madame, Monsieur " + invoice.client + ",\n\n" +
                        "La présente fait suite à mes communications restées sans paiement concernant la facture " + invoice.ref + " émise le " + invoice.date + " au montant de " + fmtCAD(invoice.amount) + ", maintenant en retard de " + daysOverdue + " jours.\n\n" +
                        "Je vous accorde un dernier délai de 10 jours, à compter de la réception du présent avis, pour acquitter intégralement cette somme :\n" + (invoice.link || "[lien Stripe à insérer]") + "\n\n" +
                        "À défaut de paiement dans ce délai, je transmettrai le dossier à la Cour des petites créances du Québec et je facturerai des intérêts au taux légal applicable, en plus de tous frais légaux.\n\n" +
                        "Veuillez prendre cet avis au sérieux.\n\n" +
                        "Olivier Blanchet\nNEXURA DATA — Examinateur forensique certifié (CFE)";
                }
                function render() {
                    var list = getList();
                    var out = node.querySelector("[data-rl-out]");
                    if (!list.length) {
                        out.innerHTML = '<p class="ops-out-label">Aucune facture en attente. Saisis-en une et clique « Ajouter ».</p>';
                        return;
                    }
                    var today = new Date();
                    var rows = list.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); }).map(function (inv) {
                        var d = new Date(inv.date);
                        var days = Math.floor((today - d) / 86400000);
                        var t = tone(days);
                        return '<details class="ops-rl-row" data-tone="' + t.css + '">' +
                            '<summary><span class="ops-rl-ref"><code>' + inv.ref + '</code> — ' + inv.client + '</span><span class="ops-rl-amt">' + fmtCAD(inv.amount) + '</span><span class="ops-rl-age">' + days + ' j</span><span class="ops-rl-tone ops-rl-tone--' + t.css + '">' + t.label + '</span></summary>' +
                            '<pre class="ops-out-text" data-rl-mail="' + inv.ref + '"></pre>' +
                            '<div class="ops-tool-actions"><a class="button button-primary" data-rl-mailto="' + inv.ref + '">Ouvrir dans courriel</a><button type="button" class="button button-outline" data-rl-copy="' + inv.ref + '">Copier</button><button type="button" class="button button-outline" data-rl-del="' + inv.ref + '">Marquer payée</button></div>' +
                            '</details>';
                    }).join("");
                    out.innerHTML = '<div class="ops-rl-list">' + rows + '</div>';
                    list.forEach(function (inv) {
                        var d = new Date(inv.date);
                        var days = Math.floor((today - d) / 86400000);
                        var msg = template(inv, days);
                        var pre = out.querySelector('[data-rl-mail="' + CSS.escape(inv.ref) + '"]');
                        if (pre) pre.textContent = msg;
                        var mailto = out.querySelector('[data-rl-mailto="' + CSS.escape(inv.ref) + '"]');
                        if (mailto) mailto.href = "mailto:" + inv.email + "?subject=" + encodeURIComponent(msg.split("\n")[0].replace(/^Objet\s*:\s*/i, "")) + "&body=" + encodeURIComponent(msg.split("\n").slice(2).join("\n"));
                        var cp = out.querySelector('[data-rl-copy="' + CSS.escape(inv.ref) + '"]');
                        if (cp) cp.addEventListener("click", function (e) { copyToClipboard(msg, e.currentTarget); });
                        var del = out.querySelector('[data-rl-del="' + CSS.escape(inv.ref) + '"]');
                        if (del) del.addEventListener("click", function () {
                            if (confirm("Marquer la facture " + inv.ref + " comme payée et la retirer ?")) {
                                saveList(getList().filter(function (x) { return x.ref !== inv.ref; }));
                                // Archive vers nxd_paid_invoices (alimente le tableau de bord)
                                try {
                                    var paid = JSON.parse(localStorage.getItem("nxd_paid_invoices") || "[]");
                                    paid.push({ ref: inv.ref, client: inv.client, amount: inv.amount, issuedAt: inv.date, paidAt: new Date().toISOString() });
                                    localStorage.setItem("nxd_paid_invoices", JSON.stringify(paid));
                                } catch (e) { /* ignore */ }
                                render();
                            }
                        });
                    });
                }
                node.querySelector("[data-rl-add]").addEventListener("click", function () {
                    var ref = node.querySelector('[data-rl="ref"]').value.trim();
                    var client = node.querySelector('[data-rl="client"]').value.trim();
                    var email = node.querySelector('[data-rl="email"]').value.trim();
                    var amount = parseFloat(node.querySelector('[data-rl="amount"]').value);
                    var date = node.querySelector('[data-rl="date"]').value;
                    var link = node.querySelector('[data-rl="link"]').value.trim();
                    if (!ref || !client || !amount || !date) { alert("Référence, client, montant et date sont requis."); return; }
                    var list = getList().filter(function (x) { return x.ref !== ref; });
                    list.push({ ref: ref, client: client, email: email, amount: amount, date: date, link: link });
                    saveList(list);
                    ["ref", "client", "email", "amount", "link"].forEach(function (k) { node.querySelector('[data-rl="' + k + '"]').value = ""; });
                    render();
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
        },

        // ─── Tool : Rapport expert PDF (jsPDF lazy-loaded) ─────────────────
        report: {
            title: "Rapport expert PDF",
            build: function () {
                var node = el(
                    '<div class="ops-tool ops-tool--report">' +
                    '<header class="ops-tool-head"><h2>Rapport expert PDF</h2><p>Livrable forensique signé pour mandats B2B et juridiques. Génération locale (aucun envoi serveur). Format A4, palette NEXURA verrouillée.</p></header>' +
                    '<div class="ops-tool-grid">' +
                    '<label class="field"><span>Référence dossier</span><input data-r="ref" placeholder="NX-2026-0001"></label>' +
                    '<label class="field"><span>Date du rapport</span><input data-r="date" type="date"></label>' +
                    '<label class="field"><span>Client (raison sociale)</span><input data-r="client" placeholder="Étude Bélanger Avocats inc."></label>' +
                    '<label class="field"><span>Contact (Me / responsable)</span><input data-r="contact" placeholder="Me Sophie Bélanger"></label>' +
                    '<label class="field"><span>Type d\'appareil</span><input data-r="device" placeholder="HDD Western Digital WD20EZRX"></label>' +
                    '<label class="field"><span>Numéro de série</span><input data-r="serial" placeholder="WCC4M0345671"></label>' +
                    '<label class="field"><span>Capacité</span><input data-r="capacity" placeholder="2 To"></label>' +
                    '<label class="field"><span>Date de réception</span><input data-r="received" type="date"></label>' +
                    '</div>' +
                    '<label class="field"><span>État physique constaté</span><textarea data-r="physical" rows="2" placeholder="Boîtier intact. Plateaux audibles. Aucune trace de liquide ni de choc."></textarea></label>' +
                    '<label class="field"><span>Diagnostic technique</span><textarea data-r="diagnostic" rows="3" placeholder="Microcode service area corrompu. Lecture de la zone système impossible avec firmware d\'origine. Substitution PCB compatible et patch ROM réalisés."></textarea></label>' +
                    '<label class="field"><span>Méthodologie</span><textarea data-r="method" rows="3" placeholder="1) Examen physique sous loupe binoculaire. 2) Sortie SMART via PC-3000. 3) Imagerie ddrescue avec PCB de remplacement. 4) Reconstruction NTFS et extraction $MFT."></textarea></label>' +
                    '<label class="field"><span>Résultats</span><textarea data-r="results" rows="3" placeholder="Image disque complète à 99,98 % (4 secteurs illisibles, hors zone utilisateur). 312 482 fichiers récupérés. Empreinte SHA-256 de l\'image disque générée et remise sur clé chiffrée."></textarea></label>' +
                    '<label class="field"><span>Empreinte SHA-256 (image disque)</span><input data-r="hash" placeholder="a1b2c3d4..."></label>' +
                    '<label class="field"><span>Examinateur</span><input data-r="examiner" placeholder="O. B. — examinateur certifié CFE"></label>' +
                    '<label class="field"><span>Mandat / numéro de cause (facultatif)</span><input data-r="mandate" placeholder="500-17-XXXXXX-XXX"></label>' +
                    '<div class="ops-tool-actions">' +
                    '<button type="button" class="button button-primary" data-r-gen>Télécharger le PDF</button>' +
                    '<span class="ops-out-meta" data-r-status></span>' +
                    '</div>' +
                    '<p class="ops-out-note">Le PDF est généré dans votre navigateur. Aucune donnée n\'est transmise à un tiers. La bibliothèque jsPDF est chargée à la demande depuis cdnjs.cloudflare.com.</p>' +
                    '</div>'
                );

                // Pre-fill date today / received yesterday
                var today = new Date();
                var iso = function (d) { return d.toISOString().slice(0, 10); };
                node.querySelector('[data-r="date"]').value = iso(today);
                var y = new Date(today.getTime() - 86400000);
                node.querySelector('[data-r="received"]').value = iso(y);

                function loadJsPdf() {
                    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
                    return new Promise(function (resolve, reject) {
                        var s = document.createElement("script");
                        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                        s.onload = function () {
                            if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
                            else reject(new Error("jsPDF unavailable"));
                        };
                        s.onerror = function () { reject(new Error("CDN unreachable")); };
                        document.head.appendChild(s);
                    });
                }

                function val(k) { return (node.querySelector('[data-r="' + k + '"]').value || "").trim(); }

                function gen() {
                    var status = node.querySelector("[data-r-status]");
                    status.textContent = "Génération en cours…";
                    loadJsPdf().then(function (jsPDF) {
                        var doc = new jsPDF({ unit: "mm", format: "a4" });
                        var pageW = doc.internal.pageSize.getWidth();
                        var pageH = doc.internal.pageSize.getHeight();
                        var margin = 18;
                        var y = margin;
                        var os = "#0d0d0b";
                        var dim = "#1c1c19";
                        var muted = "#8a857a";

                        // Header band
                        doc.setFillColor(13, 13, 11);
                        doc.rect(0, 0, pageW, 26, "F");
                        doc.setTextColor("#e8e4dc");
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(18);
                        doc.text("NEXURA DATA", margin, 16);
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9);
                        doc.text("Laboratoire de récupération de données et forensique numérique · Longueuil, QC", margin, 22);

                        y = 36;
                        doc.setTextColor(os);
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(14);
                        doc.text("Rapport d'expertise technique", margin, y);
                        y += 6;
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9);
                        doc.setTextColor(muted);
                        doc.text("Référence : " + (val("ref") || "—") + "    ·    Date : " + (val("date") || "—") +
                            (val("mandate") ? "    ·    Mandat : " + val("mandate") : ""), margin, y);
                        y += 8;

                        function section(title, lines) {
                            if (y > pageH - 40) { doc.addPage(); y = margin; }
                            doc.setDrawColor(196, 184, 168);
                            doc.setLineWidth(0.2);
                            doc.line(margin, y, pageW - margin, y);
                            y += 5;
                            doc.setTextColor(os);
                            doc.setFont("helvetica", "bold");
                            doc.setFontSize(10);
                            doc.text(title.toUpperCase(), margin, y);
                            y += 5;
                            doc.setFont("helvetica", "normal");
                            doc.setFontSize(10);
                            doc.setTextColor(dim);
                            for (var i = 0; i < lines.length; i++) {
                                if (!lines[i]) continue;
                                var wrapped = doc.splitTextToSize(lines[i], pageW - margin * 2);
                                if (y + wrapped.length * 5 > pageH - 25) { doc.addPage(); y = margin; }
                                doc.text(wrapped, margin, y);
                                y += wrapped.length * 5;
                            }
                            y += 4;
                        }

                        section("1. Identification du dossier", [
                            "Client : " + (val("client") || "—"),
                            "Contact : " + (val("contact") || "—"),
                            "Examinateur : " + (val("examiner") || "—")
                        ]);

                        section("2. Support reçu", [
                            "Type d'appareil : " + (val("device") || "—"),
                            "Numéro de série : " + (val("serial") || "—"),
                            "Capacité nominale : " + (val("capacity") || "—"),
                            "Date de réception : " + (val("received") || "—")
                        ]);

                        section("3. État physique constaté", [val("physical") || "—"]);
                        section("4. Diagnostic technique", [val("diagnostic") || "—"]);
                        section("5. Méthodologie", [val("method") || "—"]);
                        section("6. Résultats", [val("results") || "—"]);

                        if (val("hash")) {
                            section("7. Empreinte forensique (intégrité)", [
                                "Algorithme : SHA-256",
                                "Empreinte de l'image disque : " + val("hash"),
                                "Cette empreinte permet de vérifier à tout moment que l'image fournie au client n'a pas été altérée depuis sa génération en laboratoire."
                            ]);
                        }

                        // Signature block
                        if (y > pageH - 60) { doc.addPage(); y = margin; }
                        y += 6;
                        doc.setDrawColor(196, 184, 168);
                        doc.line(margin, y, pageW - margin, y);
                        y += 6;
                        doc.setTextColor(os);
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(10);
                        doc.text("ATTESTATION", margin, y);
                        y += 5;
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(10);
                        doc.setTextColor(dim);
                        var attest = doc.splitTextToSize(
                            "Je soussigné(e), examinateur(rice) au laboratoire NEXURA DATA, atteste que les " +
                            "constatations et résultats consignés dans le présent rapport ont été obtenus selon " +
                            "les méthodes décrites, sans altération volontaire de la preuve, et que la chaîne de " +
                            "possession a été maintenue depuis la réception du support.",
                            pageW - margin * 2
                        );
                        doc.text(attest, margin, y);
                        y += attest.length * 5 + 12;

                        doc.setDrawColor(13, 13, 11);
                        doc.line(margin, y, margin + 70, y);
                        doc.line(pageW - margin - 70, y, pageW - margin, y);
                        y += 4;
                        doc.setFontSize(8);
                        doc.setTextColor(muted);
                        doc.text("Signature de l'examinateur", margin, y);
                        doc.text("Date", pageW - margin - 70, y);

                        // Footer on every page
                        var pageCount = doc.getNumberOfPages();
                        for (var p = 1; p <= pageCount; p++) {
                            doc.setPage(p);
                            doc.setFontSize(8);
                            doc.setTextColor(muted);
                            doc.text("NEXURA DATA · Longueuil, QC · contact@nexuradata.ca", margin, pageH - 10);
                            doc.text("Page " + p + " / " + pageCount, pageW - margin - 20, pageH - 10);
                        }

                        var fname = "rapport-" + (val("ref") || "nexuradata") + ".pdf";
                        doc.save(fname);
                        status.textContent = "PDF généré : " + fname;
                    }).catch(function (e) {
                        status.textContent = "Erreur : " + e.message;
                    });
                }

                node.querySelector("[data-r-gen]").addEventListener("click", gen);
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
