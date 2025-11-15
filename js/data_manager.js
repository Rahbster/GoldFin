//==============================
// Data Manager
//==============================
// This module centralizes all interactions with localStorage.
import { appViewModel } from './app_viewmodel.js';
import { wipeAllUserData, saveCollection, saveBusinessDetailsToFirebase } from './firebase_sync.js';
import { showSpinner, hideSpinner } from './ui.js';

const EVENTS_STORAGE_KEY = 'goldfin_events';
const MENU_ITEMS_STORAGE_KEY = 'goldfin_menu_items';
const SERVICES_STORAGE_KEY = 'goldfin_services';
const CONTRACTS_STORAGE_KEY = 'goldfin_contracts';
const PROPOSAL_TEMPLATES_STORAGE_KEY = 'goldfin_proposal_templates';
const CONSTRAINT_TAGS_STORAGE_KEY = 'goldfin_constraint_tags';
const SYMBOL_PALETTE_STORAGE_KEY = 'goldfin_symbol_palette_items';
const BUSINESS_DETAILS_STORAGE_KEY = 'goldfin_business_details';
const CUSTOMERS_STORAGE_KEY = 'goldfin_customers';
const LOGO_STORAGE_KEY = 'goldfin_logo_data';

const ALL_STORAGE_KEYS = [
    EVENTS_STORAGE_KEY,
    MENU_ITEMS_STORAGE_KEY,
    SERVICES_STORAGE_KEY,
    CONTRACTS_STORAGE_KEY,
    PROPOSAL_TEMPLATES_STORAGE_KEY,
    CONSTRAINT_TAGS_STORAGE_KEY,
    SYMBOL_PALETTE_STORAGE_KEY,
    CUSTOMERS_STORAGE_KEY,
];

// --- Events (which contain proposals) ---

export function loadEvents() {
    const eventsJSON = localStorage.getItem(EVENTS_STORAGE_KEY);
    // This function will now be primarily for local mode.
    return eventsJSON ? JSON.parse(eventsJSON) : []; 
}

export function saveEvents(events) {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

// --- Menu Items (placeholder) ---

export function loadMenuItems() {
    // Seed with sample data if none exists
    if (!localStorage.getItem(MENU_ITEMS_STORAGE_KEY) && sessionStorage.getItem('no-seed') !== 'true') {
        seedSampleMenuItems();
    }
    const menuItemsJSON = localStorage.getItem(MENU_ITEMS_STORAGE_KEY);
    return menuItemsJSON ? JSON.parse(menuItemsJSON) : [];
}

export function saveMenuItems(menuItems) {
    localStorage.setItem(MENU_ITEMS_STORAGE_KEY, JSON.stringify(menuItems));
}

function seedSampleMenuItems() {
    const sampleItems = [
        { id: 'menu_1', name: 'Bruschetta', description: 'Toasted baguette with tomato, basil, and garlic.', price: 8, tags: ['Appetizer', 'Vegan'] },
        { id: 'menu_2', name: 'Caprese Salad', description: 'Fresh mozzarella, tomatoes, and sweet basil.', price: 12, tags: ['Salad', 'Vegetarian', 'Gluten-Free'] },
        { id: 'menu_3', name: 'Grilled Salmon', description: 'Salmon fillet with a lemon-dill sauce.', price: 25, tags: ['Main Course', 'Seafood'] },
        { id: 'menu_4', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a molten center.', price: 10, tags: ['Dessert', 'Vegetarian'] }
    ];
    saveMenuItems(sampleItems);
}

// --- Services (placeholder) ---

export function loadServices() {
    // Seed with sample data if none exists
    if (!localStorage.getItem(SERVICES_STORAGE_KEY) && sessionStorage.getItem('no-seed') !== 'true') {
        seedSampleServices();
    }
    const servicesJSON = localStorage.getItem(SERVICES_STORAGE_KEY);
    return servicesJSON ? JSON.parse(servicesJSON) : [];
}

export function saveServices(services) {
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
}

function seedSampleServices() {
    const sampleServices = [
        { id: 'serv_1', name: 'On-site Chef', description: 'Lead chef providing on-site cooking and coordination.', pricingType: 'hourly', price: 75 },
        { id: 'serv_2', name: 'Dishwasher', description: 'Dedicated staff for washing dishes and kitchen cleanup.', pricingType: 'hourly', price: 25 },
        { id: 'serv_3', name: 'Bartender', description: 'Professional bartender for serving drinks.', pricingType: 'hourly', price: 40 },
        { id: 'serv_4', name: 'Passed Appetizer Service', description: 'Servers for passing appetizers to guests.', pricingType: 'flat', price: 150 }
    ];
    saveServices(sampleServices);
}

// --- Contracts ---

export function loadContracts() {
    const contractsJSON = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    return contractsJSON ? JSON.parse(contractsJSON) : [];
}

export function saveContracts(contracts) {
    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));
}

// --- Proposal Templates ---

