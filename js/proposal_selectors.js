import { loadMenuItems, loadServices, loadConstraintTags, loadCustomers } from './data_manager.js';
import { showConfirmationModal } from './ui.js';
import { renderCustomerForm } from './customer_manager.js';

export function showMenuItemSelector(currentConstraints, onItemsSelected) {
    // Filter the master list to only include standard, selectable items.
    // This prevents "group" items from being shown as options.
    const menuItems = loadMenuItems().filter(item => !item.itemType || item.itemType === 'standard');


    let activeFilter = {
        category: 'All',
        tags: {} // { tagName: 'include' | 'exclude' }
    };

    // State for multi-selection
    const selectedItemIds = new Set();

    // Generate unique categories and tags from all menu items
    const allCategories = ['All', ...new Set(menuItems.map(item => item.displayCategory).filter(Boolean))].sort();
    const allTags = new Set();
    menuItems.forEach(item => item.tags?.forEach(tag => allTags.add(tag)));
    const sortedTags = [...allTags].sort();

    const modalHTML = `
        <div id="item-selector-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Select a Menu Item</h2>
                    <button id="toggle-filters-btn" class="theme-button secondary-button">Show Filters</button>
                    <button id="close-item-selector-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body">
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

                    <div class="filter-toggle-container" style="margin-top: 1rem;">
                        <input type="checkbox" id="show-non-conformant-toggle">
                        <label for="show-non-conformant-toggle">Show items that violate proposal's dietary restrictions</label>
                    </div>

                    <div class="item-selector-list">
                        <!-- Item list will be rendered here by JS -->
                    </div>
                </div>
                <div class="modal-footer">
                    <div id="selection-info" style="margin-right: auto;"></div>
                    <button id="done-selecting-items-btn" class="theme-button">Done</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const closeModal = () => document.getElementById('item-selector-modal')?.remove();
    document.getElementById('close-item-selector-btn').onclick = closeModal;

    document.getElementById('item-selector-modal').onclick = (e) => {
        if (e.target.id === 'item-selector-modal') {
            closeModal();
        }
    };

    // --- Main Filtering Logic ---

    const filterItems = () => {
        const showAll = document.getElementById('show-non-conformant-toggle').checked;
        const constraints = currentConstraints || [];
        const includeTags = Object.keys(activeFilter.tags).filter(tag => activeFilter.tags[tag] === 'include');
        const excludeTags = Object.keys(activeFilter.tags).filter(tag => activeFilter.tags[tag] === 'exclude');

        const filtered = menuItems.filter(item => {
            const itemTags = item.tags || [];
            const itemDietaryTags = item.dietaryTags || [];
            const itemOptionalTags = item.optionalDietaryTags || [];

            // Proposal dietary restriction check
            const isNonConformant = constraints.some(c => itemDietaryTags.includes(c) && !itemOptionalTags.includes(c));
            if (isNonConformant && !showAll) return false;

            // Category check
            if (activeFilter.category !== 'All' && item.displayCategory !== activeFilter.category) {
                return false;
            }

            // Exclude tags check (must not have any of them)
            if (excludeTags.some(tag => itemTags.includes(tag))) {
                return false;
            }

            // Include tags check (must have at least one, if any are specified)
            if (includeTags.length > 0 && !includeTags.some(tag => itemTags.includes(tag))) {
                return false;
            }

            return true; // Passed all checks
        });

        renderItemList(filtered, constraints);
    };

    // --- UI Rendering and Event Handlers ---

    const renderItemList = (itemsToRender, currentConstraints) => {
        const listContainer = document.querySelector('.item-selector-list');
        listContainer.innerHTML = itemsToRender.map(item => {
            const isSelected = selectedItemIds.has(item.id);
            const isNonConformant = (currentConstraints || []).some(c => (item.dietaryTags || []).includes(c) && !(item.optionalDietaryTags || []).includes(c));
            return `
                <div class="item-selector-item ${isNonConformant ? 'non-conformant' : ''} ${isSelected ? 'selected' : ''}" data-item-id="${item.id}">
                    <strong>${item.name}</strong> - $${item.price}
                    <p>${item.description}</p>
                </div>`;
        }).join('') || '<p>No items match the current filter.</p>';

        // Re-attach click handlers for the newly rendered items
        listContainer.querySelectorAll('.item-selector-item').forEach(itemEl => {
            itemEl.onclick = () => {
                const itemId = itemEl.dataset.itemId;
                if (selectedItemIds.has(itemId)) {
                    selectedItemIds.delete(itemId);
                    itemEl.classList.remove('selected');
                } else {
                    selectedItemIds.add(itemId);
                    itemEl.classList.add('selected');
                }
                updateSelectionBadge();
            };
        });
    };

    const updateSelectionBadge = () => {
        const badgeContainer = document.getElementById('selection-info');
        const count = selectedItemIds.size;
        if (count > 0) {
            badgeContainer.innerHTML = `<span class="selection-badge">${count} selected</span>`;
        } else {
            badgeContainer.innerHTML = '';
        }
    };

    document.getElementById('done-selecting-items-btn').onclick = () => {
        const itemsToAdd = menuItems.filter(item => selectedItemIds.has(item.id));
        const itemsWithViolations = itemsToAdd.filter(item => (currentConstraints || []).some(c => (item.dietaryTags || []).includes(c) && !(item.optionalDietaryTags || []).includes(c)));

        const addItems = () => {
            onItemsSelected(itemsToAdd);
            closeModal();
        };

        if (itemsWithViolations.length > 0) {
            const message = `Warning: You have selected ${itemsWithViolations.length} item(s) that conflict with the proposal's dietary restrictions. Add them anyway?`;
            showConfirmationModal(message, addItems);
        } else {
            addItems();
        }
    };

    const updateFilterUI = () => {
        // Update category buttons
        document.querySelectorAll('#category-filter-cloud .filter-tag-btn').forEach(btn => {
            btn.classList.toggle('include', btn.dataset.category === activeFilter.category);
        });

        // Determine which tags are relevant for the selected category
        const itemsInSelectedCategory = activeFilter.category === 'All'
            ? menuItems
            : menuItems.filter(item => item.displayCategory === activeFilter.category);

        const tagCounts = new Map();
        itemsInSelectedCategory.forEach(item => {
            item.tags?.forEach(tag => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });
        });

        // Update tag buttons
        document.querySelectorAll('#tag-filter-cloud .filter-tag-btn').forEach(btn => {
            const tag = btn.dataset.tag;
            const count = tagCounts.get(tag) || 0;

            // Hide tag if it's not on any items OR if it's on ALL items in the current view
            const isRelevant = count > 0 && count < itemsInSelectedCategory.length;
            btn.style.display = isRelevant ? '' : 'none';

            if (!isRelevant) {
                // If we hide the tag, ensure it's not part of the active filter
                delete activeFilter.tags[tag];
            }

            const state = activeFilter.tags[tag];
            btn.classList.remove('include', 'exclude'); // Reset state style
            if (state === 'include') btn.classList.add('include');
            else if (state === 'exclude') btn.classList.add('exclude');

            // Update the button text to include the count badge
            btn.innerHTML = `${tag} <span class="tag-count-badge">${count}</span>`;
        });
        filterItems();
    };

    // Toggle advanced filter panel
    document.getElementById('toggle-filters-btn').onclick = (e) => {
        const container = document.getElementById('advanced-filters-container');
        const isHidden = container.style.display === 'none';
        container.style.display = isHidden ? 'block' : 'none';
        e.target.textContent = isHidden ? 'Hide Filters' : 'Show Filters';
    };

    // Category filter clicks
    document.getElementById('category-filter-cloud').addEventListener('click', e => {
        if (e.target.matches('.filter-tag-btn')) {
            activeFilter.category = e.target.dataset.category;
            updateFilterUI();
        }
    });

    // Tag filter clicks (cycle through states)
    document.getElementById('tag-filter-cloud').addEventListener('click', e => {
        if (e.target.matches('.filter-tag-btn')) {
            const tag = e.target.dataset.tag;
            const currentState = activeFilter.tags[tag];
            if (!currentState) {
                activeFilter.tags[tag] = 'include'; // Off -> Include
            } else if (currentState === 'include') {
                activeFilter.tags[tag] = 'exclude'; // Include -> Exclude
            } else {
                delete activeFilter.tags[tag]; // Exclude -> Off
            }
            updateFilterUI();
        }
    });

    // Show non-conformant items toggle
    document.getElementById('show-non-conformant-toggle').onchange = filterItems;

    // Initial render
    filterItems();
}

