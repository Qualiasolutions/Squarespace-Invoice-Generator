const axios = require('axios');
const config = require('../config/app');
const logger = require('../utils/logger');

// Create axios instance with proper configuration
const instance = axios.create({
    baseURL: config.squarespaceApiBaseUrl,
    headers: {
        'Authorization': `Bearer ${config.squarespaceApiKey}`,
        'User-Agent': 'Squarespace-Invoice-Automation/1.0.0'
    },
    timeout: 30000, // 30 second timeout
});

// Add request interceptor for logging
instance.interceptors.request.use(
    (config) => {
        logger.debug(`Making API request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        logger.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for logging
instance.interceptors.response.use(
    (response) => {
        logger.debug(`API response: ${response.status} ${response.statusText}`);
        return response;
    },
    (error) => {
        if (error.response) {
            logger.error(`API error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
            logger.error('API request failed - no response received');
        } else {
            logger.error('API setup error:', error.message);
        }
        return Promise.reject(error);
    }
);

/**
 * Fetches new orders from Squarespace with retry logic.
 * @returns {Promise<Array>} A promise that resolves to an array of orders.
 */
async function getNewOrders() {
    let retries = 0;
    const maxRetries = config.maxRetries || 3;
    
    while (retries <= maxRetries) {
        try {
            // Get orders from the last 2 hours to ensure we don't miss any
            const modifiedAfter = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            const modifiedBefore = new Date().toISOString();
            
            logger.debug(`Fetching orders modified between ${modifiedAfter} and ${modifiedBefore}`);
            
            const response = await instance.get('/commerce/orders', {
                params: { 
                    modifiedAfter, 
                    modifiedBefore,
                    limit: 50 // Limit to prevent overwhelming
                }
            });
            
            // Validate response structure
            if (!response.data) {
                throw new Error('Invalid API response - no data');
            }
            
            const orders = response.data.result || response.data || [];
            
            if (!Array.isArray(orders)) {
                logger.warn('API returned non-array response for orders:', typeof orders);
                return [];
            }
            
            logger.info(`📦 Retrieved ${orders.length} orders from Squarespace API`);
            
            // Filter out invalid orders
            const validOrders = orders.filter(order => {
                if (!order || !order.orderNumber) {
                    logger.warn('Skipping order with missing orderNumber:', order);
                    return false;
                }
                return true;
            });
            
            if (validOrders.length !== orders.length) {
                logger.warn(`Filtered out ${orders.length - validOrders.length} invalid orders`);
            }
            
            return validOrders;
            
        } catch (error) {
            retries++;
            
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                
                // Log detailed error information
                logger.error(`API Error ${status}: ${JSON.stringify(data)}`);
                
                // Handle specific error codes
                if (status === 401) {
                    logger.error('❌ Unauthorized - check your SQUARESPACE_API_KEY');
                    break; // Don't retry authentication errors
                } else if (status === 403) {
                    logger.error('❌ Forbidden - check API permissions');
                    break; // Don't retry permission errors
                } else if (status === 404) {
                    logger.error('❌ Not Found - check your SQUARESPACE_WEBSITE_ID and API_BASE_URL');
                    break; // Don't retry not found errors
                } else if (status >= 500) {
                    logger.warn(`Server error ${status}, will retry (${retries}/${maxRetries})`);
                } else {
                    logger.error(`Client error ${status}, will retry (${retries}/${maxRetries})`);
                }
            } else if (error.code === 'ECONNABORTED') {
                logger.warn(`Request timeout, will retry (${retries}/${maxRetries})`);
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                logger.warn(`Network error, will retry (${retries}/${maxRetries})`);
            } else {
                logger.error('Unexpected error fetching orders:', error.message);
            }
            
            if (retries <= maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff, max 10s
                logger.info(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    logger.error(`❌ Failed to fetch orders after ${maxRetries} retries`);
    return [];
}

/**
 * Health check for the Squarespace API connection
 * @returns {Promise<boolean>} True if API is accessible
 */
async function healthCheck() {
    try {
        const response = await instance.get('/commerce/orders', {
            params: { limit: 1 }
        });
        return response.status === 200;
    } catch (error) {
        logger.error('API health check failed:', error.message);
        return false;
    }
}

module.exports = {
    getNewOrders,
    healthCheck,
};
