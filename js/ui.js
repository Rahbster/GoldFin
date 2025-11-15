//==============================
// UI Utilities
//==============================
import { loadBusinessDetails } from './data_manager.js';

// --- Modal Stack Management ---
const modalStack = [];


/**
 * Displays a short-lived toast notification at the bottom of the screen.
 * @param {string} message - The message to display in the toast.
 * @param {'info' | 'error'} [type='info'] - The type of toast to display.
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    createNewToast(container, message, type);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function createNewToast(container, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;

    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);

    container.prepend(toast);
    void toast.offsetWidth; // Force reflow for animation
    toast.classList.add('show');

    // Set removal timer
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

/**
 * Displays a persistent toast notification prompting the user to update the app.
 * @param {ServiceWorker} newWorker - The new service worker that is waiting to activate.
 */
export function showUpdateAvailableToast(newWorker) {
    const container = document.getElementById('toast-container') || createToastContainer();
    // Remove any existing update toast
    document.getElementById('update-toast')?.remove();

    const toast = document.createElement('div');
    toast.id = 'update-toast';
    toast.className = 'toast-notification info';

    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = 'A new version of the app is available!';
    toast.appendChild(messageSpan);

    const updateButton = document.createElement('button');
    updateButton.textContent = 'Update Now';
    updateButton.className = 'theme-button';
    updateButton.style.marginLeft = '1rem';
    updateButton.onclick = () => {
        newWorker.postMessage({ action: 'skipWaiting' });
    };
    toast.appendChild(updateButton);

    container.prepend(toast);
    void toast.offsetWidth;
    toast.classList.add('show');
}

/**
 * Displays a themed confirmation modal.
 * @param {string} message - The confirmation message to display.
 * @param {function} onConfirm - The callback function to execute if the user clicks "Yes".
 */
export function showConfirmationModal(message, onConfirm, onCancel = null) {
    // Remove any existing confirmation modal first
    document.querySelector('#confirmation-modal-overlay')?.remove();

    const modalHTML = `
        <div id="confirmation-modal-overlay" class="modal-overlay">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <p>${message}</p>
                <div class="modal-footer" style="justify-content: center;">
                    <button id="confirm-yes-btn" class="theme-button">Yes</button>
                    <button id="confirm-no-btn" class="theme-button secondary-button">No</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalId = 'confirmation-modal-overlay';
    registerModal(modalId);

    document.getElementById('confirm-no-btn').onclick = () => {
        closeTopModal();
        if (onCancel) onCancel();
    };
    document.getElementById('confirm-yes-btn').onclick = () => {
        closeTopModal();
        onConfirm();
    };
}

/**
 * Registers a modal by its ID to the modal stack.
 * @param {string} modalId The ID of the modal overlay element.
 */
export function registerModal(modalId) {
    modalStack.push(modalId);
}

/**
 * Closes the topmost modal in the stack.
 */
export function closeTopModal() {
    if (modalStack.length > 0) {
        const modalId = modalStack.pop();
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            modalElement.remove();
        }
    }
}

/**
 * Displays a full-screen loading spinner.
 * @param {string} [message='Loading...'] - The message to display under the spinner.
 */
export function showSpinner(message = 'Loading...') {
    // Remove any existing spinner first
    document.getElementById('spinner-overlay')?.remove();

    const spinnerHTML = `
        <div id="spinner-overlay" class="spinner-overlay">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', spinnerHTML);
}

/**
 * Hides the full-screen loading spinner.
 */
export function hideSpinner() {
    document.getElementById('spinner-overlay')?.remove();
}


/**
 * Initializes the "Scroll to Top" button functionality.
 */
export function initializeScrollToTop() {
    const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
    if (!scrollToTopBtn) return;

    // Show or hide the button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollToTopBtn.classList.remove('hidden');
        } else {
            scrollToTopBtn.classList.add('hidden');
        }
    });

    // Scroll to the top when the button is clicked
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * Initializes a scroll listener to apply a 'scrolled' class to the header
 * when the user scrolls down the page.
 */
