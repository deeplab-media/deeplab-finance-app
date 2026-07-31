/* Deeplab Finance PWA service worker — network-first, cache fallback.
   KHÔNG đụng vào api.github.com (đồng bộ dữ liệu luôn đi mạng thật). */
const CACHE = 'deeplab-finance-v12';
const CORE = ['./', './index.html', './app.webmanifest', './finance-icon.png', './finance-icon-180.png', './logo.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('deeplab-finance') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const inScope = u.origin === self.location.origin;
  const isExt = /fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com/.test(u.host);
  if (!inScope && !isExt) return; // api.github.com và mọi thứ khác: bỏ qua
  // Trang chính luôn hỏi server bản mới nhất, không lấy từ HTTP cache — để cập nhật app là nhận ngay
  const req = e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'no-cache' }) : e.request;
  e.respondWith(
    fetch(req)
      .then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        return r;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true })
          .then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
  );
});
