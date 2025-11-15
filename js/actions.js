import { showProposalCreator } from './proposal_creator.js';
import { loadEvents, saveEvents, loadContracts, saveContracts, loadTemplates, saveTemplates, loadBusinessDetails } from './data_manager.js';
import { showToast } from './ui.js';
import { appViewModel } from './app_viewmodel.js';
import { renderEvents } from './event_renderer.js';
import { renderContracts } from './contract_renderer.js';
import { renderTemplates } from './template_renderer.js'; // Keep this import
import { 
    updateEvent, deleteEvent, 
    addDocument, updateDocument, deleteDocument
} from './firebase_sync.js';
import { showPrintableView, showBEOView } from './print_view.js';
import { calculateProposalCost } from './utils.js';

/**
 * Creates and displays a context menu for proposal card actions.
 * @param {HTMLElement} buttonElement - The button that was clicked.
 * @param {object} proposal - The proposal object associated with the card.
 * @param {object} event - The parent event of the proposal.
 */
export function showActionsMenu(buttonElement, proposal, event) {
    const contracts = appViewModel.state.contracts;
    const hasContract = contracts.some(c => c.proposalId === proposal.id && c.eventId === event.id);

    // Close any existing menus first
    document.querySelectorAll('.actions-menu').forEach(menu => menu.remove());

    const menu = document.createElement('div');
    menu.className = 'actions-menu';

    // Add Edit Action
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => {
        showProposalCreator(event, false, false, proposal.id);
    };
    menu.appendChild(editBtn);

    // Add Duplicate Action
    const duplicateBtn = document.createElement('button');
    duplicateBtn.textContent = 'Duplicate';
    duplicateBtn.onclick = async () => {
        const proposalToDuplicate = event.proposals.find(p => p.id === proposal.id);
        const newProposal = JSON.parse(JSON.stringify(proposalToDuplicate));
        newProposal.id = `prop_${Date.now()}`;
        newProposal.name = `${proposalToDuplicate.name} (Copy)`;
        newProposal.status = 'Draft';

        const updatedEvent = JSON.parse(JSON.stringify(event));
        updatedEvent.proposals.push(newProposal);

        if (appViewModel.isCloudMode) { // Use appViewModel.isCloudMode
            await updateEvent(updatedEvent.id, updatedEvent);
        } else {
            const events = loadEvents();
            const eventIndex = events.findIndex(e => e.id === event.id);
            events[eventIndex] = updatedEvent;
            saveEvents(events);
            appViewModel.state.events = events; // Trigger reactivity
        }
        showToast('Proposal option duplicated!', 'info');
    };
    menu.appendChild(duplicateBtn);

    // Add Save as Template Action
    const templateBtn = document.createElement('button');
    templateBtn.textContent = 'Save as Template';
    templateBtn.onclick = () => createTemplateFromProposal(proposal, event);
    menu.appendChild(templateBtn);

    // Add Print / PDF Action
    const printBtn = document.createElement('button');
    printBtn.textContent = 'Print / PDF';
    printBtn.onclick = () => showPrintableView({ ...event, ...proposal });
    menu.appendChild(printBtn);

    // Add Status Change Actions
    const currentStatus = proposal.status || 'Draft';
    const statusActions = document.createElement('div');
    statusActions.className = 'actions-menu-divider'; // A visual separator
    menu.appendChild(statusActions);

    if (currentStatus === 'Draft') {
        const markSentBtn = document.createElement('button');
        markSentBtn.textContent = 'Mark as Sent';
        markSentBtn.onclick = () => updateProposalStatus(event.id, proposal.id, 'Sent');
        menu.appendChild(markSentBtn);
    }

    if (currentStatus === 'Sent') {
        const markApprovedBtn = document.createElement('button');
        markApprovedBtn.textContent = 'Mark as Approved';
        markApprovedBtn.onclick = () => updateProposalStatus(event.id, proposal.id, 'Approved');
        menu.appendChild(markApprovedBtn);
        const revertToDraftBtn = document.createElement('button');
        revertToDraftBtn.textContent = 'Revert to Draft';
        revertToDraftBtn.onclick = () => updateProposalStatus(event.id, proposal.id, 'Draft');
        menu.appendChild(revertToDraftBtn);
    }

    if (currentStatus === 'Approved' && !hasContract) {
        const revertToSentBtn = document.createElement('button');
        revertToSentBtn.textContent = 'Revert to Sent';
        revertToSentBtn.onclick = () => updateProposalStatus(event.id, proposal.id, 'Sent');
        menu.appendChild(revertToSentBtn);
    }

    // Add Generate Contract Action (if applicable)
    if (!hasContract) {
        const contractBtn = document.createElement('button');
        contractBtn.textContent = 'Generate Contract';
        contractBtn.onclick = () => {
            if (confirm(`Generate a contract for "${event.clientName}" based on "${proposal.name}"?`)) {
                generateContractFromProposal(event.id, proposal.id);
            }
        };
        menu.appendChild(contractBtn);
    }

    // Add Delete Action
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-action';
    deleteBtn.onclick = async () => {
        if (confirm(`Are you sure you want to delete the proposal option "${proposal.name}"?`)) {
            const updatedEvent = JSON.parse(JSON.stringify(event));
            updatedEvent.proposals = updatedEvent.proposals.filter(p => p.id !== proposal.id);
            if (appViewModel.isCloudMode) { // Use appViewModel.isCloudMode
                await updateEvent(updatedEvent.id, updatedEvent);
            } else {
                const events = loadEvents();
                const eventIndex = events.findIndex(e => e.id === event.id);
                events[eventIndex] = updatedEvent;
                saveEvents(events);
                appViewModel.state.events = events; // Trigger reactivity
            }
        }
    };
    menu.appendChild(deleteBtn);

    document.body.appendChild(menu);
    const rect = buttonElement.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.right + window.scrollX - menu.offsetWidth}px`;

    // Add a listener to close the menu when clicking elsewhere
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

/**
 * Updates the order of proposals within an event.
 * @param {string} eventId - The ID of the parent event.
 * @param {number} oldIndex - The original index of the dragged proposal.
 * @param {number} newIndex - The new index of the dragged proposal.
 */
export async function updateProposalOrder(eventId, oldIndex, newIndex) {
    const events = appViewModel.state.events;
    const eventIndex = events.findIndex(e => e.id === eventId);

    if (eventIndex > -1) {
        const updatedEvent = JSON.parse(JSON.stringify(events[eventIndex])); // Deep copy
        const [movedProposal] = updatedEvent.proposals.splice(oldIndex, 1);
        updatedEvent.proposals.splice(newIndex, 0, movedProposal);

        // Update sortOrder property for all proposals in the event
        updatedEvent.proposals.forEach((p, idx) => p.sortOrder = idx);

        if (appViewModel.isCloudMode) {
            await updateEvent(updatedEvent.id, updatedEvent);
        } else {
            const allEvents = loadEvents(); // Load fresh for local mode
            const localEventIndex = allEvents.findIndex(e => e.id === eventId);
            if (localEventIndex > -1) {
                allEvents[localEventIndex] = updatedEvent;
                saveEvents(allEvents);
                appViewModel.state.events = allEvents; // Trigger reactivity
            }
        }
        showToast('Proposal order updated!', 'info');
    }
}

export function showContractActionsMenu(buttonElement, contract) {
    // Close any existing menus first
    document.querySelectorAll('.actions-menu').forEach(menu => menu.remove());

    const menu = document.createElement('div');
    menu.className = 'actions-menu';

    // Action: View Details
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit Details';
    editBtn.onclick = () => showProposalCreator(contract); // Open the main editor
    menu.appendChild(editBtn);

    // Add Archive/Unarchive button
    const archiveBtn = document.createElement('button');
    if (contract.isArchived) {
        archiveBtn.textContent = 'Unarchive Contract';
        archiveBtn.onclick = () => toggleArchiveStatus(contract.eventId, false);
    } else {
        archiveBtn.textContent = 'Archive Contract';
        archiveBtn.onclick = () => {
            if (confirm(`Are you sure you want to archive the contract for "${contract.clientName}"? The associated event will also be archived.`)) {
                toggleArchiveStatus(contract.eventId, true);
            }
        };
    }
    menu.appendChild(archiveBtn);

    // Action: Print / Save as PDF
    const printBtn = document.createElement('button');
    printBtn.textContent = 'View / Print Contract';
    printBtn.onclick = () => showPrintableView(contract);
    menu.appendChild(printBtn);

    // Action: BEO / Prep Sheet
    const beoBtn = document.createElement('button');
    beoBtn.textContent = 'View BEO / Prep Sheet';
    beoBtn.onclick = () => showBEOView(contract);
    menu.appendChild(beoBtn);

    const currentStatus = contract.status || 'Sent';
    const statusMap = {
        'Sent': 'Mark Accepted',
        'Accepted': 'Mark Deposit Paid',
        'Deposit Paid': 'Mark Completed',
        'Completed': 'Mark Paid In Full'
    };
    const nextStatusAction = Object.keys(statusMap).find(s => s === currentStatus);

    if (nextStatusAction) {
        const fullActionText = statusMap[nextStatusAction];
        // Correctly extract the full status name, e.g., "Paid In Full" from "Mark Paid In Full"
        const nextStatus = fullActionText.replace('Mark as ', '').replace('Mark ', '');
        const actionBtn = document.createElement('button');
        actionBtn.textContent = statusMap[nextStatusAction];
        actionBtn.onclick = () => updateContractStatus(contract.contractId, nextStatus);
        menu.appendChild(actionBtn);
    }
    
    // Add revert options (This logic is now correctly outside the 'if' block above)
    const revertStatusMap = {
        'Paid': 'Completed', // Add this line to handle the incorrect legacy status
        'Paid In Full': 'Completed',
        'Completed': 'Deposit Paid',
        'Deposit Paid': 'Accepted',
        'Accepted': 'Sent'
    };
    const previousStatus = revertStatusMap[currentStatus];
    if (previousStatus) {
        const revertBtn = document.createElement('button');
        revertBtn.textContent = `Revert to ${previousStatus}`;
        revertBtn.onclick = () => updateContractStatus(contract.contractId, previousStatus);
        menu.appendChild(revertBtn);
    }

    // Action: Delete Contract
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-action';
    deleteBtn.onclick = () => {
        if (confirm(`Are you sure you want to delete the contract for "${contract.clientName}"? This action cannot be undone.`)) {
            if (appViewModel.isCloudMode) {
                deleteDocument('contracts', contract.id);
            } else {
                const updatedContracts = loadContracts().filter(c => c.contractId !== contract.contractId);
                saveContracts(updatedContracts);
                appViewModel.state.contracts = updatedContracts; // Trigger reactivity
                appViewModel.state.events = loadEvents(); // Trigger reactivity for events
            }
            // Real-time listener will handle UI update in cloud mode
            showToast('Contract deleted successfully.', 'info');
        }
    };
    menu.appendChild(deleteBtn);

    document.body.appendChild(menu);
    const rect = buttonElement.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.right + window.scrollX - menu.offsetWidth}px`;

    // Add a listener to close the menu when clicking elsewhere
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

