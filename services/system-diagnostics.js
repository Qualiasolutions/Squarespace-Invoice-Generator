const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const config = require('../config/app');
const logger = require('../utils/logger');
const { getPrinters } = require('pdf-to-printer');
const squarespaceApi = require('./squarespace-api');

/**
 * Performs comprehensive system health check
 * @returns {Object} System health status
 */
async function performHealthCheck() {
    const healthStatus = {
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        components: {},
        system: await getSystemInfo(),
        errors: []
    };

    // Check API connectivity
    try {
        const apiHealth = await squarespaceApi.healthCheck();
        healthStatus.components.api = {
            status: apiHealth ? 'healthy' : 'unhealthy',
            lastCheck: new Date().toISOString()
        };
        if (!apiHealth) {
            healthStatus.errors.push('Squarespace API connection failed');
            healthStatus.overall = 'unhealthy';
        }
    } catch (error) {
        healthStatus.components.api = {
            status: 'unhealthy',
            error: error.message,
            lastCheck: new Date().toISOString()
        };
        healthStatus.errors.push(`API check failed: ${error.message}`);
        healthStatus.overall = 'unhealthy';
    }

    // Check printer connectivity
    try {
        const printers = await getPrinters();
        const targetPrinter = printers.find(p => p.name === config.printerName);
        
        healthStatus.components.printer = {
            status: targetPrinter ? 'healthy' : 'warning',
            printerName: config.printerName,
            available: !!targetPrinter,
            totalPrinters: printers.length,
            lastCheck: new Date().toISOString()
        };
        
        if (!targetPrinter) {
            healthStatus.errors.push(`Configured printer '${config.printerName}' not found`);
            if (healthStatus.overall === 'healthy') {
                healthStatus.overall = 'warning';
            }
        }
    } catch (error) {
        healthStatus.components.printer = {
            status: 'unhealthy',
            error: error.message,
            lastCheck: new Date().toISOString()
        };
        healthStatus.errors.push(`Printer check failed: ${error.message}`);
        healthStatus.overall = 'unhealthy';
    }

    // Check file system health
    try {
        const fsHealth = await checkFileSystemHealth();
        healthStatus.components.filesystem = fsHealth;
        
        if (fsHealth.status !== 'healthy') {
            healthStatus.errors.push('File system issues detected');
            healthStatus.overall = 'unhealthy';
        }
    } catch (error) {
        healthStatus.components.filesystem = {
            status: 'unhealthy',
            error: error.message,
            lastCheck: new Date().toISOString()
        };
        healthStatus.errors.push(`File system check failed: ${error.message}`);
        healthStatus.overall = 'unhealthy';
    }

    // Check configuration
    try {
        const configHealth = await checkConfiguration();
        healthStatus.components.configuration = configHealth;
        
        if (configHealth.status !== 'healthy') {
            healthStatus.errors.push('Configuration issues detected');
            if (healthStatus.overall === 'healthy') {
                healthStatus.overall = 'warning';
            }
        }
    } catch (error) {
        healthStatus.components.configuration = {
            status: 'unhealthy',
            error: error.message,
            lastCheck: new Date().toISOString()
        };
        healthStatus.errors.push(`Configuration check failed: ${error.message}`);
        healthStatus.overall = 'unhealthy';
    }

    // Log health status
    if (healthStatus.overall === 'healthy') {
        logger.info('🟢 System health check passed');
    } else if (healthStatus.overall === 'warning') {
        logger.warn('🟡 System health check completed with warnings');
    } else {
        logger.error('🔴 System health check failed');
    }

    return healthStatus;
}

/**
 * Gets system information
 * @returns {Object} System information
 */
async function getSystemInfo() {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    return {
        hostname: os.hostname(),
        platform: os.platform(),
        architecture: os.arch(),
        nodeVersion: process.version,
        uptime: {
            seconds: Math.floor(uptime),
            formatted: formatUptime(uptime)
        },
        memory: {
            used: Math.round(memory.heapUsed / 1024 / 1024),
            total: Math.round(memory.heapTotal / 1024 / 1024),
            external: Math.round(memory.external / 1024 / 1024)
        },
        cpu: {
            model: os.cpus()[0].model,
            cores: os.cpus().length
        },
        loadAverage: os.loadavg(),
        freeMemory: Math.round(os.freemem() / 1024 / 1024),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024)
    };
}

