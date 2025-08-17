(function () {
  // Short list of tech-y snippets to fall down the screen.
  const SNIPPETS = [
    'def process_row(row):',
    'if __name__ == "__main__":',
    'app.get("/api/health")',
    'SELECT id, email FROM users;',
    'useEffect(() => {}, [])',
    'return jsonify(data)',
    'const res = await fetch(url)',
    'for (const item of list) {',
    'docker compose up -d',
    'git commit -m "feat: ui"',
    '@media (max-width: 768px)',
    'display: flex;',
    'border-radius: 6px;',
    'transform: translateY()',
    'pip install -r requirements.txt',
    'PRIMARY KEY (id)',
    'async function handler(req,res)',
    'width: min(1200px,90%)',
    'session.commit()',
    'JOIN accounts a ON a.id = u.aid'
  ];

  // Tunables (adjust for density & pace)
  const MAX_NODES = 42;            // Increased cap for denser field
  const SEED_COUNT = 28;           // More initial snippets
  const TOP_UP_INTERVAL = 900;     // Faster replenishment cadence
  const LIFETIME = 28000;          // Slightly shorter lifetime to recycle

  function init() {
    // Respect reduced motion preferences.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Avoid double‑injection if script loaded twice (e.g. hot reload).
    if (document.querySelector('.code-rain')) return;

    const layer = document.createElement('div');
    layer.className = 'code-rain';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    // Initial seed with staggered delays for nicer distribution.
  // Faster initial cascade (tighter stagger)
  for (let i = 0; i < SEED_COUNT; i++) spawn(layer, i * 130);

    // Periodic top-ups.
    setInterval(() => {
      if (!document.body.contains(layer)) return; // safety
      if (layer.childElementCount < MAX_NODES) spawn(layer);
    }, TOP_UP_INTERVAL);
  }

  function spawn(layer, delay = 0) {
    window.setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'code-snippet';
      el.textContent = pick(SNIPPETS);
      el.style.left = (Math.random() * 96).toFixed(2) + '%';
  // Shorter fall duration range => faster movement
  el.style.animationDuration = (9 + Math.random() * 9).toFixed(2) + 's'; // 9s - 18s
  // Smaller initial delay so items appear sooner
  el.style.animationDelay = (Math.random() * 1.6).toFixed(2) + 's';
      el.style.fontSize = (10 + Math.random() * 5).toFixed(0) + 'px';
      layer.appendChild(el);
      // Cleanup after lifetime to prevent DOM bloat.
      window.setTimeout(() => el.remove(), LIFETIME);
    }, delay);
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
