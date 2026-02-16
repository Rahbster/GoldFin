import { appViewModel } from './app_viewmodel.js';
import { registerModal, closeTopModal } from './ui.js';
import { showCardFromCalendar } from './calendar.js';
import { showPrintableView } from './print_view.js';
import { renderCustomerForm, showCustomerManager } from './customer_manager.js';
import { renderMenuItemForm, showMenuItemManager } from './menu_item_manager.js';

export function showGlobalSearchModal() {
    if (document.getElementById('global-search-modal')) return;

    const modalHTML = `
        <div id="global-search-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 600px; min-height: 400px; display: flex; flex-direction: column;">
                <div class="modal-header">
                    <h2>Global Search</h2>
                    <button id="close-global-search-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                    <input type="search" id="global-search-input" placeholder="Search events, contracts, customers, menu items..." style="width: 100%; padding: 12px; font-size: 1.1em; margin-bottom: 1rem; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: var(--border-radius);" autofocus>
                    <div id="global-search-results" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
                        <p style="text-align: center; color: var(--text-color-muted); margin-top: 2rem;">Type to search...</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <small style="color: var(--text-color-muted);">Press ESC to close</small>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'global-search-modal';
    registerModal(modalId);

    const input = document.getElementById('global-search-input');
    const resultsContainer = document.getElementById('global-search-results');
    const closeBtn = document.getElementById('close-global-search-btn');

    // Focus input immediately
    setTimeout(() => input.focus(), 50);

    const closeModal = () => {
        closeTopModal();
    };

    closeBtn.onclick = closeModal;
    document.getElementById(modalId).onclick = (e) => {
        if (e.target.id === modalId) closeModal();
    };

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-color-muted); margin-top: 2rem;">Type to search...</p>';
            return;
        }
        performSearch(term, resultsContainer, closeModal);
    });

    // Handle ESC key specifically for this modal input
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function performSearch(term, container, closeCallback) {
    const results = [];
    const { events, contracts, customers, menuItems } = appViewModel.state;

    // Search Events
    events.forEach(e => {
        if (e.clientName.toLowerCase().includes(term) || e.eventDescription?.toLowerCase().includes(term)) {
            results.push({ type: 'Event', name: e.clientName, detail: e.eventDate, id: e.id, data: e });
        }
    });

    // Search Contracts
    contracts.forEach(c => {
        if (c.clientName.toLowerCase().includes(term) || c.contractId.toLowerCase().includes(term)) {
            results.push({ type: 'Contract', name: c.clientName, detail: c.status, id: c.id, data: c });
        }
    });

    // Search Customers
    customers.forEach(c => {
        if (c.name.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term)) {
            results.push({ type: 'Customer', name: c.name, detail: c.email, id: c.id, data: c });
        }
    });

    // Search Menu Items
    menuItems.forEach(i => {
        if (i.name.toLowerCase().includes(term)) {
            results.push({ type: 'Menu Item', name: i.name, detail: `$${i.price}`, id: i.id, data: i });
        }
    });

    const limitedResults = results.slice(0, 20);

    if (limitedResults.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-color-muted);">No results found.</p>';
        return;
    }

    container.innerHTML = limitedResults.map(r => `
        <div class="search-result-item" style="padding: 10px; border: 1px solid var(--border-color); border-radius: var(--border-radius); cursor: pointer; background: var(--bg-color-light); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: bold;">${r.name}</div>
                <div style="font-size: 0.85em; color: var(--text-color-muted);">${r.type} • ${r.detail || ''}</div>
            </div>
            <div style="font-size: 1.2em;">›</div>
        </div>
    `).join('');

    // Attach click listeners
    const items = container.querySelectorAll('.search-result-item');
    items.forEach((item, index) => {
        item.onclick = () => {
            const result = limitedResults[index];
            handleResultClick(result);
            closeCallback();
        };
    });
}

function handleResultClick(result) {
    switch (result.type) {
        case 'Event':
            showCardFromCalendar(result.data);
            break;
        case 'Contract':
            showPrintableView(result.data);
            break;
        case 'Customer':
            showCustomerManager(); 
            setTimeout(() => renderCustomerForm(result.id), 50);
            break;
        case 'Menu Item':
            showMenuItemManager();
            setTimeout(() => renderMenuItemForm(result.id), 50);
            break;
    }
}