export function initializeHeaderScrollEffect() {
    const header = document.querySelector('header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        // Add the class if scrolled more than 10px, otherwise remove it.
        if (window.scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// --- Console Log Viewer ---

const consoleLogs = [];
let isConsoleOverridden = false;

/**
 * Overrides the default console methods to capture logs.
 */
export function initializeConsoleInterceptor() {
    if (isConsoleOverridden) return;

    // Store original console methods before overriding
    // Using a global object to ensure it's accessible even if this function is called multiple times
    // and to prevent issues with `bind(console)` if console is reassigned.
    window._originalConsole = window._originalConsole || {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info
    };

    const originalConsole = window._originalConsole;

    // Bind original methods to console to avoid illegal invocation errors
    const boundOriginalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console)
    };

    Object.keys(originalConsole).forEach(level => {
        console[level] = (...args) => { // Override console methods
            // Call the original console method so logs still appear in the browser console
            boundOriginalConsole[level](...args);

            // Store the log for our modal
            consoleLogs.push({
                level: level,
                message: args.map(arg => {
                    if (typeof arg === 'object' && arg !== null) {
                        try {
                            let str = JSON.stringify(arg, null, 2);
                            // Remove the initial newline and indentation from stringified objects/arrays
                            // to prevent extra spacing when joined with preceding text.
                            if (str.startsWith('[\n')) {
                                str = '[' + str.substring(str.indexOf('\n') + 1);
                            } else if (str.startsWith('{\n')) {
                                str = '{' + str.substring(str.indexOf('\n') + 1);
                            }
                            return str;
                        } catch (e) {
                            return '[Unserializable Object]';
                        }
                    }
                    return String(arg);
                }).join(' '),
                timestamp: new Date().toLocaleTimeString(),
                shown: false // Flag to track if this error has been shown in the proactive dialog
            });
        };
    });

    isConsoleOverridden = true;
}

/**
 * Displays a modal with all captured console logs.
 */
export function showConsoleLogModal() {
    document.getElementById('console-log-modal')?.remove();

    const modalHTML = `
        <div id="console-log-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 90vw; height: 80vh;">
                <div class="modal-header">
                    <h2>Console Log</h2>
                    <button id="copy-all-logs-btn" class="theme-button secondary-button">Copy All</button>
                    <button id="clear-console-log-btn" class="theme-button secondary-button" style="margin-left: 0.5rem;">Clear</button>
                    <button id="close-console-log-modal-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body" id="console-log-content">
                    ${consoleLogs.map((log, index) => {
                        const isMultiLine = log.message.includes('\n');
                        // Escape HTML characters for safe display, especially in <pre>
                        const escapedMessage = log.message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

                        if (isMultiLine) {
                            const lines = escapedMessage.split('\n');
                            const firstLine = lines[0];
                            const restOfMessage = lines.slice(1).join('\n');
                            
                            return `
                                <div class="log-entry-wrapper multi-line">
                                    <details class="collapsible-log-entry">
                                        <summary class="log-summary">
                                            <span class="log-timestamp">[${log.timestamp}]</span>
                                            <span class="log-level log-level-${log.level}">${log.level.toUpperCase()}</span>
                                            <span class="log-first-line">${firstLine}</span>
                                        </summary>
                                        <div class="log-details-content">
                                            <button class="copy-log-btn theme-button secondary-button icon-button" title="Copy This Log" data-log-index="${index}">📋</button>
                                            <pre class="log-full-message">${restOfMessage}</pre>
                                        </div>
                                    </details>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="log-entry-wrapper single-line">
                                    <span class="log-timestamp">[${log.timestamp}]</span>
                                    <span class="log-level log-level-${log.level}">${log.level.toUpperCase()}</span>
                                    <span class="log-message">${escapedMessage}</span>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const closeModal = () => document.getElementById('console-log-modal')?.remove();
    document.getElementById('close-console-log-modal-btn').onclick = closeModal;

    document.getElementById('console-log-modal').onclick = (e) => {
        if (e.target.id === 'console-log-modal') {
            closeModal();
        }
    };

    document.getElementById('clear-console-log-btn').onclick = () => {
        consoleLogs.length = 0; // Clear the array
        document.getElementById('console-log-content').innerHTML = '';
    };
    document.getElementById('copy-all-logs-btn').onclick = async () => {
        const logText = consoleLogs.map(log => 
            `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
        ).join('\n');

        try {
            await navigator.clipboard.writeText(logText);
            showToast('All logs copied to clipboard!', 'info');
        } catch (err) {
            console.error('Failed to copy logs:', err);
            showToast('Failed to copy logs.', 'error');
        }
    };

    // Add event listeners for individual copy buttons within expanded logs
    document.getElementById('console-log-content').addEventListener('click', async (e) => {
        // Use .closest to handle clicks on the button or its icon
        const copyBtn = e.target.closest('.copy-log-btn');
        if (copyBtn) {
            const logIndex = parseInt(copyBtn.dataset.logIndex, 10);
            if (!isNaN(logIndex) && consoleLogs[logIndex]) {
                try {
                    const fullLogMessage = `[${consoleLogs[logIndex].timestamp}] [${consoleLogs[logIndex].level.toUpperCase()}] ${consoleLogs[logIndex].message}`;
                    await navigator.clipboard.writeText(fullLogMessage);
                    showToast('Log entry copied to clipboard!', 'info');
                } catch (err) {
                    console.error('Failed to copy log entry:', err);
                    showToast('Failed to copy log entry.', 'error');
                }
            }
        }
    });
}

/**
 * Periodically checks for new captured errors and displays a dialog.
 */
export function startErrorMonitoring() {
    setInterval(() => {
        const details = loadBusinessDetails();
        // Only proceed if the user has this feature enabled (it's on by default).
        if (details.showErrorDialogs === false) return;

        const newErrors = consoleLogs.filter(log => log.level === 'error' && !log.shown);

        if (newErrors.length > 0) {
            // Mark these errors as shown to prevent repeated dialogs for the same error
            newErrors.forEach(error => error.shown = true);

            // Display the errors in a simple modal
            showErrorDialog(newErrors);
        }
    }, 10000); // Check every 10 seconds
}

/**
 * Displays a simple modal with a list of errors.
 * @param {Array<object>} errors - The error log objects to display.
 */
function showErrorDialog(errors) {
    // Don't show a new error dialog if one is already open
    if (document.getElementById('error-dialog-modal')) return;

    const modalHTML = `
        <div id="error-dialog-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 600px; border-left: 5px solid var(--danger-color);">
                <div class="modal-header">
                    <h2>An Error Occurred</h2>
                    <button id="close-error-dialog-btn" class="close-button">&times;</button>
                </div>
                <div class="modal-body" style="font-family: monospace; white-space: pre-wrap;">
                    <p>The application encountered an error. You can view the full details in the Console Log.</p>
                    ${errors.map(err => `<p style="color: var(--danger-color);">${err.message}</p>`).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const closeModal = () => document.getElementById('error-dialog-modal')?.remove();
    document.getElementById('close-error-dialog-btn').onclick = closeModal;
}