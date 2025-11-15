import { showProposalCreator } from './proposal_creator.js';
import { 
    loadBusinessDetails, saveBusinessDetails
} from './data_manager.js';
import { showCustomerManager } from './customer_manager.js';
import { showToast, showUpdateAvailableToast, initializeScrollToTop, initializeHeaderScrollEffect, initializeConsoleInterceptor, showConsoleLogModal, startErrorMonitoring } from './ui.js';
import { showLibraryImporterModal } from './library_importer.js';
import { renderCalendar, getCalendarDate, setCalendarDate } from './calendar.js';
import { 
    initializeUIEventListeners, initializeMonthTabs, initializeAppearanceToggles, 
    initializeAnimatedOverlay, initializeSearchClearButtons, applyBackgroundEffects, 
    applyOverlayEffect, updateAppTitle, applyCalendarTotalVisibility 
} from './ui_init.js';
import { showCloudSyncModal } from './cloud_sync_setup.js';
import { signInWithGoogle, signOut, saveBusinessDetailsToFirebase } from './firebase_sync.js';
import { renderEvents } from './event_renderer.js';
import { renderContracts } from './contract_renderer.js';
import { renderTemplates } from './template_renderer.js';
import { renderReports } from './reports.js';
import { renderDashboard } from './dashboard.js';
import { appViewModel } from './app_viewmodel.js';
import './mock_data_generator.js'; // Import for bundling and awareness

// --- Sync Status Management ---
const pendingWrites = new Set();

/**
 * Updates all status indicators in the header (Cloud, Unsynced, Offline).
 */
function updateHeaderStatus() {
    const offlineIndicator = document.getElementById('offline-status-indicator');
    const cloudIndicator = document.getElementById('cloud-status-indicator');
    const syncIndicator = document.getElementById('sync-status-indicator');

    if (offlineIndicator) offlineIndicator.classList.toggle('hidden', navigator.onLine);
    if (cloudIndicator) cloudIndicator.classList.toggle('hidden', !appViewModel.isCloudMode);

    if (syncIndicator) {
        const hasPending = pendingWrites.size > 0;
        syncIndicator.classList.toggle('hidden', !hasPending);

        if (hasPending) {
            const isOnline = navigator.onLine;
            syncIndicator.textContent = isOnline ? 'Syncing...' : 'Unsynced';
            syncIndicator.classList.toggle('syncing', isOnline);
        }
    }
}

/**
 * A centralized function to re-render all major UI components.
 */
const renderAllComponents = () => {
    applyBackgroundEffects();
    applyOverlayEffect();
    updateAppTitle();
    applyCalendarTotalVisibility();
    updateHeaderStatus(); // Ensure sync status is reflected on every render

    if (!appViewModel.isInitialRenderComplete) {
        // On the very first render, draw everything once to populate all hidden tabs.
        renderEvents(appViewModel.appData.events);
        renderContracts(appViewModel.appData.contracts);
        renderTemplates(appViewModel.appData.templates);
        renderReports(); // Render reports on initial load
        renderDashboard(appViewModel.appData);
        renderCalendar(appViewModel.appData);
        appViewModel.isInitialRenderComplete = true; // Set the flag so this block doesn't run again.
    } else {
        // On all subsequent renders, only update the currently visible tab for performance.
        const activeTab = document.querySelector('.tab-nav .tab-btn.active');
        if (activeTab?.id === 'dashboard-tab-btn') renderDashboard(appViewModel.state);
        else if (activeTab?.id === 'reports-tab-btn') renderReports();
        else if (activeTab?.id === 'events-tab-btn') renderEvents(appViewModel.getFilteredEvents());
        else if (activeTab?.id === 'contracts-tab-btn') renderContracts(appViewModel.getFilteredContracts());
        else if (activeTab?.id === 'templates-tab-btn') renderTemplates(appViewModel.getFilteredTemplates());
        else if (activeTab?.id === 'calendar-tab-btn') renderCalendar(appViewModel.state);
    }
};

// Make renderAllComponents globally available for callbacks from other modules
window.renderAllComponents = renderAllComponents;

