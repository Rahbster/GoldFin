import { 
    loadEvents, saveEvents, loadContracts, saveContracts, loadTemplates, saveTemplates, 
    loadBusinessDetails, saveBusinessDetails, loadMenuItems, saveMenuItems, loadServices, saveServices, 
    loadConstraintTags, saveConstraintTags, loadSymbolPaletteItems, saveSymbolPaletteItems, loadCustomers, saveCustomers 
} from './data_manager.js';
import { 
    initializeFirebase, onAuthStateChanged, 
    listenForEvents, listenForContracts, listenForTemplates, listenForCustomers,
    listenForMenuItems, listenForServices, listenForConstraintTags, listenForSymbolPaletteItems,
    listenForBusinessDetails 
} from './firebase_sync.js';
import { showLibraryImporterModal } from './library_importer.js';
import { FilterService } from './components/filter_service.js';
import { calculateProposalCost } from './utils.js';

class AppViewModel {
    constructor() {
        // --- MODEL ---
        // This is the raw state object.
        this.appData = { 
            events: [], 
            contracts: [], 
            templates: [],
            customers: [],
            menuItems: [],
            services: [],
            constraintTags: [],
            symbolPaletteItems: [],
            businessDetails: {},
            showLibraryImporter: showLibraryImporterModal,
            filters: {
                events: { searchTerm: '', status: 'All', dateRange: 'all', sort: 'eventDate', showArchived: false },
                contracts: { searchTerm: '', status: 'All', dateRange: 'all', sort: 'eventDate', showArchived: false },
                templates: { searchTerm: '', sort: 'creationDate' }
            }
        };
        this.isCloudMode = false;
        this.isInitialRenderComplete = false;

        this.unsubscribers = {};
        this.onStateChange = () => {}; // Callback to be set by the View layer

        // --- REACTIVE STATE ---
        // We wrap the appData in a Proxy to automatically trigger re-renders on change.
        this.state = new Proxy(this.appData, {
            set: (target, property, value) => {
                target[property] = value;
                // Automatically call the onStateChange callback whenever a property is set.
                // This makes the ViewModel reactive.
                this.onStateChange();
                return true; // Indicate success
            }
        });
    }

    // --- SELECTORS ---
    // These methods provide derived state (filtered/sorted lists) to the Views.

    getFilteredEvents() {
        return FilterService.filterEvents(this.state.events, this.state.filters.events);
    }

    getFilteredContracts() {
        return FilterService.filterContracts(this.state.contracts, this.state.filters.contracts);
    }

    getFilteredTemplates() {
        return FilterService.filterTemplates(this.state.templates, this.state.filters.templates);
    }

