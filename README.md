# Squarespace Invoice Automation

Automated invoice generation and printing system for Squarespace orders with production-grade reliability.

## 🚀 Features

- **Automated Order Processing**: Polls Squarespace API for new orders
- **PDF Invoice Generation**: Creates professional invoices using Puppeteer
- **Automatic Printing**: Sends invoices to configured printer
- **Email Notifications**: Alerts on errors and failures
- **Production Ready**: Comprehensive error handling, logging, and monitoring
- **Health Monitoring**: Built-in health checks and status monitoring
- **Graceful Shutdown**: Proper cleanup on application termination

## 📋 Prerequisites

- Node.js 18+ and npm
- Squarespace API access and credentials
- Printer setup (for automatic printing)
- SMTP server access (for notifications)
- PM2 (for production deployment)

## 🛠️ Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd custom-invoice-generator
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual configuration
   ```

3. **Required Environment Variables:**
   - `SQUARESPACE_API_KEY`: Your Squarespace API key
   - `SQUARESPACE_WEBSITE_ID`: Your Squarespace website ID
   - `SHOP_NAME`: Your business name
   - `SHOP_ADDRESS`: Your business address
   - `SHOP_EMAIL`: Your business email

## ⚙️ Configuration

### Squarespace API Setup
1. Go to your Squarespace account settings
2. Generate an API key with commerce permissions
3. Add the API key and website ID to your `.env` file

### Printer Configuration
```env
PRINTER_NAME=Your Printer Name
AUTO_PRINT=true
PRINT_COPIES=1
```

### Email Notifications
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
NOTIFICATION_EMAIL=admin@example.com
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
# Start with PM2
npm run start:prod

# Or manually
npm start
```

### Check Status
```bash
# PM2 status
pm2 status

# View logs
pm2 logs squarespace-invoice-automation

# Health check (if dashboard enabled)
curl http://localhost:3000/health
```

## 📊 Monitoring

### Health Check
If `DASHBOARD_ENABLED=true`, a health endpoint is available at:
```
GET http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-02T18:13:44.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### Log Files
- Application logs: `logs/app.log`
- PM2 logs: `logs/pm2-*.log`

## 🔧 Production Deployment

### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start application
npm run start:prod

# Setup auto-restart on server reboot
pm2 startup
pm2 save
```

### Environment Variables for Production
```env
NODE_ENV=production
LOG_LEVEL=info
DASHBOARD_ENABLED=true
AUTO_PRINT=true
```

### Security Considerations
- Keep your `.env` file secure and never commit it
- Use strong passwords for SMTP authentication
- Regularly rotate API keys
- Monitor logs for suspicious activity
- Use HTTPS for all external communications

## 🚨 Error Handling

The application includes comprehensive error handling:

- **API Failures**: Automatic retries with exponential backoff
- **PDF Generation Errors**: Cleanup and detailed logging
- **Printer Issues**: Non-blocking errors with notifications
- **Configuration Errors**: Validation on startup
- **Unhandled Exceptions**: Graceful shutdown with logging

## 📁 Directory Structure

```
custom-invoice-generator/
├── config/           # Configuration files
├── services/         # Core business logic
├── utils/           # Utility functions
├── templates/       # Invoice templates
├── logs/           # Application logs
├── data/           # Processed orders tracking
├── generated-invoices/ # Generated PDF files
└── dashboard/      # Optional web dashboard
```

## 🔍 Troubleshooting

### Common Issues

1. **"Missing environment variables" error**
   - Ensure `.env` file exists and contains all required variables
   - Check `.env.example` for reference

2. **API connection failures**
   - Verify Squarespace API key and permissions
   - Check network connectivity
   - Review API rate limits

3. **PDF generation fails**
   - Ensure sufficient memory for Puppeteer
   - Check template file exists and is valid
   - Verify file system permissions

4. **Printer not found**
   - List available printers: Use the `listPrinters()` function
   - Verify printer name matches exactly
   - Check printer driver installation

### Debug Mode
Set `LOG_LEVEL=debug` in your `.env` file for detailed logging.

## 🤝 Support

For issues and questions:
1. Check the logs in `logs/app.log`
2. Verify configuration in `.env`
3. Test API connectivity manually
4. Check printer status and availability

## 📝 License

This project is licensed under the MIT License.

---

**Production Ready Checklist:**
- ✅ Environment variable validation
- ✅ Comprehensive error handling
- ✅ Structured logging
- ✅ Health monitoring
- ✅ Graceful shutdown
- ✅ Input validation and sanitization
- ✅ Retry mechanisms
- ✅ File system error handling
- ✅ Memory management
- ✅ Process monitoring with PM2