export function showTemplateActionsMenu(buttonElement, template) {
    // Close any existing menus first
    document.querySelectorAll('.actions-menu').forEach(menu => menu.remove());

    const menu = document.createElement('div');
    menu.className = 'actions-menu';

    // Action: Create Proposal from Template
    const createBtn = document.createElement('button');
    createBtn.textContent = 'Create Event';
    createBtn.onclick = () => showProposalCreator(template, true, true); // isCreatingFromTemplate, isCreatingEvent
    menu.appendChild(createBtn);

    // Action: Edit Template
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit Template';
    editBtn.onclick = () => showProposalCreator(template, false, false); // Not from template, not creating event
    menu.appendChild(editBtn);

    // Action: Duplicate Template
    const duplicateBtn = document.createElement('button');
    duplicateBtn.textContent = 'Duplicate';
    duplicateBtn.onclick = async () => { // Use appViewModel.state.templates
        const templates = appViewModel.appData.templates;
        const templateToDuplicate = templates.find(t => t.id === template.id || t.id === template.id.replace('tmpl_', ''));
        if (!templateToDuplicate) {
            showToast('Error: Could not find template to duplicate.', 'error');
            return;
        }

        const newTemplate = JSON.parse(JSON.stringify(templateToDuplicate));
        // In cloud mode, Firestore generates the ID. In local mode, we do.
        if (!appViewModel.isCloudMode) {
            newTemplate.id = `tmpl_${Date.now()}`;
        } else {
            delete newTemplate.id; // Let Firestore create the ID
        }
        newTemplate.name = `${templateToDuplicate.name} (Copy)`;

        if (appViewModel.isCloudMode) { // Use appViewModel.isCloudMode
            await addDocument('templates', newTemplate);
        } else {
            saveTemplates([...templates, newTemplate]);
            appViewModel.state.templates = loadTemplates(); // Trigger reactivity
        }
        showToast('Template duplicated successfully!', 'info');
    };
    menu.appendChild(duplicateBtn);

    // Action: Delete Template
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-action';
    deleteBtn.onclick = async () => {
        if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
            if (appViewModel.isCloudMode) { // Use appViewModel.isCloudMode
                await deleteDocument('templates', template.id);
            } else {
                const updatedTemplates = loadTemplates().filter(t => t.id !== template.id);
                saveTemplates(updatedTemplates);
                appViewModel.state.templates = updatedTemplates; // Trigger reactivity
            }
        }
    };
    menu.appendChild(deleteBtn);

    document.body.appendChild(menu);
    const rect = buttonElement.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.right + window.scrollX - menu.offsetWidth}px`;

    // Add a listener to close the menu when clicking elsewhere
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

export function showEventActionsMenu(buttonElement, event, onUpdateCallback = null) {
    // Close any existing menus first
    document.querySelectorAll('.actions-menu').forEach(menu => menu.remove());

    const menu = document.createElement('div');
    menu.className = 'actions-menu';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit Event Details';
    editBtn.onclick = () => showProposalCreator(event, false, false, null, onUpdateCallback, true); // Pass the callback
    menu.appendChild(editBtn);

    // Add Archive/Unarchive button
    const archiveBtn = document.createElement('button');
    if (event.isArchived) {
        archiveBtn.textContent = 'Unarchive Event';
        archiveBtn.onclick = () => toggleArchiveStatus(event, false);
    } else {
        archiveBtn.textContent = 'Archive Event';
        archiveBtn.onclick = () => {
            if (confirm(`Are you sure you want to archive the event for "${event.clientName}"? It will be hidden from the main list.`)) {
                toggleArchiveStatus(event, true);
            }
        };
    }
    menu.appendChild(archiveBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete Event';
    deleteBtn.className = 'delete-action';
    deleteBtn.onclick = async () => {
        // --- NEW: Check for associated contracts before deleting ---
        const hasContract = appViewModel.state.contracts.some(c => c.eventId === event.id);
        if (hasContract) {
            showToast('Cannot delete this event because it has an associated contract. Please delete the contract first.', 'error');
            return; // Abort the deletion
        }

        if (confirm(`Are you sure you want to delete the entire event for "${event.clientName}"? This will delete all proposal options within it.`)) {
            if (appViewModel.isCloudMode) {
                await deleteEvent(event.id);
            } else {
                const updatedEvents = loadEvents().filter(e => e.id !== event.id); // Load fresh for local mode
                saveEvents(updatedEvents);
                renderEvents(updatedEvents);
            }
        }
    };
    menu.appendChild(deleteBtn);

    document.body.appendChild(menu);
    const rect = buttonElement.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.right + window.scrollX - menu.offsetWidth}px`;

    // Add a listener to close the menu when clicking elsewhere
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

