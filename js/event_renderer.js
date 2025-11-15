import { appViewModel } from './app_viewmodel.js';
import { renderEntityCard } from './components/card_renderer.js';

/**
 * Renders the list of events based on data from the ViewModel and current filters.
 * @param {Array<object>} events - The array of event objects from the ViewModel.
 */
export function renderEvents(events) {
    const eventListArea = document.getElementById('event-list-area');
    if (!eventListArea) return;
    eventListArea.innerHTML = ''; // Clear previous content

    if (events.length === 0) {
        eventListArea.innerHTML = '<p>No events match your search.</p>';
        return;
    }

    // Sort events by eventDate (default) or clientName
    events.sort((a, b) => appViewModel.state.filters.events.sort === 'eventDate' ? new Date(a.eventDate) - new Date(b.eventDate) : a.clientName.localeCompare(b.clientName));

    events.forEach(event => {
        // Add a unique ID to each card for the "Today" button to find
        event.cardId = `event-card-${event.id}`;
        const eventCard = renderEntityCard(event, 'event');
        eventCard.id = event.cardId;
        eventListArea.appendChild(eventCard);
    });
}