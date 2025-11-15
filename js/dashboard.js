import { showProposalCreator } from './proposal_creator.js';
import { showCardFromCalendar } from './calendar.js';
import { generateAndLoadMockData } from './mock_data_generator.js';
import { appViewModel } from './app_viewmodel.js';

export function renderDashboard(appData) {
    const dashboardContent = document.getElementById('dashboard-tab-content');
    dashboardContent.innerHTML = ''; // Clear previous content

    const { events, contracts } = appData;

    // If there's no data at all, show the mock data generator button
    if (events.length === 0 && contracts.length === 0) {
        dashboardContent.innerHTML = `
            <div class="empty-dashboard-message">
                <h2>Welcome to GoldFin!</h2>
                <p>Your dashboard is currently empty. Get started by creating an event or load some sample data to explore the app.</p>
                <button id="load-mock-data-btn" class="theme-button">Load Demo Data</button>
            </div>`;
        document.getElementById('load-mock-data-btn').onclick = generateAndLoadMockData;
        return;
    }

    const today = new Date(); // Get current date and time
    today.setHours(0, 0, 0, 0); // Set time to the beginning of the day for accurate comparison

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Get all contracts and create a set of event IDs that have been contracted
    const contractedEventIds = new Set(contracts.map(c => c.eventId));

    // Get events that do NOT have a corresponding contract
    const upcomingNonContractedEvents = events.filter(e => !contractedEventIds.has(e.id));

    // Combine the unique events and all contracts into a single list for upcoming items
    const allUpcomingItems = [...upcomingNonContractedEvents, ...contracts];

    // 1. Upcoming Events
    const upcomingEvents = allUpcomingItems
        .filter(c => {
            if (!c.eventDate) return false; // Skip items without an event date
            const eventDate = new Date(c.eventDate);
            return eventDate >= today && eventDate <= thirtyDaysFromNow;
        })
        .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

    // 2. Proposals Awaiting Approval
    const proposalsAwaiting = events.filter(e => e.proposals.some(p => p.status === 'Sent') && !e.proposals.some(p => p.status === 'Approved')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 3. Contracts Awaiting Deposit
    const contractsAwaitingDeposit = contracts.filter(c => c.status === 'Accepted').sort((a, b) => new Date(b.contractDate) - new Date(a.contractDate));

    const renderSection = (title, items, type) => {
        let listHTML = '<p class="empty-list-placeholder">Nothing to show.</p>';
        if (items.length > 0) {
            // Determine the type for each item individually, not based on the section
            listHTML = items.map(item => {
                // If an item has a contractId, it's a contract, otherwise it's an event.
                // Make sure to handle the case where an event is passed in but has a contract
                const itemType = item.contractId || (item.id && contractedEventIds.has(item.id)) ? 'contract' : 'event';
                return renderDashboardItem(item, itemType, appData);
            }).join('');
        }
        const sectionClass = title.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');

        return `
            <div class="dashboard-section ${sectionClass}">
                <h3>${title} (${items.length})</h3>
                <div class="dashboard-list">${listHTML}</div>
            </div>
        `;
    };

    dashboardContent.innerHTML = `
        <div class="dashboard-grid">
            ${renderSection('Upcoming Events (Next 30 Days)', upcomingEvents, null)}
            ${renderSection('Proposals Awaiting Approval', proposalsAwaiting, 'event')}
            ${renderSection('Contracts Awaiting Deposit', contractsAwaitingDeposit, 'contract')}
        </div>
    `;

    // Add event listeners to the new dashboard items
    dashboardContent.querySelectorAll('.dashboard-item').forEach(item => {
        item.onclick = () => {
            const id = item.dataset.id;
            const type = item.dataset.type;
            let entityToEdit;
            const allEvents = appData.events;
            const allContracts = appData.contracts;
            if (type === 'event') {
                entityToEdit = allEvents.find(e => e.id === id);
                if (entityToEdit) showCardFromCalendar(entityToEdit);
            } else { // 'contract'
                entityToEdit = allContracts.find(c => c.id === id || c.contractId === id);
                if (entityToEdit) {
                    // For contracts, open the print preview directly.
                    import('./print_view.js').then(module => module.showPrintableView(entityToEdit));
                }
            }
        };
    });
}

/**
 * Renders a single item for a dashboard list with status indicators.
 * @param {object} item - The event or contract object.
 * @param {string} type - The type of item ('event' or 'contract').
 * @returns {string} The HTML string for the dashboard item.
 */
function renderDashboardItem(item, type, appData) {
    const id = item.id || item.contractId;
    const contract = appData.contracts?.find(c => c.eventId === item.id);

    let statusIndicatorHTML = '';
    let itemClass = 'event-proposal-draft'; // Default

    if (contract) {
        itemClass = 'event-contract';
        statusIndicatorHTML = `<span class="mini-tab-status-indicator" data-status="${contract.status.toLowerCase().replace(/\s+/g, '-')}"></span>`;
    } else if (item.proposals?.some(p => p.status === 'Approved')) {
        itemClass = 'event-proposal-approved';
    } else if (item.proposals?.some(p => p.status === 'Sent')) {
        itemClass = 'event-proposal-sent';
    }

    // For the "Awaiting Approval" section, show the mini-tabs.
    // This now uses a flex layout to keep the date on the right.
    if (type === 'event' && item.proposals?.length > 0) {
        const miniTabsHTML = (item.proposals || []).map(proposal => {
            let statusClass = 'event-proposal-draft';
            if (proposal.status === 'Approved') statusClass = 'event-proposal-approved';
            else if (proposal.status === 'Sent') statusClass = 'event-proposal-sent';
            return `<div class="calendar-mini-tab ${statusClass}">${proposal.name}</div>`;
        }).join('');
        
        return `
            <div class="dashboard-item dashboard-item-with-tabs" data-id="${id}" data-type="${type}">
                <div class="dashboard-item-header">
                    <div class="dashboard-item-main-content">
                        <span class="dashboard-item-client-name">${item.clientName}</span>
                        <div class="mini-tabs-wrapper">${miniTabsHTML}</div>
                    </div>
                    <span class="dashboard-item-date">${new Date(item.eventDate).toLocaleDateString(navigator.language, { timeZone: 'UTC' })}</span>
                </div>
            </div>
        `;
    }

    // For Upcoming Events and Awaiting Deposit, show a simpler card
    const dateInfo = item.eventDate ? new Date(item.eventDate).toLocaleDateString(navigator.language, { timeZone: 'UTC' }) : (item.contractDate ? new Date(item.contractDate).toLocaleDateString(navigator.language, { timeZone: 'UTC' }) : '');

    return `
        <div class="dashboard-item simple-card" data-id="${id}" data-type="${type}">
            <div class="dashboard-item-status-bar ${itemClass}"></div>
            <div class="dashboard-item-content">
                <div class="dashboard-item-header">
                    <div class="dashboard-item-name-group">
                        ${statusIndicatorHTML || '<span class="mini-tab-status-indicator placeholder"></span>'}
                        <span class="dashboard-item-client-name">${item.clientName || item.name}</span>
                    </div>
                    <span class="dashboard-item-date">${dateInfo}</span>
                </div>
            </div>
        </div>
    `;
}