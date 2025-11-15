import { loadEvents, saveEvents, loadContracts, saveContracts, loadTemplates, loadCustomers } from '../data_manager.js';
import { showMenuItemManager } from '../menu_item_manager.js';
import { showServiceManager } from '../service_manager.js';
import { showConstraintTagManager } from '../constraint_manager.js';
import { showSymbolPaletteManager } from '../symbol_manager.js';
import { showProposalCreator } from '../proposal_creator.js';
import { showToast, showConfirmationModal, registerModal, closeTopModal } from '../ui.js';
import { appViewModel } from '../app_viewmodel.js';
import { renderEvents } from '../event_renderer.js';
import { renderContracts } from '../contract_renderer.js';
import { renderTemplates } from '../template_renderer.js';
import { updateEvent, updateDocument } from '../firebase_sync.js';

export function showNotesEditor(entity, entityType, parentEvent = null) {
    document.getElementById('notes-editor-modal')?.remove();

    const modalHTML = `
        <div id="notes-editor-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Edit Internal Notes</h2>
                    <button id="close-notes-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body"><div id="notes-quill-editor"></div></div>
                <div class="modal-footer"><button id="save-notes-btn" class="theme-button">Save Notes</button></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'notes-editor-modal';
    registerModal(modalId);

    document.getElementById('close-notes-modal-btn').onclick = closeTopModal;
    document.getElementById('notes-editor-modal').onclick = (e) => {
        if (e.target.id === 'notes-editor-modal') {
            showConfirmationModal('Are you sure you want to close? Any unsaved changes will be lost.', () => {
                closeTopModal();
            });
        }
    };

    const quill = new Quill('#notes-quill-editor', {
        theme: 'snow',
        modules: { toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }]] },
        placeholder: 'Enter internal notes here...'
    });
    quill.root.innerHTML = entity.notes || '';

    document.getElementById('save-notes-btn').onclick = () => {
        const newNotes = quill.root.innerHTML;
        if (appViewModel.isCloudMode) {
            const updatedEntity = { ...entity, notes: newNotes };
            if (entityType === 'proposal' && parentEvent) {
                const updatedParentEvent = { ...parentEvent };
                const proposalIndex = updatedParentEvent.proposals.findIndex(p => p.id === entity.id);
                if (proposalIndex > -1) {
                    updatedParentEvent.proposals[proposalIndex].notes = newNotes;
                    updateEvent(updatedParentEvent.id, updatedParentEvent);
                }
            } else if (entityType === 'event') {
                updateEvent(entity.id, updatedEntity);
            } else {
                updateDocument(entityType + 's', entity.id, updatedEntity);
            }
        } else {
            // Local mode logic remains the same
            if (entityType === 'proposal' && parentEvent) {
                const allEvents = loadEvents();
                const eventIndex = allEvents.findIndex(e => e.id === parentEvent.id);
                if (eventIndex > -1) {
                    const proposalIndex = allEvents[eventIndex].proposals.findIndex(p => p.id === entity.id);
                    if (proposalIndex > -1) {
                        allEvents[eventIndex].proposals[proposalIndex].notes = newNotes;
                        saveEvents(allEvents);
                        renderEvents(allEvents);
                    }
                }
            } else {
                const dataMap = {
                    'contract': { items: loadContracts(), save: saveContracts, render: renderContracts, findKey: 'contractId' },
                    'customer': { items: loadCustomers(), save: saveCustomers, render: () => {} },
                    'template': { items: loadTemplates(), save: saveTemplates, render: renderTemplates, findKey: 'id' }
                };
                const { items, save, render, findKey } = dataMap[entityType] || {};
                if (items) {
                    const itemIndex = items.findIndex(item => item[findKey || 'id'] === entity.id);
                    if (itemIndex > -1) {
                        items[itemIndex].notes = newNotes;
                        save(items);
                        if (render) render();
                    }
                }
            }
        }
        showToast('Notes updated!', 'info');
        closeTopModal();
    };
}

export function showLibraryChoiceModal() {
    if (document.getElementById('choice-modal')) return;

    const modalHTML = `
        <div id="choice-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>Manage Library</h2>
                    <button id="close-choice-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body library-choice-body">
                    <div class="library-choice-group">
                        <h4>Proposal Content</h4>
                        <button id="manage-menu-items-btn" class="theme-button">Menu Items</button>
                        <button id="manage-services-btn" class="theme-button">Services</button>
                    </div>
                    <div class="library-choice-group">
                        <h4>Configuration</h4>
                        <button id="manage-constraint-tags-btn" class="theme-button">Dietary Restrictions</button>
                        <button id="manage-symbols-btn" class="theme-button">Symbols</button>
                    </div>
                    <div class="library-choice-group">
                        <h4>Utilities</h4>
                        <button id="quick-setup-btn" class="theme-button secondary-button">Quick Setup / Import</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'choice-modal';
    registerModal(modalId);

    document.getElementById('choice-modal').onclick = (e) => { if (e.target.id === 'choice-modal') closeTopModal(); };
    document.getElementById('close-choice-modal-btn').onclick = closeTopModal;
    document.getElementById('manage-menu-items-btn').onclick = showMenuItemManager;
    document.getElementById('manage-services-btn').onclick = showServiceManager;
    document.getElementById('manage-constraint-tags-btn').onclick = showConstraintTagManager;
    document.getElementById('manage-symbols-btn').onclick = showSymbolPaletteManager;
    document.getElementById('quick-setup-btn').onclick = () => { closeTopModal(); appViewModel.appData.showLibraryImporter(); };
}

