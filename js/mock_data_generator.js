import { appViewModel } from './app_viewmodel.js';
import { showToast } from './ui.js';
import { 
    saveMenuItems, saveServices, saveConstraintTags, saveSymbolPaletteItems, saveCustomers, saveEvents, saveContracts, saveTemplates, saveBusinessDetails
} from './data_manager.js';
import { renderDashboard } from './dashboard.js';
import { renderEvents } from './event_renderer.js';
import { renderContracts } from './contract_renderer.js';
import { renderTemplates } from './template_renderer.js';
import { renderCalendar } from './calendar.js';
import { saveCollection, saveBusinessDetailsToFirebase } from './firebase_sync.js';

const MOCK_CUSTOMERS = [
    // Weddings
    { id: 'cust_mock_1', name: 'Smith & Jones Wedding', phone: '(555) 111-2222', email: 'smith.jones@wedding.com', notes: 'Bride is vegan.', dietaryRestrictions: ['Vegan'] },
    { id: 'cust_mock_2', name: 'Chen & Patel Wedding', phone: '(555) 222-3333', email: 'chen.patel@wedding.com', notes: 'Need a mix of traditional and modern dishes.', dietaryRestrictions: [] },
    { id: 'cust_mock_3', name: 'O\'Malley Vow Renewal', phone: '(555) 333-4444', email: 'omalley@email.com', notes: '25th anniversary. Focus on elegant classics.', dietaryRestrictions: [] },
    // Corporate
    { id: 'cust_mock_4', name: 'Innovate Corp Summit', phone: '(555) 444-5555', email: 'events@innovatecorp.com', notes: 'Annual leadership summit. Healthy options required.', dietaryRestrictions: [] },
    { id: 'cust_mock_5', name: 'Apex Solutions Holiday Party', phone: '(555) 555-6666', email: 'hr@apex.com', notes: 'Festive theme. Open bar service needed.', dietaryRestrictions: [] },
    { id: 'cust_mock_6', name: 'Quantum Leap Tech Launch', phone: '(555) 666-7777', email: 'pr@quantumleap.tech', notes: 'Futuristic-themed appetizers.', dietaryRestrictions: [] },
    { id: 'cust_mock_7', name: 'Starlight Foundation Gala', phone: '(555) 777-8888', email: 'gala@starlight.org', notes: 'High-profile charity event. Needs nut-free options.', dietaryRestrictions: ['Nut-Free'] },
    // Private Parties
    { id: 'cust_mock_8', name: 'David Chen\'s Retirement', phone: '(555) 888-9999', email: 'd.chen.retires@email.com', notes: 'Casual buffet style.', dietaryRestrictions: [] },
    { id: 'cust_mock_9', name: 'Maria Garcia\'s Graduation', phone: '(555) 999-0000', email: 'm.garcia@email.com', notes: 'Family-friendly, lots of kids.', dietaryRestrictions: [] },
    { id: 'cust_mock_10', name: 'Jackson Family Reunion', phone: '(555) 000-1111', email: 'reunion@jackson.fam', notes: 'Grandfather is gluten-free.', dietaryRestrictions: ['Gluten-Free'] },
    { id: 'cust_mock_11', name: 'Emily White\'s 30th Bday', phone: '(555) 111-3333', email: 'em.white@email.com', notes: 'Cocktail party theme.', dietaryRestrictions: [] },
    // Community & Other
    { id: 'cust_mock_12', name: 'Lakeside Art Fair', phone: '(555) 222-4444', email: 'info@lakesidearts.org', notes: 'Food truck style service.', dietaryRestrictions: [] },
    { id: 'cust_mock_13', name: 'Northwood High Fundraiser', phone: '(555) 333-5555', email: 'pta@northwood.edu', notes: 'Simple, cost-effective options.', dietaryRestrictions: [] },
    { id: 'cust_mock_14', name: 'Book Club Annual Dinner', phone: '(555) 444-6666', email: 'bookclub@email.com', notes: 'Small, intimate plated dinner.', dietaryRestrictions: [] },
    { id: 'cust_mock_15', name: 'Yoga Studio Anniversary', phone: '(555) 555-7777', email: 'events@yogabliss.com', notes: 'Strictly vegetarian and vegan.', dietaryRestrictions: ['Vegetarian', 'Vegan'] },
    { id: 'cust_mock_16', name: 'Miller Engagement Party', phone: '(555) 666-8888', email: 'miller.engage@email.com', notes: 'Focus on champagne and desserts.', dietaryRestrictions: [] },
    { id: 'cust_mock_17', name: 'City Council Luncheon', phone: '(555) 777-9999', email: 'clerk@cityhall.gov', notes: 'Formal, served lunch.', dietaryRestrictions: [] },
    { id: 'cust_mock_18', name: 'Local Brewery Tasting Event', phone: '(555) 888-0000', email: 'events@craftbrew.com', notes: 'Pairings with beer are essential.', dietaryRestrictions: [] }
];

