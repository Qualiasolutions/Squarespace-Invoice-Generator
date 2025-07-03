const { Service } = require('node-windows');
const path = require('path');

// Create a new service object
const svc = new Service({
    name: 'Squarespace Invoice Automation',
    script: path.join(__dirname, 'main.js')
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', function() {
    console.log('✅ Service uninstalled successfully!');
    console.log('The service will no longer start automatically with Windows.');
});

// Uninstall the service
console.log('Uninstalling Squarespace Invoice Automation Service...');
svc.uninstall(); 