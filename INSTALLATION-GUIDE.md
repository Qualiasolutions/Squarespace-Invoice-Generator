# 📦 Squarespace Invoice Automation - Installation Guide

## Quick Start (5 Minutes Setup)

### 🎯 **Step 1: Download and Extract**
1. Download the invoice automation package
2. Extract to `C:\InvoiceAutomation\` (or your preferred location)
3. Open Command Prompt as Administrator

### 🔧 **Step 2: Install Dependencies**
```bash
cd C:\InvoiceAutomation
npm install
```

### ⚙️ **Step 3: Run Setup Wizard**
```bash
npm run setup
```

**The setup wizard will guide you through:**
- ✅ Squarespace API configuration
- ✅ Business information
- ✅ Printer detection and setup
- ✅ Notification preferences
- ✅ Email alerts (optional)
- ✅ Windows service installation

### 🚀 **Step 4: Start the Service**
After setup completes, your system will:
- ✅ Auto-start with Windows
- ✅ Monitor for new orders 24/7
- ✅ Generate and print invoices automatically
- ✅ Send notifications when orders arrive

---

## 📋 Prerequisites

### Required Information
- **Squarespace API Key** (from your Squarespace account)
- **Website ID** (from your Squarespace account)
- **Business Information** (name, address, contact details)
- **Printer Name** (will be auto-detected during setup)

### System Requirements
- Windows 10/11
- Node.js 18+ (installer will download if needed)
- Printer connected to PC
- Internet connection

---

## 🛠️ Manual Configuration (Advanced)

If you prefer manual setup, create a `.env` file:

```env
# Squarespace API
SQUARESPACE_API_KEY=your_api_key_here
SQUARESPACE_WEBSITE_ID=your_website_id_here
SQUARESPACE_API_BASE_URL=https://api.squarespace.com/1.0

# Business Information
SHOP_NAME=Your Business Name
SHOP_ADDRESS=Your Business Address
SHOP_EMAIL=your@email.com
SHOP_PHONE=+1234567890
SHOP_REGISTRATION_1=Your_VAT_Number

# Printer Configuration
PRINTER_NAME=Brother HL-L2865DW
AUTO_PRINT=true
PRINT_COPIES=1

# System Settings
POLLING_INTERVAL_MINUTES=5
SOUND_ALERT_ENABLED=true
DASHBOARD_ENABLED=true
DASHBOARD_PORT=3000

# Production Settings
NODE_ENV=production
LOG_LEVEL=info
```

---

## 🎛️ Dashboard Access

Once installed, access your dashboard at:
**http://localhost:3000**

### Dashboard Features:
- 📊 **Real-time monitoring** - See order processing status
- 📈 **System health** - Monitor API, printer, and system status
- 📋 **Order history** - View processed orders
- 🔧 **System diagnostics** - Check system health
- 📱 **Live notifications** - See orders as they come in

---

## 🔧 Service Management

### Start Service
```bash
npm run install-service
```

### Stop Service
```bash
npm run uninstall-service
```

### Check Service Status
- Open Task Manager → Services
- Look for "Squarespace Invoice Automation"

### Manual Start (for testing)
```bash
npm start
```

---

## 🔔 Notification Types

Your system provides multiple notification methods:

### 🔊 **Sound Alerts**
- Loud beep sequence for 8 seconds
- Plays when new orders arrive
- Can be enabled/disabled in setup

### 📱 **Desktop Notifications**
- Windows toast notifications
- Shows order number and customer info
- Appears in system tray

### 📧 **Email Reports** (Optional)
- Daily summary reports
- Weekly comprehensive reports
- Error notifications
- Sent automatically via configured SMTP

---

## 🧪 Testing Your Setup

### Test Order Processing
1. Place a test order in your Squarespace store
2. Wait up to 5 minutes (or your configured polling interval)
3. Check for:
   - Sound alert
   - Desktop notification
   - PDF generation in `generated-invoices/` folder
   - Automatic printing
   - Dashboard update

### Test Dashboard
1. Open http://localhost:3000
2. Verify all system status indicators are green
3. Check recent activity log

### Test Health Check
1. Visit http://localhost:3000/api/health-check
2. Should return JSON with "overall": "healthy"

---

## 🆘 Troubleshooting

### Common Issues

#### **"API Connection Failed"**
- ✅ Check your Squarespace API key
- ✅ Verify website ID is correct
- ✅ Ensure internet connection is working
- ✅ Check API permissions in Squarespace

#### **"Printer Not Found"**
- ✅ Ensure printer is powered on
- ✅ Check printer is connected to PC
- ✅ Verify printer name matches exactly
- ✅ Test print from another application

#### **"Service Won't Start"**
- ✅ Run Command Prompt as Administrator
- ✅ Check Node.js is installed
- ✅ Verify all dependencies are installed (`npm install`)
- ✅ Check .env file exists and is properly configured

#### **"No Orders Being Processed"**
- ✅ Check Squarespace has new orders
- ✅ Verify API credentials are correct
- ✅ Check polling interval setting
- ✅ Review logs in `logs/app.log`

### Log Files
- **Application logs**: `logs/app.log`
- **System logs**: Windows Event Viewer → Application
- **Service logs**: `logs/pm2-*.log`

### Support Commands
```bash
# View recent logs
type logs\app.log | find /i "error"

# Check system health
curl http://localhost:3000/api/health-check

# Test printer connection
npx pdf-to-printer list

# Generate diagnostic report
curl http://localhost:3000/api/diagnostics
```

---

## 🚀 Production Tips

### Performance Optimization
- Set polling interval to 5-10 minutes for optimal performance
- Enable log rotation to prevent large log files
- Schedule regular system maintenance

### Security Best Practices
- Keep API keys secure
- Regularly update the application
- Monitor system logs for anomalies
- Use strong passwords for email accounts

### Backup Recommendations
- Backup `.env` configuration file
- Export processed orders data regularly
- Keep invoice templates backed up

---

## 📞 Support

### Self-Help Resources
1. Check dashboard health status first
2. Review application logs for errors
3. Test individual components (API, printer, etc.)
4. Consult troubleshooting section above

### Getting Help
- 📧 Email diagnostic report for faster support
- 📋 Include log files when reporting issues
- 🔍 Specify exact error messages
- 💻 Mention your system configuration

---

## 🔄 Updates

The system includes built-in update notifications. When updates are available:
1. Stop the service
2. Download new version
3. Run installation again
4. Service will resume automatically

Your configuration and data are preserved during updates.

---

**🎉 Congratulations! Your invoice automation system is now ready to streamline your order processing!** 