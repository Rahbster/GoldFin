import { renderEntityCard } from './components/card_renderer.js';

export function renderTemplates(templates) {
    const templateListArea = document.getElementById('template-list-area');
    if (!templateListArea) return;
    
    templateListArea.innerHTML = ''; // Clear previous content

    if (templates.length === 0) {
        const message = 'No templates match your search or none have been created.';
        templateListArea.innerHTML = `<p>${message}</p>`;
        return;
    }

    templates.forEach(template => {
        const templateCard = renderEntityCard(template, 'template');
        templateListArea.appendChild(templateCard);
    });
}