async function updateProposalStatus(eventId, proposalId, newStatus) {
    const events = appViewModel.appData.events; // Use in-memory data for cloud mode
    const event = JSON.parse(JSON.stringify(events.find(e => e.id === eventId))); // Deep copy
    if (event) {
        const proposal = event.proposals.find(p => p.id === proposalId);
        if (proposal) {
            proposal.status = newStatus;
            if (appViewModel.isCloudMode) {
                await updateEvent(event.id, event);
            } else {
                const allEvents = loadEvents();
                const eventIndex = allEvents.findIndex(e => e.id === eventId);
                allEvents[eventIndex] = event;
                saveEvents(allEvents);
                appViewModel.state.events = allEvents; // Trigger reactivity
            }
            showToast(`Proposal marked as ${newStatus}.`, 'info');
        }
    }
}

async function toggleArchiveStatus(eventId, isArchived) {
    const allEvents = appViewModel.state.events;
    const eventToUpdate = allEvents.find(e => e.id === eventId);
    if (eventToUpdate) {
        eventToUpdate.isArchived = isArchived;
        if (appViewModel.isCloudMode) {
            await updateEvent(eventToUpdate.id, eventToUpdate);
        }
    }

    // Now, find and update the corresponding contract, if it exists
    const allContracts = appViewModel.state.contracts;
    const contractToUpdate = allContracts.find(c => c.eventId === eventId);
    if (contractToUpdate) {
        contractToUpdate.isArchived = isArchived;
        if (appViewModel.isCloudMode) {
            await updateDocument('contracts', contractToUpdate.id, contractToUpdate);
        }
    }

    // In local mode, we need to save the updated arrays back to localStorage
    if (!appViewModel.isCloudMode) {
        saveEvents(allEvents);
        saveContracts(allContracts);
    }

    // Trigger reactivity by re-assigning the state. This is necessary for local mode and ensures UI consistency.
    appViewModel.state.events = [...allEvents];
    appViewModel.state.contracts = [...allContracts];

    showToast(`Items have been ${isArchived ? 'archived' : 'unarchived'}.`, 'info');
}

