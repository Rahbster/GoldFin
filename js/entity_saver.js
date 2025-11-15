import { appViewModel } from './app_viewmodel.js';
import { renderCalendar } from './calendar.js';
import { renderEvents } from './event_renderer.js';
import { renderContracts } from './contract_renderer.js';
import { renderTemplates } from './template_renderer.js';
import { addEvent, updateEvent, updateDocument } from './firebase_sync.js';
import { loadEvents, saveEvents, loadTemplates, saveTemplates, loadContracts, saveContracts } from './data_manager.js';
import { tempProposalState } from './proposal_editor_state.js';

export async function saveEntity(context, closeEditorCallback) {
    const isTemplate = context.isTemplateEdit;
    const isEditingProposal = context.isEditingProposalOption || context.isAddingProposalOption;

    // When editing a proposal, the client/event fields aren't in the DOM, so get them from the context.
    const clientName = isEditingProposal
        ? context.event.clientName
        : document.getElementById('client-name').value;

    const eventDate = isEditingProposal
        ? context.event.eventDate : (isTemplate ? '' : document.getElementById('event-date').value);
    
    const eventLocation = isEditingProposal
        ? context.event.eventLocation : (isTemplate ? '' : document.getElementById('event-location').value);

    const guestCount = document.getElementById('guest-count').value;
    const eventDescription = document.getElementById('event-description').value;
    const constraints = tempProposalState.constraints || [];
    const clientPhone = isTemplate ? '' : document.getElementById('client-phone').value;
    const clientContact = isTemplate ? '' : document.getElementById('client-contact').value;
    const eventStartTime = isTemplate ? '' : document.getElementById('event-start-time').value;
    const eventDuration = isTemplate ? 0 : parseFloat(document.getElementById('event-duration').value) || 0;
    const preEventDuration = isTemplate ? 0 : parseFloat(document.getElementById('pre-event-duration').value) || 0;
    const postEventDuration = isTemplate ? 0 : parseFloat(document.getElementById('post-event-duration').value) || 0;

    // Get content from Quill editors passed in the context
    const internalNotes = context.notesQuillInstance.root.innerHTML;
    const termsAndConditions = context.termsQuillInstance ? context.termsQuillInstance.root.innerHTML : (context.event?.termsAndConditions || '');

    if (!isTemplate && (!clientName || !eventDate)) {
        alert('Please fill out at least the Client Name and Event Date.');
        return;
    }

    const formData = {
        clientName, guestCount, internalNotes, eventDescription, constraints,
        clientPhone, clientContact, eventDate, eventLocation, eventStartTime, eventDuration, termsAndConditions,
        preEventDuration, postEventDuration,
        menuItems: tempProposalState.menuItems,
        services: tempProposalState.services
    };

    if (appViewModel.isCloudMode) {
        if (context.isCreatingEvent || context.isCreatingFromTemplate) {
            const newEvent = { createdAt: new Date().toISOString(), proposals: [], notes: formData.internalNotes };
            applyEventDataToEntity(newEvent, formData);
            if (context.isCreatingFromTemplate) {
                const newProposal = { id: `prop_${Date.now()}`, name: 'Option A (from Template)', status: 'Draft' };
                applyProposalDataToEntity(newProposal, formData);
                newEvent.proposals.push(newProposal);
            }
            await addEvent(newEvent);
        } else {
            if (context.isContractEdit) {
                const contractToUpdate = JSON.parse(JSON.stringify(context.contract));
                // Apply form data
                contractToUpdate.clientName = formData.clientName;
                contractToUpdate.eventDescription = formData.eventDescription;
                contractToUpdate.notes = formData.internalNotes;
                contractToUpdate.termsAndConditions = formData.termsAndConditions;
                // Apply updated menu items and services from tempProposalState
                contractToUpdate.menuItems = tempProposalState.menuItems;
                contractToUpdate.services = tempProposalState.services;

                await updateDocument('contracts', contractToUpdate.id, contractToUpdate);
                if (context.onSaveCallback) {
                    context.onSaveCallback(appViewModel.appData.contracts.find(c => c.id === contractToUpdate.id));
                }
            } else { // Existing logic for events/proposals
                const eventToUpdate = JSON.parse(JSON.stringify(context.event));
                if (context.isEditingEventDetails) {
                    applyEventDataToEntity(eventToUpdate, formData);
                    eventToUpdate.notes = formData.internalNotes;
                    eventToUpdate.termsAndConditions = formData.termsAndConditions;
                } else if (context.isAddingProposalOption) {
                    const newProposal = { id: `prop_${Date.now()}`, status: 'Draft', name: document.getElementById('proposal-name').value };
                    applyProposalDataToEntity(newProposal, formData);
                    eventToUpdate.proposals.push(newProposal);
                } else if (context.isEditingProposalOption) {
                    const propIndex = eventToUpdate.proposals.findIndex(p => p.id === context.proposal.id);
                    applyProposalDataToEntity(eventToUpdate.proposals[propIndex], formData);
                    eventToUpdate.proposals[propIndex].name = document.getElementById('proposal-name').value;
                }
                await updateEvent(eventToUpdate.id, eventToUpdate);
                if (context.onSaveCallback) {
                    // Find the latest version of the event to pass back
                    context.onSaveCallback(appViewModel.appData.events.find(e => e.id === eventToUpdate.id));
                }
            }
        }
        // TODO: Handle saving templates in cloud mode
    } else {
        // --- LOCAL MODE ---
        const events = loadEvents();
        if (context.isEditingEventDetails) {
            const eventIndex = events.findIndex(e => e.id === context.event.id);
            applyEventDataToEntity(events[eventIndex], formData);
            events[eventIndex].notes = formData.internalNotes;
            events[eventIndex].termsAndConditions = formData.termsAndConditions;
        } else if (context.isCreatingEvent || context.isCreatingFromTemplate) {
            const newEvent = { id: `evt_${Date.now()}`, createdAt: new Date().toISOString(), proposals: [], notes: formData.internalNotes };
            applyEventDataToEntity(newEvent, formData);
            if (context.isCreatingFromTemplate) {
                const newProposal = { id: `prop_${Date.now()}`, name: 'Option A (from Template)', status: 'Draft' };
                applyProposalDataToEntity(newProposal, formData);
                newEvent.proposals.push(newProposal);
            }
            events.push(newEvent);
        } else if (context.isAddingProposalOption) {
            const eventIndex = events.findIndex(e => e.id === context.event.id);
            const newProposal = { id: `prop_${Date.now()}`, status: 'Draft', name: document.getElementById('proposal-name').value };
            applyProposalDataToEntity(newProposal, formData);
            events[eventIndex].proposals.push(newProposal);
        } else if (context.isEditingProposalOption) {
            const eventIndex = events.findIndex(e => e.id === context.event.id);
            const propIndex = events[eventIndex].proposals.findIndex(p => p.id === context.proposal.id);
            applyProposalDataToEntity(events[eventIndex].proposals[propIndex], formData);
            events[eventIndex].proposals[propIndex].name = document.getElementById('proposal-name').value;
        } else if (context.isTemplateEdit) {
            // ... (rest of the logic)
        }
        saveEvents(events);
        if (context.onSaveCallback) {
            const templates = loadTemplates();
            const templateIndex = templates.findIndex(t => t.id === context.template.id);
            const templateToUpdate = templates[templateIndex];
            templateToUpdate.name = formData.clientName;
            templateToUpdate.eventDescription = formData.eventDescription;
            templateToUpdate.guestCount = parseInt(formData.guestCount, 10) || 0;
            templateToUpdate.termsAndConditions = formData.termsAndConditions;
            applyProposalDataToEntity(templates[templateIndex], formData);
            saveTemplates(templates);
            context.onSaveCallback(events.find(e => e.id === context.event.id));
        } else if (context.isContractEdit) {
            const contracts = loadContracts();
            const contractIndex = contracts.findIndex(c => c.contractId === context.contract.contractId);
            // Apply menu items and services from tempProposalState
            Object.assign(contracts[contractIndex], { menuItems: tempProposalState.menuItems, services: tempProposalState.services });
            applyEventDataToEntity(contracts[contractIndex], formData);
            applyProposalDataToEntity(contracts[contractIndex], formData);
            saveContracts(contracts);
            if (context.onSaveCallback) {
                context.onSaveCallback(contracts[contractIndex]);
            }
        }
    }

    closeEditorCallback();
    if (!appViewModel.isCloudMode) {
        renderEvents(loadEvents());
        renderContracts(loadContracts());
        renderTemplates(loadTemplates());
        renderCalendar(appViewModel.appData);
    }
}

function applyEventDataToEntity(eventEntity, formData) {
    const { clientName, eventDescription, constraints, guestCount, clientPhone, clientContact, eventDate, eventLocation, eventStartTime, eventDuration, preEventDuration, postEventDuration, termsAndConditions } = formData;
    Object.assign(eventEntity, { clientName, eventDescription, constraints, guestCount: parseInt(guestCount, 10) || 0, clientPhone, clientContact, eventDate, eventLocation, eventStartTime, eventDuration, preEventDuration, postEventDuration, termsAndConditions });
    if (tempProposalState.customerId) eventEntity.customerId = tempProposalState.customerId;
}

function applyProposalDataToEntity(proposalEntity, formData) {
    const { internalNotes, menuItems, services } = formData;
    Object.assign(proposalEntity, { notes: internalNotes, menuItems, services });
}