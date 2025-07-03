const { Service } = require('node-windows');
const path = require('path');

// Create a new service object
const svc = new Service({
    name: 'Squarespace Invoice Automation',
    description: 'Automated invoice generation and printing for Squarespace orders',
    script: path.join(__dirname, 'main.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
    env: [{
        name: "NODE_ENV",
        value: "production"
    }],
    workingDirectory: __dirname,
    allowServiceLogon: true
});

// Listen for the "install" event, which indicates the process is available as a service.
svc.on('install', function() {
    console.log('✅ Service installed successfully!');
    console.log('Starting service...');
    svc.start();
});

svc.on('alreadyinstalled', function() {
    console.log('⚠️  Service already installed');
});

svc.on('start', function() {
    console.log('✅ Service started successfully!');
    console.log('Service is now running and will auto-start with Windows');
});

svc.on('stop', function() {
    console.log('🛑 Service stopped');
});

svc.on('uninstall', function() {
    console.log('🗑️  Service uninstalled');
});

// Install the service
console.log('Installing Squarespace Invoice Automation Service...');
svc.install(); 