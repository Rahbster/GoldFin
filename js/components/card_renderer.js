import { appViewModel } from '../app_viewmodel.js';
import { showActionsMenu, showEventActionsMenu } from '../actions.js';
import { showNotesEditor, showAddProposalOptionChoiceModal } from '../modals/utility_modals.js';
import { updateProposalOrder } from '../actions.js'; // Import the new action
import { calculateProposalCost } from '../utils.js';
import { showPrintableView } from '../print_view.js';

/**
 * A centralized function to create a card element for any entity (proposal, contract, template).
 * @param {object} entity - The data object for the event, proposal, contract, or template.
 * @param {'event' | 'proposal' | 'contract' | 'template'} entityType - The type of entity.
 * @param {object} [event=null] - The parent event object, required if entityType is 'proposal'.
 * @param {function} [onUpdateCallback=null] - A function to call to refresh the card's parent.
 * @returns {HTMLElement} The fully constructed card element with event listeners.
 */
export function renderEntityCard(entity, entityType, event = null, onUpdateCallback = null) {
    const card = document.createElement('div');
    card.className = 'proposal-card';

    if (entityType === 'contract') card.classList.add('contract-card');
    else if (entityType === 'template') card.classList.add('template-card');
    else if (entityType === 'event') card.classList.add('event-card');

    // Add a class if the event is archived
    if (entity.isArchived) {
        card.classList.add('archived');
    }

    if (entity.notes) card.classList.add('has-notes');

    if (entityType === 'proposal' && event) {
        const contracts = appViewModel.appData.contracts || [];
        if (contracts.some(c => c.proposalId === entity.id && c.eventId === event.id)) {
            card.classList.add('contracted');
        }
    }
    // Add data-proposal-id for proposals to be draggable
    if (entityType === 'proposal' && entity.id) {
        card.dataset.proposalId = entity.id;
    }

    card.innerHTML = getCardContentHTML(entity, entityType, event);

    const moreActionsBtn = card.querySelector('.more-actions-btn');
    if (moreActionsBtn) {
        moreActionsBtn.onclick = (e) => {
            e.stopPropagation();
            if (entityType === 'proposal') showActionsMenu(e.target, entity, event);
            else if (entityType === 'contract') import('../actions.js').then(actions => actions.showContractActionsMenu(e.target, entity));
            else if (entityType === 'template') import('../actions.js').then(actions => actions.showTemplateActionsMenu(e.target, entity, onUpdateCallback));
            else if (entityType === 'event') showEventActionsMenu(e.target, entity, onUpdateCallback);
        };
    }

    const notesBtn = card.querySelector('.notes-icon');
    if (notesBtn) {
        notesBtn.onclick = (e) => { 
            e.stopPropagation(); 
            // For proposals, we need to pass the parent event as context.
            showNotesEditor(entity, entityType, event); 
        };
    }

    if (entityType === 'proposal' && event) {
        card.addEventListener('click', (e) => {
            // If an actions menu is open anywhere, this click should just close it.
            // The global listener on the document will handle the closing.
            if (document.querySelector('.actions-menu')) {
                return;
            }
            // Don't trigger if the click was on the buttons themselves.
            if (e.target.closest('.more-actions-btn') || e.target.closest('.notes-icon')) return;
            showPrintableView({ ...event, ...entity });
            e.stopPropagation();
        });
    } else {
        // For touch devices, a tap on the card reveals the action buttons.
        card.addEventListener('click', (e) => {
            // Don't toggle if the click was on a button itself.
            if (e.target.closest('.more-actions-btn') || e.target.closest('.notes-icon')) return;
            card.classList.toggle('show-actions-btn');
        });
    }

    if (entityType === 'event') {
        const proposalsContainer = card.querySelector('.proposal-options-container');
        if (proposalsContainer) {
            if (entity.proposals && entity.proposals.length > 0) {
                entity.proposals.forEach(proposal => {
                    const proposalCard = renderEntityCard(proposal, 'proposal', entity);
                    proposalsContainer.appendChild(proposalCard);
                });
            } else {
                proposalsContainer.innerHTML = '<p class="empty-list-placeholder">No proposal options yet. Click (+) to add one.</p>';
            }

            // Initialize SortableJS for proposals within this event
            // Only if there are proposals to sort
            if (entity.proposals && entity.proposals.length > 1) {
                new Sortable(proposalsContainer, {
                    animation: 150,
                    handle: '.drag-handle', // Use a specific handle for dragging
                    ghostClass: 'sortable-ghost', // Class for the ghost element
                    onEnd: function (evt) {
                        const oldIndex = evt.oldIndex;
                        const newIndex = evt.newIndex;
                        // Call the action to update the order in the ViewModel
                        updateProposalOrder(entity.id, oldIndex, newIndex);
                    }
                });
            }

        }
        card.querySelector('.add-proposal-option-to-event-btn').onclick = (e) => {
            e.stopPropagation();
            showAddProposalOptionChoiceModal(entity, null);
        };
    }

    return card;
}

