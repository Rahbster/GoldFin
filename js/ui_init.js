import { showProposalCreator } from './proposal_creator.js';
import { showBusinessDetailsModal } from './modals/business_details_modal.js';
import { showLibraryChoiceModal } from './modals/utility_modals.js';
import { showReadmeModal } from './modals/readme_modal.js';
import { showCustomerManager } from './customer_manager.js';
import { showCloudSyncModal } from './cloud_sync_setup.js';
import { showConsoleLogModal } from './ui.js';
import { exportAllData, importAllData, clearAllApplicationData, loadBusinessDetails, saveBusinessDetails } from './data_manager.js';
import { getCalendarDate, setCalendarDate, renderCalendar } from './calendar.js';
import { renderEvents } from './event_renderer.js';
import { renderContracts } from './contract_renderer.js';
import { renderTemplates } from './template_renderer.js';
import { renderReports } from './reports.js';
import { renderDashboard } from './dashboard.js';
import { saveBusinessDetailsToFirebase, updateDocument } from './firebase_sync.js';
import { appViewModel } from './app_viewmodel.js';

export function initializeUIEventListeners() {
    document.getElementById('add-event-btn')?.addEventListener('click', () => showProposalCreator(null, false, true));
    document.getElementById('manage-library-btn')?.addEventListener('click', async () => { await showLibraryChoiceModal(); closeHamburgerMenu(); });
    document.getElementById('readme-btn')?.addEventListener('click', () => { showReadmeModal(); closeHamburgerMenu(); });
    document.getElementById('business-details-btn')?.addEventListener('click', () => { showBusinessDetailsModal(); closeHamburgerMenu(); });
    document.getElementById('manage-customers-btn')?.addEventListener('click', () => { showCustomerManager(); closeHamburgerMenu(); });
    document.getElementById('cloud-sync-btn')?.addEventListener('click', () => { showCloudSyncModal(); closeHamburgerMenu(); });
    document.getElementById('show-console-log-btn')?.addEventListener('click', () => { showConsoleLogModal(); closeHamburgerMenu(); });

    document.getElementById('export-data-btn')?.addEventListener('click', () => { exportAllData(); closeHamburgerMenu(); });
    document.getElementById('import-data-btn')?.addEventListener('click', () => {
        if (confirm("Importing data will overwrite all current local data. Are you sure you want to proceed?")) {
            importAllData();
        }
        closeHamburgerMenu();
    });

    document.getElementById('clear-site-data-btn')?.addEventListener('click', async () => {
        const isCloudConnected = !!localStorage.getItem('goldfin_firebase_config');
        let confirmationMessage = "DANGER: This will clear all local application data (events, libraries, etc.) and reload the app. Business Details and Cloud Sync settings will be preserved. Are you sure you want to proceed?";
        if (isCloudConnected) {
            confirmationMessage += "\n\nNOTE: You are connected to the cloud. This action will NOT affect your cloud data. Use the 'Wipe Cloud Data' button in the Cloud Sync modal for that.";
        }
        if (confirm(confirmationMessage)) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
                clearAllApplicationData();
                alert('Site data has been cleared. The application will now reload.');
                window.location.reload();
            } catch (error) {
                console.error('Error clearing site data:', error);
                alert('An error occurred while clearing site data. Please check the console.');
            }
        }
    });

    document.getElementById('hamburger-icon')?.addEventListener('click', toggleHamburgerMenu);

    // Tab switching logic
    const allTabs = Array.from(document.querySelectorAll('.tab-nav .tab-btn'));
    const allContents = Array.from(document.querySelectorAll('.tab-content'));
    allTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const contentId = `${tab.id.replace('-btn', '')}-content`;
            const content = document.getElementById(contentId);
            if (content) {
                allTabs.forEach(t => t.classList.remove('active'));
                allContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                content.classList.add('active');

                // When switching tabs, get the latest data from the ViewModel and pass it to the renderer.
                if (contentId === 'dashboard-tab-content') renderDashboard(appViewModel.state);
                else if (contentId === 'reports-tab-content') renderReports();
                else if (contentId === 'calendar-tab-content') renderCalendar(appViewModel.appData);
                else if (contentId === 'events-tab-content') renderEvents(appViewModel.getFilteredEvents());
                else if (contentId === 'contracts-tab-content') renderContracts(appViewModel.getFilteredContracts());
                else if (contentId === 'templates-tab-content') renderTemplates(appViewModel.getFilteredTemplates());
                else {
                    content.querySelector('input[type="search"]')?.focus();
                }
            }
        });
    });

    // Filter and Sort Listeners
    const updateFilter = (filterType, key, value) => {
        // Create a deep copy of the specific filter object we are changing
        const newFilterObject = { ...appViewModel.state.filters[filterType], [key]: value };
        
        // Create a new top-level filters object, replacing the old nested object with our new one
        const newFiltersState = { ...appViewModel.state.filters, [filterType]: newFilterObject };
        
        // Assign the new, fully immutable state back to the ViewModel
        appViewModel.state.filters = newFiltersState;
    };

    document.getElementById('search-events-input')?.addEventListener('input', (e) => updateFilter('events', 'searchTerm', e.target.value));
    document.getElementById('event-status-filter')?.addEventListener('change', (e) => updateFilter('events', 'status', e.target.value));
    document.getElementById('event-date-range-filter')?.addEventListener('change', (e) => updateFilter('events', 'dateRange', e.target.value));
    document.getElementById('search-contracts-input')?.addEventListener('input', (e) => updateFilter('contracts', 'searchTerm', e.target.value));
    document.getElementById('contract-status-filter')?.addEventListener('change', (e) => updateFilter('contracts', 'status', e.target.value));
    document.getElementById('contract-date-range-filter')?.addEventListener('change', (e) => updateFilter('contracts', 'dateRange', e.target.value));
    document.getElementById('show-archived-contracts-toggle')?.addEventListener('change', (e) => updateFilter('contracts', 'showArchived', e.target.checked));

    // --- Archive Toggle Listener ---
    const archiveToggle = document.getElementById('show-archived-events-toggle');
    if (archiveToggle) archiveToggle.addEventListener('change', (e) => updateFilter('events', 'showArchived', e.target.checked));

    document.getElementById('search-templates-input')?.addEventListener('input', (e) => updateFilter('templates', 'searchTerm', e.target.value));

    // --- Sort Button Listeners ---
    const setupSortToggle = (btnId, filterKey, key1, key2, label1, label2) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.onclick = () => {
            const currentSort = appViewModel.state.filters[filterKey].sort;
            const newSort = currentSort === key1 ? key2 : key1;
            updateFilter(filterKey, 'sort', newSort);

            // Update the button's appearance after the state change
            btn.textContent = newSort === key1 ? label2 : label1;
            btn.title = `Sort by ${newSort === key1 ? label2 : label1}`;
        };
    };
    setupSortToggle('toggle-sort-events-btn', 'events', 'eventDate', 'clientName', 'A-Z', 'Date');
    setupSortToggle('toggle-sort-contracts-btn', 'contracts', 'eventDate', 'clientName', 'A-Z', 'Date');
    setupSortToggle('toggle-sort-templates-btn', 'templates', 'creationDate', 'name', 'A-Z', 'Date');

    // Calendar Navigation
    document.getElementById('prev-month-btn')?.addEventListener('click', () => { const d = getCalendarDate(); d.setMonth(d.getMonth() - 1); setCalendarDate(d); renderCalendar(appViewModel.appData); });
    document.getElementById('next-month-btn')?.addEventListener('click', () => { const d = getCalendarDate(); d.setMonth(d.getMonth() + 1); setCalendarDate(d); renderCalendar(appViewModel.appData); });
    document.getElementById('today-btn')?.addEventListener('click', () => { setCalendarDate(new Date()); renderCalendar(appViewModel.appData); });
    document.getElementById('prev-year-btn')?.addEventListener('click', () => { const d = getCalendarDate(); d.setFullYear(d.getFullYear() - 1); setCalendarDate(d); renderCalendar(appViewModel.appData); });
    document.getElementById('next-year-btn')?.addEventListener('click', () => { const d = getCalendarDate(); d.setFullYear(d.getFullYear() + 1); setCalendarDate(d); renderCalendar(appViewModel.appData); });

    // Global Click Listener
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.proposal-card')) {
            document.querySelectorAll('.proposal-card.show-actions-btn').forEach(card => card.classList.remove('show-actions-btn'));
        }
        const hamburgerPanel = document.getElementById('hamburger-panel');
        if (hamburgerPanel && !hamburgerPanel.contains(e.target) && !e.target.closest('#hamburger-icon')) {
            closeHamburgerMenu();
        }
    });
}

