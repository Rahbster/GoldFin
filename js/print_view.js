import { loadBusinessDetails } from './data_manager.js';
import { formatTime, calculateProposalCost } from './utils.js';
import { showToast } from './ui.js';

export function showPrintableView(entity) {
    // Remove any existing print view first
    document.getElementById('printable-contract-overlay')?.remove();

    const isContract = !!entity.contractId;
    const totalCost = calculateProposalCost(entity);
    
    // Contract-specific details
    const depositAmount = isContract ? (entity.depositAmount || totalCost * 0.5) : 0;
    const dateIssued = isContract ? new Date(entity.contractDate).toLocaleDateString() : new Date(entity.createdAt).toLocaleDateString();
    const businessDetails = loadBusinessDetails();
    const title = isContract ? 'Catering Contract' : 'Catering Proposal';
    const dateLabel = isContract ? 'Date Issued' : 'Date Created';
    const guestCount = entity.guestCount || 0;
    let costPerPersonHTML = '';
    if (guestCount > 0) {
        const costPerPerson = totalCost / guestCount;
        costPerPersonHTML = `<p><strong>Cost Per Person:</strong> $${costPerPerson.toFixed(2)}</p>`;
    }

    const financialSection = isContract ? `
        <div class="contract-section financial-summary">
            <h3>Financial Summary</h3>
            <p><strong>Total Cost:</strong> $${totalCost.toFixed(2)}</p>
            ${costPerPersonHTML}
            <p><strong>Deposit (50%):</strong> $${depositAmount.toFixed(2)}</p>
        </div>
    ` : `
        <div class="contract-section financial-summary">
            <h3>Financial Summary</h3>
            <p><strong>Estimated Total Cost:</strong> $${totalCost.toFixed(2)}</p>
            ${costPerPersonHTML}
        </div>
    `;

    // Determine if T&C should be shown based on document type and settings
    const shouldShowTerms = (isContract && businessDetails.includeTermsOnPrint) || (!isContract && businessDetails.includeTermsOnProposal);

    // For proposals, the T&C come from the parent event. For contracts, they are on the entity itself.
    // The `entity` object for a proposal is a merge of the event and proposal, so T&C are available on it.
    const termsContent = entity.termsAndConditions;

    const termsAndConditionsSection = shouldShowTerms && termsContent ? `
            <div class="contract-section">
                <h3>Terms & Conditions</h3>
                <div class="terms-content">${termsContent}</div>
            </div>
    ` : '';

    const signatureSection = isContract ? `
        <div class="contract-section signature-section">
            <p>By signing below, both parties agree to the terms and conditions outlined in this contract.</p>
            <div class="signature-lines">
                <div class="signature-line">
                    <span class="signature-field"></span>
                    <label>Client Signature</label>
                </div>
                <div class="signature-line">
                    <span class="signature-field"></span>
                    <label>Date</label>
                </div>
            </div>
            <div class="signature-lines">
                <div class="signature-line">
                    <span class="signature-field"></span>
                    <label>${businessDetails.businessName || 'Company Representative'}</label>
                </div>
                <div class="signature-line">
                    <span class="signature-field"></span>
                    <label>Date</label>
                </div>
            </div>
        </div>
    ` : '';

    const printableHTML = `
        <div id="printable-contract-overlay" class="modal-overlay">
            <div id="printable-contract" class="modal-content">
                <div class="modal-header no-print">
                    <h2>${isContract ? 'Contract' : 'Proposal'} Preview</h2>
                    <div class="print-view-actions">
                        <button id="print-btn" class="theme-button">Print</button>
                    </div>
                    <button id="close-print-view-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="printable-header">
                        ${businessDetails.businessName ? `<h1>${businessDetails.businessName}</h1>` : ''}
                        ${businessDetails.logo ? `<img src="${businessDetails.logo}" alt="Company Logo" style="max-height: 100px; margin-bottom: 1rem;">` : ''}
                        <p>
                            ${businessDetails.address ? `<span>${businessDetails.address}</span><br>` : ''}
                            ${businessDetails.phone ? `<span>${businessDetails.phone}</span> | ` : ''}
                            ${businessDetails.email ? `<span>${businessDetails.email}</span> | ` : ''}
                            ${businessDetails.website ? `<a href="${businessDetails.website}" target="_blank">${businessDetails.website}</a>` : ''}
                        </p>
                        <h1>${title}</h1>
                        <p><strong>${dateLabel}:</strong> ${dateIssued}</p>
                    </div>
                    <div class="contract-section">
                        <h3>Client & Event Details</h3>
                        ${entity.clientName ? `<p><strong>Client:</strong> ${entity.clientName}</p>` : ''}
                        ${entity.clientPhone ? `<p><strong>Phone:</strong> ${entity.clientPhone}</p>` : ''}
                        ${entity.clientContact ? `<p><strong>Email:</strong> ${entity.clientContact}</p>` : ''}
                        ${entity.eventDate ? `<p><strong>Event Date:</strong> ${new Date(entity.eventDate).toLocaleDateString(navigator.language, { timeZone: 'UTC' })}</p>` : ''}
                        ${entity.eventStartTime ? `<p><strong>Start Time:</strong> ${formatTime(entity.eventStartTime)}</p>` : ''}
                        ${entity.guestCount > 0 ? `<p><strong>Guest Count:</strong> ~${entity.guestCount}</p>` : ''}
                        ${entity.eventDescription ? `<p><strong>Description:</strong> ${entity.eventDescription}</p>` : ''}
                    </div>
                    <div class="contract-section">
                        <h3>Menu & Services</h3>
                        <h4>Menu Items:</h4>
                        ${(entity.menuItems || []).map(item => {
                            if (item.itemType === 'group') {
                                let ruleText = '';
                                const { min, max } = item.selectionRule || {};
                                if (min && max && min === max) {
                                    ruleText = `Please select ${min} of the following.`;
                                } else if (min && max) {
                                    ruleText = `Please select ${min} to ${max} of the following.`;
                                } else if (min) {
                                    ruleText = `Please select at least ${min} of the following.`;
                                } else if (max) {
                                    ruleText = `Please select up to ${max} of the following.`;
                                }

                                return `
                                    <div class="print-group-container">
                                        <h5 class="print-group-header">${item.name}</h5>
                                        <div class="print-group-description">
                                            ${item.description ? `<p>${item.description}</p>` : ''}
                                            ${ruleText ? `<p><em>${ruleText}</em></p>` : ''}
                                        </div>
                                        <ul>
                                            ${(item.options || []).map(option => `
                                                <li>
                                                    ${option.isSelected ? '✅ ' : ''}${option.name}
                                                    ${option.description ? `<div class="item-description-print">${option.description}</div>` : ''}
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                `;
                            } else {
                                // Render standard items that are not in a group
                                return `
                                    <ul>
                                        <li>
                                            ${item.name}
                                            ${item.description ? `<div class="item-description-print">${item.description}</div>` : ''}
                                        </li>
                                    </ul>
                                `;
                            }
                        }).join('')}
                        <h4>Services:</h4>
                        <ul>
                            ${(entity.services || []).map(service => `
                                <li>
                                    ${service.name} - ${service.pricingType === 'hourly' ? `${service.duration} hrs` : 'Flat Fee'} - $${(service.price * (service.duration || 1)).toFixed(2)}
                                    ${service.clientNote ? `<div class="client-note-print"><em>Note: ${service.clientNote}</em></div>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    ${financialSection}
                    ${termsAndConditionsSection}
                    ${signatureSection}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', printableHTML);

    const closeModal = () => document.getElementById('printable-contract-overlay')?.remove();

    document.getElementById('close-print-view-btn').onclick = closeModal;
    document.getElementById('print-btn').onclick = () => window.print();
    
    // Add listener to close modal on outside click
    const modalOverlay = document.getElementById('printable-contract-overlay');
    if (modalOverlay) {
        modalOverlay.onclick = (e) => {
            if (e.target.id === 'printable-contract-overlay') {
                closeModal();
            }
        };
    }

}

/**
 * Shows a modal with a printable Banquet Event Order (BEO) / Kitchen Prep Sheet.
 * This view excludes pricing, internal notes, and terms.
 * @param {object} contract - The contract object to generate the BEO for.
 */
export function showBEOView(contract) {
    const modalId = 'beo-view-modal';
    if (document.getElementById(modalId)) return;

    const modalHTML = `
        <div id="${modalId}" class="modal-overlay">
            <div class="modal-content" id="printable-beo">
                <div class="modal-header">
                    <h2>BEO / Kitchen Prep Sheet</h2>
                    <div class="print-view-actions">
                        <button id="print-beo-btn" class="theme-button">Print</button>
                        <button id="close-beo-view-btn" class="close-button">&times;</button>
                    </div>
                </div>
                <div class="modal-body">
                    ${getPrintableBEOHTML(contract)}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const closeModal = () => document.getElementById(modalId)?.remove();
    document.getElementById('close-beo-view-btn').onclick = closeModal;

    // Add listener to close modal on outside click
    document.getElementById(modalId).onclick = (e) => {
        if (e.target.id === modalId) {
            closeModal();
        }
    };
    document.getElementById('print-beo-btn').onclick = () => {
        const printContent = document.getElementById('printable-beo').cloneNode(true);
        const printWindow = window.open('', '', 'height=800,width=800');
        printWindow.document.write('<html><head><title>Print BEO</title>');
        // Link to existing stylesheets
        const stylesheets = Array.from(document.styleSheets)
            .map(sheet => `<link rel="stylesheet" href="${sheet.href}">`)
            .join('');
        printWindow.document.write(stylesheets);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => { // Timeout to ensure styles are loaded
            printWindow.print();
            printWindow.close();
        }, 500);
    };
}

/**
 * Generates the inner HTML for the BEO view.
 * @param {object} contract - The contract data.
 * @returns {string} The inner HTML for the BEO.
 */
function getPrintableBEOHTML(contract) {
    const businessDetails = loadBusinessDetails();

    const menuItemsHTML = (contract.menuItems || []).map(item => {
        const quantity = item.pricingModel === 'per_person' ? item.appliesToGuests : item.quantity;
        // Conditionally create the quantity string. If quantity is 1, it will be an empty string.
        const quantityDisplay = quantity > 1 ? `${quantity} x ` : '';
        return `
            <li>
                <span class="beo-quantity">${quantityDisplay}</span><strong>${item.name}</strong>
                ${item.clientNote ? `<div class="client-note-print"><em>Note: ${item.clientNote}</em></div>` : ''}
            </li>
        `;
    }).join('');

    const servicesHTML = (contract.services || []).map(service => {
        const quantityDisplay = service.pricingType === 'hourly' ? `${service.duration}hr` : '';
        return `
            <li>
                <span class="beo-quantity">${quantityDisplay ? `${quantityDisplay} x ` : ''}</span><strong>${service.name}</strong>
                ${service.clientNote ? `<div class="client-note-print"><em>Note: ${service.clientNote}</em></div>` : ''}
            </li>
        `;
    }).join('');

    const constraintsHTML = (contract.constraints || []).length > 0 
        ? `<li><strong>Dietary Constraints:</strong> ${(contract.constraints || []).join(', ')}</li>` 
        : '';

    return `
        <div class="printable-header">
            <h1>${businessDetails.businessName}</h1>
            <h2>Banquet Event Order (BEO)</h2>
        </div>

        <div class="contract-section">
            <h3>Event Details</h3>
            <ul>
                <li><strong>Client:</strong> ${contract.clientName}</li>
                <li><strong>Event:</strong> ${contract.eventDescription}</li>
                <li><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString(navigator.language, { timeZone: 'UTC' })}</li>
                <li><strong>Time:</strong> ${contract.eventStartTime || 'TBD'}</li>
                <li><strong>Guest Count:</strong> ~${contract.guestCount}</li>
                ${constraintsHTML}
            </ul>
        </div>

        <div class="contract-section">
            <h3>Menu Items</h3>
            <ul class="item-list-print">${menuItemsHTML}</ul>
        </div>

        <div class="contract-section">
            <h3>Services</h3>
            <ul class="item-list-print">${servicesHTML}</ul>
        </div>
    `;
}