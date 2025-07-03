// Validator functions

const logger = require('./logger');

/**
 * Validates email format
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates URL format
 * @param {string} url 
 * @returns {boolean}
 */
function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validates phone number (basic validation)
 * @param {string} phone 
 * @returns {boolean}
 */
function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    // Basic international phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Validates configuration object
 * @param {object} config 
 * @returns {object} Validation result with isValid and errors
 */
function validateConfig(config) {
    const errors = [];

    // Required fields
    const requiredFields = [
        'squarespaceApiKey',
        'squarespaceWebsiteId', 
        'squarespaceApiBaseUrl',
        'shopName',
        'shopAddress',
        'shopEmail'
    ];

    requiredFields.forEach(field => {
        if (!config[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    });

    // URL validation
    if (config.squarespaceApiBaseUrl && !isValidUrl(config.squarespaceApiBaseUrl)) {
        errors.push('Invalid Squarespace API Base URL');
    }

    if (config.shopLogoUrl && !isValidUrl(config.shopLogoUrl)) {
        errors.push('Invalid shop logo URL');
    }

    // Email validation
    if (config.shopEmail && !isValidEmail(config.shopEmail)) {
        errors.push('Invalid shop email address');
    }

    if (config.notificationEmail && !isValidEmail(config.notificationEmail)) {
        errors.push('Invalid notification email address');
    }

    if (config.smtpUser && !isValidEmail(config.smtpUser)) {
        errors.push('Invalid SMTP user email address');
    }

    // Phone validation
    if (config.shopPhone && !isValidPhone(config.shopPhone)) {
        errors.push('Invalid shop phone number');
    }

    // Numeric validations
    if (config.pollingIntervalMinutes && (config.pollingIntervalMinutes < 1 || config.pollingIntervalMinutes > 1440)) {
        errors.push('Polling interval must be between 1 and 1440 minutes');
    }

    if (config.vatRate && (config.vatRate < 0 || config.vatRate > 1)) {
        errors.push('VAT rate must be between 0 and 1 (e.g., 0.24 for 24%)');
    }

    if (config.dashboardPort && (config.dashboardPort < 1000 || config.dashboardPort > 65535)) {
        errors.push('Dashboard port must be between 1000 and 65535');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates Squarespace order object
 * @param {object} order 
 * @returns {object} Validation result
 */
function validateOrder(order) {
    const errors = [];

    if (!order) {
        errors.push('Order is null or undefined');
        return { isValid: false, errors };
    }

    if (!order.orderNumber) {
        errors.push('Order missing orderNumber');
    }

    if (!order.lineItems || !Array.isArray(order.lineItems)) {
        errors.push('Order missing lineItems array');
    } else if (order.lineItems.length === 0) {
        errors.push('Order has no line items');
    } else {
        // Validate line items
        order.lineItems.forEach((item, index) => {
            if (!item.productName) {
                errors.push(`Line item ${index} missing productName`);
            }
            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Line item ${index} has invalid quantity`);
            }
            if (!item.unitPrice && item.unitPrice !== 0) {
                errors.push(`Line item ${index} missing unitPrice`);
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Sanitizes string input to prevent XSS
 * @param {string} input 
 * @returns {string}
 */
function sanitizeString(input) {
    if (!input || typeof input !== 'string') return '';
    
    return input
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

/**
 * Validates and sanitizes invoice data
 * @param {object} data 
 * @returns {object}
 */
function validateInvoiceData(data) {
    const errors = [];
    const sanitized = {};

    // Required fields for invoice
    const requiredFields = ['SHOP_NAME', 'INVOICE_NUMBER', 'items'];
    
    requiredFields.forEach(field => {
        if (!data[field]) {
            errors.push(`Missing required invoice field: ${field}`);
        }
    });

    // Sanitize text fields
    const textFields = [
        'SHOP_NAME', 'SHOP_ADDRESS', 'SHOP_EMAIL', 'SHOP_PHONE',
        'USER_NAME', 'CUSTOMER_ADDRESS', 'INVOICE_NUMBER'
    ];

    textFields.forEach(field => {
        if (data[field]) {
            sanitized[field] = sanitizeString(data[field]);
        }
    });

    // Validate items array
    if (data.items && Array.isArray(data.items)) {
        sanitized.items = data.items.map((item, index) => {
            const sanitizedItem = {};
            
            // Sanitize text fields in items
            ['code', 'description', 'unit'].forEach(field => {
                if (item[field]) {
                    sanitizedItem[field] = sanitizeString(item[field]);
                }
            });

            // Validate numeric fields
            if (typeof item.quantity !== 'number' || item.quantity <= 0) {
                errors.push(`Item ${index} has invalid quantity`);
            } else {
                sanitizedItem.quantity = item.quantity;
            }

            ['price', 'net_amount', 'vat_amount', 'total_amount'].forEach(field => {
                if (typeof item[field] !== 'number' || item[field] < 0) {
                    errors.push(`Item ${index} has invalid ${field}`);
                } else {
                    sanitizedItem[field] = item[field];
                }
            });

            return sanitizedItem;
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
        sanitized: { ...data, ...sanitized }
    };
}

module.exports = {
    isValidEmail,
    isValidUrl,
    isValidPhone,
    validateConfig,
    validateOrder,
    validateInvoiceData,
    sanitizeString
};