// This function is exported so other modules (like firebase_sync) can report sync status.
export function setPendingWrites(collectionName, hasPending) {
    hasPending ? pendingWrites.add(collectionName) : pendingWrites.delete(collectionName);
    updateHeaderStatus();
}

async function initializePWAUpdater() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported in this browser.');
        return;
    }

    let newWorker;


    const registration = await navigator.serviceWorker.register('sw.js');
    // console.log('ServiceWorker registration successful with scope: ', registration.scope);

    // Listen for a new service worker being installed.
    registration.addEventListener('updatefound', () => {
        console.log('New service worker found. Installing...');
        newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
            // If the new service worker has installed and is waiting, show the update prompt.
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker is installed and waiting.');
                showUpdateAvailableToast(newWorker);

                // Listen for the controller change event *after* we know an update is ready.
                // This ensures we only reload when we intend to.
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                });
            }
        });
    });

    // Manually check for updates when the button is clicked.
    document.getElementById('check-for-update-btn').onclick = () => {
        showToast('Checking for updates...', 'info');
        if (registration && registration.active) {
            registration.update().then(reg => {
                if (!reg.installing && !reg.waiting) {
                    showToast('App is up to date.', 'info');
                }
            }).catch(err => {
                console.error('Error checking for SW update:', err);
                showToast('Update check failed.', 'error');
            });
        } else {
            console.warn('Service worker registration not active. Cannot check for updates.');
            showToast('Update check is not available in this context.', 'error');
            // Attempt to re-register if something went wrong.
            navigator.serviceWorker.register('sw.js');
        }
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    // --- Add console logging to verify the state of library data on load ---
    console.log("--- Post-Reload Data Check ---");
    console.log("Menu Items in localStorage:", localStorage.getItem('goldfin_menu_items'));
    console.log("Services in localStorage:", localStorage.getItem('goldfin_services'));
    console.log("Customers in localStorage:", localStorage.getItem('goldfin_customers'));
    console.log("------------------------------");

    console.log("GoldFin App Initialized");

    initializeConsoleInterceptor();
    initializeScrollToTop();
    initializeHeaderScrollEffect();
    initializeAppearanceToggles();
    // Listen for online/offline status changes to update the UI indicators.
    window.addEventListener('online', updateHeaderStatus);
    window.addEventListener('offline', updateHeaderStatus);

    initializeMonthTabs();
    startErrorMonitoring();

    initializeAnimatedOverlay();
    initializeSearchClearButtons();
    initializeUIEventListeners();

    await initializePWAUpdater();

    // --- MVVM Initialization ---
    // 1. Set the ViewModel's onStateChange callback to our main render function.
    appViewModel.onStateChange = (user) => {
        // If the 'user' argument is provided, it's an auth change.
        // If it's undefined, it's a general state change from the Proxy.
        if (user !== undefined) {
            // This block only runs on login/logout events.
            if (user) {
                document.getElementById('login-btn').classList.add('hidden');
                document.getElementById('main-content').classList.remove('hidden');
                updateUserMenu(user);
            } else if (appViewModel.isCloudMode) { // Only manage login UI if in cloud mode
                // This is a true logout event.
                document.getElementById('login-btn').classList.remove('hidden');
                document.getElementById('user-menu').classList.add('hidden');
                document.getElementById('main-content').classList.add('hidden');
            }
        }
        renderAllComponents();
    };

    // 2. Initialize the ViewModel. This will handle data loading and auth.
    if (await appViewModel.initialize()) { // Returns true if in cloud mode
        document.getElementById('login-btn').classList.remove('hidden');
        document.getElementById('cloud-status-indicator').classList.remove('hidden');
        document.getElementById('login-btn').onclick = signInWithGoogle;
    } else {
        document.getElementById('main-content').classList.remove('hidden');
    }
});

function updateUserMenu(user) {
    const userMenu = document.getElementById('user-menu');
    userMenu.innerHTML = `
        <span class="user-name">Welcome, ${user.displayName.split(' ')[0]}</span>
        <button id="logout-btn" class="theme-button secondary-button">Logout</button>
    `;
    userMenu.classList.remove('hidden');
    document.getElementById('logout-btn').onclick = () => {
        if (confirm("Are you sure you want to log out?")) {
            signOut();
        }
    };
}
    // Initial render is now the dashboard