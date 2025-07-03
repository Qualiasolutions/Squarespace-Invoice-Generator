const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config/app');
const logger = require('../utils/logger');
const squarespaceApi = require('./squarespace-api');
const invoiceGenerator = require('./invoice-generator');
const printerService = require('./printer-service');
const emailNotifier = require('./email-notifier');
const soundAlert = require('./sound-alert');
const desktopNotifier = require('./desktop-notifier');
const reportGenerator = require('./report-generator');

const processedOrdersPath = path.join('data', 'processed-orders.json');
let cronJob = null;

/**
 * Starts the order tracking service.
 */
function start() {
    logger.info('Starting order tracking service...');
    
    // Validate polling interval
    if (!config.pollingIntervalMinutes || config.pollingIntervalMinutes < 1) {
        logger.error('Invalid polling interval. Must be at least 1 minute.');
        throw new Error('Invalid polling interval configuration');
    }
    
    // Create cron expression for every N minutes
    const cronExpression = `*/${config.pollingIntervalMinutes} * * * *`;
    logger.info(`Setting up cron job with expression: ${cronExpression}`);
    
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
        logger.error(`Invalid cron expression: ${cronExpression}`);
        throw new Error('Invalid cron expression');
    }
    
    // Schedule to run every POLLING_INTERVAL_MINUTES
    cronJob = cron.schedule(cronExpression, async () => {
        try {
            await processOrders();
        } catch (error) {
            logger.error('Error in scheduled order processing:', error);
        }
    }, {
        scheduled: true,
        timezone: "Europe/Athens" // Adjust timezone as needed
    });
    
    logger.info(`✅ Order tracking scheduled to run every ${config.pollingIntervalMinutes} minutes`);
    
    // Schedule daily reports at 9 AM
    const dailyReportJob = cron.schedule('0 9 * * *', async () => {
        try {
            await reportGenerator.sendDailyReport();
        } catch (error) {
            logger.error('Error sending daily report:', error);
        }
    }, { scheduled: true, timezone: "Europe/Athens" });
    
    // Schedule weekly reports on Monday at 9 AM
    const weeklyReportJob = cron.schedule('0 9 * * 1', async () => {
        try {
            await reportGenerator.sendWeeklyReport();
        } catch (error) {
            logger.error('Error sending weekly report:', error);
        }
    }, { scheduled: true, timezone: "Europe/Athens" });
    
    // Schedule cleanup of old reports monthly
    const cleanupJob = cron.schedule('0 0 1 * *', async () => {
        try {
            await reportGenerator.cleanupOldReports();
        } catch (error) {
            logger.error('Error cleaning up old reports:', error);
        }
    }, { scheduled: true, timezone: "Europe/Athens" });
    
    logger.info('✅ Automated reporting scheduled');
    
    // Run immediately on startup (optional - remove if not desired)
    setTimeout(async () => {
        try {
            await processOrders();
        } catch (error) {
            logger.error('Error in initial order processing:', error);
        }
    }, 5000); // Wait 5 seconds after startup
}

/**
 * Stops the order tracking service.
 */
function stop() {
    if (cronJob) {
        cronJob.destroy();
        cronJob = null;
        logger.info('Order tracking service stopped');
    }
}

/**
 * Processes new orders.
 */
async function processOrders() {
    logger.info('🔍 Checking for new orders...');
    
    try {
        const processedOrders = await getProcessedOrders();
        const newOrders = await squarespaceApi.getNewOrders();
        
        if (!newOrders || newOrders.length === 0) {
            logger.info('No new orders found');
            return;
        }
        
        logger.info(`Found ${newOrders.length} orders to check`);
        
        let processedCount = 0;
        
        for (const order of newOrders) {
            if (!order || !order.orderNumber) {
                logger.warn('Invalid order object received, skipping');
                continue;
            }
            
            if (processedOrders.includes(order.orderNumber)) {
                logger.debug(`Skipping already processed order ${order.orderNumber}`);
                continue;
            }

            try {
                logger.info(`📋 Processing new order ${order.orderNumber}`);
                
                // Play alert sound for new order
                await soundAlert.playNewOrderAlert(order.orderNumber);
                
                // Send desktop notification
                await desktopNotifier.notifyNewOrder(order);
                
                const pdfPath = await invoiceGenerator.generateInvoice(order);
                
                if (config.autoPrint) {
                    await printerService.printFile(pdfPath);
                }
                
                processedOrders.push(order.orderNumber);
                await saveProcessedOrders(processedOrders);
                
                processedCount++;
                logger.info(`✅ Successfully processed order ${order.orderNumber}`);
                
            } catch (error) {
                logger.error(`❌ Failed to process order ${order.orderNumber}:`, error);
                
                // Send notification about the error
                if (config.smtpUser && config.notificationEmail) {
                    try {
                        await emailNotifier.sendNotification(
                            `Failed to process order ${order.orderNumber}`,
                            `Error: ${error.message}\n\nOrder Details: ${JSON.stringify(order, null, 2)}`
                        );
                    } catch (emailError) {
                        logger.error('Failed to send error notification:', emailError);
                    }
                }
            }
        }
        
        if (processedCount > 0) {
            logger.info(`✅ Successfully processed ${processedCount} new orders`);
        }
        
    } catch (error) {
        logger.error('❌ Error in processOrders:', error);
    }
}

/**
 * Gets the list of processed order numbers.
 * @returns {Promise<Array>} A promise that resolves to an array of order numbers.
 */
async function getProcessedOrders() {
    try {
        // Ensure the data directory exists
        await fs.ensureDir(path.dirname(processedOrdersPath));
        
        if (await fs.pathExists(processedOrdersPath)) {
            const data = await fs.readFile(processedOrdersPath, 'utf-8');
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } else {
            // Create empty file if it doesn't exist
            await fs.writeJson(processedOrdersPath, [], { spaces: 2 });
            return [];
        }
    } catch (error) {
        logger.error('Error reading processed orders file:', error);
        return [];
    }
}

/**
 * Saves the list of processed order numbers.
 * @param {Array} orders The array of order numbers to save.
 */
async function saveProcessedOrders(orders) {
    try {
        await fs.writeJson(processedOrdersPath, orders, { spaces: 2 });
        logger.debug(`Saved ${orders.length} processed order numbers`);
    } catch (error) {
        logger.error('Error saving processed orders file:', error);
    }
}

module.exports = {
    start,
    stop,
};
