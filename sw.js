const CACHE_NAME = 'goldfin-pwa-cache-v14'; // Robust caching and added files
const localUrlsToCache = [
    './',
    './index.html',
    './css/base.css',
    './css/animations.css',
    './css/cards.css',
    './css/calendar.css',
    './css/components.css',
    './css/dashboard.css',
    './css/reports.css',
    './css/library.css',
    './css/modals.css',
    './css/notifications.css',
    './css/print.css',
    './css/styles.css', // Keep for shared status badges
    './js/app.js',
    './js/app_viewmodel.js',
    './js/actions.js',
    './js/components/filter_service.js',
    './js/components/card_renderer.js',
    './js/components/charts.js',
    './js/calendar.js',
    './js/cloud_sync_setup.js',
    './js/constraint_manager.js',
    './js/customer_manager.js',
    './js/data_manager.js',
    './js/dashboard.js',
    './js/event_renderer.js',
    './js/entity_saver.js',
    './js/firebase_sync.js',
    './js/contract_renderer.js',
    './js/library_importer.js',
    './js/menu_item_manager.js',
    './js/mock_data_generator.js',
    './js/modals/business_details_modal.js',
    './js/modals/readme_modal.js',
    './js/modals/utility_modals.js',
    './js/reports.js',
    './js/print_view.js',
    './js/proposal_creator.js',
    './js/proposal_editor_state.js',
    './js/proposal_editor_ui.js',
    './js/proposal_selectors.js',
    './js/service_manager.js',
    './js/symbol_manager.js',
    './js/template_renderer.js',
    './js/ui.js',
    './js/ui_init.js',
    './js/utils.js',
    './sw.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    './icons/icon-tab.png',
    './icons/toggle.png',
    './assets/background.png',
    './assets/overlay.png',
    './assets/parchmenttile.png',
    './js/library_data/menu_items.json',
    './js/library_data/restrictions.json',
    './js/library_data/services.json',
    './js/library_data/symbols.json'
];

const externalUrlsToCache = [
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
    'https://cdn.quilljs.com/1.3.6/quill.js',
    'https://cdn.quilljs.com/1.3.6/quill.snow.css',
    'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js' // Add Chart.js CDN
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching all: app shell and content');
                const urlsToCache = [...localUrlsToCache, ...externalUrlsToCache];
                const cachePromises = urlsToCache.map((url) => {
                    return fetch(url, { cache: 'reload' }).then((response) => {
                        if (!response.ok) throw new Error(`Request for ${url} failed with status ${response.status}`);
                        return cache.put(url, response);
                    });
                });
                return Promise.all(cachePromises);
            })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        console.log('[Service Worker] Skipping waiting and activating new version.');
        self.skipWaiting();
        // After skipping waiting, we must claim the clients to take control immediately.
        self.clients.claim();
    }
});

self.addEventListener('fetch', (event) => {
    // Only apply caching strategy for GET requests.
    // Other requests (like POST to Firebase) should be passed through.
    if (event.request.method !== 'GET') {
        return;
    }

    // "Cache First" (Cache, falling back to Network) strategy.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // If the response is in the cache, return it.
            if (cachedResponse) {
                return cachedResponse;
            }
            // If it's not in the cache, fetch it from the network.
            return fetch(event.request).then((networkResponse) => {
                // And cache the new response for future use.
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});