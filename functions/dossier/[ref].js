// /dossier/:ref → 302 → /dossier/?caseId=:ref  (preserves any code via ?code=…)
// /en/dossier/:ref → /en/dossier/?caseId=:ref
// Validates case ID format strictly to avoid open-redirect / log noise.

const REF_RE = /^NX-\d{4}-\d{4}$/i;

export const onRequest = ({ request, params }) => {
    const url = new URL(request.url);
    const ref = (params?.ref || "").trim().toUpperCase();
    if (!REF_RE.test(ref)) {
        return new Response("Not found", { status: 404 });
    }
    const isEn = url.pathname.startsWith("/en/");
    const target = (isEn ? "/en/dossier/" : "/dossier/") + "?caseId=" + encodeURIComponent(ref);
    return Response.redirect(new URL(target, url.origin).toString(), 302);
};
