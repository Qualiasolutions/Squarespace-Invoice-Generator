const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs-extra');
const path = require('path');
const { getPrinters } = require('pdf-to-printer');
const axios = require('axios');

console.log(chalk.blue(figlet.textSync('Invoice Pro', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default'
})));

console.log(chalk.green('Welcome to the Squarespace Invoice Automation Setup Wizard!'));
console.log(chalk.yellow('This wizard will help you configure your invoice automation system.\n'));

async function runSetup() {
    try {
        // Check if .env already exists
        const envExists = await fs.pathExists('.env');
        if (envExists) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'Configuration file already exists. Do you want to overwrite it?',
                    default: false
                }
            ]);
            
            if (!overwrite) {
                console.log(chalk.yellow('Setup cancelled. Your existing configuration is preserved.'));
                return;
            }
        }

        const config = await collectConfiguration();
        await generateConfigFile(config);
        await promptServiceInstallation();

    } catch (error) {
        console.error(chalk.red('\n❌ Setup failed:'), error.message);
        process.exit(1);
    }
}

async function collectConfiguration() {
    const config = {};
    
    // API Configuration
    console.log(chalk.blue('\n📋 Step 1: Squarespace API Configuration'));
    config.api = await inquirer.prompt([
        {
            type: 'input',
            name: 'apiKey',
            message: 'Enter your Squarespace API Key:',
            validate: (input) => input.length > 0 ? true : 'API Key is required'
        },
        {
            type: 'input',
            name: 'websiteId',
            message: 'Enter your Squarespace Website ID:',
            validate: (input) => input.length > 0 ? true : 'Website ID is required'
        },
        {
            type: 'input',
            name: 'apiBaseUrl',
            message: 'Enter API Base URL:',
            default: 'https://api.squarespace.com/1.0'
        }
    ]);

    // Test API connection
    await testApiConnection(config.api);

    // Business Information
    console.log(chalk.blue('\n🏪 Step 2: Business Information'));
    config.business = await inquirer.prompt([
        {
            type: 'input',
            name: 'shopName',
            message: 'Enter your business name:',
            validate: (input) => input.length > 0 ? true : 'Business name is required'
        },
        {
            type: 'input',
            name: 'shopAddress',
            message: 'Enter your business address:',
            validate: (input) => input.length > 0 ? true : 'Business address is required'
        },
        {
            type: 'input',
            name: 'shopEmail',
            message: 'Enter your business email:',
            validate: (input) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(input) ? true : 'Please enter a valid email address';
            }
        },
        {
            type: 'input',
            name: 'shopPhone',
            message: 'Enter your business phone (optional):',
            default: ''
        },
        {
            type: 'input',
            name: 'vatNumber',
            message: 'Enter your VAT/Tax registration number:',
            default: ''
        }
    ]);

    // Printer Configuration
    config.printer = await configurePrinter();
    
    // Notification Settings
    config.notifications = await configureNotifications();
    
    // Dashboard Settings
    config.dashboard = await configureDashboard();
    
    return config;
}

async function testApiConnection(apiConfig) {
    console.log(chalk.yellow('\n🔍 Testing API connection...'));
    try {
        const response = await axios.get(`${apiConfig.apiBaseUrl}/commerce/orders`, {
            headers: {
                'Authorization': `Bearer ${apiConfig.apiKey}`,
                'User-Agent': 'Invoice-Setup-Wizard'
            },
            params: { limit: 1 }
        });
        console.log(chalk.green('✅ API connection successful!'));
    } catch (error) {
        console.log(chalk.red('❌ API connection failed. Please check your credentials.'));
        console.log(chalk.red(`Error: ${error.message}`));
        
        const { continue: continueSetup } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'continue',
                message: 'Do you want to continue with the setup anyway?',
                default: false
            }
        ]);
        
        if (!continueSetup) {
            console.log(chalk.yellow('Setup cancelled.'));
            process.exit(0);
        }
    }
}

async function configurePrinter() {
    console.log(chalk.blue('\n🖨️ Step 3: Printer Configuration'));
    
    // Get available printers
    console.log(chalk.yellow('Detecting available printers...'));
    let printers = [];
    try {
        printers = await getPrinters();
        console.log(chalk.green(`✅ Found ${printers.length} printer(s)`));
    } catch (error) {
        console.log(chalk.red('❌ Could not detect printers automatically'));
    }

    const printerChoices = printers.map(p => ({
        name: `${p.name} (${p.status || 'Unknown status'})`,
        value: p.name
    }));

    printerChoices.push({
        name: 'Enter printer name manually',
        value: 'MANUAL'
    });

    let selectedPrinter = '';
    if (printerChoices.length > 1) {
        const { printer } = await inquirer.prompt([
            {
                type: 'list',
                name: 'printer',
                message: 'Select your printer:',
                choices: printerChoices
            }
        ]);
        selectedPrinter = printer;
    }

    if (selectedPrinter === 'MANUAL' || printerChoices.length === 1) {
        const { manualPrinter } = await inquirer.prompt([
            {
                type: 'input',
                name: 'manualPrinter',
                message: 'Enter your printer name:',
                default: 'Brother HL-L2865DW',
                validate: (input) => input.length > 0 ? true : 'Printer name is required'
            }
        ]);
        selectedPrinter = manualPrinter;
    }

    const printConfig = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'autoPrint',
            message: 'Enable automatic printing?',
            default: true
        },
        {
            type: 'number',
            name: 'copies',
            message: 'Number of copies to print:',
            default: 1,
            validate: (input) => input > 0 ? true : 'Must be at least 1'
        },
        {
            type: 'number',
            name: 'pollingInterval',
            message: 'Check for new orders every (minutes):',
            default: 5,
            validate: (input) => input >= 1 ? true : 'Must be at least 1 minute'
        }
    ]);

    return {
        name: selectedPrinter,
        ...printConfig
    };
}

