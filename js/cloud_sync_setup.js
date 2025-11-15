import { showToast, showConfirmationModal, registerModal, closeTopModal } from './ui.js';
import { wipeAllUserData, testFirebaseConfig } from './firebase_sync.js';
export function showCloudSyncModal() {
    if (document.getElementById('cloud-sync-modal')) return;

    const modalHTML = `
        <div id="cloud-sync-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Cloud Sync Setup</h2>
                    <button id="close-cloud-sync-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Follow the steps below to connect your own private cloud storage using a free Google Firebase account. This will enable data synchronization across your devices.</p>
                    
                    <div class="setup-step">
                        <h4>Step 1: Create Firebase Project</h4>
                        <p>Go to the <a href="https://console.firebase.google.com/" target="_blank">Firebase Console</a> and create a new project. You can name it whatever you like (e.g., "My GoldFin Data").</p>
                    </div>

                    <div class="setup-step">
                        <h4>Step 2: Create a Web App</h4>
                        <p>In your new project's overview page, click the \`+ Add app\` button and then the Web icon (<code>&lt;/&gt;</code>). Give your app a nickname and click "Register app". On the next screen ("Add Firebase SDK"), select the <strong>"Use a &lt;script&gt; tag"</strong> option.</p>
                    </div>

                    <div class="setup-step">
                        <h4>Step 3: Copy Configuration</h4>
                        <p>After registering, Firebase will show you a <code>firebaseConfig</code> object. Copy this entire object.</p>
                        <pre class="code-block-example">
<code>
const firebaseConfig = {
apiKey: "AIzaSy...",
authDomain: "your-project-id.firebaseapp.com",
projectId: "your-project-id",
storageBucket: "your-project-id.appspot.com",
messagingSenderId: "...",
appId: "..."
};
</code>
                        </pre>
                    </div>

                    <div class="setup-step">
                        <h4>Step 4: Paste and Save</h4>
                        <p>Paste the entire copied config object into the text box below and click Verify.</p>
                        <textarea id="firebase-config-input" placeholder="Paste your firebaseConfig object here..." style="min-height: 150px; font-family: monospace; color: var(--text-color-normal);"></textarea>
                        <div id="initial-setup-actions" class="button-row" style="margin-top: 10px; justify-content: flex-start;">
                            <button id="verify-config-btn" class="theme-button">Verify</button>
                            <button type="button" id="enter-manual-btn" class="theme-button secondary-button">Or, Enter Manually...</button>
                        </div>
                        
                        <fieldset id="firebase-config-manual-entry" class="hidden" style="margin-top: 1rem;">
                            <legend>Confirm or Enter Manually</legend>
                            <p id="manual-entry-description"></p>
                            <div id="manual-entry-form-container">
                                <!-- Form rows will be injected here by JavaScript -->
                            </div>
                        </fieldset>

                    </div>

                    <div class="setup-step">
                        <h4>Step 5: Enable Services</h4>
                        <p><strong>CRITICAL STEP:</strong> Your app will not be able to log in until you enable the services below.</p>
                        <p>In the Firebase Console, go to <strong>Build > Authentication</strong>. Click "Get started", select <strong>Google</strong> from the list of providers, and enable it. You may be prompted to configure an **OAuth consent screen**; you must provide a public-facing name (we recommend changing the default to something clear like "GoldFin Data Sync") and a support email to continue. Then, click Save.</p>
                        <p>Then, go to <strong>Build > Firestore Database</strong>, click "Create database", choose to start in <strong>production mode</strong>, and select a location for your server.</p>
                        <p class="setup-note"><em><strong>Note:</strong> After creating your database, it may take a few minutes for the backend services to be fully enabled. If you see "400 (Bad Request)" errors in the console after logging in, please wait 2-3 minutes and then refresh the page.</em></p>
                    </div>

                    <div class="setup-step">
                        <h4>Step 6: Secure Your Database</h4>
                        <p>This is a critical step to ensure only you can access your data. In the Firebase Console, go to the <strong>Rules</strong> tab within the Firestore Database section.</p>
                        <p>Delete all the text in the editor and replace it with the following rules, then click <strong>Publish</strong>:</p>
                        <pre class="code-block-example">
<code>
rules_version = '2';
service cloud.firestore {
    match /databases/{database}/documents {
        match /users/{userId} {
            allow read, write: if request.auth.uid == userId;
            match /{collection}/{document=**} {
                allow read, write, create, delete: if request.auth.uid == userId;
            }
        }
    }
}
</code>
                        </pre>
                    </div>

                    <div class="setup-step">
                        <h4>Optional: Restrict Access to Specific Users</h4>
                        <p>By default, any user with a Google account can sign in and create their own data silo. If you want to restrict access to only a specific list of users (e.g., only you or your team), you can create an allowlist.</p>
                        <ol style="padding-left: 20px; line-height: 1.6;">
                            <li>
                                <strong>Create the Collection:</strong> In the main "Data" tab of your Firestore Database, click the <strong>+ Start collection</strong> button.
                            </li>
                            <li>
                                In the "Collection ID" field that appears, type exactly <code>allowed_users</code> and click <strong>Next</strong>.
                            </li>
                            <li>
                                <strong>Add Your First User:</strong> The screen will now ask you to create the first document. For the <strong>Document ID</strong>, enter the full Google email address of a user you want to grant access to (e.g., <code>your.email@gmail.com</code>). You can leave the fields below the ID empty. Click <strong>Save</strong>.
                            </li>
                            <li>To add more users, select the <code>allowed_users</code> collection in the left panel and click <strong>+ Add document</strong>, repeating the step above for each email.</li>
                            <li><strong>Update Security Rules:</strong> Finally, update your Firestore Security Rules with the code below. This will check if a user's email exists in your allowlist before letting them create data.</li>
                        </ol>
                        <pre class="code-block-example">
<code>
rules_version = '2';
service cloud.firestore {
    match /databases/{database}/documents {
        match /users/{userId} {
            // Allow a user to create their data only if their email is on the allowlist.
            allow create: if request.auth.uid == userId && exists(/databases/$(database)/documents/allowed_users/$(request.auth.token.email));
            
            // Once their data exists, they have full control over it.
            allow read, update, delete: if request.auth.uid == userId;

            match /{collection}/{document=**} {
                allow read, write, create, delete: if request.auth.uid == userId;
            }
        }
    }
}
</code>
                        </pre>
                    </div>

                    <hr style="margin: 2rem 0;">

                    <div class="setup-step">
                        <h4>Forgot Your Credentials?</h4>
                        <p>If you've already set up a project and need to find your configuration again:</p>
                        <ol style="padding-left: 20px; line-height: 1.6;">
                            <li>Go to the <a href="https://console.firebase.google.com/" target="_blank">Firebase Console</a> and sign in.</li>
                            <li>Select your project (e.g., "My GoldFin Data").</li>
                            <li>Click the gear icon ⚙️ next to "Project Overview" in the top-left, then select <strong>Project settings</strong>.</li>
                            <li>In the "Your apps" card at the bottom of the page, find your web app. Under the "SDK setup and configuration" section, select the "Config" option to view and copy your <code>firebaseConfig</code> object.</li>
                        </ol>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="disconnect-cloud-btn" class="theme-button secondary-button" style="margin-right: auto;">Disconnect</button>
                    <button id="wipe-cloud-data-btn" class="theme-button delete-action" style="margin-right: 1rem;">Wipe Cloud Data</button>
                    <button id="save-cloud-config-btn" class="theme-button hidden">Save & Reconnect</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'cloud-sync-modal';
    registerModal(modalId);

    const renderManualForm = (config = {}, showValues = false) => {
        const container = document.getElementById('manual-entry-form-container');
        container.innerHTML = '';
        const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];

        keys.forEach(key => {
            const row = document.createElement('div');
            row.className = 'config-entry-row';
            row.innerHTML = `
                <label for="config-input-${key}">${key}:</label>
                <input type="${showValues ? 'text' : 'password'}" id="config-input-${key}" class="config-value-input" value="${config[key] || ''}">
                <button class="toggle-vis-btn icon-button" data-target="config-input-${key}">👁️</button>
            `;
            container.appendChild(row);
        });

        container.querySelectorAll('.toggle-vis-btn').forEach(btn => {
            btn.onclick = () => {
                const input = document.getElementById(btn.dataset.target);
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.textContent = isPassword ? '🙈' : '👁️';
            };
        });

        document.getElementById('firebase-config-manual-entry').classList.remove('hidden');
    };

    // --- Event Listeners ---

    document.getElementById('cloud-sync-modal').onclick = (e) => {
        if (e.target.id === 'cloud-sync-modal') {
            // Only ask for confirmation if the user might be editing the config
            if (document.getElementById('firebase-config-input').value || !document.getElementById('firebase-config-manual-entry').classList.contains('hidden')) {
                showConfirmationModal('Are you sure you want to close? Any unsaved changes will be lost.', closeTopModal);
            } else {
                closeTopModal();
            }
        }
    };

    document.getElementById('close-cloud-sync-modal-btn').onclick = closeTopModal;

    document.getElementById('disconnect-cloud-btn').onclick = () => {
        if (confirm("Are you sure you want to disconnect from Cloud Sync? The app will revert to using this browser's local storage.")) {
            localStorage.removeItem('goldfin_firebase_config');
            showToast('Disconnected from Cloud Sync. Please refresh the page.', 'info');
            closeTopModal();
        }
    };

    document.getElementById('wipe-cloud-data-btn').onclick = () => {
        if (confirm("DANGER: This will permanently delete ALL data (events, contracts, libraries, etc.) from your connected Firebase account. This cannot be undone. Are you sure you want to proceed?")) {
            showToast('Wiping all cloud data...', 'info');
            wipeAllUserData().then(() => {
                showToast('All cloud data has been wiped.', 'info');
            });
        }
    };

    // --- Main Logic: Check for existing config and set modal state ---
    const existingConfigJSON = localStorage.getItem('goldfin_firebase_config');
    const saveBtn = document.getElementById('save-cloud-config-btn');

    // --- Verification Logic ---
    const verifyBtn = document.getElementById('verify-config-btn');
    verifyBtn.onclick = async () => {
        const configInput = document.getElementById('firebase-config-input');
        const manualForm = document.getElementById('firebase-config-manual-entry');
        let config;

        // Prioritize reading from the manual form if it's visible and has content
        if (!manualForm.classList.contains('hidden') && document.getElementById('config-input-apiKey')?.value) {
            config = {};
            const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
            keys.forEach(key => {
                config[key] = document.getElementById(`config-input-${key}`).value;
            });
        } else if (configInput.value) {
            // Otherwise, parse from the main textarea
            const configText = configInput.value;
            try {
                const startIndex = configText.indexOf('{');
                const endIndex = configText.lastIndexOf('}');
                if (startIndex === -1 || endIndex === -1) throw new Error("Braces not found.");
                let jsonString = configText.substring(startIndex, endIndex + 1);
                jsonString = jsonString.replace(/\/\/.*/g, '').replace(/,\s*}/g, '}');
                jsonString = jsonString.replace(/'/g, '"');
                jsonString = jsonString.replace(/({|,)\s*([a-zA-Z0-9_-]+)\s*:/g, '$1"$2":');
                config = JSON.parse(jsonString);
            } catch (e) {
                console.error("Firebase config parsing error:", e);
                showToast('Could not parse the pasted text. Please check the format.', 'error');
                return;
            }
        } else {
            showToast('Please paste your config or fill out the manual fields to verify.', 'error');
            return;
        }

        showToast('Verifying configuration...', 'info');
        const isValid = await testFirebaseConfig(config);

        if (isValid) {
            showToast('Verification successful! You can now save.', 'info');
            renderManualForm(config, true); // Show parsed values in the form
            saveBtn.classList.remove('hidden'); // Show the save button
        } else {
            showToast('Verification failed. Please check your config values.', 'error');
        }
    };

    // --- Save Button Logic (Unified) ---
    saveBtn.onclick = () => {
        const config = {};
        const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        let allFieldsValid = true;
        keys.forEach(key => {
            const value = document.getElementById(`config-input-${key}`).value;
            if (!value) {
                allFieldsValid = false;
            }
            config[key] = value;
        });

        if (!allFieldsValid) {
            alert('Please fill in all configuration fields before saving.');
            return;
        }

        localStorage.setItem('goldfin_firebase_config', JSON.stringify(config));
        showToast('Cloud Sync configured! Please refresh the page to connect.', 'info');
        closeTopModal();
    };

    if (existingConfigJSON) {
        // --- EDIT MODE ---
        try {
            const existingConfig = JSON.parse(existingConfigJSON);
            document.getElementById('manual-entry-description').textContent = 'Your current configuration is shown below. You can edit the values and save changes.';
            renderManualForm(existingConfig);
            saveBtn.textContent = 'Save Changes'; // Update button text for clarity
            saveBtn.classList.remove('hidden');
        } catch (e) {
            console.error("Error parsing existing Firebase config:", e);
            localStorage.removeItem('goldfin_firebase_config'); // Clear corrupt config
        }
    } else {
        // --- INITIAL SETUP MODE ---
        document.getElementById('enter-manual-btn').onclick = () => {
            document.getElementById('manual-entry-description').textContent = 'Please enter the values from your Firebase config manually:';
            renderManualForm();
            saveBtn.classList.remove('hidden'); // Show the save button
        };
    }
}