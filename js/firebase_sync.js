import { showToast } from './ui.js';
import { setPendingWrites } from './app.js';
import { saveBusinessDetails } from './data_manager.js';

let db = null;
let auth = null;
let isInitialized = false;

/**
 * Initializes the Firebase app if a configuration is found in localStorage.
 * @returns {boolean} - True if initialization was successful, false otherwise.
 */
export async function initializeFirebase() {
    const configJSON = localStorage.getItem('goldfin_firebase_config');
    if (!configJSON) {
        console.log("Firebase config not found. Running in local mode.");
        return false;
    }

    try {
        const firebaseConfig = JSON.parse(configJSON);
        // Prevent re-initialization
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);

            // --- Proactive Validation Step ---
            // This benign operation forces Firebase to validate the config against its servers.
            // If the API key is invalid, this will throw an error that we can catch.
            await firebase.auth().getRedirectResult();
            
            db = firebase.firestore();
            auth = firebase.auth();

            // Enable offline persistence
            db.enablePersistence().catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Firestore persistence failed: multiple tabs open.');
                } else if (err.code == 'unimplemented') {
                    console.warn('Firestore persistence not available in this browser.');
                }
            });
            
            isInitialized = true;
            console.log("Firebase initialized successfully. Running in Cloud Sync mode.");
        }
        return true;
    } catch (e) {
        console.error("Firebase Initialization Failed:", e);
        showToast('Invalid Firebase configuration. Disconnecting from Cloud Sync.', 'error');
        localStorage.removeItem('goldfin_firebase_config');
        return false;
    }
}

/**
 * Tests a Firebase configuration by attempting to initialize a temporary app.
 * @param {object} config - The Firebase config object to test.
 * @returns {Promise<boolean>} - True if the config is valid, false otherwise.
 */
export async function testFirebaseConfig(config) {
    const tempAppName = `test-app-${Date.now()}`;
    try {
        const tempApp = firebase.initializeApp(config, tempAppName);
        // A benign operation to force validation against Firebase servers.
        await tempApp.auth().getRedirectResult();
        // If it succeeds, delete the temporary app.
        await tempApp.delete();
        return true;
    } catch (error) {
        console.error("Firebase config verification failed:", error);
        // Attempt to delete the app even if it failed, in case it was partially created.
        try {
            const tempApp = firebase.app(tempAppName);
            await tempApp.delete();
        } catch (e) { /* Ignore errors on cleanup */ }
        return false;
    }
}

/**
 * Signs the user in with a Google account popup.
 */
export function signInWithGoogle() {
    if (!auth) return;
    const provider = new firebase.auth.GoogleAuthProvider();
    // This line forces the account selection prompt to appear every time.
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    auth.signInWithPopup(provider).catch((error) => {
        console.error("Google Sign-In Error:", error);
        showToast(`Sign-in failed: ${error.message}`, 'error');
    });
}

/**
 * Signs the current user out.
 */
export function signOut() {
    if (!auth) return;
    auth.signOut();
}

/**
 * Sets up a listener for authentication state changes.
 * @param {function} onLogin - Callback function when a user logs in.
 * @param {function} onLogout - Callback function when a user logs out.
 */
export function onAuthStateChanged(onLogin, onLogout) {
    if (!auth) return;
    auth.onAuthStateChanged(user => {
        if (user) {
            onLogin(user);
        } else {
            onLogout();
        }
    });
}

/**
 * Generic function to create a real-time listener for a collection.
 * @param {string} collectionName - The name of the collection to listen to.
 * @param {function} onDataChange - A callback that receives the data array.
 * @returns {function|null} An unsubscribe function.
 */
function createCollectionListener(collectionName, onDataChange) {
    console.log("Creating listener for collection:", collectionName);
    const user = auth.currentUser;
    if (!user || !db) return null;

    return db.collection('users').doc(user.uid).collection(collectionName).onSnapshot(snapshot => {
        const items = [];
        snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });
        console.log(`[DIAGNOSTIC] Snapshot for [${collectionName}]. Metadata:`, { hasPendingWrites: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache });
        console.log(`Received ${items.length} items for collection: ${collectionName}`);
        // Report the sync status for this collection
        setPendingWrites(collectionName, snapshot.metadata.hasPendingWrites);
        onDataChange(items);
    });
}

/**
 * Generic function to save an entire collection. Used for simpler, less frequently changed data.
 * This is a "set" operation and will overwrite all documents in the collection.
 * It's useful for initializing or bulk-updating library data.
 * @param {string} collectionName - The name of the collection.
 * @param {Array<object>} items - The array of items to save.
 */
