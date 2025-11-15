import { tempProposalState } from './proposal_editor_state.js';
import { updateTotalCost, renderWarnings } from './proposal_creator.js';
import { showMenuItemSelector } from './proposal_selectors.js';

let sortableInstances = []; // Array to keep track of Sortable instances

export function renderAddedItems() {
    const menuItemsContainer = document.getElementById('proposal-menu-items-list');
    const servicesContainer = document.getElementById('proposal-services-list');
    const currentGuestCount = parseInt(document.getElementById('guest-count')?.value, 10) || 0;

    // Render Menu Items and Groups
    menuItemsContainer.innerHTML = tempProposalState.menuItems.map((item, index) => {
        if (item.itemType === 'group') {
            return renderGroup(item, index);
        } else {
            return renderStandardItem(item, index, currentGuestCount);
        }
    }).join('') || '<p class="empty-list-placeholder">No menu items or groups added yet.</p>';

    // Render Services
    servicesContainer.innerHTML = tempProposalState.services.map((service, index) => `
        <div class="added-item-row">
            <div class="drag-handle">⠿</div>
            <span class="item-name">${service.name} (${service.pricingType})</span>
            ${service.pricingType === 'hourly' ? `<input type="number" class="item-duration" value="${service.duration || 1}" min="0.5" step="0.5" data-index="${index}">` : '<span></span>'} 
            <button class="remove-item-btn" data-index="${index}" data-type="service">&times;</button>
            <div class="item-note-line">
                <input type="text" class="client-note-input" data-index="${index}" data-type="service" placeholder="Add a client-facing note..." value="${service.clientNote || ''}">
            </div>
        </div>
    `).join('') || '<p class="empty-list-placeholder">No services added yet.</p>';

    attachItemEventListeners();
}

export function renderConstraintsDisplay() {
    const displayInput = document.getElementById('constraints-display');
    if (!displayInput) return;
    const sortedConstraints = [...(tempProposalState.constraints || [])].sort();
    displayInput.value = sortedConstraints.join(', ');
}

function renderStandardItem(item, index, currentGuestCount, groupIndex = null) {
    let quantityInputHTML = '';
    const groupIndexAttr = groupIndex !== null ? `data-group-index="${groupIndex}"` : '';
    let warningIcon = '';

    if (item.pricingModel === 'per_person') {
        const countMismatch = item.guestCountOnAdd !== currentGuestCount;
        warningIcon = countMismatch ? `<span class="warning-icon" title="Event guest count has changed. Please review.">🔄</span>` : '';
        quantityInputHTML = `
            <div class="per-person-input-group">
                ${warningIcon}
                <input type="number" class="item-guest-count" value="${item.appliesToGuests || 0}" data-index="${index}" ${groupIndexAttr} min="0">
                <span> guests</span>
            </div>`;
    } else {
        quantityInputHTML = `<input type="number" class="item-quantity" value="${item.quantity || 1}" data-index="${index}" ${groupIndexAttr} min="1">`;
    }

    return `
        <div class="added-item-row ${groupIndex !== null && item.isSelected ? 'option-selected' : ''}">
            <div class="drag-handle">⠿</div>
            ${groupIndex !== null ? `<input type="checkbox" class="option-select-checkbox" data-index="${index}" ${groupIndexAttr} ${item.isSelected ? 'checked' : ''}>` : ''}
            <span class="item-name">${item.name}</span>
            ${quantityInputHTML}
            <button class="remove-item-btn" data-index="${index}" ${groupIndexAttr} data-type="menu">&times;</button>
            <div class="item-note-line">
                <input type="text" class="client-note-input" data-index="${index}" ${groupIndexAttr} data-type="menu" value="${item.clientNote || ''}" placeholder="Add a client-facing note...">
            </div>
        </div>`;
}

