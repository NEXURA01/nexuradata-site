// NEXURA DATA — newsletter signup
// Posts to /api/newsletter, displays inline status, honors honeypot.
(function () {
    'use strict';

    const forms = document.querySelectorAll('form[data-newsletter]');
    if (!forms.length) return;

    forms.forEach(function (form) {
        const status = form.querySelector('.newsletter-status');
        const submit = form.querySelector('.newsletter-submit');
        const locale = (form.getAttribute('data-locale') || 'fr').toLowerCase() === 'en' ? 'en' : 'fr';
        const source = form.getAttribute('data-source') || 'unknown';

        const T = locale === 'en'
            ? { sending: 'Sending…', error: 'Could not subscribe. Try again.', invalid: 'Please enter a valid email.' }
            : { sending: 'Envoi…', error: 'Inscription échouée. Réessayez.', invalid: 'Adresse courriel invalide.' };

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!status || !submit) return;
            status.classList.remove('is-error');
            status.textContent = '';

            const fd = new FormData(form);
            const email = String(fd.get('email') || '').trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                status.textContent = T.invalid;
                status.classList.add('is-error');
                return;
            }

            submit.disabled = true;
            status.textContent = T.sending;

            try {
                const res = await fetch('/api/newsletter', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        website: String(fd.get('website') || ''),
                        locale: locale,
                        source: source,
                        consent_text: (form.querySelector('.newsletter-consent') || {}).textContent || ''
                    })
                });
                const data = await res.json().catch(function () { return null; });
                if (res.ok && data && data.ok) {
                    status.textContent = data.message || (locale === 'en' ? 'Subscribed.' : 'Inscription confirmée.');
                    form.reset();
                } else {
                    status.textContent = (data && data.message) || T.error;
                    status.classList.add('is-error');
                }
            } catch (err) {
                status.textContent = T.error;
                status.classList.add('is-error');
            } finally {
                submit.disabled = false;
            }
        });
    });
})();