export function showServiceSelector(onServiceSelected) {
    const services = loadServices();

    const modalHTML = `
        <div id="item-selector-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Select a Service</h2>
                    <button id="close-item-selector-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body item-selector-list">
                    ${services.map(service => `
                        <div class="item-selector-item" data-item-id="${service.id}">
                            <strong>${service.name}</strong> - $${service.price} ${service.pricingType === 'hourly' ? '/hr' : '(flat)'}
                            <p>${service.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const closeModal = () => document.getElementById('item-selector-modal')?.remove();

    document.getElementById('close-item-selector-btn').onclick = closeModal;
    document.getElementById('item-selector-modal').onclick = (e) => {
        if (e.target.id === 'item-selector-modal') {
            closeModal();
        }
    };

    document.querySelectorAll('.item-selector-item').forEach(itemElement => {
        itemElement.onclick = () => {
            const itemId = itemElement.dataset.itemId;
            const selectedItem = services.find(item => item.id === itemId);
            
            if (selectedItem) {
                onServiceSelected(selectedItem);
            }
            
            closeModal();
        };
    });
}

export function showConstraintEditorModal(currentConstraints, onConstraintsChanged) {
    const availableTags = loadConstraintTags();
    // Sort tags alphabetically for display in the cloud
    availableTags.sort((a, b) => a.name.localeCompare(b.name));

    const selectedConstraints = new Set(currentConstraints || []);

    const modalHTML = `
        <div id="constraint-editor-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Dietary Restrictions</h2>
                    <button id="close-constraint-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tag-cloud">
                        ${availableTags.map(tag => {
                            const isSelected = selectedConstraints.has(tag.name);
                            return `<button type="button" class="tag-btn ${isSelected ? 'active' : ''}" data-tag-name="${tag.name}" data-size="${tag.size || 5}">${tag.name}</button>`;
                        }).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="done-editing-constraints-btn" class="theme-button">Done</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('constraint-editor-modal');
    const cloudContainer = modal.querySelector('.tag-cloud');

    cloudContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-btn')) {
            const tagName = e.target.dataset.tagName;
            selectedConstraints.has(tagName) ? selectedConstraints.delete(tagName) : selectedConstraints.add(tagName);
            e.target.classList.toggle('active');
        }
    });

    const closeModal = () => {
        onConstraintsChanged(Array.from(selectedConstraints));
        modal.remove();
    };

    modal.onclick = (e) => {
        if (e.target.id === 'constraint-editor-modal') {
            closeModal();
        }
    };

    document.getElementById('close-constraint-modal-btn').onclick = closeModal;
    document.getElementById('done-editing-constraints-btn').onclick = closeModal;
}

export function showCustomerLookupModal(onCustomerSelected) {
    const customers = loadCustomers();

    const modalHTML = `
        <div id="customer-lookup-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Select a Customer</h2>
                    <button id="close-lookup-modal-btn" class="close-button">&times;</button>
                </div>
                <div id="customer-lookup-modal-body" class="modal-body">
                    <input type="search" id="search-lookup-input" placeholder="Search customers..." style="width: 95%; margin-bottom: 1rem;">
                    <div class="item-selector-list">
                        ${customers.map(customer => `
                            <div class="item-selector-item customer-lookup-item" data-customer-id="${customer.id}" data-search-term="${customer.name.toLowerCase()} ${customer.phone} ${customer.email.toLowerCase()}">
                                <strong>${customer.name}</strong>
                                <p>${customer.phone || ''} | ${customer.email || ''}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="add-new-customer-from-lookup-btn" class="theme-button circular-icon-button" title="Add New Customer">+</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const closeModal = () => document.getElementById('customer-lookup-modal').remove();
    document.getElementById('close-lookup-modal-btn').onclick = closeModal;

    document.getElementById('customer-lookup-modal').onclick = (e) => {
        if (e.target.id === 'customer-lookup-modal') {
            closeModal();
        }
    };

    document.getElementById('search-lookup-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.customer-lookup-item').forEach(row => {
            const show = row.dataset.searchTerm.includes(searchTerm);
            row.style.display = show ? 'block' : 'none';
        });
    });

    document.getElementById('add-new-customer-from-lookup-btn').onclick = () => {
        // When adding a new customer from the lookup, we want to re-render the lookup list after saving.
        const onSaveCallback = () => {
            closeModal();
            showCustomerLookupModal(onCustomerSelected);
        };
        renderCustomerForm(null, onSaveCallback, 'customer-lookup-modal-body');
    };

    document.querySelectorAll('.customer-lookup-item').forEach(itemEl => {
        itemEl.onclick = () => {
            const customerId = itemEl.dataset.customerId;
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                onCustomerSelected(customer);
            }
            closeModal();
        };
    });
}