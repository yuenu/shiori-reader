// 網路優先、斷線才用快取：線上永遠拿到最新版，離線也打得開
// 每次開頁面（以及第一次安裝時）依 build 產生的 asset-manifest.json 補齊所有 chunk，
// 書本解析用的 epub、zip 等延遲載入的檔案也會先存好，不必先開過一本書
// ponytail: 舊版的 hash 檔不會清掉，每次部署多約 200 KB；在意再於 precache 時刪掉清單外的 /assets/
const CACHE = 'shiori'

const precache = async () => {
    const cache = await caches.open(CACHE)
    const manifest = await (await fetch('/asset-manifest.json', { cache: 'no-store' })).json()
    const files = new Set(['/', ...Object.values(manifest).flatMap(c => [c.file, ...(c.css ?? [])]).map(f => `/${f}`)])
    for (const f of files) if (f === '/' || !await cache.match(f)) await cache.add(f)
}

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(Promise.all([self.clients.claim(), precache()])))

self.addEventListener('fetch', e => {
    const req = e.request
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
    if (req.mode === 'navigate') e.waitUntil(precache().catch(() => {}))
    e.respondWith(fetch(req).then(res => {
        if (res.ok) {
            const copy = res.clone()
            e.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)))
        }
        return res
    // ignoreVary：module script 的請求帶 Origin，若回應有 Vary: Origin 會比對不到快取
    }, async err => await caches.match(req, { ignoreSearch: true, ignoreVary: true }) ?? Promise.reject(err)))
})
