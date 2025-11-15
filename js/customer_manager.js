//==============================
// Customer Manager Logic
//==============================
import { appViewModel } from './app_viewmodel.js';
import { 
    addDocument, updateDocument, deleteDocument 
} from './firebase_sync.js';
import { showConfirmationModal, showToast, registerModal, closeTopModal } from './ui.js';
import { showNotesEditor } from './modals/utility_modals.js';
import { loadCustomers, saveCustomers, loadConstraintTags, loadEvents, loadContracts } from './data_manager.js';
import { formatPhoneNumber, validateEmail } from './utils.js';

export function showCustomerManager() {
    if (document.getElementById('library-manager-modal')) return;

    const modalHTML = `
        <div id="library-manager-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Customer Library</h2>
                    <button id="close-library-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body" id="library-manager-body">
                    <!-- Customer list will be rendered here -->
                </div>
                <div class="modal-footer">
                    <button id="add-new-customer-btn" class="theme-button circular-icon-button" title="Add New Customer">+</button>
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
        const isFormOpen = !!document.getElementById('customer-form');
        if (e.target.id === 'library-manager-modal' && !isFormOpen) {
            closeTopModal();
        }
    };

    document.getElementById('close-library-modal-btn').onclick = closeTopModal;
    document.getElementById('add-new-customer-btn').onclick = () => renderCustomerForm();

    renderCustomerList();
}

function renderCustomerList() {
    const customers = loadCustomers();
    const body = document.getElementById('library-manager-body');

    const searchBarHTML = `<input type="search" id="search-customers-input" placeholder="Search by name, phone, or email..." style="width: 95%; margin-bottom: 1rem;">`;

    const listHTML = `
        ${searchBarHTML}
        <div id="customer-list" class="item-list-container">
            ${customers.map(customer => `
                <div class="library-item-row customer-row" data-item-id="${customer.id}" data-search-term="${customer.name.toLowerCase()} ${customer.phone} ${customer.email.toLowerCase()}">
                    <div class="item-info">
                        <strong>${customer.name}</strong>
                        ${customer.notes ? `<button class="notes-icon-inline icon-button customer-notes-btn" data-item-id="${customer.id}">📝</button>` : ''}
                        <br>
                        <small>${customer.phone || ''} | ${customer.email || ''}</small>
                    </div>
                    <div class="item-actions">
                        <button class="edit-item-btn theme-button secondary-button icon-button" title="Edit Customer" data-item-id="${customer.id}">✏️</button>
                        <button class="delete-item-btn theme-button secondary-button icon-button" title="Delete Customer" data-item-id="${customer.id}">X</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    body.innerHTML = listHTML;

    // Set focus to the search bar when the list is rendered
    document.getElementById('search-customers-input').focus();

    document.getElementById('search-customers-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.customer-row').forEach(row => {
            const isMatch = row.dataset.searchTerm.includes(searchTerm);
            row.style.display = isMatch ? 'grid' : 'none'; // Use 'grid' to match the CSS layout
        });
    });

    // Add click listener to each customer row to show details
    document.querySelectorAll('.customer-row').forEach(row => {
        row.onclick = (e) => {
            if (e.target.closest('button')) return; // Don't trigger if a button was clicked
            showCustomerDetailView(row.dataset.itemId);
        };
    });
    document.querySelectorAll('.edit-item-btn').forEach(btn => {
        btn.onclick = () => renderCustomerForm(btn.dataset.itemId);
    });

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.onclick = () => {
            showConfirmationModal('Are you sure you want to delete this customer?', () => {
                deleteCustomer(btn.dataset.itemId);
            });
        };
    });

    document.querySelectorAll('.customer-notes-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const customer = loadCustomers().find(c => c.id === btn.dataset.itemId);
            if (customer) showNotesEditor(customer, 'customer');
        };
    });
}

export function renderCustomerForm(customerId = null, onSaveCallback = null, containerId = 'library-manager-body') {
    const customers = loadCustomers();
    const customer = customerId ? customers.find(c => c.id === customerId) : null;
    const isEditing = customer !== null;
    const container = document.getElementById(containerId);
    if (!container) return;
    let tempCustomerDietaryRestrictions = [...(customer?.dietaryRestrictions || [])];

    const formHTML = `
        <form id="customer-form">
            <label for="customer-name">Name:</label>
            <input type="text" id="customer-name" value="${customer?.name || ''}" required>
            <label for="customer-phone">Phone:</label>
            <input type="tel" id="customer-phone" value="${customer?.phone || ''}">
            <label for="customer-email">Email:</label>
            <input type="email" id="customer-email" value="${customer?.email || ''}">
            <label for="customer-notes">Notes:</label>
            <textarea id="customer-notes">${customer?.notes || ''}</textarea>
            <label for="customer-dietary-restrictions">Default Dietary Restrictions:</label>
            <div class="readonly-input-container">
                <input type="text" id="customer-dietary-restrictions-display" readonly placeholder="None">
                <button type="button" id="edit-customer-dietary-restrictions-btn" class="theme-button">✏️</button>
            </div>
            <div class="form-actions">
                <button type="submit" class="theme-button">Save Customer</button>
                <button type="button" id="cancel-item-form" class="theme-button secondary-button">Cancel</button>
            </div>
        </form>
    `;
    container.innerHTML = formHTML;

    // Hide the main modal's add button if it exists
    const mainAddBtn = document.getElementById('add-new-customer-btn');
    if (mainAddBtn) {
        mainAddBtn.style.display = 'none';
    }

    const renderDisplay = () => {
        document.getElementById('customer-dietary-restrictions-display').value = [...tempCustomerDietaryRestrictions].sort().join(', ');
    };

    document.getElementById('cancel-item-form').onclick = () => {
        if (mainAddBtn) {
            mainAddBtn.style.display = 'inline-block';
        }
        // If a callback is provided (i.e., we are in the lookup modal), don't render the list.
        if (!onSaveCallback) {
            renderCustomerList();
        }
    };

    // Attach phone and email formatters
    const customerPhoneInput = document.getElementById('customer-phone');
    if (customerPhoneInput) customerPhoneInput.addEventListener('input', (e) => formatPhoneNumber(e.target));

    const customerEmailInput = document.getElementById('customer-email');
    if (customerEmailInput) {
        customerEmailInput.addEventListener('input', (e) => validateEmail(e.target));
    }

    document.getElementById('edit-customer-dietary-restrictions-btn').onclick = () => {
        showCustomerDietaryRestrictionEditorModal(tempCustomerDietaryRestrictions, (updatedRestrictions) => {
            tempCustomerDietaryRestrictions = updatedRestrictions;
            renderDisplay();
        });
    };

    document.getElementById('customer-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = customer?.id || `cust_${Date.now()}`;
        const updatedCustomer = {
            id: id,
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            email: document.getElementById('customer-email').value,
            notes: document.getElementById('customer-notes').value,
            dietaryRestrictions: tempCustomerDietaryRestrictions
        };

        if (appViewModel.isCloudMode) {
            await updateDocument('customers', id, updatedCustomer);
        } else {
            const updatedCustomers = isEditing ? customers.map(c => c.id === customerId ? updatedCustomer : c) : [...customers, updatedCustomer];
            saveCustomers(updatedCustomers);
        }
        showToast('Customer Saved!', 'info');

        if (onSaveCallback) {
            onSaveCallback();
        } else {
            if (mainAddBtn) {
                mainAddBtn.style.display = 'inline-block';
            }
            renderCustomerList();
        }
    };

    renderDisplay(); // Initial render
}

async function deleteCustomer(customerId) {
    // --- NEW: Check for associations before deleting ---
    const associatedEvents = appViewModel.state.events.filter(e => e.customerId === customerId);
    const associatedContracts = appViewModel.state.contracts.filter(c => c.customerId === customerId);

    if (associatedEvents.length > 0 || associatedContracts.length > 0) {
        const message = `Cannot delete customer. They are associated with ${associatedEvents.length} event(s) and ${associatedContracts.length} contract(s). Please remove them from these items first.`;
        showToast(message, 'error');
        return; // Abort the deletion
    }

    if (appViewModel.isCloudMode) {
        await deleteDocument('customers', customerId);
        // The real-time listener will update the underlying data in localStorage.
        // We just need to re-render the list in the modal to reflect the change.
        renderCustomerList();
    } else {
        saveCustomers(loadCustomers().filter(c => c.id !== customerId));
        renderCustomerList();
    }
    showToast('Customer deleted.', 'info');
}

function showCustomerDietaryRestrictionEditorModal(currentRestrictions, onDone) {
    const availableTags = loadConstraintTags();
    availableTags.sort((a, b) => a.name.localeCompare(b.name));

    const selectedConstraints = new Set(currentRestrictions || []);

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
    modal.querySelector('.tag-cloud').addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-btn')) {
            const tagName = e.target.dataset.tagName;
            selectedConstraints.has(tagName) ? selectedConstraints.delete(tagName) : selectedConstraints.add(tagName);
            e.target.classList.toggle('active');
        }
    });

    const closeModal = () => { onDone(Array.from(selectedConstraints)); modal.remove(); };

    modal.onclick = (e) => {
        if (e.target.id === 'constraint-editor-modal') {
            closeModal();
        }
    };

    document.getElementById('close-constraint-modal-btn').onclick = closeModal;
    document.getElementById('done-editing-constraints-btn').onclick = closeModal;
}

/**
 * Shows a detailed view of a single customer, including their events and contracts.
 * @param {string} customerId - The ID of the customer to display.
 */
function showCustomerDetailView(customerId) {
    const customers = loadCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
        showToast('Could not find customer.', 'error');
        return;
    }

    const modalId = 'customer-detail-modal';
    document.getElementById(modalId)?.remove();

    // Find all associated events and contracts
    const allEvents = appViewModel.appData.events;
    const allContracts = appViewModel.appData.contracts;
    const customerEvents = allEvents.filter(e => e.customerId === customerId).sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    const customerContracts = allContracts.filter(c => c.customerId === customerId).sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

    const eventsHTML = customerEvents.length > 0 ? customerEvents.map(event => `
        <div class="customer-history-item">
            <strong>${event.clientName}</strong> (${new Date(event.eventDate).toLocaleDateString()})
            <div class="mini-tabs-wrapper">${(event.proposals || []).map(p => `<div class="calendar-mini-tab status-${p.status.toLowerCase()}">${p.name}</div>`).join('')}</div>
        </div>
    `).join('') : '<p>No events found for this customer.</p>';

    const contractsHTML = customerContracts.length > 0 ? customerContracts.map(contract => `
        <div class="customer-history-item">
            <strong>${contract.clientName}</strong> (${new Date(contract.eventDate).toLocaleDateString()})
            <div class="mini-tabs-wrapper"><div class="calendar-mini-tab status-contract-${contract.status.toLowerCase().replace(/ /g, '-')}">${contract.status}</div></div>
        </div>
    `).join('') : '<p>No contracts found for this customer.</p>';

    const modalHTML = `
        <div id="${modalId}" class="modal-overlay">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Customer Details</h2>
                    <button id="close-customer-detail-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="customer-detail-header">
                        <h3>${customer.name}</h3>
                        <p><strong>Contact:</strong> ${customer.phone || 'N/A'} | ${customer.email || 'N/A'}</p>
                        ${customer.notes ? `<div class="customer-notes-display"><strong>Notes:</strong> ${customer.notes}</div>` : ''}
                    </div>
                    <div class="customer-history-section">
                        <h4>Events & Proposals</h4>
                        <div class="customer-history-list">${eventsHTML}</div>
                    </div>
                    <div class="customer-history-section">
                        <h4>Contracts</h4>
                        <div class="customer-history-list">${contractsHTML}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    registerModal(modalId);

    document.getElementById('close-customer-detail-btn').onclick = closeTopModal;
    document.getElementById(modalId).onclick = (e) => {
        if (e.target.id === modalId) {
            closeTopModal();
        }
    };
}