export async function saveCollection(collectionName, items) {
    const user = auth.currentUser;
    if (!user || !db) return;

    const batch = db.batch();
    const collectionRef = db.collection('users').doc(user.uid).collection(collectionName);

    items.forEach(item => {
        const docId = item.id; // Assuming all library items have a unique 'id' property
        const { id, ...dataToSave } = item;
        const docRef = collectionRef.doc(docId);
        batch.set(docRef, dataToSave);
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error(`Error saving ${collectionName} collection:`, error);
    }
}

/**
 * Generic function to update a single document in a collection.
 * @param {string} collectionName - The name of the collection.
 * @param {string} docId - The ID of the document to update.
 * @param {object} data - The data to set.
 */
export async function updateDocument(collectionName, docId, data) {
    const user = auth.currentUser;
    if (!user || !db) return;
    const { id, ...dataToSave } = data;
    await db.collection('users').doc(user.uid).collection(collectionName).doc(docId).set(dataToSave);
    // Imperative step to ensure sync status is cleared after a successful write.
    setPendingWrites(collectionName, false);
}

/**
 * Generic function to add a new document to a collection.
 * @param {string} collectionName - The name of the collection.
 * @param {object} data - The data to add.
 */
export async function addDocument(collectionName, data) {
    const user = auth.currentUser;
    if (!user || !db) return;
    await db.collection('users').doc(user.uid).collection(collectionName).add(data);
    // Imperative step to ensure sync status is cleared after a successful write.
    setPendingWrites(collectionName, false);
}

/**
 * Generic function to delete a document from a collection.
 * @param {string} collectionName - The name of the collection.
 * @param {string} docId - The ID of the document to delete.
 */
export async function deleteDocument(collectionName, docId) {
    const user = auth.currentUser;
    if (!user || !db) return;
    await db.collection('users').doc(user.uid).collection(collectionName).doc(docId).delete();
    // Imperative step to ensure sync status is cleared after a successful delete.
    setPendingWrites(collectionName, false);
}


// --- Specific Listeners for each data type ---
export function listenForEvents(onDataChange) {
    return createCollectionListener('events', onDataChange);
}

export function listenForContracts(onDataChange) {
    return createCollectionListener('contracts', onDataChange);
}

export function listenForTemplates(onDataChange) {
    return createCollectionListener('templates', onDataChange);
}

export function listenForCustomers(onDataChange) {
    return createCollectionListener('customers', onDataChange);
}

export function listenForMenuItems(onDataChange) {
    return createCollectionListener('menuItems', onDataChange);
}

export function listenForServices(onDataChange) {
    return createCollectionListener('services', onDataChange);
}

export function listenForConstraintTags(onDataChange) {
    return createCollectionListener('constraintTags', onDataChange);
}

export function listenForSymbolPaletteItems(onDataChange) {
    return createCollectionListener('symbolPaletteItems', onDataChange);
}

export function listenForBusinessDetails(onDataChange) {
    const user = auth.currentUser;
    if (!user || !db) return null;

    // Business details is a single document, not a collection
    return db.collection('users').doc(user.uid).onSnapshot(doc => {
        if (doc.exists && doc.data().businessDetails) {
            onDataChange(doc.data().businessDetails);
            // Report sync status for the user document
            setPendingWrites('businessDetails', doc.metadata.hasPendingWrites);
        } else {
            onDataChange(null); // No details set yet
        }
    });
}

/**
 * Adds a new event document to Firestore.
 * @param {object} eventData - The event object to add.
 */
export async function addEvent(eventData) {
    const user = auth.currentUser;
    if (!user || !db) return;
    try {
        // Firestore will auto-generate an ID if you don't specify one.
        await db.collection('users').doc(user.uid).collection('events').add(eventData);
    } catch (error) {
        console.error("Error adding event to Firestore: ", error);
        showToast('Failed to save event to the cloud.', 'error');
    }
}

/**
 * Updates an existing event document in Firestore.
 * @param {string} eventId - The ID of the event document to update.
 * @param {object} eventData - The updated event object.
 */
export async function updateEvent(eventId, eventData) {
    const user = auth.currentUser;
    if (!user || !db) return;
    // We don't want to save the ID inside the document itself.
    const { id, ...dataToSave } = eventData;
    await db.collection('users').doc(user.uid).collection('events').doc(eventId).set(dataToSave);
    // Imperative step to ensure sync status is cleared after a successful write.
    setPendingWrites('events', false);
}

/**
 * Deletes an event document from Firestore.
 * @param {string} eventId - The ID of the event to delete.
 */
export async function deleteEvent(eventId) {
    const user = auth.currentUser;
    if (!user || !db) return;
    await db.collection('users').doc(user.uid).collection('events').doc(eventId).delete();
}

/**
 * Saves the business details object to the main user document.
 * @param {object} details - The business details object.
 */
export async function saveBusinessDetailsToFirebase(details) {
    const user = auth.currentUser;
    if (!user || !db) return;

    try {
        // Merge with existing user doc to avoid overwriting other top-level fields
        await db.collection('users').doc(user.uid).set({ businessDetails: details }, { merge: true });
        // Imperative Step: After a successful save, we know there are no longer pending writes
        // for this specific operation. This call ensures the 'Syncing...' indicator is cleared
        // even if the listener's server-side snapshot is missed or delayed.
        setPendingWrites('businessDetails', false);
    } catch (error) {
        console.error("Error saving business details to Firebase:", error);
    }
}

/**
 * Deletes all collections and data associated with the current user in Firestore.
 * This is a destructive developer tool for testing.
 */
export async function wipeAllUserData() {
    const user = auth.currentUser;
    if (!user || !db) {
        showToast('You must be logged in to wipe data.', 'error');
        return;
    }

    const collectionsToDelete = [
        'events', 'contracts', 'templates', 'customers', 
        'menuItems', 'services', 'constraintTags', 'symbolPaletteItems'
    ];

    try {
        for (const collectionName of collectionsToDelete) {
            const collectionRef = db.collection('users').doc(user.uid).collection(collectionName);
            const snapshot = await collectionRef.get();
            
            if (snapshot.empty) continue;

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Successfully wiped collection: ${collectionName}`);
        }
    } catch (error) {
        console.error("Error wiping user data:", error);
        showToast('An error occurred while wiping data.', 'error');
    }
}