function renderGroup(group, index) {
    const currentGuestCount = parseInt(document.getElementById('guest-count')?.value, 10) || 0;

    // --- SELECTION VALIDATION LOGIC ---
    const selectedCount = group.options.filter(opt => opt.isSelected).length;
    const { min, max } = group.selectionRule || {};

    let isInvalid = false;
    // Check if min is not met
    if (min !== null && min > 0 && selectedCount < min) isInvalid = true;
    // Check if max is exceeded
    if (max !== null && selectedCount > max) isInvalid = true;

    const warningIconHTML = isInvalid ? `<span class="warning-icon" title="Selection count (${selectedCount}) does not meet the Min/Max rules.">⚠️</span>` : '';
    const selectionBadgeHTML = `<span class="selection-count-badge">${selectedCount} selected</span>`;

    return `
        <div class="item-group-container">
            <div class="item-group-header">
                <div class="item-main-line">
                    <div class="drag-handle">⠿</div>
                    <input type="text" class="group-name-input" value="${group.name}" data-index="${index}" placeholder="Group Name (e.g., Course 1)">
                    ${warningIconHTML}
                    <button class="remove-item-btn" data-index="${index}" data-type="group">&times;</button>
                </div>
                <textarea class="group-description-input" data-index="${index}" placeholder="Group description or instructions (e.g., Please select two)...">${group.description}</textarea>
                <div class="group-rules-container">
                    <label>Min Choices:</label>
                    <input type="number" class="group-rule-input" data-rule="min" data-index="${index}" value="${group.selectionRule?.min || ''}" placeholder="-" min="0">
                    <label>Max Choices:</label>
                    <input type="number" class="group-rule-input" data-rule="max" data-index="${index}" value="${group.selectionRule?.max || ''}" placeholder="-" min="0">
                    ${selectionBadgeHTML}
                </div>
            </div>
            <div class="item-group-options" data-group-index="${index}">
                ${group.options.map((option, optionIndex) => renderStandardItem(option, optionIndex, currentGuestCount, index)).join('')}
            </div>
            <button class="theme-button secondary-button add-option-to-group-btn" data-index="${index}">+ Add Option</button>
        </div>
    `;
}

