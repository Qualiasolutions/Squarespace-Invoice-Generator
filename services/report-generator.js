const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const config = require('../config/app');
const logger = require('../utils/logger');
const emailNotifier = require('./email-notifier');

/**
 * Generates daily report for processed orders
 * @returns {Object} Report data
 */
async function generateDailyReport() {
    try {
        const today = moment().format('YYYY-MM-DD');
        const logFile = path.join('logs', 'app.log');
        
        if (!await fs.pathExists(logFile)) {
            return { orders: [], total: 0, date: today };
        }

        const logs = await fs.readFile(logFile, 'utf-8');
        const lines = logs.split('\n').filter(line => line.includes(today));
        
        const processedOrders = lines
            .filter(line => line.includes('Successfully processed order'))
            .map(line => {
                const match = line.match(/Successfully processed order (\w+)/);
                return match ? match[1] : null;
            })
            .filter(Boolean);

        const report = {
            date: today,
            orders: processedOrders,
            total: processedOrders.length,
            generatedAt: new Date().toISOString()
        };

        // Save report to file
        const reportPath = path.join('reports', `daily-${today}.json`);
        await fs.ensureDir('reports');
        await fs.writeJson(reportPath, report, { spaces: 2 });

        logger.info(`📊 Daily report generated: ${report.total} orders processed`);
        return report;
        
    } catch (error) {
        logger.error('Failed to generate daily report:', error);
        throw error;
    }
}

/**
 * Generates weekly report for processed orders
 * @returns {Object} Report data
 */
async function generateWeeklyReport() {
    try {
        const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
        const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');
        
        const reportDir = path.join('reports');
        if (!await fs.pathExists(reportDir)) {
            return { orders: [], total: 0, period: `${startOfWeek} to ${endOfWeek}` };
        }

        const files = await fs.readdir(reportDir);
        const dailyReports = [];
        
        for (const file of files) {
            if (file.startsWith('daily-') && file.endsWith('.json')) {
                const date = file.replace('daily-', '').replace('.json', '');
                if (moment(date).isBetween(startOfWeek, endOfWeek, null, '[]')) {
                    try {
                        const reportData = await fs.readJson(path.join(reportDir, file));
                        dailyReports.push(reportData);
                    } catch (error) {
                        logger.warn(`Failed to read daily report: ${file}`);
                    }
                }
            }
        }

        const allOrders = dailyReports.flatMap(report => report.orders);
        const uniqueOrders = [...new Set(allOrders)];
        
        const report = {
            period: `${startOfWeek} to ${endOfWeek}`,
            orders: uniqueOrders,
            total: uniqueOrders.length,
            dailyBreakdown: dailyReports.map(r => ({
                date: r.date,
                count: r.total
            })),
            generatedAt: new Date().toISOString()
        };

        // Save report to file
        const reportPath = path.join('reports', `weekly-${startOfWeek}.json`);
        await fs.writeJson(reportPath, report, { spaces: 2 });

        logger.info(`📊 Weekly report generated: ${report.total} orders processed`);
        return report;
        
    } catch (error) {
        logger.error('Failed to generate weekly report:', error);
        throw error;
    }
}

/**
 * Generates HTML report for email
 * @param {Object} report - Report data
 * @param {string} type - Report type ('daily' or 'weekly')
 * @returns {string} HTML content
 */
