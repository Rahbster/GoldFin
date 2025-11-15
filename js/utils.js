//==============================
// Utility Functions
//==============================

/**
 * Calculates the total cost of a proposal's items and services.
 * @param {object} proposal - The proposal object.
 * @returns {number} The total calculated cost.
 */
export function calculateProposalCost(proposal) {
    let totalCost = 0;

    // Sum menu item prices
    (proposal.menuItems || []).forEach(item => {
        const quantity = item.quantity || 1;
        totalCost += (item.price || 0) * quantity;
    });

    // Sum service prices
    (proposal.services || []).forEach(service => {
        if (service.pricingType === 'hourly') {
            const duration = service.duration || 1;
            totalCost += (service.price || 0) * duration;
        } else { // flat fee
            totalCost += service.price || 0;
        }
    });

    return totalCost;
}

/**
 * Formats a phone number input field as (###) ###-#### while allowing extensions.
 * @param {HTMLInputElement} input - The input element to format.
 */
export function formatPhoneNumber(input) {
    // Get only the digits from the input value.
    const digits = input.value.replace(/\D/g, '');
    
    // Don't format if there are no digits.
    if (!digits) {
        input.value = '';
        return;
    }
    
    // Format the first 10 digits.
    let formattedNumber = '';
    formattedNumber = '(' + digits.substring(0, 3);
    if (digits.length > 3) formattedNumber += ') ' + digits.substring(3, 6);
    if (digits.length > 6) formattedNumber += '-' + digits.substring(6, 10);
    
    // If there are more than 10 digits, it's part of an extension.
    // We find where the extension starts in the original input and append it.
    const extension = input.value.substring(formattedNumber.length);
    input.value = formattedNumber + extension;
}

/**
 * Validates an email input field and adds/removes CSS classes for feedback.
 * @param {HTMLInputElement} input - The input element to validate.
 */
export function validateEmail(input) {
    // A simple regex for email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (input.value === '') {
        input.classList.remove('valid', 'invalid');
    } else if (emailRegex.test(input.value)) {
        input.classList.add('valid');
        input.classList.remove('invalid');
    } else {
        input.classList.add('invalid');
        input.classList.remove('valid');
    }
}

/**
 * Formats a 24-hour time string (e.g., "16:30") into a 12-hour AM/PM format (e.g., "4:30 PM").
 * @param {string} timeString - The time string to format.
 * @returns {string} The formatted 12-hour time string, or an empty string if the input is invalid.
 */
export function formatTime(timeString) {
    if (!timeString || !timeString.includes(':')) {
        return ''; // Return empty for invalid input
    }
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));

    // Use toLocaleTimeString with options for 12-hour format
    return date.toLocaleTimeString(navigator.language, { hour: 'numeric', minute: '2-digit', hour12: true });
}