    getMonthlyRevenueData() {
        const monthlyTotals = Array(12).fill(0);
        const currentYear = new Date().getFullYear();

        this.state.contracts.forEach(contract => {
            const eventDate = new Date(contract.eventDate);
            if (eventDate.getFullYear() === currentYear) {
                const month = eventDate.getMonth(); // 0-11
                monthlyTotals[month] += calculateProposalCost(contract);
            }
        });

        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            data: monthlyTotals
        };
    }

    getContractStatusData() {
        const statusCounts = {};
        const statusColors = {
            'Sent': 'rgba(54, 162, 235, 0.7)',
            'Accepted': 'rgba(153, 102, 255, 0.7)',
            'Deposit Paid': 'rgba(255, 206, 86, 0.7)',
            'Completed': 'rgba(75, 192, 192, 0.7)',
            'Paid In Full': 'rgba(46, 204, 113, 0.7)'
        };

        this.state.contracts.forEach(contract => {
            const status = contract.status || 'Sent';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const labels = Object.keys(statusCounts);
        const data = Object.values(statusCounts);
        const colors = labels.map(label => statusColors[label] || '#ccc');

        return { labels, data, colors };
    }

    getEventVolumeData() {
        const monthlyCounts = Array(12).fill(0);
        const currentYear = new Date().getFullYear();

        this.state.contracts.forEach(contract => {
            const eventDate = new Date(contract.eventDate);
            if (eventDate.getFullYear() === currentYear) {
                const month = eventDate.getMonth(); // 0-11
                monthlyCounts[month]++;
            }
        });

        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            data: monthlyCounts
        };
    }

    getTopMenuItemsData() {
        const itemData = new Map();

        // Only count items from signed contracts
        this.state.contracts.forEach(contract => {
            (contract.menuItems || []).forEach(item => {
                // We only care about standard items with an ID, not groups
                if (item.id && !item.itemType) {
                    if (itemData.has(item.id)) {
                        itemData.get(item.id).count++;
                    } else {
                        // Store the name with the first occurrence
                        itemData.set(item.id, { name: item.name, count: 1 });
                    }
                }
            });
        });

        const sortedItems = [...itemData.values()].sort((a, b) => b.count - a.count).slice(0, 5);

        return {
            labels: sortedItems.map(item => item.name),
            data: sortedItems.map(item => item.count)
        };
    }

    // --- COMMANDS / ACTIONS ---

    async initialize() {
        this.isCloudMode = await initializeFirebase();
        
        if (this.isCloudMode) {
            onAuthStateChanged(
                (user) => this.handleLogin(user),
                () => this.handleLogout()
            );
        } else {
            this.loadLocalData();
            this.onStateChange();
        }
        return this.isCloudMode;
    }

    loadLocalData() {
        this.state.events = loadEvents();
        this.state.contracts = loadContracts();
        this.state.templates = loadTemplates();
        this.state.customers = loadCustomers();
        this.state.menuItems = loadMenuItems();
        this.state.services = loadServices();
        this.state.constraintTags = loadConstraintTags();
        this.state.symbolPaletteItems = loadSymbolPaletteItems();
        this.state.businessDetails = loadBusinessDetails();
    }

    handleLogin(user) {
        Object.values(this.unsubscribers).forEach(unsub => unsub && unsub());

        const listenerConfig = [
            { key: 'events', listen: listenForEvents, save: saveEvents, dataKey: 'events' },
            { key: 'contracts', listen: listenForContracts, save: saveContracts, dataKey: 'contracts' },
            { key: 'templates', listen: listenForTemplates, save: saveTemplates, dataKey: 'templates' },
            { key: 'customers', listen: listenForCustomers, save: saveCustomers, dataKey: 'customers' },
            { key: 'menuItems', listen: listenForMenuItems, save: saveMenuItems, dataKey: 'menuItems' },
            { key: 'services', listen: listenForServices, save: saveServices, dataKey: 'services' },
            { key: 'constraintTags', listen: listenForConstraintTags, save: saveConstraintTags, dataKey: 'constraintTags' },
            { key: 'symbolPaletteItems', listen: listenForSymbolPaletteItems, save: saveSymbolPaletteItems, dataKey: 'symbolPaletteItems' },
        ];

        listenerConfig.forEach(config => {
            this.unsubscribers[config.key] = config.listen(data => {
                this.state[config.dataKey] = data;
                config.save(data);
                this.onStateChange(user);
            });
        });

        this.unsubscribers.businessDetails = listenForBusinessDetails(details => {
            this.state.businessDetails = details || loadBusinessDetails(); // Fallback to local if cloud is null
            saveBusinessDetails(details);
            this.onStateChange(user);
        });
    }

    handleLogout() {
        Object.values(this.unsubscribers).forEach(unsub => unsub && unsub());
        this.state.events = [];
        this.state.contracts = [];
        this.state.templates = [];
        this.state.customers = [];
        this.state.menuItems = [];
        this.state.services = [];
        this.state.constraintTags = [];
        this.state.symbolPaletteItems = [];
        this.state.businessDetails = loadBusinessDetails(); // Keep local business details on logout
        this.onStateChange(null); // Pass null for user
    }
}

// Export a single instance of the ViewModel to act as a singleton
export const appViewModel = new AppViewModel();