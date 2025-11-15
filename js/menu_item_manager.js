//==============================
// Menu Item Manager Logic
//==============================
import { appViewModel } from './app_viewmodel.js';
import { updateDocument, deleteDocument } from './firebase_sync.js'; // Keep this import
import { showConfirmationModal, showToast, registerModal, closeTopModal } from './ui.js';
import { loadMenuItems, saveMenuItems } from './data_manager.js';

let tempItemState = { // For the item editor form
    tags: []
};

export function showMenuItemManager() {
    if (document.getElementById('library-manager-modal')) return;

    const modalHTML = `
        <div id="library-manager-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Menu Item Library</h2>
                    <div>
                        <button id="toggle-filters-btn" class="theme-button secondary-button">Show Filters</button>
                    </div>
                    <button id="close-library-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body" id="library-manager-body"></div>
                <div class="modal-footer">
                    <button id="add-new-menu-item-btn" class="theme-button circular-icon-button" title="Add New Item">+</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'library-manager-modal';
    registerModal(modalId);

    const modal = document.getElementById('library-manager-modal');
    modal.onclick = (e) => {
        // Only close on click-away if we are in the list view.
        // If the form is open, the user must use the Cancel or Save buttons.
        const isFormOpen = !!document.getElementById('menu-item-form');
        if (e.target.id === 'library-manager-modal' && !isFormOpen) { // Keep this logic
            closeTopModal();
        }
    };

    document.getElementById('close-library-modal-btn').onclick = closeTopModal;
    document.getElementById('add-new-menu-item-btn').onclick = () => renderMenuItemForm();

    // Listen for custom event to re-render if data changes elsewhere
    document.addEventListener('menuItemsUpdated', renderMenuItemList);

    renderMenuItemList();
}

function renderMenuItemList() { // This now acts as an initializer
    const menuItems = loadMenuItems();
    // Sort items alphabetically by name
    menuItems.sort((a, b) => a.name.localeCompare(b.name));

    const body = document.getElementById('library-manager-body');
    let activeFilter = { category: 'All', tags: {} };

    // Generate unique categories and tags from all menu items
    const allCategories = ['All', ...new Set(menuItems.map(item => item.displayCategory).filter(Boolean))].sort();
    const allTags = new Set();
    menuItems.forEach(item => item.tags?.forEach(tag => allTags.add(tag)));
    const sortedTags = [...allTags].sort();

    const filterUIHTML = `
        <input type="search" id="search-menu-items-input" placeholder="Search by name..." style="width: 95%; margin-bottom: 1rem;">
        <div id="advanced-filters-container" class="item-selector-filters" style="display: none;">
            <!-- Category Filters -->
            <h4>Filter by Category</h4>
            <div id="category-filter-cloud" class="filter-tag-cloud">
                ${allCategories.map(cat => `<button class="filter-tag-btn ${cat === 'All' ? 'include' : ''}" data-category="${cat}">${cat}</button>`).join('')}
            </div>

            <!-- Tag Filters -->
            <div class="filter-legend-header">
                <h4>Filter by Tags (Click to cycle)</h4>
                <div class="filter-legend">
                    <span class="filter-tag-btn include">+</span>
                    <span class="filter-tag-btn exclude">&times;</span>
                    <span class="filter-tag-btn">Off</span>
                </div>
            </div>
            <div id="tag-filter-cloud" class="filter-tag-cloud">
                ${sortedTags.map(tag => `<button class="filter-tag-btn" data-tag="${tag}">${tag}</button>`).join('')}
            </div>
        </div>
        <div class="item-list-container" id="menu-item-list-container"></div>
    `;
    body.innerHTML = filterUIHTML;

    // Set focus to the search bar when the list is rendered
    document.getElementById('search-menu-items-input').focus();

    const renderFilteredList = (itemsToRender) => {
        const listContainer = document.getElementById('menu-item-list-container');
        listContainer.innerHTML = (itemsToRender || []).map(item => `
            <div class="library-item-row">
                <div class="item-info">
                    <strong>${item.name}</strong> - $${item.price}<br>
                    <small>${item.tags?.join(', ') || 'No tags'}</small>
                </div>
                <div class="item-actions">
                    <button class="edit-item-btn theme-button secondary-button icon-button" title="Edit Item" data-item-id="${item.id}">✏️</button>
                    <button class="delete-item-btn theme-button secondary-button icon-button" title="Delete Item" data-item-id="${item.id}">X</button>
                </div>
            </div>
        `).join('') || '<p>No items match the current filter.</p>';

        // Re-attach event listeners
        listContainer.querySelectorAll('.edit-item-btn').forEach(btn => {
            btn.onclick = () => renderMenuItemForm(btn.dataset.itemId);
        });
        listContainer.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.onclick = () => {
                showConfirmationModal('Are you sure you want to delete this menu item?', () => {
                    deleteMenuItem(btn.dataset.itemId);
                });
            };
        });
    };

    const filterItems = () => {
        const searchTerm = document.getElementById('search-menu-items-input').value.toLowerCase();
        const includeTags = Object.keys(activeFilter.tags).filter(tag => activeFilter.tags[tag] === 'include');
        const excludeTags = Object.keys(activeFilter.tags).filter(tag => activeFilter.tags[tag] === 'exclude');

        const filtered = menuItems.filter(item => {
            const itemTags = item.tags || [];
            // Search term check
            if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) return false;
            if (activeFilter.category !== 'All' && item.displayCategory !== activeFilter.category) return false;
            if (excludeTags.some(tag => itemTags.includes(tag))) return false;
            if (includeTags.length > 0 && !includeTags.some(tag => itemTags.includes(tag))) return false;
            return true;
        });
        renderFilteredList(filtered);
    };

    const updateFilterUI = () => {
        document.querySelectorAll('#category-filter-cloud .filter-tag-btn').forEach(btn => {
            btn.classList.toggle('include', btn.dataset.category === activeFilter.category);
        });

        const itemsInSelectedCategory = activeFilter.category === 'All'
            ? menuItems
            : menuItems.filter(item => item.displayCategory === activeFilter.category);

        const tagCounts = new Map();
        itemsInSelectedCategory.forEach(item => {
            item.tags?.forEach(tag => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });
        });

        document.querySelectorAll('#tag-filter-cloud .filter-tag-btn').forEach(btn => {
            const tag = btn.dataset.tag;
            const count = tagCounts.get(tag) || 0;
            const isRelevant = count > 0 && count < itemsInSelectedCategory.length;
            btn.style.display = isRelevant ? '' : 'none';

            if (!isRelevant) delete activeFilter.tags[tag];

            const state = activeFilter.tags[tag];
            btn.classList.remove('include', 'exclude');
            if (state === 'include') btn.classList.add('include');
            else if (state === 'exclude') btn.classList.add('exclude');

            btn.innerHTML = `${tag} <span class="tag-count-badge">${count}</span>`;
        });
        filterItems();
    };

    // --- Event Listeners for Filters ---
    document.getElementById('toggle-filters-btn').onclick = (e) => {
        const container = document.getElementById('advanced-filters-container');
        const isHidden = container.style.display === 'none';
        container.style.display = isHidden ? 'block' : 'none';
        e.target.textContent = isHidden ? 'Hide Filters' : 'Show Filters';
    };

    // Search input listener
    document.getElementById('search-menu-items-input').addEventListener('input', filterItems);

    document.getElementById('category-filter-cloud').addEventListener('click', e => {
        if (e.target.matches('.filter-tag-btn')) {
            activeFilter.category = e.target.dataset.category;
            updateFilterUI();
        }
    });

    document.getElementById('tag-filter-cloud').addEventListener('click', e => {
        if (e.target.matches('.filter-tag-btn')) {
            const tag = e.target.dataset.tag;
            const currentState = activeFilter.tags[tag];
            if (!currentState) activeFilter.tags[tag] = 'include';
            else if (currentState === 'include') activeFilter.tags[tag] = 'exclude';
            else delete activeFilter.tags[tag];
            updateFilterUI();
        }
    });

    // Initial Render
    updateFilterUI();
}


function renderMenuItemForm(itemId = null) {
    const menuItems = loadMenuItems();
    const item = itemId ? menuItems.find(i => i.id === itemId) : null;
    const isEditing = item !== null;

    const allCategories = [...new Set(menuItems.map(i => i.displayCategory).filter(Boolean))];
    const categoriesDatalist = `<datalist id="display-categories-list">${allCategories.map(cat => `<option value="${cat}"></option>`).join('')}</datalist>`;

    const formHTML = `
        <form id="menu-item-form">
            <label for="item-name">Item Name:</label>
            <input type="text" id="item-name" placeholder="e.g., Bruschetta" value="${item?.name || ''}" required>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <label for="item-pricing-model">Pricing Model:</label>
                    <select id="item-pricing-model" class="header-select" style="width: 100%;"><option value="fixed" ${item?.pricingModel === 'fixed' || !item?.pricingModel ? 'selected' : ''}>Fixed Price</option><option value="per_person" ${item?.pricingModel === 'per_person' ? 'selected' : ''}>Per Person</option></select>
                </div>
                <div>
                    <label for="item-price">Price:</label>
                    <input type="number" id="item-price" placeholder="e.g., 8.00" value="${item?.price || ''}" required min="0" step="0.01">
                </div>
            </div>
            <label for="item-description">Description:</label>
            <textarea id="item-description" placeholder="e.g., Toasted baguette with tomato, basil, and garlic." style="min-height: 100px;">${item?.description || ''}</textarea>
            
            <label for="item-display-category">Display Category:</label>
            <input type="text" id="item-display-category" list="display-categories-list" placeholder="e.g., Appetizers" value="${item?.displayCategory || ''}">
            ${categoriesDatalist}
            
            <label for="item-tags">General Tags:</label>
            <div class="readonly-input-container">
                <input type="text" id="item-tags-display" readonly placeholder="e.g., Appetizer, Fall Season">
                <button type="button" id="edit-item-tags-btn" class="theme-button">✏️</button>
            </div>
            
            <label for="item-dietary-tags">Dietary Tags (what it is):</label>
            <input type="text" id="item-dietary-tags" placeholder="e.g., Vegetarian, Contains Gluten" value="${item?.dietaryTags?.join(', ') || ''}">
            
            <label for="item-optional-tags">Optional Dietary Tags (can be made):</label>
            <input type="text" id="item-optional-tags" placeholder="e.g., Gluten-Free, Vegan" value="${item?.optionalDietaryTags?.join(', ') || ''}">

            <div class="form-actions">
                <button type="submit" class="theme-button">Save Item</button>
                <button type="button" id="cancel-item-form" class="theme-button secondary-button">Cancel</button>
            </div>
        </form>
    `;
    document.getElementById('library-manager-body').innerHTML = formHTML;
    document.getElementById('add-new-menu-item-btn').style.display = 'none';

    tempItemState.tags = [...(item?.tags || [])];

    document.getElementById('edit-item-tags-btn').onclick = showItemTagEditorModal;
    renderItemTagsDisplay();

    document.getElementById('cancel-item-form').onclick = () => {
        document.getElementById('add-new-menu-item-btn').style.display = 'inline-block';
        renderMenuItemList();
    };

    document.getElementById('menu-item-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = item?.id || `menu_${Date.now()}`;
        const updatedItem = {
            id: id,
            name: document.getElementById('item-name').value,
            description: document.getElementById('item-description').value,
            price: parseFloat(document.getElementById('item-price').value),
            pricingModel: document.getElementById('item-pricing-model')?.value || 'fixed',
            displayCategory: document.getElementById('item-display-category').value.trim(),
            tags: tempItemState.tags || [],
            dietaryTags: document.getElementById('item-dietary-tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
            optionalDietaryTags: document.getElementById('item-optional-tags').value.split(',').map(tag => tag.trim()).filter(Boolean)
        };

        if (appViewModel.isCloudMode) {
            await updateDocument('menuItems', id, updatedItem);
        } else {
            const updatedItems = isEditing ? menuItems.map(i => i.id === itemId ? updatedItem : i) : [...menuItems, updatedItem];
            saveMenuItems(updatedItems);
        }

        showToast('Menu item saved!', 'info');
        document.getElementById('add-new-menu-item-btn').style.display = 'inline-block';
        renderMenuItemList();
    };
}

async function deleteMenuItem(itemId) {
    if (appViewModel.isCloudMode) {
        await deleteDocument('menuItems', itemId);
        renderMenuItemList(); // Re-render the list in the modal
    } else {
        const updatedItems = loadMenuItems().filter(item => item.id !== itemId);
        saveMenuItems(updatedItems);
        renderMenuItemList(); // Call directly for consistency
    }
    showToast('Menu item deleted.', 'info');
}

function renderItemTagsDisplay() {
    const displayInput = document.getElementById('item-tags-display');
    if (!displayInput) return;
    displayInput.value = [...(tempItemState.tags || [])].sort().join(', ');
}

function showItemTagEditorModal() {
    const allMenuItems = loadMenuItems();
    const existingTags = new Set();
    allMenuItems.forEach(item => item.tags?.forEach(tag => existingTags.add(tag)));

    const selectedTags = new Set(tempItemState.tags || []);

    const modalHTML = `
        <div id="tag-editor-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit General Tags</h2>
                    <button id="close-tag-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tag-cloud">
                        ${[...existingTags].sort().map(tag => {
                            const isSelected = selectedTags.has(tag);
                            return `<button type="button" class="tag-btn ${isSelected ? 'active' : ''}" data-tag-name="${tag}">${tag}</button>`;
                        }).join('')}
                    </div>
                    <hr>
                    <form id="add-new-tag-form" style="flex-direction: row; gap: 10px; align-items: center;">
                        <input type="text" id="new-tag-name" placeholder="Create a new tag...">
                        <button type="submit" class="theme-button">Add</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('tag-editor-modal');

    modal.querySelector('.tag-cloud').addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-btn')) {
            const tagName = e.target.dataset.tagName;
            selectedTags.has(tagName) ? selectedTags.delete(tagName) : selectedTags.add(tagName);
            e.target.classList.toggle('active');
        }
    });

    modal.onclick = (e) => {
        if (e.target.id === 'tag-editor-modal') {
            closeModal();
        }
    };

    const closeModal = () => {
        tempItemState.tags = Array.from(selectedTags);
        renderItemTagsDisplay();
        modal.remove();
    };

    document.getElementById('close-tag-modal-btn').onclick = closeModal;
}