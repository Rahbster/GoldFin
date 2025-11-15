import { appViewModel } from './app_viewmodel.js';
import { showToast, registerModal, closeTopModal } from './ui.js';
import { 
    loadMenuItems, saveMenuItems, loadServices, saveServices, 
    loadConstraintTags, saveConstraintTags, loadSymbolPaletteItems, saveSymbolPaletteItems 
} from './data_manager.js';
import { addDocument, saveCollection } from './firebase_sync.js';

let librarySources = {
    menuItems: {
        load: loadMenuItems,
        save: saveMenuItems,
        idPrefix: 'menu_',
        nameKey: 'name'
    },
    services: {
        load: loadServices,
        save: saveServices,
        idPrefix: 'serv_',
        nameKey: 'name'
    },
    restrictions: {
        load: loadConstraintTags,
        save: saveConstraintTags,
        idPrefix: 'tag_',
        nameKey: 'name'
    },
    symbols: {
        load: loadSymbolPaletteItems,
        save: saveSymbolPaletteItems,
        idPrefix: 'sym_',
        nameKey: 'symbol'
    }
};

export async function showLibraryImporterModal() {
    if (document.getElementById('importer-modal')) return;

    try {
        // Asynchronously load all necessary library data using fetch
        const [menuItemsRes, servicesRes, restrictionsRes, symbolsRes] = await Promise.all([
            fetch('./js/library_data/menu_items.json'),
            fetch('./js/library_data/services.json'),
            fetch('./js/library_data/restrictions.json'),
            fetch('./js/library_data/symbols.json')
        ]);

        librarySources.menuItems.data = await menuItemsRes.json();
        librarySources.services.data = await servicesRes.json();
        librarySources.restrictions.data = await restrictionsRes.json();
        librarySources.symbols.data = await symbolsRes.json();
    } catch (error) {
        console.error("Failed to load library source data for importer:", error);
        showToast("Error: Could not load library data.", "error");
        return;
    }

    const modalHTML = `
        <div id="importer-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Quick Setup / Import Library Items</h2>
                    <button id="close-importer-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tab-nav">
                        <button class="tab-btn active" data-tab="menuItems">Menu Items</button>
                        <button class="tab-btn" data-tab="services">Services</button>
                        <button class="tab-btn" data-tab="restrictions">Restrictions</button>
                        <button class="tab-btn" data-tab="symbols">Symbols</button>
                    </div>
                    <div style="padding: 0.5rem 0;">
                        <input type="search" id="importer-search-input" placeholder="Search items..." style="width: 100%; box-sizing: border-box; padding: 8px;">
                    </div>
                    <div id="importer-tab-content" class="tab-content active" style="max-height: 50vh; overflow-y: auto; padding-top: 1rem;">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="import-selected-btn" class="theme-button">Import Selected</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'importer-modal';
    registerModal(modalId);

    document.getElementById('close-importer-modal-btn').onclick = closeTopModal;

    document.getElementById('importer-modal').onclick = (e) => {
        if (e.target.id === 'importer-modal') {
            // This modal has no data entry, so it's safe to close without confirmation.
            closeTopModal();
        }
    };

    const tabButtons = document.querySelectorAll('#importer-modal .tab-btn');
    const tabContent = document.getElementById('importer-tab-content');
    let fullListOfItems = []; // To hold the full list for the current tab

    async function switchTab(tabName) {
        tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
        tabContent.innerHTML = '<p>Loading...</p>';

        const source = librarySources[tabName];
        const masterList = source.data;
        const existingItems = source.load();

        const existingNames = new Set(existingItems.map(item => item[source.nameKey]));
        fullListOfItems = masterList.filter(item => !existingNames.has(item[source.nameKey]));

        // Clear search input and render the full list for the new tab
        document.getElementById('importer-search-input').value = '';
        renderFilteredList(fullListOfItems);
    }

    function renderFilteredList(items) {
        if (items.length === 0) {
            tabContent.innerHTML = '<p>All available items have already been imported.</p>';
            return;
        }

        let listHTML = '<div>';
        items.forEach(item => {
            // Find the original index from the full list to maintain correct import logic
            const originalIndex = fullListOfItems.findIndex(originalItem => originalItem === item);
            const displayName = item.name || item.symbol;
            const description = item.description ? `<p style="margin: 0.2rem 0 0; font-size: 0.9em; color: #666;">${item.description}</p>` : '';
            listHTML += `
                <div class="importer-list-item">
                    <label for="import-item-${originalIndex}" class="importer-item-label">
                        <strong>${displayName}</strong>
                        ${description}
                    </label>
                    <div class="importer-checkbox-container">
                        <input type="checkbox" id="import-item-${originalIndex}" class="import-checkbox" data-item-index="${originalIndex}">
                    </div>
                </div>
            `;
        });
        listHTML += '</div>';
        tabContent.innerHTML = listHTML;
    }

    document.getElementById('importer-search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = fullListOfItems.filter(item => 
            (item.name || item.symbol).toLowerCase().includes(searchTerm) ||
            (item.description || '').toLowerCase().includes(searchTerm)
        );
        renderFilteredList(filtered);
    });

    tabButtons.forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });

    document.getElementById('import-selected-btn').onclick = async () => {
        const activeTab = document.querySelector('#importer-modal .tab-btn.active').dataset.tab;
        const source = librarySources[activeTab];
        const itemsToDisplay = fullListOfItems; // Use the full unfiltered list for indexing
        const selectedItems = [];

        document.querySelectorAll('.import-checkbox:checked').forEach(checkbox => {
            const index = parseInt(checkbox.dataset.itemIndex, 10);
            selectedItems.push(itemsToDisplay[index]);
        });

        if (selectedItems.length === 0) {
            showToast('No items selected to import.', 'info');
            return;
        }

        const newItems = selectedItems.map(item => ({
            ...item,
            id: `${source.idPrefix}${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        }));

        if (appViewModel.isCloudMode) {
            // In cloud mode, we need to save the entire collection.
            // This is less efficient but required by the current `saveCollection` design.
            // A more advanced implementation would batch-add new documents.
            const existingItems = source.load();
            const combinedItems = [...existingItems, ...newItems];
            await saveCollection(activeTab, combinedItems);
            // The listener will trigger a save to localStorage.
        } else {
            const existingItems = source.load();
            const combinedItems = [...existingItems, ...newItems];
            source.save(combinedItems);
        }

        showToast(`${selectedItems.length} item(s) imported successfully!`, 'info');
        // Refresh the current tab to show the updated list
        switchTab(activeTab);
    };

    // Load the initial tab
    switchTab('menuItems');

    // Add some specific styles for the importer
    const style = document.createElement('style');
    style.innerHTML = `
        .importer-list-item {
            display: flex;
            padding: 0.75rem;
            border-bottom: 1px solid #eee;
        }
        .importer-list-item:hover {
            background-color: #f9f9f9;
        }
        .importer-item-label {
            flex-grow: 1; /* Take up all available space */
            cursor: pointer;
        }
        .importer-checkbox-container {
            flex-shrink: 0; /* Prevent this column from shrinking */
            width: 50px; /* Give it a fixed width */
            text-align: right; /* Align checkbox to the right of its column */
            padding-top: 2px; /* Small adjustment to align with the top of the text */
        }
        .importer-list-item input[type="checkbox"] {
            transform: scale(1.2);
        }
    `;
    document.head.appendChild(style);
    // Clean up style on close
    document.getElementById('close-importer-modal-btn').addEventListener('click', () => style.remove(), { once: true });
}