/**
 * Generates the inner HTML for a card based on the entity type.
 * @param {object} entity - The data object.
 * @param {string} entityType - The type of entity.
 * @param {object} [event=null] - The parent event, if applicable.
 * @returns {string} The inner HTML for the card.
 */
function getCardContentHTML(entity, entityType, event = null) {
    const totalCost = calculateProposalCost(entity).toFixed(2);
    const addProposalBtn = `<button class="add-proposal-option-to-event-btn theme-button circular-icon-button" title="Add Proposal Option">+</button>`;
    const notesIcon = `<button class="notes-icon icon-button" title="Edit Internal Notes">📝</button>`;
    const proposalWarningIcon = getProposalWarningHTML(entity);
    const eventWarningIcon = entityType === 'event' ? getEventWarningHTML(entity) : '';
    const moreActions = `<button class="more-actions-btn">...</button>`;

    if (entityType === 'event') {
        return `<div class="card-header"><h3>${entity.clientName}</h3><div class="card-actions">${notesIcon} <div class="top-right-actions">${eventWarningIcon}${moreActions}</div></div></div>
                <div class="card-body">
                    <p class="card-detail"><strong>Date:</strong> ${new Date(entity.eventDate).toLocaleDateString(navigator.language, { timeZone: 'UTC' })}</p>
                    <p class="card-detail"><strong>Guests:</strong> ~${entity.guestCount}</p>
                    <p class="card-description">${entity.eventDescription || 'No description'}</p>
                </div>
                <div class="proposal-options-wrapper">
                    ${addProposalBtn}
                    <div class="proposal-options-container"></div>
                </div>`;
    } else if (entityType === 'proposal') {
        return `<div class="card-header">
                    <h3>${entity.name}</h3>
                    <div class="card-actions">${notesIcon} ${proposalWarningIcon} ${moreActions}</div>
                </div>
                <div class="card-body">
                    <div class="proposal-card-top-row">
                        <div class="status-badge status-${(entity.status || 'Draft').toLowerCase()}">${entity.status || 'Draft'}</div>
                        <div class="drag-handle">⠿</div>
                    </div>
                    <p class="card-detail"><strong>Items:</strong> ${entity.menuItems?.length || 0}</p>
                    <p class="card-detail"><strong>Services:</strong> ${entity.services?.length || 0}</p>
                </div>
                <div class="card-footer">
                    <p class="card-cost">Total: $${totalCost}</p>
                </div>`;
    } else if (entityType === 'contract') {
        const status = entity.status || 'Sent';
        return `<div class="card-header">
                    <h3>${entity.clientName}</h3>
                    <div class="card-actions">${notesIcon} ${proposalWarningIcon} ${moreActions}</div>
                </div>
                <div class="card-body">
                    <div class="status-badge status-contract-${status.toLowerCase().replace(/ /g, '-')}">${status}</div>
                    <p class="card-detail"><strong>Event Date:</strong> ${new Date(entity.eventDate).toLocaleDateString(navigator.language, { timeZone: 'UTC' })}</p>
                    <p class="card-detail"><strong>Contract Date:</strong> ${new Date(entity.contractDate).toLocaleDateString(navigator.language, { timeZone: 'UTC' })}</p>
                </div>
                <div class="card-footer">
                    <p class="card-cost">Total: $${totalCost}</p>
                </div>`;
    } else if (entityType === 'template') {
        return `<div class="card-header">
                    <h3>${entity.name}</h3>
                    <div class="card-actions">${notesIcon} ${moreActions}</div>
                </div>
                <div class="card-body">
                    <p class="card-detail"><strong>Guests:</strong> ~${entity.guestCount || 0}</p>
                    <p class="card-detail"><strong>Items:</strong> ${entity.menuItems?.length || 0}</p>
                    <p class="card-detail"><strong>Services:</strong> ${entity.services?.length || 0}</p>
                </div>`;
    }
    return '';
}

function getProposalWarningHTML(proposal) {
    const constraints = proposal.constraints || [];
    if (constraints.length === 0) return '';
    const violations = (proposal.menuItems || []).filter(item => (item.dietaryTags || []).some(tag => constraints.includes(tag)));
    return violations.length > 0 ? `<div class="warning-icon" title="This proposal has dietary restriction violations.">⚠️</div>` : '';
}

function getEventWarningHTML(event) {
    const missingFields = [];
    if (!event.eventStartTime) missingFields.push('Start Time');
    if (event.eventDuration == null || event.eventDuration <= 0) missingFields.push('Event Duration');
    if (event.preEventDuration == null) missingFields.push('Setup Duration');
    if (event.postEventDuration == null) missingFields.push('Cleanup Duration');

    if (missingFields.length > 0) {
        return `<div class="warning-icon" title="Missing Details: ${missingFields.join(', ')}">⚠️</div>`;
    }
    return '';
}