async function createTemplateFromProposal(proposal, event) {
    const templateName = prompt("Enter a name for this template:");
    if (!templateName) return;

    // Create a sanitized template object from the proposal
    const newTemplate = {
        name: templateName,
        eventDescription: event.eventDescription || '',
        notes: proposal.notes || '',
        guestCount: event.guestCount || 0,
        termsAndConditions: proposal.termsAndConditions || loadBusinessDetails().termsAndConditions,
        menuItems: JSON.parse(JSON.stringify(proposal.menuItems || [])),
        services: JSON.parse(JSON.stringify(proposal.services || []))
    };

    if (appViewModel.isCloudMode) {
        await addDocument('templates', newTemplate);
    } else {
        newTemplate.id = `tmpl_${Date.now()}`;
        const templates = loadTemplates();
        templates.push(newTemplate);
        saveTemplates(templates);
    }

    showToast(`Template "${templateName}" saved successfully!`, 'info');
}

async function generateContractFromProposal(eventId, proposalId) {
    const allEvents = appViewModel.state.events; // Use appViewModel.state
    const event = allEvents.find(e => e.id === eventId);
    if (!event) { alert('Error: Event not found.'); return; }

    // --- DIAGNOSTIC LOGGING ---
    console.log('Validating event data before contract generation:', event);

    // --- NEW: Data Validation with specific feedback ---
    const missingFields = [];
    if (!event.eventStartTime) missingFields.push('Start Time'); // An empty string is falsy, which is correct here.
    if (event.eventDuration == null || event.eventDuration <= 0) missingFields.push('Event Duration'); // Must be a positive number.
    if (event.preEventDuration == null) missingFields.push('Setup Duration'); // 0 is a valid value.
    if (event.postEventDuration == null) missingFields.push('Cleanup Duration'); // 0 is a valid value.

    if (missingFields.length > 0) {
        showToast(`Cannot generate contract. Missing: ${missingFields.join(', ')}.`, 'error');
        return; // Stop execution.
    }

    const proposalToConvert = event.proposals.find(p => p.id === proposalId);
    if (!proposalToConvert) { alert('Error: Proposal not found.'); return; }

    const totalCost = calculateProposalCost(proposalToConvert);

    const newContract = {
        // --- Explicitly copy event-level details ---
        clientName: event.clientName,
        customerId: event.customerId,
        eventDate: event.eventDate,
        eventLocation: event.eventLocation,
        eventDescription: event.eventDescription,
        eventStartTime: event.eventStartTime,
        eventDuration: event.eventDuration,
        preEventDuration: event.preEventDuration,
        postEventDuration: event.postEventDuration,
        guestCount: event.guestCount,
        constraints: event.constraints,
        termsAndConditions: event.termsAndConditions, // CRITICAL: Take formatted T&C from the event

        // --- Explicitly copy proposal-specific details ---
        name: proposalToConvert.name,
        menuItems: proposalToConvert.menuItems,
        services: proposalToConvert.services,
        notes: proposalToConvert.notes || '', // Use the proposal's notes, falling back to an empty string

        // --- Add contract-specific details ---
        eventId: event.id,
        proposalId: proposalId,
        contractDate: new Date().toISOString(),
        status: 'Sent', // Default status for a new contract,
        depositAmount: totalCost * 0.5 // Default 50% deposit
    };

    if (appViewModel.isCloudMode) {
        delete newContract.id; // Let firestore create the ID
        await addDocument('contracts', newContract);
    } else {
        newContract.contractId = `cont_${Date.now()}`; // Legacy ID for local mode
        newContract.id = newContract.contractId;
        const contracts = loadContracts();
        contracts.push(newContract); // Add to local array
        saveContracts(contracts); // Save to localStorage
        appViewModel.state.events = loadEvents(); // Trigger reactivity for events
        appViewModel.state.contracts = contracts; // Trigger reactivity for contracts
    }
}

async function updateContractStatus(contractId, newStatus) {
    const contracts = appViewModel.appData.contracts;
    const contractIndex = contracts.findIndex(c => c.id === contractId);
    if (contractIndex > -1) {
        const contractToUpdate = JSON.parse(JSON.stringify(contracts[contractIndex]));
        const oldStatus = contractToUpdate.status || 'Sent';

        // Update the contract object
        contractToUpdate.status = newStatus;

        if (!contracts[contractIndex].statusHistory) {
            contracts[contractIndex].statusHistory = []; // Initialize if it doesn't exist
        }
        // Add the new status change to the history
        contracts[contractIndex].statusHistory.push({
            from: oldStatus,
            to: newStatus,
            date: new Date().toISOString()
        });

        if (appViewModel.isCloudMode) {
            await updateDocument('contracts', contractId, contractToUpdate);
        } else {
            const allContracts = loadContracts();
            const localIndex = allContracts.findIndex(c => c.contractId === contractId);
            allContracts[localIndex] = contractToUpdate;
            saveContracts(allContracts); // Save to localStorage
            appViewModel.state.contracts = allContracts; // Trigger reactivity
        }
        showToast(`Contract marked as ${newStatus}.`, 'info');
    }
}