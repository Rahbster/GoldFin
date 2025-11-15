import { appViewModel } from './app_viewmodel.js';
import { renderEntityCard } from './components/card_renderer.js';
import { showToast } from './ui.js';

export function renderContracts(contracts) {
    const contractListArea = document.getElementById('contract-list-area');
    if (!contractListArea) return;
    
    contractListArea.innerHTML = ''; // Clear previous content

    if (contracts.length === 0) {
        contractListArea.innerHTML = '<p>No contracts match your search.</p>';
        return;
    }

    contracts.forEach(contract => {
        // Add a unique ID to each card for the "Today" button to find
        contract.cardId = `contract-card-${contract.id}`;
        const contractCard = renderEntityCard(contract, 'contract');
        contractCard.id = contract.cardId;
        contractListArea.appendChild(contractCard);
    });
}

// --- NEW: Add event listener for the "Today" button ---
document.addEventListener('DOMContentLoaded', () => {
    const todayBtn = document.getElementById('contracts-today-btn');
    if (todayBtn) {
        todayBtn.onclick = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const contractListArea = document.getElementById('contract-list-area');
            const allCards = Array.from(contractListArea.querySelectorAll('.proposal-card'));

            // Find the first card with an event date that is today or in the future
            const closestCard = allCards.find(card => new Date(appViewModel.appData.contracts?.find(c => `contract-card-${c.id}` === card.id)?.eventDate) >= today);

            if (closestCard) {
                closestCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                showToast('Scrolled to the next upcoming event.', 'info');
            } else {
                showToast('No upcoming events found in the current view.', 'info');
            }
        };
    }
});
