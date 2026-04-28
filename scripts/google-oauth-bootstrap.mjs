#!/usr/bin/env node
// Local OAuth bootstrap for Google APIs.
// Run: node scripts/google-oauth-bootstrap.mjs
// You must have GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET set in env or .env.

import http from 'node:http';
import { exec } from 'node:child_process';
import crypto from 'node:crypto';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT = 'http://127.0.0.1:8765/oauth/callback';
const SCOPES = [
    'https://www.googleapis.com/auth/webmasters',
    'https://www.googleapis.com/auth/business.manage'
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET first.');
    process.exit(1);
}

const state = crypto.randomBytes(16).toString('hex');
const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        state
    }).toString();

console.log('\n1) Opening browser to:\n', authUrl, '\n');

const opener = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
exec(`${opener} "${authUrl}"`);

const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith('/oauth/callback')) {
        res.statusCode = 404; res.end(); return;
    }
    const u = new URL(req.url, REDIRECT);
    const code = u.searchParams.get('code');
    if (u.searchParams.get('state') !== state || !code) {
        res.statusCode = 400; res.end('state/code mismatch'); return;
    }
    try {
        const r = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT,
                grant_type: 'authorization_code'
            })
        });
        const j = await r.json();
        if (!r.ok) {
            res.statusCode = 500; res.end(JSON.stringify(j)); return;
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<h1>OK — refresh token captured. Check your terminal.</h1>');
        console.log('\n=== GOOGLE_OAUTH_REFRESH_TOKEN ===');
        console.log(j.refresh_token);
        console.log('\nNext step:');
        console.log('  npx wrangler pages secret put GOOGLE_OAUTH_REFRESH_TOKEN --project-name nexuradata');
        console.log('  (paste the value above when prompted)\n');
        setTimeout(() => server.close(), 500);
    } catch (e) {
        console.error('OAuth callback error:', e);
        res.statusCode = 500;
        res.end('Error completing OAuth flow. Check the terminal for details.');
    }
});

server.listen(8765, '127.0.0.1', () => {
    console.log('Listening on http://127.0.0.1:8765 — complete the consent in the browser.');
});
