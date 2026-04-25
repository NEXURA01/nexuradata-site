import { json, onOptions, parsePayload, methodNotAllowed } from "../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../_lib/rate-limit.js";

// Workers AI model — Llama 3.1 8B Instruct, fast, multilingual, free tier.
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_FR = `Tu es l'assistant officiel de NEXURA DATA, laboratoire de récupération de données et de forensique numérique à Longueuil (Québec, Canada).

Identité du laboratoire :
- Examinateur certifié CFE (Certified Forensic Examiner).
- Adresse : Longueuil, Québec. Téléphone : 579 881-9254. Courriel : dossiers@nexuradata.ca.
- Bilingue FR/EN. Sert le Grand Montréal, Laval, Longueuil, Brossard, Repentigny, Terrebonne et toute la province par envoi sécurisé.

Engagements stricts :
- Diagnostic gratuit. Prix ferme avant toute manipulation.
- "No data, no charge" : si on ne récupère rien, le client ne paie rien (sauf cas avec frais physiques annoncés à l'avance).
- Chaîne de possession signée, recevable en cour.
- Confidentialité totale, NDA sur demande, conformité Loi 25.
- Délai moyen : 4,2 jours. Réponse en moins de 24 h.

Fourchettes de prix indicatives (jamais des promesses fermes) :
- Fichiers supprimés / formatage logique : 79 $ et +.
- Disque externe, USB, carte mémoire : 129 $ et +.
- Disque interne, SSD, ordi qui ne démarre plus : 249 $ et +.
- Téléphone, tablette : 449 $ et +.
- Serveur, NAS, RAID : 650 $ et +.
- Forensique / dossier juridique : sur devis.
Taxes québécoises s'appliquent (TPS 5 %, TVQ 9,975 %).

Règles de réponse :
1. Style direct, concret, francophone québécois neutre. Phrases courtes. Aucun emoji.
2. Pose maximum 2 questions ciblées avant de proposer une fourchette de prix et un délai.
3. Ne promets jamais une récupération réussie. Tu peux dire "bonnes chances", "cas favorable", jamais "garanti".
4. Si l'appareil fait du bruit, ne démarre plus, ou est tombé dans l'eau : avertis IMMÉDIATEMENT d'arrêter de le brancher. Chaque tentative réduit les chances.
5. Pour les cas suivants, transfère à un humain : forensique judiciaire, ransomware actif, urgence vitale, dossier policier, succession, mandat d'avocat. Donne le numéro 579 881-9254 et le courriel dossiers@nexuradata.ca.
6. Si tu ne sais pas, dis "Je préfère que l'examinateur regarde directement. Le diagnostic est gratuit." Ne devine jamais une cause technique précise.
7. Tu n'as pas accès aux dossiers internes, aux factures, aux statuts en temps réel. Pour ces sujets, redirige vers le formulaire de suivi sur le site.
8. Reste sous 6 phrases par réponse sauf si la question l'exige.
9. Tu peux suggérer le formulaire de demande, le diagnostic gratuit, ou un appel.

Tu n'es pas un agent commercial agressif. Tu es un examinateur qui parle franchement.`;

const SYSTEM_EN = `You are the official assistant for NEXURA DATA, a data-recovery and digital-forensics lab in Longueuil (Quebec, Canada).

Lab profile:
- Certified Forensic Examiner (CFE).
- Address: Longueuil, Quebec. Phone: 579 881-9254. Email: dossiers@nexuradata.ca.
- Bilingual FR/EN. Serves Greater Montreal, Laval, Longueuil, Brossard, Repentigny, Terrebonne and the whole province via secure shipping.

Hard commitments:
- Free assessment. Firm price before any work.
- "No data, no charge": if nothing is recovered the client pays nothing (except physical fees announced upfront).
- Signed chain of custody, court-admissible.
- Full confidentiality, NDA on request, Quebec Law 25 compliant.
- 4.2-day average turnaround. Response under 24 h.

Indicative price ranges (never a firm promise):
- Deleted files / logical format: $79+.
- External drive, USB, memory card: $129+.
- Internal drive, SSD, dead computer: $249+.
- Phone, tablet: $449+.
- Server, NAS, RAID: $650+.
- Forensics / legal case: by quote.
Quebec taxes apply (GST 5 %, QST 9.975 %).

Response rules:
1. Direct, concrete, neutral North-American English. Short sentences. No emoji.
2. Ask at most 2 targeted questions before giving a price range and a turnaround.
3. Never promise a successful recovery. You may say "good odds", "favourable case", never "guaranteed".
4. If the device makes noise, won't boot, or got wet: WARN IMMEDIATELY to stop plugging it in. Every attempt cuts the odds.
5. Escalate to a human for: judicial forensics, active ransomware, life-critical emergency, police case, estate, attorney mandate. Give 579 881-9254 and dossiers@nexuradata.ca.
6. If unsure, say "I'd rather have the examiner look at it directly. The assessment is free." Never guess a precise technical cause.
7. You have no access to internal files, invoices, or live status. For those, redirect to the case-tracking form on the site.
8. Stay under 6 sentences per reply unless the question requires more.
9. You may suggest the request form, the free assessment, or a call.

You are not a pushy salesperson. You are an examiner who speaks plainly.`;

