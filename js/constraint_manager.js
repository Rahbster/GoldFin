//==============================
// Dietary Restriction Manager Logic
//==============================
import { appViewModel } from './app_viewmodel.js';
import { updateDocument, deleteDocument } from './firebase_sync.js';
import { showConfirmationModal, showToast, registerModal, closeTopModal } from './ui.js';
import { loadConstraintTags, saveConstraintTags, loadSymbolPaletteItems } from './data_manager.js';

export function showConstraintTagManager() {
    if (document.getElementById('library-manager-modal')) return;

    const modalHTML = `
        <div id="library-manager-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Dietary Restriction Library</h2>
                    <button id="close-library-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body" id="library-manager-body"></div>
                <div class="modal-footer">
                    <button id="add-new-tag-btn" class="theme-button circular-icon-button" title="Add New Restriction">+</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'library-manager-modal';
    registerModal(modalId);

    document.getElementById('close-library-modal-btn').onclick = closeTopModal;
    document.getElementById('add-new-tag-btn').onclick = () => renderConstraintTagForm();

    document.getElementById('library-manager-modal').onclick = (e) => {
        const isFormOpen = !!document.getElementById('constraint-tag-form');
        if (e.target.id === 'library-manager-modal' && !isFormOpen) {
            closeTopModal();
        }
    };

    renderConstraintTagList();
}

function renderConstraintTagList() {
    const tags = loadConstraintTags();
    // Sort tags alphabetically by name
    tags.sort((a, b) => a.name.localeCompare(b.name));

    const body = document.getElementById('library-manager-body');
    
    const listHTML = `
        <div class="item-list-container">
            <input type="search" id="search-tags-input" placeholder="Search by name..." style="width: 95%; margin-bottom: 1rem;">
            ${tags.map(tag => `
                <div class="library-item-row">
                    <div class="item-info">
                        <strong style="font-size: ${1 + (tag.size || 5) / 10}em;">${tag.symbol || ''} ${tag.name}</strong><br>
                        <small>Size: ${tag.size || 5}</small>
                    </div>
                    <div class="item-actions">
                        <button class="edit-item-btn theme-button secondary-button icon-button" title="Edit Restriction" data-item-id="${tag.id}">✏️</button>
                        <button class="delete-item-btn theme-button secondary-button icon-button" title="Delete Restriction" data-item-id="${tag.id}">X</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    body.innerHTML = listHTML;

    // Set focus to the search bar when the list is rendered
    document.getElementById('search-tags-input').focus();

    // Add search functionality
    document.getElementById('search-tags-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        body.querySelectorAll('.library-item-row').forEach(row => {
            const name = row.querySelector('strong').textContent.toLowerCase();
            row.style.display = name.includes(searchTerm) ? 'grid' : 'none';
        });
    });

    document.querySelectorAll('.edit-item-btn').forEach(btn => {
        btn.onclick = () => renderConstraintTagForm(btn.dataset.itemId);
    });

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.onclick = () => {
            showConfirmationModal('Are you sure you want to delete this dietary restriction?', () => {
                deleteConstraintTag(btn.dataset.itemId);
            });
        };
    });
}

function renderConstraintTagForm(tagId = null) {
    const tags = loadConstraintTags();
    const tag = tagId ? tags.find(t => t.id === tagId) : null;
    const isEditing = tag !== null;

    const foodSymbols = loadSymbolPaletteItems();

    const formHTML = `
        <form id="constraint-tag-form">
            <label for="tag-name">Restriction Name:</label>
            <input type="text" id="tag-name" placeholder="e.g., Vegan" value="${tag?.name || ''}" required>            
            <label for="tag-symbol">Symbol (e.g., 🌾, GF):</label>
            <input type="text" id="tag-symbol" placeholder="e.g., 🌾" value="${tag?.symbol || ''}">
            <div class="symbol-palette">
                ${foodSymbols.map(item => 
                    `<button type="button" class="symbol-btn" data-symbol="${item.symbol}" title="${item.hoverText}">${item.symbol}</button>`
                ).join('')}
            </div>
            <label for="tag-size">Visual Size (1-10):</label>
            <input type="number" id="tag-size" value="${tag?.size || 5}" required min="1" max="10">
            <div class="form-actions">
                <button type="submit" class="theme-button">Save Restriction</button>
                <button type="button" id="cancel-item-form" class="theme-button secondary-button">Cancel</button>
            </div>
        </form>
    `;
    document.getElementById('library-manager-body').innerHTML = formHTML;
    document.getElementById('add-new-tag-btn').style.display = 'none';

    document.querySelectorAll('.symbol-btn').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('tag-symbol').value += btn.dataset.symbol;
        };
    });

    document.getElementById('cancel-item-form').onclick = () => {
        document.getElementById('add-new-tag-btn').style.display = 'inline-block';
        renderConstraintTagList();
    };

    document.getElementById('constraint-tag-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = tag?.id || `tag_${Date.now()}`;
        const updatedTag = {
            id: id,
            name: document.getElementById('tag-name').value,
            symbol: document.getElementById('tag-symbol').value,
            size: parseInt(document.getElementById('tag-size').value, 10)
        };

        if (appViewModel.isCloudMode) {
            await updateDocument('constraintTags', id, updatedTag);
        } else {
            const updatedTags = isEditing ? tags.map(t => t.id === tagId ? updatedTag : t) : [...tags, updatedTag];
            saveConstraintTags(updatedTags);
        }
        showToast('Dietary Restriction Saved!', 'info');
        document.getElementById('add-new-tag-btn').style.display = 'inline-block';
        renderConstraintTagList();
    };
}

async function deleteConstraintTag(tagId) {
    if (appViewModel.isCloudMode) {
        await deleteDocument('constraintTags', tagId);
        renderConstraintTagList(); // Re-render the list in the modal
    } else {
        saveConstraintTags(loadConstraintTags().filter(tag => tag.id !== tagId));
        renderConstraintTagList();
    }
    showToast('Dietary restriction deleted.', 'info');
}