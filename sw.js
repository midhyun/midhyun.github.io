/**
 * Service Worker — 법인카드관리 백오피스
 * 전략: Cache-First (오프라인에서도 앱이 즉시 열립니다)
 *
 * ⚠️  PWA는 http:// 또는 https:// 에서만 동작합니다.
 *     file:// 프로토콜에서는 Service Worker 등록이 거부됩니다.
 *     로컬 테스트 시: npx serve . 또는 VS Code Live Server를 사용하세요.
 */

const CACHE_NAME = 'overtime-ledger-v1';

// 캐시할 정적 자산 목록
const PRECACHE_ASSETS = [
    './expense_ledger.html',
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

// ── fetch: Cache-First 전략
self.addEventListener('fetch', (event) => {
    // chrome-extension, data: 등 비 http 요청은 무시
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // 캐시 미스 → 네트워크에서 가져와 캐시에 저장
            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            });
        })
    );
});