function attachItemEventListeners() {
    // --- FINAL, CORRECT FIX for event listener management ---
    // 1. Destroy all old SortableJS instances
    sortableInstances.forEach(s => s.destroy());
    sortableInstances = [];

    // 2. Clone and replace containers to remove ALL old event listeners (click, change, etc.)
    const menuItemsContainer = document.getElementById('proposal-menu-items-list');
    const servicesContainer = document.getElementById('proposal-services-list');
    const newMenuItemsContainer = menuItemsContainer.cloneNode(true);
    const newServicesContainer = servicesContainer.cloneNode(true);
    menuItemsContainer.parentNode.replaceChild(newMenuItemsContainer, menuItemsContainer);
    servicesContainer.parentNode.replaceChild(newServicesContainer, servicesContainer);
    
    const currentGuestCount = parseInt(document.getElementById('guest-count')?.value, 10) || 0;

    // Initialize SortableJS for each group's options
    newMenuItemsContainer.querySelectorAll('.item-group-options').forEach(groupContainer => {
        const groupSortable = new Sortable(groupContainer, {
            animation: 150,
            handle: '.drag-handle', // Drag only works on the handle
            onEnd: function (evt) {
                const groupIndex = parseInt(evt.from.dataset.groupIndex, 10);
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;

                if (isNaN(groupIndex)) return;
                const group = tempProposalState.menuItems[groupIndex];
                if (group && group.itemType === 'group') {
                    const [movedItem] = group.options.splice(oldIndex, 1);
                    group.options.splice(newIndex, 0, movedItem);
                    renderAddedItems(); // Re-render to ensure all data attributes and listeners are correct
                }
            }
        });
        sortableInstances.push(groupSortable);
    });

    // Initialize SortableJS for the main container (top-level items and groups)
    const mainSortable = new Sortable(newMenuItemsContainer, {
        animation: 150,
        handle: '.drag-handle', // Drag only works on the handle
        onEnd: function (evt) {
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;

            const [movedItem] = tempProposalState.menuItems.splice(oldIndex, 1);
            tempProposalState.menuItems.splice(newIndex, 0, movedItem);

            renderAddedItems();
        }
    });
    sortableInstances.push(mainSortable);

    newMenuItemsContainer.addEventListener('change', (e) => {
        const target = e.target;
        const index = parseInt(target.dataset.index, 10);
        const groupIndex = target.dataset.groupIndex ? parseInt(target.dataset.groupIndex, 10) : null;

        let item;
        if (groupIndex !== null) {
            item = tempProposalState.menuItems[groupIndex]?.options[index];
        } else {
            item = tempProposalState.menuItems[index];
        }
        if (!item) return;

        if (target.matches('.item-quantity')) {
            item.quantity = parseInt(target.value, 10);
        } else if (target.matches('.item-guest-count')) {
            item.appliesToGuests = parseInt(target.value, 10);
            item.guestCountOnAdd = currentGuestCount; // Mark as reviewed
            renderAddedItems(); // Re-render to remove warning
        } else if (target.matches('.client-note-input')) {
            item.clientNote = target.value;
        } else if (target.matches('.group-name-input')) {
            item.name = target.value;
        } else if (target.matches('.group-description-input')) {
            item.description = target.value;
        } else if (target.matches('.group-rule-input')) {
            if (!item.selectionRule) item.selectionRule = {};
            const rule = target.dataset.rule; // 'min' or 'max'
            const value = target.value ? parseInt(target.value, 10) : null;
            item.selectionRule[rule] = value;
        } else if (target.matches('.option-select-checkbox')) {
            item.isSelected = target.checked;
            renderAddedItems(); // Re-render to apply the 'option-selected' class
        }
        updateTotalCost();
    });

    newMenuItemsContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (!target.matches('button')) return;

        const index = parseInt(target.dataset.index, 10);
        const groupIndex = target.dataset.groupIndex ? parseInt(target.dataset.groupIndex, 10) : null;

        if (target.matches('.remove-item-btn')) {
            if (groupIndex !== null) { // Removing an option from a group
                tempProposalState.menuItems[groupIndex].options.splice(index, 1);
            } else { // Removing a top-level item or group
                tempProposalState.menuItems.splice(index, 1);
            }
            renderAddedItems();
            updateTotalCost();
            renderWarnings();
        } else if (target.matches('.add-option-to-group-btn')) {
            showMenuItemSelector(tempProposalState.constraints, (selectedItems) => {
                const group = tempProposalState.menuItems[index];
                if (group && group.itemType === 'group') {
                    selectedItems.forEach(item => {
                        if (item.pricingModel === 'per_person') {
                            item.appliesToGuests = currentGuestCount;
                            item.guestCountOnAdd = currentGuestCount;
                            item.isSelected = false; // Default to not selected
                            delete item.quantity;
                        } else {
                            item.isSelected = false; // Default to not selected
                            item.quantity = 1;
                        }
                        group.options.push(item);
                    });
                    renderAddedItems();
                    updateTotalCost();
                }
            });
        }
    });

    // Initialize SortableJS for the services list
    const servicesSortable = new Sortable(newServicesContainer, {
        animation: 150,
        handle: '.drag-handle', // Drag only works on the handle
        onEnd: function (evt) {
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;

            const [movedItem] = tempProposalState.services.splice(oldIndex, 1);
            tempProposalState.services.splice(newIndex, 0, movedItem);

            renderAddedItems();
        }
    });
    sortableInstances.push(servicesSortable);

    // Service listeners
    newServicesContainer.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index, 10);
        const service = tempProposalState.services[index];
        if (!service) return;

        if (e.target.matches('.item-duration')) {
            service.duration = parseFloat(e.target.value);
        } else if (e.target.matches('.client-note-input')) {
            service.clientNote = e.target.value;
        }
        updateTotalCost();
    });

    newServicesContainer.addEventListener('click', (e) => {
        if (e.target.matches('.remove-item-btn')) {
            const index = parseInt(e.target.dataset.index, 10);
            tempProposalState.services.splice(index, 1);
            renderAddedItems();
            updateTotalCost();
        }
    });
}

function renderServiceItem(service, index) {
    return `
        <div class="added-item-row">
            <div class="drag-handle">⠿</div>
            <span class="item-name">${service.name} (${service.pricingType})</span>
            ${service.pricingType === 'hourly' ? `<input type="number" class="item-duration" value="${service.duration || 1}" min="0.5" step="0.5" data-index="${index}">` : '<span></span>'} 
            <button class="remove-item-btn" data-index="${index}" data-type="service">&times;</button>
            <div class="item-note-line">
                <input type="text" class="client-note-input" data-index="${index}" data-type="service" placeholder="Add a client-facing note..." value="${service.clientNote || ''}">
            </div>
        </div>
    `;
}