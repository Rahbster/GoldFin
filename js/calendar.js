import { loadBusinessDetails } from './data_manager.js';
import { showProposalCreator } from './proposal_creator.js';
import { formatTime } from './utils.js';
import { renderEntityCard } from './components/card_renderer.js';
import { calculateProposalCost } from './utils.js';

let calendarDate = new Date();

export function getCalendarDate() {
    return calendarDate;
}

export function setCalendarDate(date) {
    calendarDate = date;
}

export function renderCalendar(appData) {
    const grid = document.getElementById('calendar-grid');
    const monthYearEl = document.getElementById('calendar-month-year');
    const monthlyTotalEl = document.getElementById('calendar-monthly-total');
    const dayHeadersContainer = document.getElementById('calendar-day-headers');
    grid.innerHTML = '';

    updateMonthTabs(); // Highlight the current month tab

    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();

    monthYearEl.textContent = `${calendarDate.toLocaleString('default', { month: 'long' })} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Add day headers to their dedicated container
    dayHeadersContainer.innerHTML = ''; // Clear previous headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        dayHeadersContainer.appendChild(dayHeader);
    });

    // Add empty cells for the days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
        grid.appendChild(document.createElement('div'));
    }

    // Load all events once
    const events = appData.events || [];
    const contracts = appData.contracts || [];
    let monthlyTotal = 0;
    const contractsByEventId = new Map(contracts.map(c => [c.eventId, c]));

    // Create cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.innerHTML = `<div class="day-number">${day}</div>`;

        const currentDate = new Date(year, month, day);
        if (currentDate.toDateString() === new Date().toDateString()) {
            dayCell.classList.add('today');
        }

        // Find events for this day
        const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const eventsForDay = events.filter(e => e.eventDate === dayString);
        const contractsForDay = contracts.filter(c => c.eventDate === dayString);
        
        const details = loadBusinessDetails();

        // Calculate and display daily total
        if (details.showDailyTotals && contractsForDay.length > 0) {
            const dailyTotal = contractsForDay.reduce((sum, contract) => sum + calculateProposalCost(contract), 0);
            monthlyTotal += dailyTotal;

            const dailyTotalEl = document.createElement('div');
            dailyTotalEl.className = 'calendar-daily-total';
            dailyTotalEl.textContent = `$${dailyTotal.toLocaleString()}`;
            dayCell.appendChild(dailyTotalEl);
        }

        // Add the '+' button for creating new events
        const addEventBtn = document.createElement('button');
        addEventBtn.className = 'add-event-from-calendar-btn';
        addEventBtn.innerHTML = '+';
        addEventBtn.title = 'Add Event for this day';
        addEventBtn.onclick = (e) => {
            e.stopPropagation();
            showProposalCreator({ eventDate: dayString }, false, true); // isCreatingEvent = true
        };
        dayCell.appendChild(addEventBtn);

        // For touch devices, a tap on the day reveals the button
        dayCell.addEventListener('click', () => {
            // Remove the class from any other day that might have it
            document.querySelectorAll('.calendar-day.show-plus-btn').forEach(d => d.classList.remove('show-plus-btn'));
            dayCell.classList.add('show-plus-btn');
        });

        // For mouse users, hovering over a day should clear any "stuck" plus buttons
        dayCell.addEventListener('mouseenter', () => {
            document.querySelectorAll('.calendar-day.show-plus-btn').forEach(d => d.classList.remove('show-plus-btn'));
        });

        eventsForDay.forEach(event => {
            const contract = contractsByEventId.get(event.id);
            const container = document.createElement('div');
            container.className = 'calendar-item-container';
            
            // Always show the event name as a header for consistency.
            const itemHeader = document.createElement('div');
            itemHeader.className = 'calendar-item-header';
            itemHeader.textContent = event.clientName;
            container.appendChild(itemHeader);
            
            const miniTabsContainer = document.createElement('div');
            miniTabsContainer.className = 'mini-tabs-wrapper';
            
            if (contract) { // If a contract exists, show a single contract tab.
                const contractTab = document.createElement('div');
                contractTab.className = 'calendar-mini-tab event-contract';
                
                const statusIndicator = document.createElement('span');
                statusIndicator.className = 'mini-tab-status-indicator';
                statusIndicator.dataset.status = contract.status.toLowerCase().replace(/\s+/g, '-');

                const tabText = document.createElement('span');
                tabText.textContent = 'Contract'; // Use a generic name for the tab

                contractTab.appendChild(statusIndicator);
                contractTab.appendChild(tabText);
                miniTabsContainer.appendChild(contractTab);
                container.onclick = () => showCardFromCalendar(contract);

            } else { // If no contract, show tabs for each proposal option.
                (event.proposals || []).forEach(proposal => {
                    const proposalTab = document.createElement('div');
                    proposalTab.className = 'calendar-mini-tab';
                    
                    let statusClass = 'event-proposal-draft';
                    if (proposal.status === 'Approved') {
                        statusClass = 'event-proposal-approved';
                    } else if (proposal.status === 'Sent') {
                        statusClass = 'event-proposal-sent'; // Assuming a 'sent' style exists or can be added
                    }
                    proposalTab.classList.add(statusClass);
                    proposalTab.textContent = proposal.name;
                    miniTabsContainer.appendChild(proposalTab);
                });
                container.onclick = () => showCardFromCalendar(event);
            }

            container.appendChild(miniTabsContainer);
            dayCell.appendChild(container);
        });

        grid.appendChild(dayCell);
    }

    // Display the calculated monthly total
    const details = loadBusinessDetails();
    if (details.showMonthlyTotal) {
        monthlyTotalEl.textContent = `Month Total: $${monthlyTotal.toLocaleString()}`;
    } else {
        monthlyTotalEl.textContent = '';
    }

    // Add a listener to hide any "stuck" plus buttons when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.calendar-day')) {
            document.querySelectorAll('.calendar-day.show-plus-btn').forEach(d => d.classList.remove('show-plus-btn'));
        }
    }, { once: true, capture: true });
}

/**
 * Updates the month tabs to highlight the currently displayed month.
 */
function updateMonthTabs() {
    const currentMonth = calendarDate.getMonth();
    const monthTabs = document.querySelectorAll('#calendar-month-tabs .month-tab-btn');
    
    monthTabs.forEach(tab => {
        const tabMonth = parseInt(tab.dataset.month, 10);
        tab.classList.toggle('active', tabMonth === currentMonth);
    });
}

/**
 * Displays a modal containing the full card for a given proposal or contract.
 * @param {object} entity - The proposal or contract object.
 */
export function showCardFromCalendar(event) {
    // If the entity is a contract, show the detailed print/invoice view directly.
    if (event.contractId) {
        showPrintableView(event);
        return;
    }

    const modalId = `calendar-modal-overlay-${event.id}`;
    // If the modal already exists, remove it before creating a new one to ensure it's fresh.
    document.getElementById(modalId)?.remove();

    // This function will be passed down to allow child components to trigger a refresh.
    const refreshModal = (updatedEvent) => {
        showCardFromCalendar(updatedEvent || event); // Re-render with fresh data
    };

    // renderEntityCard will create the full card HTML.
    const cardElement = renderEntityCard(event, 'event', null, refreshModal);

    // Create the standard modal overlay structure
    const modalOverlay = document.createElement('div');
    modalOverlay.id = modalId;
    modalOverlay.className = 'modal-overlay';
    const modalContent = document.createElement('div');
    modalContent.className = 'calendar-modal-card';
    modalContent.appendChild(cardElement); // Append the live element, preserving its listeners
    modalOverlay.appendChild(modalContent);

    document.body.appendChild(modalOverlay);
    // Close the modal when clicking the overlay
    modalOverlay.addEventListener('click', (e) => {
        if (e.target.id === modalId) {
            modalOverlay.remove();
        }
    });
}