import {
    createCase,
    createCasePaymentRequest,
    validateSubmission
} from "../../_lib/cases.js";
import { sendClientAccessEmail, sendLabNotificationEmail } from "../../_lib/email.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../../_lib/rate-limit.js";

const EVALUATION_AMOUNT = "75.00";
const EVALUATION_LABEL_FR = "Évaluation diagnostique NEXURADATA";
const EVALUATION_LABEL_EN = "NEXURADATA diagnostic evaluation";
const EVALUATION_DESCRIPTION_FR =
    "Évaluation diagnostique 60–90 minutes en laboratoire à Montréal. Non remboursable. Créditée intégralement sur le mandat de récupération si vous décidez d'aller de l'avant.";
const EVALUATION_DESCRIPTION_EN =
    "60–90 minute diagnostic evaluation at our Montreal lab. Non-refundable. Fully credited toward your recovery mandate if you proceed.";

const normalizeLocale = (value) => {
    const lower = `${value || ""}`.trim().toLowerCase();
    return lower === "en" ? "en" : "fr";
};

export const onRequestOptions = () => onOptions("POST, OPTIONS");

export const onRequestPost = async (context) => {
    const limit = checkRateLimit(context.request, 5);
    if (!limit.allowed) return tooManyRequests(limit.retryAfter);

    if (!context.env?.INTAKE_DB) {
        return json(
            { ok: false, message: "Le backend de paiement n'est pas encore configuré." },
            { status: 503 }
        );
    }

    if (!context.env?.ACCESS_CODE_SECRET) {
        return json(
            { ok: false, message: "Configuration incomplète. Contactez l'administrateur." },
            { status: 503 }
        );
    }

    if (!context.env?.STRIPE_SECRET_KEY) {
        return json(
            { ok: false, message: "Le module de paiement n'est pas encore activé." },
            { status: 503 }
        );
    }

    let payload;
    try {
        payload = await parsePayload(context.request);
    } catch (error) {
        return json(
            { ok: false, message: error instanceof Error ? error.message : "Format invalide." },
            { status: 400 }
        );
    }

    const locale = normalizeLocale(payload.locale);
    const submissionInput = {
        nom: payload.nom ?? payload.name,
        courriel: payload.courriel ?? payload.email,
        telephone: payload.telephone ?? payload.phone,
        support: payload.support || "Je ne sais pas",
        urgence: payload.urgence || payload.urgency || "Standard",
        message: payload.message ?? payload.problem ?? payload.description,
        sourcePath: payload.sourcePath || payload.source_path || "/tarifs-recuperation-donnees-montreal.html",
        consentement: payload.consentement === true || payload.consentement === "true" || payload.consentement === "on" || payload.consent === true,
        website: payload.website
    };

    let submission;
    try {
        submission = validateSubmission(submissionInput);
    } catch (error) {
        return json(
            { ok: false, message: error instanceof Error ? error.message : "Champs invalides." },
            { status: 400 }
        );
    }

    let intakeRecord;
    try {
        intakeRecord = await createCase(context.env, submission);
    } catch (error) {
        return json(
            { ok: false, message: error instanceof Error ? error.message : "Création du dossier impossible." },
            { status: 500 }
        );
    }

    // Send intake emails best-effort, do not block the payment flow if they fail.
    context.waitUntil?.(
        Promise.allSettled([
            sendLabNotificationEmail(context.env, intakeRecord, context.request.url),
            sendClientAccessEmail(
                context.env,
                {
                    caseId: intakeRecord.caseId,
                    accessCode: intakeRecord.accessCode,
                    email: intakeRecord.courriel,
                    name: intakeRecord.nom,
                    status: intakeRecord.status,
                    nextStep: intakeRecord.nextStep
                },
                context.request.url,
                "initial"
            )
        ])
    );

    let paymentRow;
    try {
        paymentRow = await createCasePaymentRequest(
            context.env,
            {
                caseId: intakeRecord.caseId,
                paymentKind: "evaluation",
                label: locale === "en" ? EVALUATION_LABEL_EN : EVALUATION_LABEL_FR,
                description: locale === "en" ? EVALUATION_DESCRIPTION_EN : EVALUATION_DESCRIPTION_FR,
                amount: EVALUATION_AMOUNT,
                currency: "cad"
            },
            "client-evaluation",
            context.request.url
        );
    } catch (error) {
        return json(
            {
                ok: false,
                error: "stripe-error",
                message: "Création de la session Stripe impossible. Réessayez ou contactez le laboratoire."
            },
            { status: 502 }
        );
    }

    if (!paymentRow?.checkoutUrl) {
        return json(
            { ok: false, message: "Lien de paiement indisponible." },
            { status: 502 }
        );
    }

    return json({
        ok: true,
        caseId: intakeRecord.caseId,
        paymentRequestId: paymentRow.paymentRequestId,
        url: paymentRow.checkoutUrl,
        amountCents: paymentRow.amountCents,
        currency: paymentRow.currency
    });
};

export const onRequest = methodNotAllowed;