export function initializeMonthTabs() {
    const monthTabsContainer = document.getElementById('calendar-month-tabs');
    if (!monthTabsContainer) return;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    monthTabsContainer.innerHTML = months.map((month, index) => `<button class="tab-btn month-tab-btn" data-month="${index}">${month}</button>`).join('');
    monthTabsContainer.addEventListener('click', (e) => {
        if (e.target.matches('.month-tab-btn')) {
            const targetMonth = parseInt(e.target.dataset.month, 10);
            const newDate = new Date(getCalendarDate().getFullYear(), targetMonth, 1);
            setCalendarDate(newDate);
            renderCalendar(appViewModel.appData);
        }
    });
}

export function initializeAppearanceToggles() {
    const panel = document.getElementById('hamburger-panel');
    if (!panel) return;

    const details = loadBusinessDetails();
    const savedTheme = localStorage.getItem('theme') || 'light';

    const appearanceFieldset = document.createElement('fieldset');
    appearanceFieldset.innerHTML = `
        <legend>Appearance</legend>
        <div class="setting-row">
            <label class="toggle"><span class="toggle-label">Dark Mode</span><span><input class="toggle-checkbox" type="checkbox" id="theme-toggle-checkbox" ${savedTheme === 'dark' ? 'checked' : ''}><div class="toggle-switch"></div></span></label>
        </div>
        <div class="setting-row">
            <label class="toggle"><span class="toggle-label">Background Water Effect</span><span><input class="toggle-checkbox" type="checkbox" id="enable-water-effect-toggle" ${details.enableWaterEffect !== false ? 'checked' : ''}><div class="toggle-switch"></div></span></label>
        </div>
        <div class="setting-row">
            <label class="toggle"><span class="toggle-label">Overlay Animation</span><span><input class="toggle-checkbox" type="checkbox" id="enable-overlay-effect-toggle" ${details.enableOverlayEffect !== false ? 'checked' : ''}><div class="toggle-switch"></div></span></label>
        </div>
    `;
    panel.prepend(appearanceFieldset);

    const htmlElement = document.documentElement;
    const applyTheme = (theme) => {
        htmlElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    };
    applyTheme(savedTheme);

    const themeToggle = document.getElementById('theme-toggle-checkbox');
    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    const waterEffectToggle = document.getElementById('enable-water-effect-toggle');
    const overlayEffectToggle = document.getElementById('enable-overlay-effect-toggle');

    const handleToggleChange = (key, applyFunc, toggleElement) => {
        const currentDetails = loadBusinessDetails();
        currentDetails[key] = toggleElement.checked;
        appViewModel.isCloudMode ? saveBusinessDetailsToFirebase(currentDetails) : saveBusinessDetails(currentDetails);
        applyFunc();
    };

    waterEffectToggle.addEventListener('change', () => handleToggleChange('enableWaterEffect', applyBackgroundEffects, waterEffectToggle));
    overlayEffectToggle.addEventListener('change', () => handleToggleChange('enableOverlayEffect', applyOverlayEffect, overlayEffectToggle));
}

