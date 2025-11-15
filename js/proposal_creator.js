//==============================
// Proposal Creator Logic
//==============================
import { showConfirmationModal } from './ui.js';
import { loadBusinessDetails, loadEvents } from './data_manager.js';
import { showMenuItemSelector, showServiceSelector, showConstraintEditorModal, showCustomerLookupModal } from './proposal_selectors.js';
import { validateEmail, formatPhoneNumber } from './utils.js';
import { tempProposalState, initializeState, checkConstraintViolations } from './proposal_editor_state.js';
import { renderAddedItems, renderConstraintsDisplay } from './proposal_editor_ui.js';
import { saveEntity } from './entity_saver.js';

export function showProposalCreator(entityToEdit = null, isCreatingFromTemplate = false, isCreatingEvent = false, proposalIdToEdit = null, onSaveCallback = null, isEditingEventDetails = false) {
    // Prevent creating multiple modals
    if (document.getElementById('proposal-creator-modal')) {
        return;
    }

    const isEditing = entityToEdit !== null;
    const isEventContext = isEditing && entityToEdit.proposals; // It's an event if it has a proposals array
    const isTemplateEdit = isEditing && (entityToEdit.id?.startsWith('tmpl_') || entityToEdit.id?.startsWith('template_')) && !isCreatingFromTemplate;
    const isContractEdit = isEditing && entityToEdit.contractId;

    // Determine the primary entity being worked on
    const event = isEventContext ? entityToEdit : null;
    const proposal = isEventContext && proposalIdToEdit ? event.proposals.find(p => p.id === proposalIdToEdit) : null;
    const template = isTemplateEdit ? entityToEdit : null;
    const contract = isContractEdit ? entityToEdit : null;

    // Determine what the modal is for
    const isEditingProposalOption = isEventContext && proposalIdToEdit;
    const isAddingProposalOption = isEventContext && !proposalIdToEdit && !isCreatingEvent && !isEditingEventDetails;

    const proposalToEdit = proposal || template || contract || event || (isCreatingEvent ? entityToEdit : null);
    const isProposalLike = !isTemplateEdit;

    // Initialize state module
    initializeState({
        menuItems: JSON.parse(JSON.stringify(proposalToEdit?.menuItems || [])),
        services: JSON.parse(JSON.stringify(proposalToEdit?.services || [])),
        constraints: [...(event?.constraints || proposalToEdit?.constraints || [])],
        customerId: event?.customerId || proposalToEdit?.customerId || null
    });
    
    let initialTerms = event?.termsAndConditions || entityToEdit?.termsAndConditions || loadBusinessDetails().termsAndConditions;

    let modalTitle = 'New Event';
    if (isEditingEventDetails) modalTitle = 'Edit Event Details';
    else if (isAddingProposalOption) modalTitle = 'New Proposal Option';
    else if (isEditingProposalOption) modalTitle = 'Edit Proposal Option';
    else if (isTemplateEdit) modalTitle = 'Edit Template';
    else if (isContractEdit) modalTitle = 'Edit Contract';
    else if (isCreatingFromTemplate) modalTitle = 'New Event from Template';

    let saveButtonText = 'Save Event';
    if (isEditingProposalOption || isAddingProposalOption) saveButtonText = 'Save Proposal';
    else if (isTemplateEdit) saveButtonText = 'Save Template';
    else if (isContractEdit) saveButtonText = 'Save Contract';

    const showProposalFields = isAddingProposalOption || isEditingProposalOption || isTemplateEdit;
    const showEventFields = isCreatingEvent || isEditingEventDetails || isCreatingFromTemplate;

    const clientContactHTML = isProposalLike ? `
        <div id="client-phone-group">
            <label for="client-phone">Phone:</label>
            <input type="tel" id="client-phone" name="client-phone" placeholder="(###) ###-####" value="${proposalToEdit?.clientPhone || ''}">
        </div>
        <div id="client-contact-group">
            <label for="client-contact">Email:</label>
            <input type="email" id="client-contact" name="client-contact" placeholder="example@email.com" value="${proposalToEdit?.clientContact || ''}">
        </div>
    ` : '';

    const eventDateHTML = isProposalLike ? `
        <div id="event-date-group">
            <label for="event-date">Date:</label>
            <input type="date" id="event-date" name="event-date" ${showEventFields ? 'required' : ''} value="${proposalToEdit?.eventDate || ''}">
        </div>
    ` : '';

    const timeAndDurationHTML = isProposalLike ? `
        <div class="time-duration-group">
            <label for="event-start-time">Start Time:</label><input type="time" id="event-start-time" value="${proposalToEdit?.eventStartTime || ''}">
            <label for="pre-event-duration">Setup (hrs):</label><input type="number" id="pre-event-duration" min="0" step="0.5" value="${proposalToEdit?.preEventDuration ?? ''}">
            <label for="event-duration">Event (hrs):</label><input type="number" id="event-duration" min="0.5" step="0.5" value="${proposalToEdit?.eventDuration || ''}">
            <label for="post-event-duration">Cleanup (hrs):</label><input type="number" id="post-event-duration" min="0" step="0.5" value="${proposalToEdit?.postEventDuration ?? ''}">
        </div>
    ` : '';

    const proposalNameHTML = showProposalFields ? `
        <label for="proposal-name">Proposal Option Name:</label>
        <input type="text" id="proposal-name" name="proposal-name" required value="${proposal?.name || template?.name || ''}" placeholder="e.g., Option A: Buffet">
    ` : '';
    
    const modalHTML = `
        <div id="proposal-creator-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${modalTitle}</h2>
                    <button id="close-modal-btn" class="close-button">&times;</button>
                </div>
                <div id="proposal-actions-bar" class="button-row" style="display: ${showProposalFields ? 'flex' : 'none'}; padding: 0 10px 1rem; border-bottom: 1px solid #eee; margin-bottom: 1rem; gap: 0.5rem;">
                    <button type="button" id="add-menu-item-btn" class="theme-button pill-button">+ Menu Item</button>
                    <button type="button" id="add-group-btn" class="theme-button pill-button secondary-button">+ Menu Group</button>
                    <button type="button" id="add-service-btn" class="theme-button pill-button">+ Service</button>
                </div>
                <div class="modal-body">
                    <form id="proposal-form">
                        <fieldset id="client-info-fieldset" style="display: ${showEventFields ? 'block' : 'none'}">
                            <legend>
                                ${isTemplateEdit ? 'Template Details' : 'Client Information'}
                                ${isProposalLike ? `<button type="button" id="customer-lookup-btn" class="theme-button secondary-button" style="margin-left: 1rem; padding: 2px 8px;">Lookup</button>` : ''}
                            </legend>
                            <label for="client-name">${isTemplateEdit ? 'Template Name:' : 'Name:'}</label>
                            <input type="text" id="client-name" name="client-name" required value="${(isCreatingFromTemplate && isProposalLike) ? '' : (entityToEdit?.name || entityToEdit?.clientName || '')}">
                            ${clientContactHTML}
                        </fieldset>

                        <fieldset id="event-details-fieldset" style="display: ${showEventFields ? 'block' : 'none'}">
                            <legend>Event Details</legend>
                            ${eventDateHTML}
                            <label for="event-location">Location:</label>
                            <input type="text" id="event-location" name="event-location" placeholder="e.g., 123 Main St, Anytown" value="${entityToEdit?.eventLocation || ''}">
                            <label for="event-description">Description:</label>
                            <input type="text" id="event-description" name="event-description" placeholder="e.g., Wedding for John & Daphne" value="${entityToEdit?.eventDescription || ''}">
                            ${timeAndDurationHTML}
                            <label for="constraints-input">Dietary Constraints:</label>
                            <div class="readonly-input-container">
                                <input type="text" id="constraints-display" readonly placeholder="None">
                                <button type="button" id="edit-constraints-btn" class="theme-button">✏️</button>
                            </div>
                            <label for="guest-count">Guests:</label>
                            <input type="number" id="guest-count" name="guest-count" min="1" placeholder="e.g., 50" value="${entityToEdit?.guestCount || ''}">
                        </fieldset>

                        <fieldset id="proposal-details-fieldset" style="display: ${showProposalFields ? 'block' : 'none'}">
                            <legend>Proposal Details</legend>
                            ${proposalNameHTML}
                        </fieldset>

                        <fieldset style="display: ${showProposalFields ? 'block' : 'none'}">
                            <legend>Menu Items</legend>
                            <div id="proposal-menu-items-list"></div>
                        </fieldset>

                        <fieldset style="display: ${showProposalFields ? 'block' : 'none'}">
                            <legend>Services</legend>
                            <div id="proposal-services-list"></div>
                        </fieldset>

                        <fieldset>
                            <legend>Internal Notes</legend>
                            <div id="pc-internal-notes-editor"></div>
                        </fieldset>

                        <fieldset style="display: ${showEventFields ? 'block' : 'none'}">
                            <legend>Terms & Conditions</legend>
                            <div id="pc-terms-editor"></div>
                        </fieldset>
                    </form>
                    <div id="proposal-warnings" class="warning-banner hidden"></div>
                </div>
                <div class="modal-footer">
                    <div id="proposal-total-cost" style="display: ${isContractEdit ? 'block' : 'none'};"></div>
                    <button type="button" id="save-proposal-btn" class="theme-button">${saveButtonText}</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // --- Initialize Quill Editors ---
    const notesQuill = new Quill('#pc-internal-notes-editor', {
        theme: 'snow',
        modules: { toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }]] },
        placeholder: 'Notes for internal use, not shown on contract...'
    });
    notesQuill.root.innerHTML = proposalToEdit?.notes || '';

    let termsQuill = null; // Initialize as null
    if (showEventFields) {
        termsQuill = new Quill('#pc-terms-editor', {
            theme: 'snow',
            modules: { toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }]] },
            placeholder: 'Enter event terms and conditions...'
        });
        if (termsQuill) {
            termsQuill.root.innerHTML = initialTerms || '';
        }
    }

    // Pass the Quill instances to the save function via the context object
    const editorContext = {
        notesQuillInstance: notesQuill,
        termsQuillInstance: termsQuill
    };

    document.getElementById('proposal-form').onsubmit = (e) => e.preventDefault();

    document.getElementById('close-modal-btn').onclick = closeProposalCreator;
    document.getElementById('proposal-creator-modal').onclick = (e) => {
        if (e.target.id === 'proposal-creator-modal') {
            showConfirmationModal('Are you sure you want to close? Any unsaved changes will be lost.', () => {
                closeProposalCreator();
            });
        }
    };

    const clientContactInput = document.getElementById('client-contact');
    if (clientContactInput) {
        clientContactInput.addEventListener('input', (e) => validateEmail(e.target));
    }

    const clientPhoneInput = document.getElementById('client-phone');
    if (clientPhoneInput) clientPhoneInput.addEventListener('input', (e) => formatPhoneNumber(e.target));

    document.getElementById('save-proposal-btn').onclick = () => {
        saveEntity({ // Call the function from the new module
            isCreatingEvent, isEditingEventDetails, isAddingProposalOption, isEditingProposalOption,
            isTemplateEdit, isContractEdit, isCreatingFromTemplate, ...editorContext,
            event, proposal, template, contract, onSaveCallback
        }, closeProposalCreator);
    };

    document.getElementById('add-menu-item-btn').onclick = () => {
        showMenuItemSelector(tempProposalState.constraints, (selectedItems) => {
            const currentGuestCount = parseInt(document.getElementById('guest-count').value, 10) || 0;
            selectedItems.forEach(item => {
                if (item.pricingModel === 'per_person') {
                    item.appliesToGuests = currentGuestCount; // Default to event guest count
                    item.guestCountOnAdd = currentGuestCount; // Snapshot for later comparison
                    delete item.quantity;
                } else {
                    item.quantity = 1; // Default quantity for fixed price items
                }
                tempProposalState.menuItems.push(item);
            });
            renderAddedItems(); // Re-render the entire list
            updateTotalCost(); // Update total cost
            renderWarnings(); // Check for any new violations
        });
    };

    document.getElementById('add-group-btn').onclick = () => {
        const newGroup = {
            id: `group_${Date.now()}`,
            itemType: 'group',
            name: 'New Group',
            description: '',
            options: [],
            selectionRule: { min: null, max: null }
        };
        tempProposalState.menuItems.push(newGroup);
        renderAddedItems();
    };

    document.getElementById('add-service-btn').onclick = () => {
        showServiceSelector((selectedItem) => {
            tempProposalState.services.push({ ...selectedItem, duration: selectedItem.pricingType === 'hourly' ? 1 : undefined });
            renderAddedItems();
            updateTotalCost();
            renderWarnings();
        });
    };

    const customerLookupBtn = document.getElementById('customer-lookup-btn');
    if (customerLookupBtn) {
        customerLookupBtn.onclick = () => {
            showCustomerLookupModal((customer) => {
                document.getElementById('client-name').value = customer.name;
                document.getElementById('client-phone').value = customer.phone;
                document.getElementById('client-contact').value = customer.email;
                tempProposalState.customerId = customer.id;
                tempProposalState.constraints = [...customer.dietaryRestrictions];
                renderConstraintsDisplay();
            });
        };
    }

    document.getElementById('guest-count').addEventListener('input', () => {
        updateTotalCost();
        // Re-render items to show/hide warnings if guest count changes
        renderAddedItems();
    });
    
    document.getElementById('edit-constraints-btn').onclick = () => {
        showConstraintEditorModal(tempProposalState.constraints, (updatedConstraints) => {
            tempProposalState.constraints = updatedConstraints;
            renderConstraintsDisplay();
            renderWarnings();
        });
    };

    renderAddedItems();
    updateTotalCost();
    renderConstraintsDisplay();
    renderWarnings();
}

function closeProposalCreator() {
    const modal = document.getElementById('proposal-creator-modal');
    if (modal) modal.remove();
}

export function updateTotalCost() {
    const totalCostElement = document.getElementById('proposal-total-cost');
    if (!totalCostElement) return;

    let totalCost = 0;
    tempProposalState.menuItems.forEach(item => {
        if (item.pricingModel === 'per_person') {
            totalCost += (item.price || 0) * (item.appliesToGuests || 0);
        } else {
            totalCost += (item.price || 0) * (item.quantity || 1);
        }
    });
    tempProposalState.services.forEach(service => {
        totalCost += (service.price || 0) * (service.pricingType === 'hourly' ? (service.duration || 1) : 1);
    });

    const guestCount = parseInt(document.getElementById('guest-count').value, 10) || 0;
    let costPerPersonText = '';
    if (guestCount > 0) {
        const costPerPerson = totalCost / guestCount;
        costPerPersonText = ` <span style="font-size: 0.9rem; color: #555;">($${costPerPerson.toFixed(2)}/person)</span>`;
    }
    totalCostElement.innerHTML = `Total: $${totalCost.toFixed(2)}${costPerPersonText}`;
}

export function renderWarnings() {
    const warningsContainer = document.getElementById('proposal-warnings');
    if (!warningsContainer) return;
    const violations = checkConstraintViolations();
    warningsContainer.innerHTML = violations.length > 0 ? `<p><strong>Warning:</strong> This proposal contains items that conflict with the dietary restrictions.</p><ul>${violations.map(v => `<li>${v}</li>`).join('')}</ul>` : '';
    warningsContainer.classList.toggle('hidden', violations.length === 0);
}