function generateHTMLReport(report, type) {
    const title = type === 'daily' ? 'Daily Report' : 'Weekly Report';
    const period = type === 'daily' ? report.date : report.period;
    
    let dailyBreakdownHTML = '';
    if (type === 'weekly' && report.dailyBreakdown) {
        dailyBreakdownHTML = `
            <h3>Daily Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Date</th>
                        <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Orders</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.dailyBreakdown.map(day => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 12px;">${day.date}</td>
                            <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${day.count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
                .content { margin: 20px 0; }
                .summary { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .order-list { background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px; }
                .order-item { padding: 8px 0; border-bottom: 1px solid #eee; }
                .order-item:last-child { border-bottom: none; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🧾 ${title}</h1>
                <p>Invoice Automation System - ${config.shopName}</p>
            </div>
            
            <div class="content">
                <div class="summary">
                    <h2>📊 Summary</h2>
                    <p><strong>Period:</strong> ${period}</p>
                    <p><strong>Total Orders Processed:</strong> ${report.total}</p>
                    <p><strong>Generated:</strong> ${moment(report.generatedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                </div>
                
                ${dailyBreakdownHTML}
                
                ${report.orders.length > 0 ? `
                    <div class="order-list">
                        <h3>📋 Processed Orders</h3>
                        ${report.orders.map(order => `
                            <div class="order-item">
                                <strong>Order #${order}</strong>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p>No orders processed during this period.</p>'}
            </div>
            
            <div class="footer">
                <p>This report was automatically generated by the Squarespace Invoice Automation System.</p>
                <p>System running on: ${require('os').hostname()}</p>
            </div>
        </body>
        </html>
    `;
}

/**
 * Sends daily report via email
 * @param {boolean} force - Force send even if no orders
 */
async function sendDailyReport(force = false) {
    try {
        if (!config.smtpUser || !config.notificationEmail) {
            logger.debug('Email not configured, skipping daily report');
            return;
        }

        const report = await generateDailyReport();
        
        if (report.total === 0 && !force) {
            logger.info('No orders processed today, skipping daily report');
            return;
        }

        const htmlContent = generateHTMLReport(report, 'daily');
        const subject = `Daily Report - ${report.total} orders processed (${report.date})`;
        
        await emailNotifier.sendNotification(
            subject,
            `Daily report for ${report.date}: ${report.total} orders processed`,
            htmlContent
        );
        
        logger.info(`📧 Daily report sent to ${config.notificationEmail}`);
        
    } catch (error) {
        logger.error('Failed to send daily report:', error);
    }
}

/**
 * Sends weekly report via email
 * @param {boolean} force - Force send even if no orders
 */
async function sendWeeklyReport(force = false) {
    try {
        if (!config.smtpUser || !config.notificationEmail) {
            logger.debug('Email not configured, skipping weekly report');
            return;
        }

        const report = await generateWeeklyReport();
        
        if (report.total === 0 && !force) {
            logger.info('No orders processed this week, skipping weekly report');
            return;
        }

        const htmlContent = generateHTMLReport(report, 'weekly');
        const subject = `Weekly Report - ${report.total} orders processed (${report.period})`;
        
        await emailNotifier.sendNotification(
            subject,
            `Weekly report for ${report.period}: ${report.total} orders processed`,
            htmlContent
        );
        
        logger.info(`📧 Weekly report sent to ${config.notificationEmail}`);
        
    } catch (error) {
        logger.error('Failed to send weekly report:', error);
    }
}

/**
 * Cleans up old report files
 * @param {number} daysToKeep - Number of days to keep reports
 */
async function cleanupOldReports(daysToKeep = 30) {
    try {
        const reportDir = path.join('reports');
        if (!await fs.pathExists(reportDir)) {
            return;
        }

        const files = await fs.readdir(reportDir);
        const cutoffDate = moment().subtract(daysToKeep, 'days');
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                let fileDate;
                if (file.startsWith('daily-')) {
                    fileDate = file.replace('daily-', '').replace('.json', '');
                } else if (file.startsWith('weekly-')) {
                    fileDate = file.replace('weekly-', '').replace('.json', '');
                }
                
                if (fileDate && moment(fileDate).isBefore(cutoffDate)) {
                    await fs.remove(path.join(reportDir, file));
                    logger.debug(`Cleaned up old report: ${file}`);
                }
            }
        }
        
    } catch (error) {
        logger.error('Failed to cleanup old reports:', error);
    }
}

module.exports = {
    generateDailyReport,
    generateWeeklyReport,
    sendDailyReport,
    sendWeeklyReport,
    cleanupOldReports
}; 