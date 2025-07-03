const moment = require('moment');
const config = require('../config/app');

/**
 * Formats a date to DD/MM/YYYY format.
 * @param {Date} date The date to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
    return moment(date).format('DD/MM/YYYY');
}

/**
 * Formats a number as EUR currency.
 * @param {number} amount The amount to format.
 * @returns {string} The formatted currency string.
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('el-GR', {
        style: 'currency',
        currency: config.currency,
    }).format(amount);
}

module.exports = {
    formatDate,
    formatCurrency,
};