async function configureNotifications() {
    console.log(chalk.blue('\n🔔 Step 4: Notification Settings'));
    
    const notificationConfig = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'soundAlert',
            message: 'Enable sound alerts for new orders?',
            default: true
        },
        {
            type: 'confirm',
            name: 'emailNotifications',
            message: 'Enable email notifications for errors?',
            default: false
        }
    ]);

    let emailConfig = {};
    if (notificationConfig.emailNotifications) {
        emailConfig = await inquirer.prompt([
            {
                type: 'input',
                name: 'smtpHost',
                message: 'SMTP Host:',
                default: 'smtp.gmail.com'
            },
            {
                type: 'number',
                name: 'smtpPort',
                message: 'SMTP Port:',
                default: 587
            },
            {
                type: 'input',
                name: 'smtpUser',
                message: 'SMTP Username (email):',
                validate: (input) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailRegex.test(input) ? true : 'Please enter a valid email address';
                }
            },
            {
                type: 'password',
                name: 'smtpPass',
                message: 'SMTP Password (app password recommended):',
                mask: '*'
            },
            {
                type: 'input',
                name: 'notificationEmail',
                message: 'Email address for notifications:',
                validate: (input) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailRegex.test(input) ? true : 'Please enter a valid email address';
                }
            }
        ]);
    }

    return {
        ...notificationConfig,
        ...emailConfig
    };
}

async function configureDashboard() {
    console.log(chalk.blue('\n🎨 Step 5: Dashboard Settings'));
    
    return await inquirer.prompt([
        {
            type: 'confirm',
            name: 'enableDashboard',
            message: 'Enable web dashboard?',
            default: true
        },
        {
            type: 'number',
            name: 'dashboardPort',
            message: 'Dashboard port:',
            default: 3000,
            when: (answers) => answers.enableDashboard
        }
    ]);
}

async function generateConfigFile(config) {
    console.log(chalk.yellow('\n📝 Generating configuration file...'));
    
    const envContent = `# Squarespace API Configuration
SQUARESPACE_API_KEY=${config.api.apiKey}
SQUARESPACE_WEBSITE_ID=${config.api.websiteId}
SQUARESPACE_API_BASE_URL=${config.api.apiBaseUrl}

# Business Information
SHOP_NAME=${config.business.shopName}
SHOP_ADDRESS=${config.business.shopAddress}
SHOP_EMAIL=${config.business.shopEmail}
SHOP_PHONE=${config.business.shopPhone}
SHOP_REGISTRATION_1=${config.business.vatNumber}

# Printer Configuration
PRINTER_NAME=${config.printer.name}
AUTO_PRINT=${config.printer.autoPrint}
PRINT_COPIES=${config.printer.copies}

# Polling Configuration
POLLING_INTERVAL_MINUTES=${config.printer.pollingInterval}

# Notification Settings
SOUND_ALERT_ENABLED=${config.notifications.soundAlert}
${config.notifications.emailNotifications ? `
# Email Notifications
SMTP_HOST=${config.notifications.smtpHost}
SMTP_PORT=${config.notifications.smtpPort}
SMTP_USER=${config.notifications.smtpUser}
SMTP_PASS=${config.notifications.smtpPass}
NOTIFICATION_EMAIL=${config.notifications.notificationEmail}` : ''}

# Dashboard Settings
DASHBOARD_ENABLED=${config.dashboard.enableDashboard}
${config.dashboard.dashboardPort ? `DASHBOARD_PORT=${config.dashboard.dashboardPort}` : ''}

# System Configuration
NODE_ENV=production
LOG_LEVEL=info
`;

    await fs.writeFile('.env', envContent);
    console.log(chalk.green('✅ Configuration file created successfully!'));
}

async function promptServiceInstallation() {
    console.log(chalk.blue('\n🚀 Next Steps:'));
    console.log(chalk.white('1. Install as Windows service: npm run install-service'));
    console.log(chalk.white('2. Start the application: npm start'));
    console.log(chalk.white('3. Access dashboard at: http://localhost:3000'));
    
    const { installService } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'installService',
            message: 'Would you like to install as Windows service now?',
            default: true
        }
    ]);

    if (installService) {
        console.log(chalk.yellow('\n🔧 Installing Windows service...'));
        const { spawn } = require('child_process');
        const serviceInstall = spawn('npm', ['run', 'install-service'], { stdio: 'inherit' });
        
        serviceInstall.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green('\n✅ Setup completed successfully!'));
                console.log(chalk.yellow('Your invoice automation system is now ready and will start automatically with Windows.'));
            } else {
                console.log(chalk.red('\n❌ Service installation failed. You can install it manually later using: npm run install-service'));
            }
        });
    } else {
        console.log(chalk.green('\n✅ Setup completed successfully!'));
        console.log(chalk.yellow('Run "npm start" to start the application manually.'));
    }
}

// Run the setup wizard
runSetup(); 