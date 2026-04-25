// NEXURA DATA — AI chat widget
// - Bilingual (auto-detect via <html lang>)
// - Calls /api/chat backed by Cloudflare Workers AI (Llama 3.1)
// - Conversation kept locally only (no server storage)
// - Minimal, accessible, locked-token styling
(function () {
    'use strict';

    const root = document.documentElement;
    const locale = (root.getAttribute('lang') || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';

    const T = locale === 'en'
        ? {
            title: 'NEXURA Assistant',
            subtitle: 'AI · Lab Longueuil',
            placeholder: 'Describe your situation…',
            send: 'Send',
            close: 'Close',
            opener: 'Ask the AI',
            intro: "Hi. I'm the NEXURA DATA AI assistant. Tell me what happened — device, symptoms, urgency. I give a price range and a turnaround. For sensitive cases (legal, ransomware, emergency), I hand you to a human right away.",
            foot: 'AI · responses indicative · the examiner confirms.',
            error: 'Connection issue. Try again or call 514 555-0199.',
            rate: 'Too many messages. Take a breath, try again in a moment.'
        }
        : {
            title: 'Assistant NEXURA',
            subtitle: 'IA · Labo Longueuil',
            placeholder: 'Décrivez votre situation…',
            send: 'Envoyer',
            close: 'Fermer',
            opener: 'Parler à l’IA',
            intro: "Bonjour. Je suis l’assistant IA de NEXURA DATA. Dites-moi ce qui s’est passé — appareil, symptômes, urgence. Je donne une fourchette de prix et un délai. Pour les cas sensibles (juridique, ransomware, urgence), je vous transfère à un humain immédiatement.",
            foot: 'IA · réponses indicatives · l’examinateur confirme.',
            error: 'Problème de connexion. Réessayez ou appelez le 514 555-0199.',
            rate: 'Trop de messages. Reprenez votre souffle, réessayez dans un moment.'
        };

    // Build launcher
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'chat-launcher';
    launcher.setAttribute('aria-label', T.opener);
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = '<span class="chat-launcher-dot" aria-hidden="true"></span><span>' + T.opener + '</span>';

    // Build panel
    const panel = document.createElement('section');
    panel.className = 'chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', T.title);
    panel.setAttribute('aria-modal', 'false');
    panel.innerHTML =
        '<header class="chat-head">' +
        '<div class="chat-head-title"><strong>' + T.title + '</strong><span>' + T.subtitle + '</span></div>' +
        '<button type="button" class="chat-close" aria-label="' + T.close + '">×</button>' +
        '</header>' +
        '<div class="chat-log" role="log" aria-live="polite"></div>' +
        '<form class="chat-form" autocomplete="off">' +
        '<textarea class="chat-input" rows="1" placeholder="' + T.placeholder + '" required maxlength="1500" aria-label="' + T.placeholder + '"></textarea>' +
        '<button type="submit" class="chat-send">' + T.send + '</button>' +
        '</form>' +
        '<p class="chat-foot">' + T.foot + '</p>';

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    const log = panel.querySelector('.chat-log');
    const form = panel.querySelector('.chat-form');
    const input = panel.querySelector('.chat-input');
    const sendBtn = panel.querySelector('.chat-send');
    const closeBtn = panel.querySelector('.chat-close');

    const history = []; // [{role, content}]
    let busy = false;
    let opened = false;

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Linkify phone, email, URLs (very small, safe)
    function linkify(s) {
        let out = escapeHtml(s);
        out = out.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        out = out.replace(/(\b[\w.+-]+@[\w-]+\.[\w.-]+\b)/g, '<a href="mailto:$1">$1</a>');
        out = out.replace(/(\b(?:514|438|450|579|581|418|819|873|367)[\s.\-]?\d{3}[\s.\-]?\d{4}\b)/g,
            function (m) { return '<a href="tel:' + m.replace(/[^\d]/g, '') + '">' + m + '</a>'; });
        return out;
    }

    function addMsg(role, text, opts) {
        const div = document.createElement('div');
        div.className = 'chat-msg chat-msg--' + role;
        if (opts && opts.html) div.innerHTML = linkify(text);
        else div.textContent = text;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
        return div;
    }

    function showTyping() {
        const t = document.createElement('div');
        t.className = 'chat-typing';
        t.innerHTML = '<span></span><span></span><span></span>';
        t.setAttribute('aria-label', 'typing');
        log.appendChild(t);
        log.scrollTop = log.scrollHeight;
        return t;
    }

    function open() {
        if (opened) return;
        opened = true;
        panel.classList.add('is-open');
        launcher.setAttribute('aria-expanded', 'true');
        if (history.length === 0) {
            addMsg('bot', T.intro);
            history.push({ role: 'assistant', content: T.intro });
        }
        setTimeout(function () { input.focus(); }, 50);
    }

    function close() {
        opened = false;
        panel.classList.remove('is-open');
        launcher.setAttribute('aria-expanded', 'false');
    }

    launcher.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && opened) close();
    });
    // Mobile sticky-bar bot button hooks here too
    document.querySelectorAll('[data-open-chat]').forEach(function (b) {
        b.addEventListener('click', open);
    });

    // Auto-grow textarea
    input.addEventListener('input', function () {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 96) + 'px';
    });
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.requestSubmit();
        }
    });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (busy) return;
        const text = input.value.trim();
        if (!text) return;

        addMsg('user', text);
        history.push({ role: 'user', content: text });
        input.value = '';
        input.style.height = 'auto';

        busy = true;
        sendBtn.disabled = true;
        const typing = showTyping();

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ locale: locale, messages: history })
            });

            typing.remove();

            if (res.status === 429) {
                addMsg('system', T.rate);
            } else {
                const data = await res.json().catch(function () { return null; });
                if (!data || !data.ok || !data.reply) {
                    addMsg('system', (data && data.message) || T.error);
                } else {
                    const node = addMsg('bot', data.reply, { html: true });
                    history.push({ role: 'assistant', content: data.reply });
                    if (data.escalate) {
                        const esc = document.createElement('div');
                        esc.className = 'chat-msg chat-msg--system';
                        esc.innerHTML = locale === 'en'
                            ? 'Sensitive case detected — recommended: <a href="tel:+15145550199">514 555-0199</a> or <a href="mailto:dossiers@nexuradata.ca">dossiers@nexuradata.ca</a>.'
                            : 'Cas sensible détecté — recommandé : <a href="tel:+15145550199">514 555-0199</a> ou <a href="mailto:dossiers@nexuradata.ca">dossiers@nexuradata.ca</a>.';
                        log.appendChild(esc);
                    }
                    // Trim history client-side to last 16 turns
                    if (history.length > 16) history.splice(0, history.length - 16);
                }
            }
        } catch (err) {
            typing.remove();
            addMsg('system', T.error);
        } finally {
            busy = false;
            sendBtn.disabled = false;
            log.scrollTop = log.scrollHeight;
            input.focus();
        }
    });
})();
