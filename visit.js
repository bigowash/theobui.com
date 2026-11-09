// Silent visitor ping: tells Theo (via /api/visit -> Slack) where a visitor is
// from. No UI. Bots skip it, and it fires once per browser session, not per page.
(function () {
    try {
        var KEY = 'tb-visit-v1';
        var BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp|telegram|discord|lighthouse|headless|google-inspectiontool|gptbot|perplexity|claude|chatgpt/i;
        if (BOT.test(navigator.userAgent) || sessionStorage.getItem(KEY)) return;
        sessionStorage.setItem(KEY, '1');

        var body = JSON.stringify({
            page: location.pathname,
            referrer: document.referrer,
            query: location.search,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            screen: screen.width + 'x' + screen.height
        });
        if (!(navigator.sendBeacon && navigator.sendBeacon('/api/visit', body))) {
            fetch('/api/visit', { method: 'POST', body: body, keepalive: true }).catch(function () {});
        }
    } catch (e) {}
})();
