// Receives the silent visitor ping from visit.js.
// Every visit is logged (Vercel runtime logs) and, when SLACK_WEBHOOK_URL is
// set, posted to Slack with the visitor's IP-based location.

// Theo's Slack user ID, tagged on every alert so it notifies him.
var THEO_SLACK_ID = 'U09RTC8B0RW';
var BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp|telegram|discord|lighthouse|headless|google-inspectiontool|gptbot|perplexity|claude|chatgpt/i;

function clean(value, max) {
    return String(value || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max || 200);
}

// Slack treats <...> as links and mentions, so escape visitor-supplied text.
function esc(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function header(req, name) {
    var value = req.headers[name];
    try { return value ? decodeURIComponent(String(value)) : ''; } catch (e) { return String(value); }
}

function parse(body) {
    if (body && typeof body === 'object') return body;
    try { return JSON.parse(body || '{}') || {}; } catch (e) { return {}; }
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    var userAgent = clean(req.headers['user-agent'], 300);
    if (BOT.test(userAgent)) return res.status(204).end();

    var body = parse(req.body);
    var visit = {
        page: clean(body.page, 200),
        referrer: clean(body.referrer, 300),
        query: clean(body.query, 300),
        timezone: clean(body.timezone, 60),
        language: clean(body.language, 30),
        screen: clean(body.screen, 20),
        city: header(req, 'x-vercel-ip-city'),
        region: header(req, 'x-vercel-ip-country-region'),
        country: header(req, 'x-vercel-ip-country'),
        ip: clean(String(req.headers['x-forwarded-for'] || '').split(',')[0], 60),
        userAgent: userAgent,
        at: new Date().toISOString()
    };

    console.log('[visit]', JSON.stringify(visit));

    var webhook = process.env.SLACK_WEBHOOK_URL;
    if (webhook) {
        var where = esc([visit.city, visit.region, visit.country].filter(Boolean).join(', '));
        var lines = [
            '<@' + THEO_SLACK_ID + '> *theobui.com visitor* from ' + (where || 'unknown location'),
            '*IP:* ' + esc(visit.ip || 'unknown') + (visit.ip ? ' (https://ipinfo.io/' + encodeURIComponent(visit.ip) + ')' : ''),
            '*Landed on:* ' + esc(visit.page || '/') + (visit.query ? ' ' + esc(visit.query) : ''),
            '*From:* ' + esc(visit.referrer || 'direct / unknown'),
            '*Timezone:* ' + esc(visit.timezone || 'unknown') + (visit.language ? ' · ' + esc(visit.language) : '') + (visit.screen ? ' · ' + esc(visit.screen) : ''),
            '*UA:* ' + esc(visit.userAgent || 'unknown')
        ];
        try {
            var r = await fetch(webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: lines.join('\n') })
            });
            if (!r.ok) console.error('[visit] slack webhook failed', r.status, await r.text());
        } catch (e) {
            console.error('[visit] slack webhook error', e);
        }
    }

    return res.status(204).end();
};