export function initializeAnimatedOverlay() {
    let animationFrameId = null;
    let isAnimationRunning = false;
    const overlay = document.getElementById('animated-overlay');
    if (!overlay) return;
    const overlayImage = overlay.querySelector('img');
    let x, baseY, direction, speed, animationProgress = 0;

    const resetOverlay = () => {
        baseY = (Math.random() * 0.6 + 0.2) * window.innerHeight;
        if (Math.random() > 0.5) {
            x = -overlayImage.width;
            direction = 1;
            overlay.classList.remove('flipped');
        } else {
            x = window.innerWidth;
            direction = -1;
            overlay.classList.add('flipped');
        }
        speed = (Math.random() * 0.1) + 0.5;
    };

    const animate = () => {
        if (!isAnimationRunning) return;
        animationProgress += 0.002;
        x += speed * direction;
        const yOffset = Math.sin(animationProgress) * (window.innerHeight * 0.10);
        const scale = 1.0 + (Math.sin(animationProgress * 1.5) * 0.10);
        overlay.style.opacity = 0.15 + (Math.sin(animationProgress * 1.5) * 0.1);
        overlay.style.transform = `translate(${x}px, ${baseY + yOffset}px) scale(${scale})`;
        if ((direction === 1 && x > window.innerWidth) || (direction === -1 && x < -overlayImage.width)) {
            resetOverlay();
        }
        animationFrameId = requestAnimationFrame(animate);
    };

    const startAnimation = () => {
        if (isAnimationRunning) return;
        isAnimationRunning = true;
        const start = () => { resetOverlay(); animate(); };
        if (overlayImage.complete) start(); else overlayImage.onload = start;
    };

    const stopAnimation = () => {
        if (!isAnimationRunning) return;
        isAnimationRunning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    };

    window.controlOverlayAnimation = { start: startAnimation, stop: stopAnimation };
}

export function initializeSearchClearButtons() {
    document.querySelectorAll('.clear-search-btn').forEach(button => {
        const targetInput = document.getElementById(button.dataset.target);
        if (!targetInput) return;
        targetInput.addEventListener('input', () => button.classList.toggle('hidden', targetInput.value === ''));
        button.addEventListener('click', () => {
            targetInput.value = '';
            targetInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        });
    });
}

export function applyBackgroundEffects() {
    const details = loadBusinessDetails() || {};
    document.body.classList.toggle('water-effect', details.enableWaterEffect !== false);
}

export function applyOverlayEffect() {
    const details = loadBusinessDetails() || {};
    const overlay = document.getElementById('animated-overlay');
    if (overlay) {
        const isEnabled = details.enableOverlayEffect !== false;
        overlay.style.display = isEnabled ? 'block' : 'none';
        isEnabled ? window.controlOverlayAnimation?.start() : window.controlOverlayAnimation?.stop();
    }
}

export function updateAppTitle() {
    const details = loadBusinessDetails() || {};
    document.getElementById('app-title').textContent = details.businessName || 'GoldFin';
}

export function applyCalendarTotalVisibility() {
    const details = loadBusinessDetails() || {};
    const monthlyTotalEl = document.getElementById('calendar-monthly-total');
    if (monthlyTotalEl) monthlyTotalEl.classList.toggle('hidden', details.showMonthlyTotal === false);
}

function toggleHamburgerMenu() {
    document.getElementById('hamburger-panel').classList.toggle('open');
}

function closeHamburgerMenu() {
    document.getElementById('hamburger-panel').classList.remove('open');
}