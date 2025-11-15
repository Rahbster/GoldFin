import { registerModal, closeTopModal } from '../ui.js';

export async function showReadmeModal() {
    if (document.getElementById('readme-modal')) return;

    const modalHTML = `
        <div id="readme-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>README</h2>
                    <div class="header-controls-group" style="margin-left: auto;">
                        <div class="search-input-container">
                            <input type="search" id="readme-search-input" placeholder="Search..." style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc;">
                            <button class="clear-search-btn hidden" data-target="readme-search-input">&times;</button>
                        </div>
                        <span id="readme-search-count" style="font-size: 0.9rem; color: #555; min-width: 40px;"></span>
                    </div>
                    <button id="close-readme-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body" id="readme-content"><p>Loading...</p></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'readme-modal';
    registerModal(modalId);

    document.getElementById('close-readme-modal-btn').onclick = closeTopModal;
    document.getElementById('readme-modal').onclick = (e) => { if (e.target.id === 'readme-modal') closeTopModal(); };

    let originalHTML = '';
    const contentArea = document.getElementById('readme-content');
    try {
        const response = await fetch('README.md');
        if (!response.ok) throw new Error('README.md file not found.');
        
        const markdown = await response.text();
        originalHTML = parseMarkdown(markdown);
        contentArea.innerHTML = originalHTML;

        const searchInput = document.getElementById('readme-search-input');
        const searchCount = document.getElementById('readme-search-count');
        const clearButton = document.querySelector('.clear-search-btn[data-target="readme-search-input"]');

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.trim();
            contentArea.innerHTML = originalHTML;
            clearButton.classList.toggle('hidden', searchTerm === '');
            if (searchTerm === '') {
                searchCount.textContent = '';
                return;
            }
            const regex = new RegExp(searchTerm, 'gi');
            let matches = 0;
            const newHTML = originalHTML.replace(regex, (match) => {
                matches++;
                return `<mark>${match}</mark>`;
            });
            contentArea.innerHTML = newHTML;
            searchCount.textContent = `${matches} found`;
            const firstMark = contentArea.querySelector('mark');
            if (firstMark) firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        });

    } catch (error) {
        console.error('Error fetching README:', error);
        contentArea.innerHTML = `<p style="color: red;">Error: Could not load README.md.</p>`;
    }
}

function parseMarkdown(markdown) {
    const lines = markdown.split('\n');
    let html = '';
    let listStack = [];

    const closeOpenLists = (currentLineIndent, currentLineType = null) => {
        while (listStack.length > 0) {
            const topOfStack = listStack[listStack.length - 1];
            if (topOfStack.indent > currentLineIndent || (topOfStack.indent === currentLineIndent && currentLineType && topOfStack.type !== currentLineType) || !currentLineType) {
                html += `</${topOfStack.type}>`;
                listStack.pop();
            } else {
                break;
            }
        }
    };

    for (const line of lines) {
        let processedLine = line;
        const currentLineIndent = line.match(/^\s*/)[0].length;

        if (/^### (.*)/.test(line)) {
            closeOpenLists(currentLineIndent);
            html += `<h3>${processedLine.substring(4)}</h3>`;
        } else if (/^##### (.*)/.test(line)) {
            closeOpenLists(currentLineIndent);
            html += `<h5>${processedLine.substring(6)}</h5>`;
        } else if (/^#### (.*)/.test(line)) {
            closeOpenLists(currentLineIndent);
            html += `<h4>${processedLine.substring(5)}</h4>`;
        } else if (/^## (.*)/.test(line)) {
            closeOpenLists(currentLineIndent);
            html += `<h2>${processedLine.substring(3)}</h2>`;
        } else if (/^# (.*)/.test(line)) {
            closeOpenLists(currentLineIndent);
            html += `<h1>${processedLine.substring(2)}</h1>`;
        } else if (/^---/.test(line)) {
            closeOpenLists(currentLineIndent);
            html += '<hr>';
        } else if (/^(\s*)[*-]+\s+(.*)/.test(line)) {
            const match = line.match(/^(\s*)[*-]+\s+(.*)/);
            const itemIndent = match[1].length;
            let itemContent = match[2];
            // Apply inline formatting *after* identifying the list item content
            itemContent = itemContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>');
            closeOpenLists(itemIndent, 'ul');
            if (listStack.length === 0 || listStack[listStack.length - 1].indent < itemIndent || listStack[listStack.length - 1].type !== 'ul') {
                html += '<ul>';
                listStack.push({ type: 'ul', indent: itemIndent });
            }
            html += `<li>${itemContent}</li>`;
        } else if (/^(\s*)(\d+\.)\s+(.*)/.test(line)) {
            const match = line.match(/^(\s*)(\d+\.)\s+(.*)/);
            const itemIndent = match[1].length;
            let itemContent = match[3];
            itemContent = itemContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>');
            closeOpenLists(itemIndent, 'ol');
            if (listStack.length === 0 || listStack[listStack.length - 1].indent < itemIndent || listStack[listStack.length - 1].type !== 'ol') {
                html += '<ol>';
                listStack.push({ type: 'ol', indent: itemIndent });
            }
            html += `<li>${itemContent}</li>`;
        } else if (line.trim() === '') {
            closeOpenLists(currentLineIndent);
            html += '<br>';
        } else {
            closeOpenLists(currentLineIndent);
            // Apply inline formatting for paragraphs
            processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>');
            html += `<p>${processedLine}</p>`;
        }
    }
    closeOpenLists(0);
    return html;
}