const MOCK_BUSINESS_DETAILS = {
    businessName: 'GoldFin Catering',
    address: '123 Culinary Lane, Foodie City, 12345',
    phone: '(555) 555-5555',
    email: 'contact@goldfincatering.com',
    website: 'www.goldfincatering.com',
    logo: '', // No mock logo for now to keep it simple
    termsAndConditions: '1. A 50% non-refundable deposit is required to secure the event date.\n2. Final guest count must be confirmed 14 days prior to the event.\n3. Final payment is due 7 days before the event date.',
    enableWaterEffect: true,
    enableOverlayEffect: true,
    includeTermsOnPrint: true,
    includeTermsOnProposal: true
};

const EVENT_DESCRIPTIONS = [
    'Annual Charity Gala', 'Summer Wedding Reception', 'Corporate Holiday Party', 'Product Launch Event', 
    'Milestone Birthday Celebration', 'Backyard BBQ Party', 'Rehearsal Dinner', 'Graduation Party',
    'Executive Offsite Meeting', 'Investor Relations Dinner', 'Team Building Workshop', 'Client Appreciation Night',
    'New Year\'s Eve Bash', 'Oktoberfest Celebration', 'Spring Fling Social', 'User Conference Catering',
    'Baptism Luncheon', 'Anniversary Dinner Party', 'Engagement Celebration', 'Housewarming Party'
];

const MOCK_LOCATIONS = [
    'The Grand Ballroom, 123 Main St, Anytown', 'Lakeside Pavilion, 456 Park Ave, Sometown', 'The Rose Garden, 789 Vineyard Rd, Wineville',
    'Innovate Corp Headquarters, 101 Tech Plaza, Silicon Valley', 'The Starlight Mansion, 1 Starlight Dr, Beverly Hills',
    'The Old Mill, 321 River Run, Brookside', 'The Art Gallery, 555 Canvas Ct, Metro City', 'The Community Center, 800 Center St, Smalltown',
    'The Mountain Lodge, 1 Peak Rd, Summitville'
];

const PROPOSAL_NAMES = ['Standard Package', 'Premium Option', 'Buffet Style', 'Plated Dinner', 'Cocktail Reception'];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createProposal(menuItems, services, sortOrder) {
    const targetValue = getRandomInt(250, 3500);
    let currentValue = 0;
    const proposal = {
        id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: getRandomItem(PROPOSAL_NAMES),
        sortOrder: sortOrder,
        status: getRandomItem(['Draft', 'Sent', 'Approved']),
        menuItems: [],
        services: []
    };

    // Add services first
    const numServices = getRandomInt(1, 3);
    for (let i = 0; i < numServices; i++) {
        const service = { ...getRandomItem(services) };
        if (service.pricingType === 'hourly') {
            service.duration = getRandomInt(2, 6);
            currentValue += service.price * service.duration;
        } else {
            currentValue += service.price;
        }
        proposal.services.push(service);
    }

    // Add menu items until target value is approached
    while (currentValue < targetValue && proposal.menuItems.length < 20) {
        const item = { ...getRandomItem(menuItems) };
        let lineValue = 0;
        if (item.pricingModel === 'per_person') {
            item.appliesToGuests = getRandomInt(20, 200); // Mock guest count for the item
            lineValue = item.price * item.appliesToGuests;
        } else {
            item.quantity = getRandomInt(1, 5);
            lineValue = item.price * item.quantity;
        }
        
        // If adding this item would greatly overshoot, skip it and try another
        if (currentValue + lineValue > targetValue * 1.2 && currentValue > targetValue * 0.8) {
            continue;
        }
        proposal.menuItems.push(item);
        currentValue += lineValue;
    }

    return proposal;
}

