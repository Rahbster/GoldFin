import { renderAddedItems } from './proposal_editor_ui.js';
import { updateTotalCost, renderWarnings } from './proposal_creator.js';

export let tempProposalState = {};

export function initializeState(initialData) {
    tempProposalState = {
        menuItems: initialData.menuItems || [],
        services: initialData.services || [],
        constraints: initialData.constraints || [],
        customerId: initialData.customerId || null
    };
}

export function updateItem(type, index, property, value) {
    const itemArray = type === 'menu' ? tempProposalState.menuItems : tempProposalState.services;
    if (itemArray[index]) {
        itemArray[index][property] = value;
    }
    updateTotalCost();
    if (type === 'menu') {
        renderWarnings();
    }
}

export function removeItem(type, index) {
    const itemArray = type === 'menu' ? tempProposalState.menuItems : tempProposalState.services;
    if (itemArray[index]) {
        itemArray.splice(index, 1);
    }
    renderAddedItems();
    updateTotalCost();
    renderWarnings();
}

export function checkConstraintViolations() {
    const violations = [];
    const activeConstraints = tempProposalState.constraints || [];
    if (activeConstraints.length === 0) return violations;

    tempProposalState.menuItems.forEach(item => {
        const itemTags = item.dietaryTags || [];
        const conflictingTag = activeConstraints.find(constraint => itemTags.includes(constraint));
        if (conflictingTag) {
            violations.push(`'${item.name}' conflicts with '${conflictingTag}'`);
        }
    });
    return [...new Set(violations)]; // Return unique violation messages
}