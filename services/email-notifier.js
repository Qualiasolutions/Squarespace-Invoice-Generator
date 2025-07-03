const nodemailer = require('nodemailer');
const config = require('../config/app');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465, // true for 465, false for other ports
    auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
    },
});

/**
 * Sends an email notification.
 * @param {string} subject The subject of the email.
 * @param {string} text The plain text body of the email.
 * @param {string} html The HTML body of the email.
 */
async function sendNotification(subject, text, html) {
    try {
        await transporter.sendMail({
            from: `"Invoice System" <${config.smtpUser}>`,
            to: config.notificationEmail,
            subject: subject,
            text: text,
            html: html,
        });
        logger.info('Email notification sent successfully.');
    } catch (error) {
        logger.error('Error sending email notification:', error);
    }
}

module.exports = {
    sendNotification,
};