function createMockTemplates(menuItems, services) {
    const findItem = (name) => { const item = menuItems.find(m => m.name === name); return item ? { ...item, id: item.id } : {}; };
    const findService = (name) => { const service = services.find(s => s.name === name); return service ? { ...service, id: service.id } : {}; };

    return [
        {
            id: 'tmpl_mock_1',
            name: 'Classic Wedding Package',
            eventDescription: 'A comprehensive package for a classic wedding reception.',
            notes: 'Includes setup, service, and cleanup. Assumes a 5-hour event.',
            guestCount: 150,
            menuItems: [
                { ...findItem('Heirloom Tomato Bruschetta'), quantity: 150, name: 'Heirloom Tomato Bruschetta' },
                { ...findItem('Classic Caesar Salad'), quantity: 150, name: 'Classic Caesar Salad' },
                { ...findItem('Filet Mignon (8oz)'), quantity: 75, name: 'Filet Mignon (8oz)' },
                { ...findItem('Roasted Chicken Breast'), quantity: 75, name: 'Roasted Chicken Breast' },
                { ...findItem('Garlic Mashed Potatoes'), quantity: 150, name: 'Garlic Mashed Potatoes' },
                { ...findItem('New York Cheesecake'), quantity: 150, name: 'New York Cheesecake' }
            ].filter(item => item.id), // Filter out any items that weren't found
            services: [
                { ...findService('On-site Chef'), duration: 6 },
                { ...findService('Sous Chef'), duration: 6 },
                { ...findService('Server / Waitstaff'), duration: 5 },
                { ...findService('Dishwasher'), duration: 5 }
            ].filter(service => service.id) // Filter out any services that weren't found
        }
    ];
}

