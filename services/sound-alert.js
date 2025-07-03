const { spawn } = require('child_process');
const config = require('../config/app');
const logger = require('../utils/logger');

/**
 * Plays a loud alert sound for new orders
 * @param {string} orderNumber - The order number for logging
 */
async function playNewOrderAlert(orderNumber) {
    if (!config.soundAlertEnabled) {
        return;
    }
    
    try {
        logger.info(`🔔 Playing alert sound for new order ${orderNumber}`);
        
        // Create a PowerShell command to play multiple beeps for 7-8 seconds
        const psCommand = `
            $duration = 8000  # 8 seconds in milliseconds
            $startTime = Get-Date
            
            while ((Get-Date) - $startTime -lt [TimeSpan]::FromMilliseconds($duration)) {
                [Console]::Beep(1000, 500)  # 1000Hz frequency, 500ms duration
                Start-Sleep -Milliseconds 200  # Brief pause between beeps
            }
        `;
        
        // Execute PowerShell command in background
        const psProcess = spawn('powershell', ['-Command', psCommand], {
            detached: true,
            stdio: 'ignore'
        });
        
        // Don't wait for the process to complete (runs in background)
        psProcess.unref();
        
        logger.info(`✅ Alert sound started for order ${orderNumber}`);
        
    } catch (error) {
        logger.error(`❌ Failed to play alert sound for order ${orderNumber}:`, error);
    }
}

/**
 * Plays a simple system beep (fallback)
 */
async function playSimpleBeep() {
    try {
        const psCommand = '[Console]::Beep(800, 1000)';
        spawn('powershell', ['-Command', psCommand], {
            detached: true,
            stdio: 'ignore'
        });
    } catch (error) {
        logger.error('Failed to play simple beep:', error);
    }
}

module.exports = {
    playNewOrderAlert,
    playSimpleBeep
}; 