/**
 * Checks file system health
 * @returns {Object} File system health status
 */
async function checkFileSystemHealth() {
    const health = {
        status: 'healthy',
        directories: {},
        lastCheck: new Date().toISOString()
    };

    const requiredDirs = ['logs', 'data', 'generated-invoices', 'reports'];
    
    for (const dir of requiredDirs) {
        try {
            const exists = await fs.pathExists(dir);
            const stats = exists ? await fs.stat(dir) : null;
            
            health.directories[dir] = {
                exists,
                readable: exists ? true : false,
                writable: exists ? true : false,
                size: stats ? await getDirSize(dir) : 0
            };
            
            if (!exists) {
                health.status = 'unhealthy';
            }
        } catch (error) {
            health.directories[dir] = {
                exists: false,
                error: error.message
            };
            health.status = 'unhealthy';
        }
    }

    return health;
}

/**
 * Checks configuration health
 * @returns {Object} Configuration health status
 */
async function checkConfiguration() {
    const health = {
        status: 'healthy',
        issues: [],
        lastCheck: new Date().toISOString()
    };

    // Check required configuration
    const requiredConfig = [
        'squarespaceApiKey',
        'squarespaceWebsiteId',
        'shopName',
        'shopAddress',
        'shopEmail'
    ];

    for (const key of requiredConfig) {
        if (!config[key]) {
            health.issues.push(`Missing required configuration: ${key}`);
            health.status = 'warning';
        }
    }

    // Check .env file
    try {
        const envExists = await fs.pathExists('.env');
        if (!envExists) {
            health.issues.push('.env file not found');
            health.status = 'warning';
        }
    } catch (error) {
        health.issues.push(`Error checking .env file: ${error.message}`);
        health.status = 'unhealthy';
    }

    return health;
}

/**
 * Gets directory size
 * @param {string} dirPath - Directory path
 * @returns {number} Size in bytes
 */
async function getDirSize(dirPath) {
    try {
        const files = await fs.readdir(dirPath);
        let totalSize = 0;
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
                totalSize += stats.size;
            } else if (stats.isDirectory()) {
                totalSize += await getDirSize(filePath);
            }
        }
        
        return totalSize;
    } catch (error) {
        return 0;
    }
}

/**
 * Formats uptime in human readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

/**
 * Generates diagnostic report
 * @returns {Object} Diagnostic report
 */
async function generateDiagnosticReport() {
    const report = {
        timestamp: new Date().toISOString(),
        version: require('../package.json').version,
        environment: config.nodeEnv,
        healthCheck: await performHealthCheck(),
        recentActivity: await getRecentActivity(),
        configuration: {
            pollingInterval: config.pollingIntervalMinutes,
            autoPrint: config.autoPrint,
            soundAlert: config.soundAlertEnabled,
            dashboard: config.dashboardEnabled,
            emailNotifications: !!(config.smtpUser && config.notificationEmail)
        }
    };

    return report;
}

/**
 * Gets recent activity from logs
 * @returns {Object} Recent activity summary
 */
async function getRecentActivity() {
    try {
        const logFile = path.join('logs', 'app.log');
        if (!await fs.pathExists(logFile)) {
            return { orders: [], errors: [], totalLines: 0 };
        }

        const logs = await fs.readFile(logFile, 'utf-8');
        const lines = logs.split('\n').filter(line => line.trim());
        
        const recentLines = lines.slice(-100); // Last 100 log entries
        
        const orders = recentLines
            .filter(line => line.includes('Successfully processed order'))
            .map(line => {
                const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*Successfully processed order (\w+)/);
                return match ? { timestamp: match[1], orderNumber: match[2] } : null;
            })
            .filter(Boolean)
            .slice(-10); // Last 10 orders

        const errors = recentLines
            .filter(line => line.includes('error'))
            .map(line => {
                const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*error: (.+)/i);
                return match ? { timestamp: match[1], message: match[2] } : null;
            })
            .filter(Boolean)
            .slice(-5); // Last 5 errors

        return {
            orders,
            errors,
            totalLines: lines.length
        };
    } catch (error) {
        return { orders: [], errors: [], totalLines: 0, error: error.message };
    }
}

module.exports = {
    performHealthCheck,
    getSystemInfo,
    generateDiagnosticReport,
    getRecentActivity
}; 