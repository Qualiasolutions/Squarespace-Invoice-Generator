const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config/app');
const logger = require('../utils/logger');
const { formatDate, formatCurrency } = require('../utils/helpers');

/**
 * Generates a PDF invoice for an order.
 * @param {object} order The order object from Squarespace.
 * @returns {Promise<string>} The path to the generated PDF.
 */
async function generateInvoice(order) {
    // Validate order input
    if (!order || !order.orderNumber) {
        throw new Error('Invalid order: missing orderNumber');
    }
    
    if (!order.lineItems || !Array.isArray(order.lineItems) || order.lineItems.length === 0) {
        throw new Error('Invalid order: missing or empty lineItems');
    }
    
    logger.info(`🧾 Starting invoice generation for order ${order.orderNumber}`);
    
    // Ensure output directory exists
    const outputDir = 'generated-invoices';
    await fs.ensureDir(outputDir);
    
    const invoiceData = prepareInvoiceData(order);
    const htmlContent = await populateTemplate(invoiceData);
    const pdfPath = path.join(outputDir, `invoice-${order.orderNumber}.pdf`);

    let browser = null;
    try {
        // Launch browser with production-ready settings
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 800 });
        
        // Set content with timeout
        await page.setContent(htmlContent, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        // Generate PDF with optimized settings
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });
        
        logger.info(`✅ Generated invoice for order ${order.orderNumber} at ${pdfPath}`);
        
        // Verify file was created and has content
        const stats = await fs.stat(pdfPath);
        if (stats.size === 0) {
            throw new Error('Generated PDF file is empty');
        }
        
        logger.debug(`PDF file size: ${stats.size} bytes`);
        return pdfPath;
        
    } catch (error) {
        logger.error(`❌ Error generating PDF for order ${order.orderNumber}:`, error);
        
        // Clean up partial file if it exists
        try {
            if (await fs.pathExists(pdfPath)) {
                await fs.remove(pdfPath);
            }
        } catch (cleanupError) {
            logger.warn('Failed to clean up partial PDF file:', cleanupError);
        }
        
        throw error;
    } finally {
        // Ensure browser is closed
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                logger.warn('Error closing browser:', closeError);
            }
        }
    }
}

/**
 * Populates the HTML template with invoice data.
 * @param {object} data The invoice data.
 * @returns {Promise<string>} The HTML content with data.
 */
async function populateTemplate(data) {
    const templatePath = path.join('templates', 'invoice-template.html');
    
    // Check if template exists
    if (!await fs.pathExists(templatePath)) {
        throw new Error(`Invoice template not found at ${templatePath}`);
    }
    
    let template = await fs.readFile(templatePath, 'utf-8');
    
    // Validate template has basic structure
    if (!template.includes('{{') || template.length < 100) {
        throw new Error('Invalid or corrupted invoice template');
    }

    for (const key in data) {
        if (key === 'items') {
            const itemsRegex = /{{\#each items}}([\s\S]*?){{\/each}}/;
            const itemTemplateMatch = template.match(itemsRegex);
            
            if (itemTemplateMatch) {
                const itemTemplate = itemTemplateMatch[1];
                let itemsHtml = '';
                
                data.items.forEach((item, index) => {
                    let itemHtml = itemTemplate;
                    for (const itemKey in item) {
                        const regex = new RegExp(`{{${itemKey}}}`, 'g');
                        // Format currency values before replacing
                        let value = item[itemKey];
                        if (typeof value === 'number' && itemKey.includes('amount')) {
                            value = formatCurrency(value);
                        }
                        itemHtml = itemHtml.replace(regex, value || '');
                    }
                    itemsHtml += itemHtml;
                });
                template = template.replace(itemsRegex, itemsHtml);
            }
        } else {
            const regex = new RegExp(`{{${key}}}`, 'g');
            template = template.replace(regex, data[key] || '');
        }
    }
    
    // Check for unreplaced placeholders
    const unreplacedPlaceholders = template.match(/{{\w+}}/g);
    if (unreplacedPlaceholders) {
        logger.warn(`Unreplaced placeholders in template: ${unreplacedPlaceholders.join(', ')}`);
    }
    
    return template;
}

/**
 * Prepares the data for the invoice template.
 * @param {object} order The order object.
 * @returns {object} The prepared invoice data.
 */
function prepareInvoiceData(order) {
    try {
        // Validate order structure
        if (!order.lineItems || !Array.isArray(order.lineItems)) {
            throw new Error('Order missing lineItems array');
        }
        
        const items = order.lineItems.map((item, index) => {
            // Validate line item
            if (!item.productName) {
                logger.warn(`Line item ${index} missing productName`);
            }
            
            const quantity = item.quantity || 1;
            const unitPrice = item.unitPrice?.value || item.unitPrice || 0;
            const netAmount = unitPrice * quantity;
            const vatAmount = netAmount * (config.vatRate || 0.24);
            const totalAmount = netAmount + vatAmount;
            
            return {
                code: item.sku || item.productId || `ITEM-${index + 1}`,
                description: item.productName || 'Unknown Product',
                quantity: quantity,
                price: unitPrice,
                unit: item.unit || 'τμχ', // Default to 'piece' in Greek
                discount: item.discount || 0,
                net_amount: netAmount,
                vat_amount: vatAmount,
                total_amount: totalAmount,
            };
        });

        const netTotal = items.reduce((sum, item) => sum + item.net_amount, 0);
        const vatTotal = items.reduce((sum, item) => sum + item.vat_amount, 0);
        const grandTotal = netTotal + vatTotal;
        
        // Prepare customer information
        const customerInfo = order.customerInfo || order.billingAddress || {};
        
        return {
            // Shop information
            SHOP_NAME: config.shopName || 'Shop Name',
            SHOP_ADDRESS: config.shopAddress || 'Shop Address',
            SHOP_PHONE: config.shopPhone || '',
            SHOP_EMAIL: config.shopEmail || '',
            SHOP_REGISTRATION_1: config.shopRegistration1 || '',
            SHOP_REGISTRATION_2: config.shopRegistration2 || '',
            SHOP_LOGO_URL: config.shopLogoUrl || '',
            
            // Invoice information
            INVOICE_NUMBER: order.orderNumber,
            PAGE_NUMBER: 1,
            VAT_NUMBER: config.shopRegistration1 ? `${config.country || 'GR'}${config.shopRegistration1}` : '',
            INVOICE_DATE: formatDate(order.createdOn ? new Date(order.createdOn) : new Date()),
            USER_NAME: customerInfo.firstName && customerInfo.lastName ? 
                      `${customerInfo.firstName} ${customerInfo.lastName}` : 'Customer',
            CUSTOMER_ADDRESS: customerInfo.address1 || '',
            RECEIPT_INFO: order.receiptInfo || 'N/A',
            PROJECT_NUMBER: order.projectNumber || 'N/A',
            
            // Items and totals
            items: items,
            NET_TOTAL: formatCurrency(netTotal),
            VAT_TOTAL: formatCurrency(vatTotal),
            GRAND_TOTAL: formatCurrency(grandTotal),
            
            // Additional information
            CURRENCY: config.currency || 'EUR',
            VAT_RATE_PERCENT: Math.round((config.vatRate || 0.24) * 100),
        };
    } catch (error) {
        logger.error('Error preparing invoice data:', error);
        throw new Error(`Failed to prepare invoice data: ${error.message}`);
    }
}

module.exports = {
    generateInvoice,
};

