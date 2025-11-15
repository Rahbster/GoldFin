import { loadBusinessDetails, saveBusinessDetails, loadLogo, saveLogo } from '../data_manager.js';
import { showToast, showConfirmationModal, registerModal, closeTopModal } from '../ui.js';
import { appViewModel } from '../app_viewmodel.js';
import { saveBusinessDetailsToFirebase } from '../firebase_sync.js';
import { formatPhoneNumber, validateEmail } from '../utils.js';
import { applyCalendarTotalVisibility, updateAppTitle } from '../ui_init.js';

export function showBusinessDetailsModal() {
    if (document.getElementById('business-details-modal')) return;

    const details = loadBusinessDetails();
    const logoData = loadLogo();

    const modalHTML = `
        <div id="business-details-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h2>Edit Business Details</h2>
                    <button id="close-details-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="business-details-form">
                        <label for="business-name">Business Name:</label>
                        <div id="logo-preview-container" style="text-align: center; margin-bottom: 1rem;">
                            <img id="logo-preview" src="${logoData || ''}" alt="Logo Preview" style="max-width: 150px; max-height: 150px; display: ${logoData ? 'block' : 'none'}; margin: auto; border: 1px solid #eee; padding: 5px;">
                        </div>
                        <label for="business-logo-input">Company Logo:</label>
                        <input type="file" id="business-logo-input" accept="image/*">
                        <button type="button" id="remove-logo-btn" class="theme-button secondary-button" style="display: ${logoData ? 'block' : 'none'}; margin-top: 5px;">Remove Logo</button>
                        <input type="text" id="business-name" value="${details.businessName}">
                        <label for="business-address">Address:</label>
                        <input type="text" id="business-address" value="${details.address}">
                        <label for="business-phone">Phone:</label>
                        <input type="tel" id="business-phone" value="${details.phone}">
                        <label for="business-email">Email:</label>
                        <input type="email" id="business-email" value="${details.email}">
                        <label for="business-website">Website:</label>
                        <input type="url" id="business-website" value="${details.website}">
                        <label for="business-terms">Default Terms & Conditions:</label>
                        <div id="terms-quill-editor"></div>
                        <fieldset>
                        <legend>Options</legend>
                        <div class="setting-row">
                            <label class="toggle"><span class="toggle-label">Include T&C on Proposals</span>
                                <span>
                                    <input class="toggle-checkbox" type="checkbox" id="include-terms-on-proposal" ${details.includeTermsOnProposal !== false ? 'checked' : ''}>
                                    <div class="toggle-switch"></div>
                                </span>
                            </label>
                        </div>
                        <div class="setting-row">
                            <label class="toggle">
                                <span class="toggle-label">Include T&C on Contracts</span>
                                    <input class="toggle-checkbox" type="checkbox" id="include-terms-on-contract" ${details.includeTermsOnPrint !== false ? 'checked' : ''}>
                                    <div class="toggle-switch"></div>
                                </span>
                            </label>
                        </div>
                        <div class="setting-row">
                            <label class="toggle">
                                <span class="toggle-label">Show Daily Totals on Calendar</span>
                                <span>
                                    <input class="toggle-checkbox" type="checkbox" id="show-daily-totals" ${details.showDailyTotals !== false ? 'checked' : ''}>
                                    <div class="toggle-switch"></div>
                                </span>
                            </label>
                        </div>
                        <div class="setting-row">
                            <label class="toggle">
                                <span class="toggle-label">Show Monthly Total on Calendar</span>
                                <span>
                                    <input class="toggle-checkbox" type="checkbox" id="show-monthly-total" ${details.showMonthlyTotal !== false ? 'checked' : ''}>
                                    <div class="toggle-switch"></div>
                                </span>
                            </label>
                        </div>
                        <div class="hidden">
                            <label class="toggle">
                                <span class="toggle-label">Show Automatic Error Dialogs</span>
                                <span>
                                    <input class="toggle-checkbox" type="checkbox" id="show-error-dialogs-toggle" ${details.showErrorDialogs !== false ? 'checked' : ''}>
                                    <div class="toggle-switch"></div>
                                </span>
                            </label>
                        </div>
                        </fieldset>
                    </form>
                </div>
                <div class="modal-footer">
                    <button id="save-details-btn" class="theme-button">Save Details</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'business-details-modal';
    registerModal(modalId);

    document.getElementById('business-details-modal').onclick = (e) => {
        if (e.target.id === 'business-details-modal') {
            showConfirmationModal('Are you sure you want to close? Any unsaved changes will be lost.', () => {
                closeTopModal();
            });
        }
    };

    const termsQuill = new Quill('#terms-quill-editor', {
        theme: 'snow',
        modules: {
            toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered' }, { 'list': 'bullet' }]]
        },
        placeholder: 'Enter default terms and conditions...'
    });
    termsQuill.root.innerHTML = details.termsAndConditions || '';

    document.getElementById('business-phone').addEventListener('input', (e) => formatPhoneNumber(e.target));
    document.getElementById('business-email').addEventListener('input', (e) => validateEmail(e.target));

    const logoPreview = document.getElementById('logo-preview');
    const removeLogoBtn = document.getElementById('remove-logo-btn');

    document.getElementById('business-logo-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                logoPreview.src = event.target.result;
                logoPreview.style.display = 'block';
                removeLogoBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };

    removeLogoBtn.onclick = () => {
        logoPreview.src = '';
        logoPreview.style.display = 'none';
        removeLogoBtn.style.display = 'none';
        document.getElementById('business-logo-input').value = '';
    };

    document.getElementById('close-details-modal-btn').onclick = closeTopModal;
    document.getElementById('save-details-btn').onclick = () => {
        saveLogo(logoPreview.src.startsWith('data:image') ? logoPreview.src : '');

        const currentDetails = loadBusinessDetails();
        const newDetails = {
            businessName: document.getElementById('business-name').value,
            address: document.getElementById('business-address').value,
            phone: document.getElementById('business-phone').value,
            email: document.getElementById('business-email').value,
            website: document.getElementById('business-website').value,
            includeTermsOnProposal: document.getElementById('include-terms-on-proposal').checked,
            includeTermsOnPrint: document.getElementById('include-terms-on-contract').checked,
            showDailyTotals: document.getElementById('show-daily-totals').checked,
            showMonthlyTotal: document.getElementById('show-monthly-total').checked,
            showErrorDialogs: document.getElementById('show-error-dialogs-toggle').checked,
            termsAndConditions: termsQuill.root.innerHTML,
            enableOverlayEffect: currentDetails.enableOverlayEffect,
            enableWaterEffect: currentDetails.enableWaterEffect
        };

        appViewModel.isCloudMode ? saveBusinessDetailsToFirebase(newDetails) : saveBusinessDetails(newDetails);

        showToast('Business details saved!', 'info');
        applyCalendarTotalVisibility();
        updateAppTitle();
        closeTopModal();
    };
}