/**
 * Service Worker — 법인카드관리 백오피스
 * 전략:
 *   · HTML 문서  → Network-First (항상 최신 화면, 오프라인 시 캐시 폴백)
 *   · 그 외 자산 → Cache-First   (오프라인에서도 즉시 로드)
 *   (구버전 Cache-First는 HTML까지 캐시해 업데이트가 반영되지 않는 문제가 있었음)
 *
 * ⚠️  PWA는 http:// 또는 https:// 에서만 동작합니다.
 *     file:// 프로토콜에서는 Service Worker 등록이 거부됩니다.
 *     로컬 테스트 시: npx serve . 또는 VS Code Live Server를 사용하세요.
 */

const CACHE_NAME = 'overtime-ledger-v3';

// 캐시할 정적 자산 목록
const PRECACHE_ASSETS = [
    './expense_ledger.html',
    './m_expense_ledger.html',
    './manifest.json',
];

// ── 설치: 정적 자산 사전 캐시
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
    );
    self.skipWaiting(); // 즉시 활성화
});

// ── 활성화: 이전 버전 캐시 삭제
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim(); // 열린 페이지에 즉시 적용
});

// ── fetch
self.addEventListener('fetch', (event) => {
    const req = event.request;
    // chrome-extension, data: 등 비 http 요청은 무시
    if (!req.url.startsWith('http')) return;
    // GET 외(POST 등)는 그대로 통과
    if (req.method !== 'GET') return;

    const accept = req.headers.get('accept') || '';
    const isHTML = req.mode === 'navigate' || accept.includes('text/html');

    if (isHTML) {
        // Network-First: 최신 HTML 우선, 네트워크 실패 시 캐시 폴백
        event.respondWith(
            fetch(req).then((response) => {
                if (response && response.status === 200) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                }
                return response;
            }).catch(() =>
                caches.match(req).then((cached) => cached || caches.match('./m_expense_ledger.html'))
            )
        );
        return;
    }

    // 그 외 정적 자산: Cache-First
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                return response;
            });
        })
    );
});
