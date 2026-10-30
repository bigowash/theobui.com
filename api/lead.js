// Receives visitor-gate submissions from gate.js.
// Every submission is logged (Vercel runtime logs) and, when SLACK_WEBHOOK_URL
// is set, posted to Slack so Theo hears about each visitor.

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

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

    var body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    // Honeypot field: real visitors never fill it.
    if (body.website) return res.status(200).json({ ok: true });

    var lead = {
        name: clean(body.name, 120),
        email: clean(body.email, 200).toLowerCase(),
        who: clean(body.who, 60),
        company: clean(body.company, 300),
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
        userAgent: clean(req.headers['user-agent'], 300),
        at: new Date().toISOString()
    };

    if (!lead.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
        return res.status(400).json({ error: 'name and email required' });
    }

    console.log('[lead]', JSON.stringify(lead));

    var webhook = process.env.SLACK_WEBHOOK_URL;
    if (webhook) {
        var where = esc([lead.city, lead.region, lead.country].filter(Boolean).join(', '));
        var lines = [
            '*New theobui.com visitor:* ' + esc(lead.name) + ' (' + esc(lead.email) + ')',
            '*Who:* ' + esc(lead.who) + (lead.company ? ' — ' + esc(lead.company) : ''),
            '*Landed on:* ' + esc(lead.page || '/') + (lead.query ? ' ' + esc(lead.query) : ''),
            '*From:* ' + esc(lead.referrer || 'direct / unknown'),
            '*Where:* ' + (where || 'unknown') + (lead.timezone ? ' (' + esc(lead.timezone) + ')' : ''),
            'https://www.linkedin.com/search/results/all/?keywords=' + encodeURIComponent(lead.name + ' ' + lead.email.split('@')[1])
        ];
        try {
            var r = await fetch(webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: lines.join('\n') })
            });
            if (!r.ok) console.error('[lead] slack webhook failed', r.status, await r.text());
        } catch (e) {
            console.error('[lead] slack webhook error', e);
        }
    }

    return res.status(200).json({ ok: true });
};
