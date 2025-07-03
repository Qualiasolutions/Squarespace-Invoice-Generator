const { print } = require('pdf-to-printer');
const fs = require('fs-extra');
const config = require('../config/app');
const logger = require('../utils/logger');

/**
 * Prints a PDF file with error handling and validation.
 * @param {string} filePath The path to the PDF file.
 */
async function printFile(filePath) {
    if (!config.autoPrint) {
        logger.info('🖨️  Auto-printing is disabled. Skipping printing.');
        return;
    }

    try {
        // Validate file exists and is readable
        if (!await fs.pathExists(filePath)) {
            throw new Error(`PDF file not found: ${filePath}`);
        }
        
        const stats = await fs.stat(filePath);
        if (stats.size === 0) {
            throw new Error(`PDF file is empty: ${filePath}`);
        }
        
        logger.info(`🖨️  Printing file: ${filePath} (${stats.size} bytes)`);
        
        const printOptions = {
            printer: config.printerName || 'Default Printer',
            copies: config.printCopies || 1,
        };
        
        // Add additional options if needed
        if (config.printerOptions) {
            Object.assign(printOptions, config.printerOptions);
        }
        
        await print(filePath, printOptions);
        logger.info(`✅ Successfully sent ${filePath} to printer '${printOptions.printer}'`);
        
    } catch (error) {
        logger.error(`❌ Error printing file ${filePath}:`, error);
        
        // Log specific error types
        if (error.message.includes('printer not found') || error.message.includes('printer')) {
            logger.error(`Check printer name: '${config.printerName}'. Available printers may be listed with 'pdf-to-printer list' command.`);
        }
        
        // Don't throw the error - printing failure shouldn't stop the entire process
        // but we should notify about it
        throw error; // Re-throw to allow caller to handle notification
    }
}

/**
 * Lists available printers (for debugging/setup purposes)
 * @returns {Promise<Array>} List of available printers
 */
async function listPrinters() {
    try {
        const { getPrinters } = require('pdf-to-printer');
        const printers = await getPrinters();
        logger.info(`Available printers: ${printers.map(p => p.name).join(', ')}`);
        return printers;
    } catch (error) {
        logger.error('Error listing printers:', error);
        return [];
    }
}

module.exports = {
    printFile,
    listPrinters,
};
