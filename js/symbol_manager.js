//==============================
// Symbol Palette Manager Logic
//==============================
import { appViewModel } from './app_viewmodel.js';
import { updateDocument, deleteDocument } from './firebase_sync.js';
import { showConfirmationModal, showToast, registerModal, closeTopModal } from './ui.js';
import { loadSymbolPaletteItems, saveSymbolPaletteItems } from './data_manager.js';

export function showSymbolPaletteManager() {
    if (document.getElementById('library-manager-modal')) return;

    const modalHTML = `
        <div id="library-manager-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Symbol Palette Library</h2>
                    <button id="close-library-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body" id="library-manager-body"></div>
                <div class="modal-footer">
                    <button id="add-new-symbol-btn" class="theme-button circular-icon-button" title="Add New Symbol">+</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'library-manager-modal';
    registerModal(modalId);

    document.getElementById('close-library-modal-btn').onclick = closeTopModal;
    document.getElementById('add-new-symbol-btn').onclick = () => renderSymbolPaletteForm();

    document.getElementById('library-manager-modal').onclick = (e) => {
        const isFormOpen = !!document.getElementById('symbol-palette-form');
        if (e.target.id === 'library-manager-modal' && !isFormOpen) {
            closeTopModal();
        }
    };
    renderSymbolPaletteList();
}

function renderSymbolPaletteList() {
    const symbols = loadSymbolPaletteItems();
    // Sort symbols alphabetically by hover text
    symbols.sort((a, b) => a.hoverText.localeCompare(b.hoverText));

    const body = document.getElementById('library-manager-body');
    
    const listHTML = `
        <div class="item-list-container">
            <input type="search" id="search-symbols-input" placeholder="Search by hover text..." style="width: 95%; margin-bottom: 1rem;">
            ${symbols.map(item => `
                <div class="library-item-row">
                    <div class="item-info">
                        <strong style="font-size: 1.5rem;">${item.symbol}</strong><br>
                        <small>Hover Text: ${item.hoverText}</small>
                    </div>
                    <div class="item-actions">
                        <button class="edit-item-btn theme-button secondary-button icon-button" title="Edit Symbol" data-item-id="${item.id}">✏️</button>
                        <button class="delete-item-btn theme-button secondary-button icon-button" title="Delete Symbol" data-item-id="${item.id}">X</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    body.innerHTML = listHTML;

    // Set focus to the search bar when the list is rendered
    document.getElementById('search-symbols-input').focus();

    // Add search functionality
    document.getElementById('search-symbols-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        body.querySelectorAll('.library-item-row').forEach(row => {
            const text = row.querySelector('small').textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? 'grid' : 'none';
        });
    });

    document.querySelectorAll('.edit-item-btn').forEach(btn => {
        btn.onclick = () => renderSymbolPaletteForm(btn.dataset.itemId);
    });

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.onclick = () => {
            showConfirmationModal('Are you sure you want to delete this symbol?', () => {
                deleteSymbolPaletteItem(btn.dataset.itemId);
            });
        };
    });
}

function renderSymbolPaletteForm(itemId = null) {
    const items = loadSymbolPaletteItems();
    const item = itemId ? items.find(i => i.id === itemId) : null;
    const isEditing = item !== null;

    const formHTML = `
        <form id="symbol-palette-form">
            <label for="symbol-char">Symbol (Emoji):</label>
            <input type="text" id="symbol-char" placeholder="e.g., 🧀" value="${item?.symbol || ''}" required>
            <label for="symbol-hover-text">Hover Text:</label>
            <input type="text" id="symbol-hover-text" placeholder="e.g., Contains Cheese" value="${item?.hoverText || ''}" required>
            <div class="form-actions">
                <button type="submit" class="theme-button">Save Symbol</button>
                <button type="button" id="cancel-item-form" class="theme-button secondary-button">Cancel</button>
            </div>
        </form>
    `;
    document.getElementById('library-manager-body').innerHTML = formHTML;
    document.getElementById('add-new-symbol-btn').style.display = 'none';

    document.getElementById('cancel-item-form').onclick = () => {
        document.getElementById('add-new-symbol-btn').style.display = 'inline-block';
        renderSymbolPaletteList();
    };

    document.getElementById('symbol-palette-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = item?.id || `sym_${Date.now()}`;
        const updatedItem = {
            id: id,
            symbol: document.getElementById('symbol-char').value,
            hoverText: document.getElementById('symbol-hover-text').value
        };

        if (appViewModel.isCloudMode) {
            await updateDocument('symbolPaletteItems', id, updatedItem);
        } else {
            const updatedItems = isEditing ? items.map(i => i.id === itemId ? updatedItem : i) : [...items, updatedItem];
            saveSymbolPaletteItems(updatedItems);
        }
        showToast('Symbol Saved!', 'info');
        document.getElementById('add-new-symbol-btn').style.display = 'inline-block';
        renderSymbolPaletteList();
    };
}

async function deleteSymbolPaletteItem(itemId) {
    if (appViewModel.isCloudMode) {
        await deleteDocument('symbolPaletteItems', itemId);
        renderSymbolPaletteList(); // Re-render the list in the modal
    } else {
        saveSymbolPaletteItems(loadSymbolPaletteItems().filter(item => item.id !== itemId));
        renderSymbolPaletteList();
    }
    showToast('Symbol deleted.', 'info');
}