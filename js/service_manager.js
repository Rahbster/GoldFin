//==============================
// Service Manager Logic
//==============================
import { appViewModel } from './app_viewmodel.js';
import { updateDocument, deleteDocument } from './firebase_sync.js';
import { showConfirmationModal, showToast, registerModal, closeTopModal } from './ui.js';
import { loadServices, saveServices } from './data_manager.js';

export function showServiceManager() {
    if (document.getElementById('library-manager-modal')) return;

    const modalHTML = `
        <div id="library-manager-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Services Library</h2>
                    <button id="close-library-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body" id="library-manager-body"></div>
                <div class="modal-footer">
                    <button id="add-new-service-btn" class="theme-button circular-icon-button" title="Add New Service">+</button>
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
        const isFormOpen = !!document.getElementById('service-form');
        if (e.target.id === 'library-manager-modal' && !isFormOpen) {
            closeTopModal();
        }
    };

    document.getElementById('close-library-modal-btn').onclick = closeTopModal;
    document.getElementById('add-new-service-btn').onclick = () => renderServiceForm();

    renderServiceList();
}

function renderServiceList() {
    const services = loadServices();
    // Sort services alphabetically by name
    services.sort((a, b) => a.name.localeCompare(b.name));

    const body = document.getElementById('library-manager-body');
    
    const listHTML = `
        <div class="item-list-container">
            <input type="search" id="search-services-input" placeholder="Search by name..." style="width: 95%; margin-bottom: 1rem;">
            ${services.map(service => `
                <div class="library-item-row">
                    <div class="item-info">
                        <strong>${service.name}</strong> - $${service.price} ${service.pricingType === 'hourly' ? '/hr' : '(flat)'}<br>
                        <small>${service.description || ''}</small>
                    </div>
                    <div class="item-actions">
                        <button class="edit-item-btn theme-button secondary-button icon-button" title="Edit Service" data-item-id="${service.id}">✏️</button>
                        <button class="delete-item-btn theme-button secondary-button icon-button" title="Delete Service" data-item-id="${service.id}">X</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    body.innerHTML = listHTML;

    // Set focus to the search bar when the list is rendered
    document.getElementById('search-services-input').focus();

    // Add search functionality
    document.getElementById('search-services-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        body.querySelectorAll('.library-item-row').forEach(row => {
            const name = row.querySelector('strong').textContent.toLowerCase();
            row.style.display = name.includes(searchTerm) ? 'grid' : 'none';
        });
    });

    document.querySelectorAll('.edit-item-btn').forEach(btn => {
        btn.onclick = () => renderServiceForm(btn.dataset.itemId);
    });

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.onclick = () => {
            showConfirmationModal('Are you sure you want to delete this service?', () => {
                deleteService(btn.dataset.itemId);
            });
        };
    });
}

function renderServiceForm(serviceId = null) {
    const services = loadServices();
    const service = serviceId ? services.find(s => s.id === serviceId) : null;
    const isEditing = service !== null;

    const formHTML = `
        <form id="service-form">
            <input type="text" id="service-name" placeholder="Service Name" value="${service?.name || ''}" required>
            <textarea id="service-description" placeholder="Description">${service?.description || ''}</textarea>
            <div class="button-row">
                <select id="service-pricing-type" class="designer-input">
                    <option value="flat" ${service?.pricingType === 'flat' ? 'selected' : ''}>Flat Fee</option>
                    <option value="hourly" ${service?.pricingType === 'hourly' ? 'selected' : ''}>Hourly Rate</option>
                </select>
                <input type="number" id="service-price" placeholder="Price" value="${service?.price || ''}" required min="0" step="0.01">
            </div>
            <div class="form-actions">
                <button type="submit" class="theme-button">Save Service</button>
                <button type="button" id="cancel-item-form" class="theme-button secondary-button">Cancel</button>
            </div>
        </form>
    `;
    document.getElementById('library-manager-body').innerHTML = formHTML;
    document.getElementById('add-new-service-btn').style.display = 'none';

    document.getElementById('cancel-item-form').onclick = () => {
        document.getElementById('add-new-service-btn').style.display = 'inline-block';
        renderServiceList();
    };

    document.getElementById('service-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = service?.id || `serv_${Date.now()}`;
        const updatedService = {
            id: id,
            name: document.getElementById('service-name').value,
            description: document.getElementById('service-description').value,
            pricingType: document.getElementById('service-pricing-type').value,
            price: parseFloat(document.getElementById('service-price').value)
        };

        if (appViewModel.isCloudMode) {
            await updateDocument('services', id, updatedService);
        } else {
            const updatedServices = isEditing ? services.map(s => s.id === serviceId ? updatedService : s) : [...services, updatedService];
            saveServices(updatedServices);
        }

        showToast('Service saved!', 'info');
        document.getElementById('add-new-service-btn').style.display = 'inline-block';
        renderServiceList();
    };
}

async function deleteService(serviceId) {
    if (appViewModel.isCloudMode) {
        await deleteDocument('services', serviceId);
        renderServiceList(); // Re-render the list in the modal
    } else {
        saveServices(loadServices().filter(service => service.id !== serviceId));
        renderServiceList();
    }
    showToast('Service deleted.', 'info');
}