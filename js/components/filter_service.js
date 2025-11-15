export class FilterService {
    static filterEvents(events, filters) {
        let filteredEvents = [...events];

        // Filter by archive status first
        if (filters.showArchived) {
            filteredEvents = filteredEvents.filter(event => event.isArchived === true);
        } else {
            filteredEvents = filteredEvents.filter(event => !event.isArchived);
        }

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            filteredEvents = filteredEvents.filter(event => event.clientName.toLowerCase().includes(term));
        }

        if (filters.status !== 'All') {
            filteredEvents = filteredEvents.filter(event => {
                const hasApproved = event.proposals.some(p => p.status === 'Approved');
                if (filters.status === 'Approved') return hasApproved;
                if (filters.status === 'Sent') return !hasApproved && event.proposals.some(p => p.status === 'Sent');
                if (filters.status === 'Draft') return !hasApproved && !event.proposals.some(p => p.status === 'Sent');
                return false;
            });
        }

        if (filters.dateRange !== 'all') {
            filteredEvents = this.applyDateRangeFilter(filteredEvents, filters.dateRange);
        }

        return this.sort(filteredEvents, filters.sort, 'clientName', 'eventDate');
    }

    static filterContracts(contracts, filters) {
        let filteredContracts = [...contracts];

        // Filter by archive status first
        if (filters.showArchived) {
            filteredContracts = filteredContracts.filter(contract => contract.isArchived === true);
        } else {
            filteredContracts = filteredContracts.filter(contract => !contract.isArchived);
        }

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            filteredContracts = filteredContracts.filter(contract => contract.clientName.toLowerCase().includes(term));
        }

        if (filters.status !== 'All') {
            filteredContracts = filteredContracts.filter(contract => (contract.status || 'Sent') === filters.status);
        }

        if (filters.dateRange !== 'all') {
            filteredContracts = this.applyDateRangeFilter(filteredContracts, filters.dateRange);
        }

        return this.sort(filteredContracts, filters.sort, 'clientName', 'eventDate');
    }

    static filterTemplates(templates, filters) {
        let filteredTemplates = [...templates];

        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            filteredTemplates = filteredTemplates.filter(template => template.name.toLowerCase().includes(term));
        }

        return this.sort(filteredTemplates, filters.sort, 'name', 'creationDate');
    }

    static applyDateRangeFilter(items, range) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return items.filter(item => {
            if (!item.eventDate) return false;
            const eventDate = new Date(item.eventDate);

            switch (range) {
                case 'next30': return eventDate >= today && eventDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                case 'next60': return eventDate >= today && eventDate <= new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
                case 'next90': return eventDate >= today && eventDate <= new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
                case 'last30': return eventDate < today && eventDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                case 'last60': return eventDate < today && eventDate >= new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
                case 'last90': return eventDate < today && eventDate >= new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                default: return true;
            }
        });
    }

    static sort(items, sortOrder, nameKey, dateKey) {
        const sortedItems = [...items];
        if (sortOrder === dateKey) {
            sortedItems.sort((a, b) => new Date(a[dateKey]) - new Date(b[dateKey]));
        } else if (sortOrder === 'creationDate') { // Special case for templates by creation
            sortedItems.sort((a, b) => {
                // Use createdAt if available, otherwise fall back to parsing the ID
                const idA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id?.split('_')[1] || 0);
                const idB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id?.split('_')[1] || 0);
                return parseInt(idB) - parseInt(idA);
            });
        } else {
            sortedItems.sort((a, b) => a[nameKey].localeCompare(b[nameKey]));
        }
        return sortedItems;
    }
}