export function showAddProposalOptionChoiceModal(event, onUpdateCallback = null) {
    if (document.getElementById('choice-modal')) return;

    const modalHTML = `
        <div id="choice-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>Add Proposal Option</h2>
                    <button id="close-choice-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body button-row" style="justify-content: center; gap: 1rem;">
                    <button id="blank-proposal-option-btn" class="theme-button">Blank Option</button>
                    <button id="from-template-option-btn" class="theme-button">From Template</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'choice-modal';
    registerModal(modalId);

    document.getElementById('choice-modal').onclick = (e) => { if (e.target.id === 'choice-modal') closeTopModal(); };
    document.getElementById('close-choice-modal-btn').onclick = closeTopModal;
    document.getElementById('blank-proposal-option-btn').onclick = () => { closeTopModal(); showProposalCreator(event, false, false, null, onUpdateCallback); };
    document.getElementById('from-template-option-btn').onclick = () => { closeTopModal(); showTemplateSelectorModal(event, onUpdateCallback); };
}

export function showNewProposalChoiceModal(defaults = {}) {
    if (document.getElementById('choice-modal')) return;

    const modalHTML = `
        <div id="choice-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>Create New Proposal</h2>
                    <button id="close-choice-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body button-row" style="justify-content: center; gap: 1rem;">
                    <button id="blank-proposal-btn" class="theme-button">Blank Proposal</button>
                    <button id="from-template-btn" class="theme-button">From Template</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'choice-modal';
    registerModal(modalId);

    document.getElementById('choice-modal').onclick = (e) => { if (e.target.id === 'choice-modal') closeTopModal(); };
    document.getElementById('close-choice-modal-btn').onclick = closeTopModal;
    document.getElementById('blank-proposal-btn').onclick = () => { closeTopModal(); showProposalCreator(defaults); };
    document.getElementById('from-template-btn').onclick = () => { closeTopModal(); showTemplateSelectorModal(defaults); };
}

export async function showTemplateSelectorModal(context = {}, onUpdateCallback = null) {
    const templates = appViewModel.appData.templates;
    const isEventContext = !!context.proposals;

    let listHTML = '<p>No templates saved yet.</p>';
    if (templates.length > 0) {
        listHTML = templates.map(template => `<div class="item-selector-item" data-template-id="${template.id}"><strong>${template.name}</strong></div>`).join('');
    }

    const modalHTML = `
        <div id="item-selector-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header"><h2>Select a Template</h2><button id="close-item-selector-btn" class="close-button">&times;</button></div>
                <div class="modal-body item-selector-list">${listHTML}</div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'item-selector-modal';
    registerModal(modalId);

    document.getElementById('close-item-selector-btn').onclick = closeTopModal;
    document.getElementById('item-selector-modal').onclick = (e) => { if (e.target.id === 'item-selector-modal') closeTopModal(); };

    document.querySelectorAll('.item-selector-item').forEach(item => {
        item.onclick = async () => {
            const template = templates.find(t => t.id === item.dataset.templateId);
            closeTopModal();
            if (isEventContext) {
                const event = context;
                const newProposal = {
                    id: `prop_${Date.now()}`,
                    name: template.name,
                    status: 'Draft',
                    menuItems: template.menuItems || [],
                    services: template.services || [],
                    notes: template.notes || '',
                    sortOrder: updatedEvent.proposals.length // Assign initial sort order
                };
                const updatedEvent = { ...event, proposals: [...event.proposals, newProposal] };

                if (appViewModel.isCloudMode) {
                    await updateEvent(updatedEvent.id, updatedEvent);
                } else {
                    saveEvents(loadEvents().map(e => e.id === event.id ? updatedEvent : e));
                    renderEvents(loadEvents());
                }
                if (onUpdateCallback) {
                    onUpdateCallback(appViewModel.appData.events.find(e => e.id === updatedEvent.id) || updatedEvent);
                }
                showToast('Proposal option added from template!', 'info');
            } else {
                const mergedData = { ...template, ...context };
                showProposalCreator(mergedData, true, true);
            }
        };
    });
}