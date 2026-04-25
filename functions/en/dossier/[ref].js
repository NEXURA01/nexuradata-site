// /en/dossier/:ref → 302 → /en/dossier/?caseId=:ref
const REF_RE = /^NX-\d{4}-\d{4}$/i;

export const onRequest = ({ request, params }) => {
    const url = new URL(request.url);
    const ref = (params?.ref || "").trim().toUpperCase();
    if (!REF_RE.test(ref)) return new Response("Not found", { status: 404 });
    return Response.redirect(
        new URL("/en/dossier/?caseId=" + encodeURIComponent(ref), url.origin).toString(),
        302
    );
};