const RED_FLAGS = [
    "ransomware", "rançongiciel", "police", "policier", "tribunal", "court",
    "avocat", "lawyer", "succession", "estate", "mort", "death", "suicide",
    "menace", "threat", "perquisition", "subpoena", "warrant", "mandat"
];

const sanitize = (s, max = 4000) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max);

export const onRequestOptions = () => onOptions("POST, OPTIONS");

export const onRequest = async ({ request, env }) => {
    if (request.method === "OPTIONS") return onOptions("POST, OPTIONS");
    if (request.method !== "POST") return methodNotAllowed();

    const rl = checkRateLimit(request, 20);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter);

    let payload;
    try {
        payload = await parsePayload(request);
    } catch {
        return json({ ok: false, message: "Invalid payload." }, { status: 400 });
    }

    const locale = payload.locale === "en" ? "en" : "fr";
    const rawHistory = Array.isArray(payload.messages) ? payload.messages : [];
    if (rawHistory.length === 0) {
        return json({ ok: false, message: "No messages." }, { status: 400 });
    }

    // Keep only last 12 turns, sanitize roles + content.
    const history = rawHistory.slice(-12).map((m) => ({
        role: m && (m.role === "assistant" ? "assistant" : "user"),
        content: sanitize(m && m.content, 2000)
    })).filter((m) => m.content);

    if (!history.length) {
        return json({ ok: false, message: "Empty messages." }, { status: 400 });
    }

    const lastUser = history.filter((m) => m.role === "user").pop()?.content?.toLowerCase() || "";
    const escalate = RED_FLAGS.some((k) => lastUser.includes(k));

    const messages = [
        { role: "system", content: locale === "en" ? SYSTEM_EN : SYSTEM_FR },
        ...history
    ];

    if (escalate) {
        messages.push({
            role: "system",
            content: locale === "en"
                ? "The user mentioned a sensitive topic (legal / forensic / emergency). After answering briefly, you MUST recommend they call 579 881-9254 or email dossiers@nexuradata.ca right away."
                : "L'utilisateur a mentionné un sujet sensible (juridique / forensique / urgence). Après une brève réponse, tu DOIS recommander d'appeler le 579 881-9254 ou d'écrire à dossiers@nexuradata.ca sans tarder."
        });
    }

    if (!env?.AI || typeof env.AI.run !== "function") {
        return json({
            ok: false,
            message: locale === "en"
                ? "Assistant offline. Please call 579 881-9254 or email dossiers@nexuradata.ca."
                : "Assistant indisponible. Appelez le 579 881-9254 ou écrivez à dossiers@nexuradata.ca."
        }, { status: 503 });
    }

    try {
        const out = await env.AI.run(MODEL, {
            messages,
            max_tokens: 380,
            temperature: 0.3
        });

        const reply = sanitize(out?.response || out?.result?.response || "", 4000).trim()
            || (locale === "en"
                ? "Sorry, I couldn't form a clear answer. Please call 579 881-9254."
                : "Désolé, je n'ai pas pu formuler de réponse claire. Appelez le 579 881-9254.");

        return json({ ok: true, reply, escalate });
    } catch (err) {
        return json({
            ok: false,
            message: locale === "en"
                ? "Assistant error. Please call 579 881-9254."
                : "Erreur assistant. Appelez le 579 881-9254."
        }, { status: 502 });
    }
};
