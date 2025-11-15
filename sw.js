const CACHE_NAME = 'goldfin-pwa-cache-v12'; // Add Reports & Analytics
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
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            console.log('[Service Worker] Caching all: app shell and content');
            await cache.addAll([...localUrlsToCache, ...externalUrlsToCache]);
        })()
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

    // "Cache then Network" strategy for GET requests.
    event.respondWith(
        (async () => { // IIFE (Immediately Invoked Function Expression)
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(event.request);

            try {
                // Network First: Try to fetch a fresh version from the network.
                const networkResponse = await fetch(event.request);

                // If the fetch is successful, cache the new response and return it.
                // We only cache valid responses (status 200-299) to avoid caching errors.
                if (networkResponse.ok) {
                    cache.put(event.request, networkResponse.clone());
                }
                
                return networkResponse;
            } catch (error) {
                // Network failed, so fall back to the cached version if it exists.
                return cachedResponse;
            }
        })()
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