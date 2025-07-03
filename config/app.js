require('dotenv').config();

// Configuration validation helper
function validateConfig() {
    const requiredVars = [
        'SQUARESPACE_API_KEY',
        'SQUARESPACE_WEBSITE_ID', 
        'SQUARESPACE_API_BASE_URL',
        'SHOP_NAME',
        'SHOP_ADDRESS',
        'SHOP_EMAIL'
    ];
    
    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please create a .env file based on .env.example');
        process.exit(1);
    }
}

// Validate configuration on startup
validateConfig();

// Helper function to parse integer with default
function parseIntWithDefault(value, defaultValue) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

// Helper function to parse float with default
function parseFloatWithDefault(value, defaultValue) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

module.exports = {
    // Squarespace API Configuration
    squarespaceApiKey: process.env.SQUARESPACE_API_KEY,
    squarespaceWebsiteId: process.env.SQUARESPACE_WEBSITE_ID,
    squarespaceApiBaseUrl: process.env.SQUARESPACE_API_BASE_URL,

    // Polling Configuration
    pollingIntervalMinutes: parseIntWithDefault(process.env.POLLING_INTERVAL_MINUTES, 5),
    maxRetries: parseIntWithDefault(process.env.MAX_RETRIES, 3),

    // Printer Configuration
    printerName: process.env.PRINTER_NAME || 'Default Printer',
    printCopies: parseIntWithDefault(process.env.PRINT_COPIES, 1),
    autoPrint: process.env.AUTO_PRINT === 'true',

    // Email Notifications
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseIntWithDefault(process.env.SMTP_PORT, 587),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    notificationEmail: process.env.NOTIFICATION_EMAIL,

    // Greek Invoice Configuration
    shopName: process.env.SHOP_NAME,
    shopAddress: process.env.SHOP_ADDRESS,
    shopPhone: process.env.SHOP_PHONE || '',
    shopEmail: process.env.SHOP_EMAIL,
    shopLogoUrl: process.env.SHOP_LOGO_URL || '',
    shopRegistration1: process.env.SHOP_REGISTRATION_1 || '',
    shopRegistration2: process.env.SHOP_REGISTRATION_2 || '',
    currency: process.env.CURRENCY || 'EUR',
    vatRate: parseFloatWithDefault(process.env.VAT_RATE, 0.24),
    country: process.env.COUNTRY || 'GR',
    language: process.env.LANGUAGE || 'el',

    // System Configuration
    logLevel: process.env.LOG_LEVEL || 'info',
    logRetentionDays: parseIntWithDefault(process.env.LOG_RETENTION_DAYS, 30),
    dataBackupEnabled: process.env.DATA_BACKUP_ENABLED === 'true',

    // Web Dashboard (Optional)
    dashboardPort: parseIntWithDefault(process.env.DASHBOARD_PORT, 3000),
    dashboardEnabled: process.env.DASHBOARD_ENABLED === 'true',
    
    // Sound Alert Configuration
    soundAlertEnabled: process.env.SOUND_ALERT_ENABLED === 'true',
    
    // Environment
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production'
};
