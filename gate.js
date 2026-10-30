// Visitor gate: asks for name, email and who they are before showing the site.
// Crawlers and link-preview bots skip it, so pages still index and unfurl.
// The page content stays in the HTML; the gate only covers it until submitted.
(function () {
    var KEY = 'tb-gate-v1';
    var BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp|telegram|discord|lighthouse|headless|google-inspectiontool|gptbot|perplexity|claude|chatgpt/i;

    // ?gate forces the gate to show again, even after this browser submitted it.
    var force = /[?&]gate\b/.test(location.search);
    try {
        if (force) localStorage.removeItem(KEY);
        else if (localStorage.getItem(KEY)) return;
    } catch (e) { return; }
    if (!force && BOT.test(navigator.userAgent)) return;

    var root = document.documentElement;
    root.classList.add('tb-gated');

    var css = document.createElement('style');
    css.textContent =
        'html.tb-gated { overflow: hidden; }' +
        '@keyframes tb-in { from { opacity: 0; } to { opacity: 1; } }' +
        '#tb-gate { position: fixed; inset: 0; z-index: 9999; overflow-y: auto; background: #0c0c0c; color: #b8b8b8; line-height: 1.7; font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; animation: tb-in 0.3s ease; }' +
        '#tb-gate form { min-height: 100%; max-width: 640px; margin: 0 auto; padding: 80px 40px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }' +
        '#tb-gate h1 { font-size: 1.1em; font-weight: 500; color: #e8e8e8; letter-spacing: -0.01em; margin: 0; }' +
        '#tb-gate .sub { color: #555; font-size: 0.82em; margin-top: 4px; }' +
        '#tb-gate .bio { margin-top: 28px; font-size: 0.88em; color: #999; max-width: 440px; }' +
        '#tb-gate .fields { margin-top: 32px; width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 10px; }' +
        '#tb-gate input[type=text], #tb-gate input[type=email] { display: block; width: 100%; background: #121212; border: 1px solid #222; border-radius: 10px; color: #e8e8e8; font: inherit; font-size: 0.85em; padding: 11px 14px; text-align: left; outline: none; transition: border-color 0.15s, background 0.15s; }' +
        '#tb-gate input::placeholder { color: #555; }' +
        '#tb-gate input[type=text]:focus, #tb-gate input[type=email]:focus { border-color: #555; background: #151515; }' +
        '#tb-gate .q { font-size: 0.78em; color: #666; margin: 14px 0 0; text-align: left; }' +
        '#tb-gate .who { display: flex; flex-wrap: wrap; gap: 6px; }' +
        '#tb-gate .who input { position: absolute; opacity: 0; pointer-events: none; }' +
        '#tb-gate .who span { display: inline-block; font-size: 0.78em; color: #777; cursor: pointer; padding: 5px 12px; border: 1px solid #222; border-radius: 999px; transition: color 0.15s, border-color 0.15s, background 0.15s; }' +
        '#tb-gate .who span:hover { color: #999; border-color: #333; }' +
        '#tb-gate .who input:checked + span { color: #0c0c0c; border-color: #e8e8e8; background: #e8e8e8; }' +
        '#tb-gate .who input:focus-visible + span { outline: 1px solid #666; outline-offset: 2px; }' +
        '#tb-gate .hp { position: absolute; left: -9999px; }' +
        '#tb-gate button { margin-top: 18px; width: 100%; background: #e8e8e8; border: 0; border-radius: 10px; padding: 11px 14px; font: inherit; font-size: 0.85em; font-weight: 500; color: #0c0c0c; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.15s; }' +

        '#tb-gate button:hover { opacity: 0.88; }' +

        '#tb-gate .err { color: #c77; font-size: 0.75em; min-height: 1.2em; text-align: left; }' +
        '@media (max-width: 600px) { #tb-gate form { padding: 60px 24px; } }';
    document.head.appendChild(css);

    var WHO = ['Investor', 'Founder', 'Recruiter', 'Engineer', 'Brand', 'Creator', 'Student', 'Friend', 'Other'];

    function mount() {
        var gate = document.createElement('div');
        gate.id = 'tb-gate';
        gate.innerHTML =
            '<form novalidate>' +
                '<h1>Theo Bui</h1>' +
                '<div class="sub">Engineer · San Francisco</div>' +
                '<p class="bio">Before you look around, tell me who you are.</p>' +
                '<div class="fields">' +
                    '<input type="text" name="name" placeholder="Name" autocomplete="name" aria-label="Name">' +
                    '<input type="email" name="email" placeholder="Email" autocomplete="email" aria-label="Email">' +
                    '<div class="q" id="tb-who-label">I\'m a…</div>' +
                    '<div class="who" role="radiogroup" aria-labelledby="tb-who-label">' +
                        WHO.map(function (w) {
                            return '<label><input type="radio" name="who" value="' + w + '"><span>' + w.toLowerCase() + '</span></label>';
                        }).join('') +
                    '</div>' +
                    '<input type="text" name="company" placeholder="Company, or what brings you here (optional)" autocomplete="organization" aria-label="Company, or what brings you here" style="margin-top: 6px">' +
                    '<button type="submit">Continue →</button>' +
                    '<div class="err" role="alert"></div>' +
                '</div>' +
                '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
            '</form>';
        document.body.appendChild(gate);

        var form = gate.querySelector('form');
        var err = gate.querySelector('.err');
        form.elements.namedItem('name').focus();

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
