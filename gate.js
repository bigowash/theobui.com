// Visitor gate: asks for name, email and who they are before showing the site.
// Crawlers and link-preview bots skip it, so pages still index and unfurl.
// The page content stays in the HTML; the gate only blurs it until submitted.
(function () {
    var KEY = 'tb-gate-v1';
    var BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp|telegram|discord|lighthouse|headless|google-inspectiontool|gptbot|perplexity|claude|chatgpt/i;

    try { if (localStorage.getItem(KEY)) return; } catch (e) { return; }
    if (BOT.test(navigator.userAgent)) return;

    var root = document.documentElement;
    root.classList.add('tb-gated');

    var css = document.createElement('style');
    css.textContent =
        'html.tb-gated { overflow: hidden; }' +
        'html.tb-gated body > *:not(#tb-gate) { filter: blur(10px); pointer-events: none; user-select: none; }' +
        '#tb-gate { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(12,12,12,0.72); font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }' +
        '#tb-gate form { width: 100%; max-width: 360px; background: #0c0c0c; border: 1px solid #1c1c1c; border-radius: 10px; padding: 32px 28px; }' +
        '#tb-gate h2 { font-size: 1.05em; font-weight: 500; color: #e8e8e8; letter-spacing: -0.01em; }' +
        '#tb-gate p { font-size: 0.8em; color: #555; margin: 6px 0 24px; line-height: 1.6; }' +
        '#tb-gate label { display: block; font-size: 0.72em; color: #555; margin: 14px 0 6px; }' +
        '#tb-gate input, #tb-gate select { width: 100%; background: #111; border: 1px solid #222; border-radius: 6px; color: #e8e8e8; font: inherit; font-size: 0.88em; padding: 10px 12px; outline: none; transition: border-color 0.15s; }' +
        '#tb-gate select { appearance: none; -webkit-appearance: none; }' +
        '#tb-gate input:focus, #tb-gate select:focus { border-color: #555; }' +
        '#tb-gate .hp { position: absolute; left: -9999px; }' +
        '#tb-gate button { width: 100%; margin-top: 24px; background: #e8e8e8; color: #0c0c0c; border: 0; border-radius: 6px; font: inherit; font-size: 0.85em; font-weight: 500; padding: 11px; cursor: pointer; transition: opacity 0.15s; }' +
        '#tb-gate button:hover { opacity: 0.85; }' +
        '#tb-gate .err { color: #c66; font-size: 0.75em; margin-top: 10px; min-height: 1em; }';
    document.head.appendChild(css);

    function mount() {
        var gate = document.createElement('div');
        gate.id = 'tb-gate';
        gate.innerHTML =
            '<form novalidate>' +
                '<h2>Theo Bui</h2>' +
                '<p>Quick intro before you look around.</p>' +
                '<label for="tb-name">Name</label>' +
                '<input id="tb-name" name="name" autocomplete="name" required>' +
                '<label for="tb-email">Email</label>' +
                '<input id="tb-email" name="email" type="email" autocomplete="email" required>' +
                '<label for="tb-who">Who are you?</label>' +
                '<select id="tb-who" name="who" required>' +
                    '<option value="" disabled selected>Pick one</option>' +
                    '<option>Investor</option>' +
                    '<option>Founder</option>' +
                    '<option>Recruiter / hiring</option>' +
                    '<option>Engineer</option>' +
                    '<option>Brand / potential customer</option>' +
                    '<option>Creator</option>' +
                    '<option>Student</option>' +
                    '<option>Friend</option>' +
                    '<option>Other</option>' +
                '</select>' +
                '<label for="tb-company">Company / what brings you here <span style="color:#333">(optional)</span></label>' +
                '<input id="tb-company" name="company" autocomplete="organization">' +
                '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
                '<button type="submit">Continue</button>' +
                '<div class="err" role="alert"></div>' +
            '</form>';
        document.body.appendChild(gate);

        var form = gate.querySelector('form');
        var err = gate.querySelector('.err');
        form.querySelector('#tb-name').focus();

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var f = form.elements;
            var data = {
                name: f.namedItem('name').value.trim(),
                email: f.namedItem('email').value.trim(),
                who: f.namedItem('who').value,
                company: f.namedItem('company').value.trim(),
                website: f.namedItem('website').value,
                page: location.pathname,
                referrer: document.referrer,
                query: location.search,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                screen: screen.width + 'x' + screen.height
            };
            if (!data.name) { err.textContent = 'Add your name.'; return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { err.textContent = 'That email looks off.'; return; }
            if (!data.who) { err.textContent = 'Pick who you are.'; return; }

            // Never lock a real visitor out: unlock even if the request fails.
            fetch('/api/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true
            }).catch(function () {});
            try { localStorage.setItem(KEY, JSON.stringify({ email: data.email, at: Date.now() })); } catch (e) {}
            gate.remove();
            root.classList.remove('tb-gated');
        });
    }

    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount);
})();
