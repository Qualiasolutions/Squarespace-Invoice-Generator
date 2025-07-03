const notifier = require('node-notifier');
const config = require('../config/app');
const logger = require('../utils/logger');
const path = require('path');

/**
 * Sends a desktop notification for new orders
 * @param {Object} order - The order object
 */
async function notifyNewOrder(order) {
    try {
        const notification = {
            title: '🎉 New Order Received!',
            message: `Order #${order.orderNumber}\nCustomer: ${getCustomerName(order)}\nTotal: ${formatOrderTotal(order)}`,
            icon: path.join(__dirname, '..', 'assets', 'icon.png'),
            sound: true,
            timeout: 10,
            type: 'info',
            appID: 'Squarespace Invoice Automation'
        };

        notifier.notify(notification);
        logger.info(`📱 Desktop notification sent for order ${order.orderNumber}`);
        
    } catch (error) {
        logger.error('Failed to send desktop notification:', error);
    }
}

/**
 * Sends a desktop notification for errors
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
async function notifyError(title, message) {
    try {
        const notification = {
            title: `❌ ${title}`,
            message: message,
            icon: path.join(__dirname, '..', 'assets', 'icon.png'),
            sound: true,
            timeout: 15,
            type: 'error',
            appID: 'Squarespace Invoice Automation'
        };

        notifier.notify(notification);
        logger.info(`📱 Error notification sent: ${title}`);
        
    } catch (error) {
        logger.error('Failed to send error notification:', error);
    }
}

/**
 * Sends a desktop notification for system status
 * @param {string} message - Status message
 */
async function notifyStatus(message) {
    try {
        const notification = {
            title: '📊 System Status',
            message: message,
            icon: path.join(__dirname, '..', 'assets', 'icon.png'),
            sound: false,
            timeout: 8,
            type: 'info',
            appID: 'Squarespace Invoice Automation'
        };

        notifier.notify(notification);
        logger.info(`📱 Status notification sent: ${message}`);
        
    } catch (error) {
        logger.error('Failed to send status notification:', error);
    }
}

/**
 * Helper function to get customer name from order
 * @param {Object} order - Order object
 * @returns {string} Customer name
 */
function getCustomerName(order) {
    const customer = order.customerInfo || order.billingAddress || {};
    if (customer.firstName && customer.lastName) {
        return `${customer.firstName} ${customer.lastName}`;
    }
    return customer.firstName || customer.lastName || 'Unknown Customer';
}

/**
 * Helper function to format order total
 * @param {Object} order - Order object
 * @returns {string} Formatted total
 */
function formatOrderTotal(order) {
    if (order.grandTotal && order.grandTotal.value) {
        return `€${order.grandTotal.value.toFixed(2)}`;
    }
    if (order.lineItems && Array.isArray(order.lineItems)) {
        const total = order.lineItems.reduce((sum, item) => {
            const price = item.unitPrice?.value || item.unitPrice || 0;
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);
        return `€${total.toFixed(2)}`;
    }
    return 'N/A';
}

module.exports = {
    notifyNewOrder,
    notifyError,
    notifyStatus
}; 