export function loadTemplates() {
    const templatesJSON = localStorage.getItem(PROPOSAL_TEMPLATES_STORAGE_KEY);
    return templatesJSON ? JSON.parse(templatesJSON) : [];
}

export function saveTemplates(templates) {
    localStorage.setItem(PROPOSAL_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

// --- Constraint Tags ---

export function loadConstraintTags() {
    if (!localStorage.getItem(CONSTRAINT_TAGS_STORAGE_KEY) && sessionStorage.getItem('no-seed') !== 'true') {
        seedSampleConstraintTags();
    }
    const tagsJSON = localStorage.getItem(CONSTRAINT_TAGS_STORAGE_KEY);
    return tagsJSON ? JSON.parse(tagsJSON) : [];
}

export function saveConstraintTags(tags) {
    localStorage.setItem(CONSTRAINT_TAGS_STORAGE_KEY, JSON.stringify(tags));
}

function seedSampleConstraintTags() {
    const sampleTags = [
        { id: 'tag_1', name: 'Vegan', size: 10 },
        { id: 'tag_2', name: 'Vegetarian', size: 8 },
        { id: 'tag_3', name: 'Gluten-Free', size: 7 },
        { id: 'tag_4', name: 'Dairy-Free', size: 7 },
        { id: 'tag_5', name: 'Nut-Free', size: 9 }
    ];
    saveConstraintTags(sampleTags);
}

// --- Symbol Palette Items ---

export function loadSymbolPaletteItems() {
    if (!localStorage.getItem(SYMBOL_PALETTE_STORAGE_KEY) && sessionStorage.getItem('no-seed') !== 'true') {
        seedSampleSymbolPaletteItems();
    }
    const itemsJSON = localStorage.getItem(SYMBOL_PALETTE_STORAGE_KEY);
    return itemsJSON ? JSON.parse(itemsJSON) : [];
}

export function saveSymbolPaletteItems(items) {
    localStorage.setItem(SYMBOL_PALETTE_STORAGE_KEY, JSON.stringify(items));
}

function seedSampleSymbolPaletteItems() {
    const sampleSymbols = [
        { id: 'sym_1', symbol: '🌱', hoverText: 'Plant-Based / Vegan' },
        { id: 'sym_2', symbol: '🌾', hoverText: 'Contains Gluten' },
        { id: 'sym_3', symbol: '🥜', hoverText: 'Contains Nuts' },
        { id: 'sym_4', symbol: '🥛', hoverText: 'Contains Dairy' },
        { id: 'sym_5', symbol: '🐟', hoverText: 'Contains Fish' },
        { id: 'sym_6', symbol: '🦐', hoverText: 'Contains Shellfish' },
        { id: 'sym_7', symbol: '🥚', hoverText: 'Contains Eggs' },
        { id: 'sym_8', symbol: '🌶️', hoverText: 'Spicy' },
        { id: 'sym_9', symbol: '🌽', hoverText: 'Contains Corn' },
        { id: 'sym_10', symbol: '🍄', hoverText: 'Contains Mushrooms' },
        { id: 'sym_11', symbol: '🧀', hoverText: 'Contains Cheese' },
        { id: 'sym_12', symbol: '🍞', hoverText: 'Contains Bread/Gluten' },
        { id: 'sym_13', symbol: '🥩', hoverText: 'Red Meat' },
        { id: 'sym_14', symbol: '🍗', hoverText: 'Poultry' },
        { id: 'sym_15', symbol: '🍯', hoverText: 'Contains Honey' },
        { id: 'sym_16', symbol: '🚫', hoverText: 'Negation / Not' }
    ];
    saveSymbolPaletteItems(sampleSymbols);
}

// --- Business Details ---

export function loadBusinessDetails() {
    const detailsJSON = localStorage.getItem(BUSINESS_DETAILS_STORAGE_KEY);
    // Return saved details or a default object with empty strings
    return detailsJSON ? JSON.parse(detailsJSON) : {
        businessName: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        termsAndConditions: '1. A 50% non-refundable deposit is required to secure the event date.\n2. Final guest count must be confirmed 14 days prior to the event.\n3. Final payment is due 7 days before the event date.',
        enableWaterEffect: true,
        enableOverlayEffect: true,
        includeTermsOnPrint: true, // This will now be for contracts only
        includeTermsOnProposal: true,
        showDailyTotals: true, // Default to showing daily totals
        showMonthlyTotal: true // Default to showing monthly total
    };
}

export function saveBusinessDetails(details) {
    // If called with null or undefined, clear the stored details and return the default object.
    if (details === undefined || details === null) {
        localStorage.removeItem(BUSINESS_DETAILS_STORAGE_KEY);
        return loadBusinessDetails();
    }
    localStorage.setItem(BUSINESS_DETAILS_STORAGE_KEY, JSON.stringify(details));
}

// --- Logo Data (stored separately to avoid size issues with Firebase) ---

export function loadLogo() {
    return localStorage.getItem(LOGO_STORAGE_KEY) || '';
}

export function saveLogo(logoDataUrl) {
    if (logoDataUrl) {
        localStorage.setItem(LOGO_STORAGE_KEY, logoDataUrl);
    } else {
        localStorage.removeItem(LOGO_STORAGE_KEY);
    }
}


// --- Customers ---

export function loadCustomers() {
    if (!localStorage.getItem(CUSTOMERS_STORAGE_KEY) && sessionStorage.getItem('no-seed') !== 'true') {
        seedSampleCustomers();
    }
    const customersJSON = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    return customersJSON ? JSON.parse(customersJSON) : [];
}

export function saveCustomers(customers) {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
}

function seedSampleCustomers() {
    const sampleCustomers = [
        {
            id: 'cust_1',
            name: 'The Family',
            phone: '(123) 456-7890',
            email: 'abc123@email.com',
            notes: 'Prefers vegetarian options for large gatherings.',
            dietaryRestrictions: ['Vegetarian']
        }
    ];
    saveCustomers(sampleCustomers);
}

// --- Backup & Restore ---

/**
 * Gathers all data from localStorage and triggers a download of a backup JSON file.
 */
export function exportAllData() {
    const backupData = {};
    ALL_STORAGE_KEYS.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
            // The logo is stored as a raw string, not JSON
            if (key === LOGO_STORAGE_KEY) {
                backupData[key] = data;
            } else {
                backupData[key] = JSON.parse(data);
            }
        }
    });

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    a.download = `goldfin_backup_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Prompts the user to select a backup file and imports the data into localStorage.
 */
export async function importAllData() {
    return new Promise((resolve) => {
        console.log('Starting import process...');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) {
                console.log('No file selected. Import cancelled.');
                resolve();
                return;
            }

            console.log(`File selected: ${file.name}`);
            showSpinner('Importing data...');

            const reader = new FileReader();
            reader.onload = async (event) => {
                console.log('File read successfully. Attempting to parse and import...');
                try {
                    const backupData = JSON.parse(event.target.result);
                    console.log('Parsed backup data:', backupData);

                    if (appViewModel.isCloudMode) {
                        // --- CLOUD MODE IMPORT ---
                        showSpinner('Wiping existing cloud data...');
                        await wipeAllUserData();

                        showSpinner('Uploading new data to cloud...');
                        const uploadPromises = [];
                        const keyToCollectionMap = {
                            [EVENTS_STORAGE_KEY]: 'events',
                            [CONTRACTS_STORAGE_KEY]: 'contracts',
                            [PROPOSAL_TEMPLATES_STORAGE_KEY]: 'templates',
                            [MENU_ITEMS_STORAGE_KEY]: 'menuItems',
                            [SERVICES_STORAGE_KEY]: 'services',
                            [CONSTRAINT_TAGS_STORAGE_KEY]: 'constraintTags',
                            [SYMBOL_PALETTE_STORAGE_KEY]: 'symbolPaletteItems',
                            [CUSTOMERS_STORAGE_KEY]: 'customers'
                        };

                        for (const key in keyToCollectionMap) {
                            if (backupData[key]) {
                                const collectionName = keyToCollectionMap[key];
                                console.log(`Uploading to collection: ${collectionName}`);
                                uploadPromises.push(saveCollection(collectionName, backupData[key]));
                            }
                        }

                        if (backupData[BUSINESS_DETAILS_STORAGE_KEY]) {
                            console.log('Uploading business details...');
                            uploadPromises.push(saveBusinessDetailsToFirebase(backupData[BUSINESS_DETAILS_STORAGE_KEY]));
                        }

                        // The logo is always stored locally, even in cloud mode.
                        if (backupData[LOGO_STORAGE_KEY]) {
                            saveLogo(backupData[LOGO_STORAGE_KEY]);
                        }

                        await Promise.all(uploadPromises);

                    } else {
                        // --- LOCAL MODE IMPORT ---
                        clearAllApplicationData();
                        ALL_STORAGE_KEYS.forEach(key => {
                            if (backupData[key]) {
                                if (key === LOGO_STORAGE_KEY) {
                                    localStorage.setItem(key, backupData[key]);
                                } else {
                                    localStorage.setItem(key, JSON.stringify(backupData[key]));
                                }
                            }
                        });
                    }

                    // The import was successful, so we can now clear the no-seed flag
                    sessionStorage.removeItem('no-seed');
                    hideSpinner();
                    alert('Data imported successfully! The application will now reload to apply the changes.');
                    window.location.reload();

                } catch (error) {
                    alert('Error: The selected file is not a valid GoldFin backup file.');
                    hideSpinner();
                    console.error('Error importing data:', error);
                } finally {
                    resolve();
                }
            };
            reader.readAsText(file);
        };

        window.addEventListener('focus', () => resolve(), { once: true });
        input.click();
    });
}

/**
 * Clears all application-specific data from localStorage, but preserves settings
 * like the Firebase configuration.
 */
export function clearAllApplicationData() {
    console.log('Clearing all application data from localStorage...');
    // Set a flag to prevent re-seeding on the next load
    sessionStorage.setItem('no-seed', 'true');
    ALL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
}