export async function generateAndLoadMockData() {
    // If the no-seed flag is present, it's because the user manually cleared data.
    // Clicking this button is an explicit request to re-seed, so we should remove the flag and proceed.
    if (sessionStorage.getItem('no-seed') === 'true') {
        console.log('User initiated mock data load, removing no-seed flag.');
        sessionStorage.removeItem('no-seed');
    }

    showToast('Generating mock data...', 'info');

    // 1. Load all library data using fetch
    let allMenuItems, allServices, allRestrictions, allSymbols;
    try {
        const [menuItemsRes, servicesRes, restrictionsRes, symbolsRes] = await Promise.all([
            fetch('./js/library_data/menu_items.json'),
            fetch('./js/library_data/services.json'),
            fetch('./js/library_data/restrictions.json'),
            fetch('./js/library_data/symbols.json')
        ]);
        allMenuItems = (await menuItemsRes.json()).map((item, i) => ({ ...item, id: `menu_${i}` }));
        allServices = (await servicesRes.json()).map((item, i) => ({ ...item, id: `serv_${i}` }));
        allRestrictions = (await restrictionsRes.json()).map((item, i) => ({ ...item, id: `tag_${i}` }));
        allSymbols = (await symbolsRes.json()).map((item, i) => ({ ...item, id: `sym_${i}` }));
    } catch (error) {
        console.error("Failed to load library source data for mock generator:", error);
        showToast("Error: Could not load library data for mock generator.", "error");
        return;
    }

    // 2. Generate Events
    const mockEvents = [];
    const today = new Date(); today.setHours(0,0,0,0);
    // Generate events for the last 90 days and the next 90 days
    for (let i = -90; i < 90; i++) {
        // 2-3 events per week, so roughly a 35% chance of an event on any given day
        if (Math.random() < 0.35) {
            const eventDate = new Date(today);
            eventDate.setDate(today.getDate() + i);
            const dateString = eventDate.toISOString().split('T')[0];
            const isPastEvent = eventDate < today;

            const customer = getRandomItem(MOCK_CUSTOMERS);
            const newEvent = {
                id: `evt_${Date.now()}_${i}`,
                createdAt: new Date().toISOString(),
                clientName: customer.name,
                customerId: customer.id,
                eventDate: dateString,
                eventLocation: getRandomItem(MOCK_LOCATIONS),
                eventDescription: getRandomItem(EVENT_DESCRIPTIONS),
                guestCount: getRandomInt(20, 200),
                constraints: customer.dietaryRestrictions || [],
                proposals: [],
                isArchived: isPastEvent && Math.random() < 0.7 // 70% chance of archiving a past event
            };

            const numProposals = getRandomInt(1, 3);
            for (let j = 0; j < numProposals; j++) {
                newEvent.proposals.push(createProposal(allMenuItems, allServices, j));
            }
            mockEvents.push(newEvent);
        }
    }

    // 3. Generate Contracts from some 'Approved' proposals
    const mockContracts = [];
    mockEvents.forEach(event => {
        const approvedProposal = event.proposals.find(p => p.status === 'Approved');
        if (approvedProposal && Math.random() > 0.5) { // 50% chance of generating a contract
            const contractDate = new Date(event.createdAt);
            contractDate.setDate(contractDate.getDate() + getRandomInt(1, 7));

            const newContract = {
                ...JSON.parse(JSON.stringify(event)),
                ...JSON.parse(JSON.stringify(approvedProposal)),
                id: `cont_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                contractId: `cont_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                eventId: event.id,
                proposalId: approvedProposal.id,
                contractDate: contractDate.toISOString(),
                isArchived: event.isArchived, // Sync archive status with parent event
                status: getRandomItem(['Sent', 'Accepted', 'Deposit Paid']),
                depositAmount: 500 // Simplified for mock data
            };
            mockContracts.push(newContract);
        }
    });

    // 3.5 Generate Templates
    const mockTemplates = createMockTemplates(allMenuItems, allServices);

    // 4. Save everything
    if (appViewModel.isCloudMode) {
        try {
            await Promise.all([
                saveCollection('menuItems', allMenuItems),
                saveCollection('services', allServices),
                saveCollection('constraintTags', allRestrictions),
                saveCollection('symbolPaletteItems', allSymbols),
                saveCollection('customers', MOCK_CUSTOMERS),
                saveCollection('events', mockEvents),
                saveCollection('contracts', mockContracts),
                saveCollection('templates', mockTemplates) // This was missing from the Promise.all
            ]);
            await saveBusinessDetailsToFirebase(MOCK_BUSINESS_DETAILS);
        } catch (error) {
            console.error("Error saving mock data to Firebase:", error);
            showToast('Error saving mock data to cloud.', 'error');
            return;
        } 
    } else {
        saveMenuItems(allMenuItems);
        saveServices(allServices);
        saveConstraintTags(allRestrictions);
        saveSymbolPaletteItems(allSymbols);
        saveCustomers(MOCK_CUSTOMERS);
        saveEvents(mockEvents);
        saveContracts(mockContracts);
        saveTemplates(mockTemplates);
        saveBusinessDetails(MOCK_BUSINESS_DETAILS);
    }

    // The data load was successful, so we can now clear the no-seed flag
    sessionStorage.removeItem('no-seed');

    showToast('Mock data loaded successfully!', 'info');

    // Update the ViewModel state to trigger a full, reactive re-render
    appViewModel.state.events = mockEvents;
    appViewModel.state.contracts = mockContracts;
    appViewModel.state.templates = mockTemplates;
    appViewModel.state.customers = MOCK_CUSTOMERS;
    appViewModel.state.menuItems = allMenuItems;
    appViewModel.state.services = allServices;
    appViewModel.state.constraintTags = allRestrictions;
    appViewModel.state.symbolPaletteItems = allSymbols;
}