const config = require('./config/app');
const logger = require('./utils/logger');
const orderTracker = require('./services/order-tracker');
const fs = require('fs-extra');
const path = require('path');

// Ensure required directories exist
async function ensureDirectories() {
    const directories = [
        'logs',
        'data', 
        'generated-invoices',
        'dashboard',
        'reports',
        'assets'
    ];
    
    for (const dir of directories) {
        try {
            await fs.ensureDir(dir);
            logger.info(`✅ Directory ensured: ${dir}`);
        } catch (error) {
            logger.error(`❌ Failed to create directory ${dir}:`, error);
            throw error;
        }
    }
}

// Graceful shutdown handler
function setupGracefulShutdown() {
    const shutdown = (signal) => {
        logger.info(`Received ${signal}. Starting graceful shutdown...`);
        
        // Add cleanup logic here if needed
        // orderTracker.stop(); // If you implement a stop method
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

// Enhanced dashboard server with API endpoints
function setupDashboard() {
    if (config.dashboardEnabled) {
        const express = require('express');
        const app = express();
        
        // Serve static files
        app.use(express.static('dashboard'));
        
        // API endpoint for system health
        app.get('/api/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: require('./package.json').version,
                environment: config.nodeEnv,
                pollingInterval: config.pollingIntervalMinutes
            });
        });
        
        // API endpoint for recent logs
        app.get('/api/logs', async (req, res) => {
            try {
                const logFile = path.join('logs', 'app.log');
                if (await fs.pathExists(logFile)) {
                    const logs = await fs.readFile(logFile, 'utf-8');
                    const logLines = logs.split('\n')
                        .filter(line => line.trim())
                        .slice(-50) // Last 50 log entries
                        .reverse();
                    res.json({ logs: logLines });
                } else {
                    res.json({ logs: [] });
                }
            } catch (error) {
                res.status(500).json({ error: 'Failed to read logs' });
            }
        });
        
        // API endpoint for processed orders
        app.get('/api/orders', async (req, res) => {
            try {
                const processedOrdersPath = path.join('data', 'processed-orders.json');
                if (await fs.pathExists(processedOrdersPath)) {
                    const orders = await fs.readJson(processedOrdersPath);
                    res.json({ 
                        processedOrders: Array.isArray(orders) ? orders : [],
                        totalProcessed: Array.isArray(orders) ? orders.length : 0
                    });
                } else {
                    res.json({ processedOrders: [], totalProcessed: 0 });
                }
            } catch (error) {
                res.status(500).json({ error: 'Failed to read orders data' });
            }
        });
        
        // API endpoint for system stats
        app.get('/api/stats', async (req, res) => {
            try {
                const stats = {
                    memory: {
                        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                    },
                    uptime: {
                        seconds: Math.floor(process.uptime()),
                        formatted: formatUptime(process.uptime())
                    },
                    directories: {
                        logs: await getDirectorySize('logs'),
                        data: await getDirectorySize('data'),
                        generatedInvoices: await getDirectorySize('generated-invoices'),
                        reports: await getDirectorySize('reports')
                    }
                };
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: 'Failed to get system stats' });
            }
        });

        // API endpoint for system diagnostics
        app.get('/api/diagnostics', async (req, res) => {
            try {
                const systemDiagnostics = require('./services/system-diagnostics');
                const diagnostics = await systemDiagnostics.generateDiagnosticReport();
                res.json(diagnostics);
            } catch (error) {
                res.status(500).json({ error: 'Failed to get diagnostics' });
            }
        });

        // API endpoint for health check
        app.get('/api/health-check', async (req, res) => {
            try {
                const systemDiagnostics = require('./services/system-diagnostics');
                const health = await systemDiagnostics.performHealthCheck();
                res.json(health);
            } catch (error) {
                res.status(500).json({ error: 'Failed to perform health check' });
            }
        });
        
        // Serve dashboard homepage
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
        });
        
        app.listen(config.dashboardPort, () => {
            logger.info(`🚀 Dashboard server running on port ${config.dashboardPort}`);
            logger.info(`Dashboard available at: http://localhost:${config.dashboardPort}`);
        });
    }
}

// Helper function to format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

// Helper function to get directory size
async function getDirectorySize(dirPath) {
    try {
        if (!await fs.pathExists(dirPath)) return { files: 0, size: '0 B' };
        
        const files = await fs.readdir(dirPath);
        let totalSize = 0;
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
                totalSize += stats.size;
            }
        }
        
        return {
            files: files.length,
            size: formatFileSize(totalSize)
        };
    } catch (error) {
        return { files: 0, size: '0 B' };
    }
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Main application startup
async function startApplication() {
    try {
        logger.info('🚀 Starting Squarespace Invoice Automation...');
        logger.info(`Environment: ${config.nodeEnv}`);
        
        // Ensure directories exist
        await ensureDirectories();
        
        // Setup graceful shutdown
        setupGracefulShutdown();
        
        // Setup dashboard with API endpoints
        setupDashboard();
        
        // Start order tracking service
        logger.info('Starting order tracking service...');
        orderTracker.start();
        
        logger.info('✅ Application started successfully');
        logger.info(`Polling interval: ${config.pollingIntervalMinutes} minutes`);
        
    } catch (error) {
        logger.error('❌ Failed to start application:', error);
        process.exit(1);
    }
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Start the application
startApplication();
