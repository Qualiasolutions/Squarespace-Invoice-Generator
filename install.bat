@echo off
setlocal enabledelayedexpansion

:: Set colors for output
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "GREEN=%ESC%[32m"
set "RED=%ESC%[31m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "RESET=%ESC%[0m"

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo %RED%Please run this installer as Administrator%RESET%
    echo Right-click on install.bat and select "Run as administrator"
    pause
    exit /b 1
)

echo %BLUE%================================================================%RESET%
echo %BLUE%    Squarespace Invoice Automation - One-Click Installer%RESET%
echo %BLUE%================================================================%RESET%
echo.
echo %GREEN%Welcome! This installer will set up your invoice automation system.%RESET%
echo %YELLOW%Please wait while we prepare everything for you...%RESET%
echo.

:: Create installation directory
set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

:: Step 1: Check and install Node.js
echo %BLUE%[1/6] Checking Node.js installation...%RESET%
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo %YELLOW%Node.js not found. Downloading and installing...%RESET%
    
    :: Download Node.js installer
    if not exist "node-installer.msi" (
        echo %YELLOW%Downloading Node.js installer...%RESET%
        powershell -Command "(New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v18.17.0/node-v18.17.0-x64.msi', 'node-installer.msi')"
        
        if !errorLevel! neq 0 (
            echo %RED%Failed to download Node.js installer.%RESET%
            echo %RED%Please check your internet connection and try again.%RESET%
            pause
            exit /b 1
        )
    )
    
    :: Install Node.js silently
    echo %YELLOW%Installing Node.js... (this may take a few minutes)%RESET%
    msiexec /i "node-installer.msi" /quiet /norestart
    
    :: Wait for installation to complete
    timeout /t 10 /nobreak >nul
    
    :: Refresh PATH
    call RefreshEnv.cmd >nul 2>&1
    
    :: Check if Node.js is now available
    node --version >nul 2>&1
    if !errorLevel! neq 0 (
        echo %RED%Node.js installation failed.%RESET%
        echo %RED%Please install Node.js manually from https://nodejs.org%RESET%
        pause
        exit /b 1
    )
    
    :: Clean up installer
    if exist "node-installer.msi" del "node-installer.msi"
    
    echo %GREEN%Node.js installed successfully!%RESET%
) else (
    echo %GREEN%Node.js is already installed.%RESET%
)

:: Step 2: Install npm dependencies
echo.
echo %BLUE%[2/6] Installing application dependencies...%RESET%
npm install --production --silent
if %errorLevel% neq 0 (
    echo %RED%Failed to install dependencies.%RESET%
    echo %RED%Please check your internet connection and try again.%RESET%
    pause
    exit /b 1
)
echo %GREEN%Dependencies installed successfully!%RESET%

:: Step 3: Create desktop shortcut
echo.
echo %BLUE%[3/6] Creating desktop shortcuts...%RESET%
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Invoice Automation Dashboard.lnk'); $Shortcut.TargetPath = 'http://localhost:3000'; $Shortcut.Save()"
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Invoice Automation Setup.lnk'); $Shortcut.TargetPath = 'cmd.exe'; $Shortcut.Arguments = '/c cd /d \"' + '%INSTALL_DIR%' + '\" && npm run setup && pause'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Save()"
echo %GREEN%Desktop shortcuts created!%RESET%

:: Step 4: Run setup wizard
echo.
echo %BLUE%[4/6] Starting configuration wizard...%RESET%
echo %YELLOW%Please follow the setup wizard to configure your system.%RESET%
echo.
timeout /t 3 /nobreak >nul

:: Run setup wizard
npm run setup
if %errorLevel% neq 0 (
    echo %RED%Setup wizard failed or was cancelled.%RESET%
    echo %YELLOW%You can run the setup again later using the desktop shortcut.%RESET%
    pause
    exit /b 1
)

:: Step 5: Install Windows service
echo.
echo %BLUE%[5/6] Installing Windows service...%RESET%
npm run install-service
if %errorLevel% neq 0 (
    echo %RED%Service installation failed.%RESET%
    echo %YELLOW%You can install the service manually later.%RESET%
) else (
    echo %GREEN%Windows service installed successfully!%RESET%
)

:: Step 6: Create uninstaller
echo.
echo %BLUE%[6/6] Creating uninstaller...%RESET%
(
echo @echo off
echo echo Uninstalling Squarespace Invoice Automation...
echo npm run uninstall-service
echo echo Service uninstalled.
echo if exist "%USERPROFILE%\Desktop\Invoice Automation Dashboard.lnk" del "%USERPROFILE%\Desktop\Invoice Automation Dashboard.lnk"
echo if exist "%USERPROFILE%\Desktop\Invoice Automation Setup.lnk" del "%USERPROFILE%\Desktop\Invoice Automation Setup.lnk"
echo echo Desktop shortcuts removed.
echo echo Uninstallation complete.
echo pause
) > uninstall.bat
echo %GREEN%Uninstaller created!%RESET%

:: Final success message
echo.
echo %GREEN%================================================================%RESET%
echo %GREEN%           🎉 INSTALLATION COMPLETED SUCCESSFULLY! 🎉%RESET%
echo %GREEN%================================================================%RESET%
echo.
echo %BLUE%Your invoice automation system is now ready!%RESET%
echo.
echo %YELLOW%What's been set up for you:%RESET%
echo %GREEN%✅ Node.js installed (if needed)%RESET%
echo %GREEN%✅ All dependencies installed%RESET%
echo %GREEN%✅ System configured via setup wizard%RESET%
echo %GREEN%✅ Windows service installed and running%RESET%
echo %GREEN%✅ Desktop shortcuts created%RESET%
echo %GREEN%✅ Uninstaller created%RESET%
echo.
echo %YELLOW%Next steps:%RESET%
echo %BLUE%• Your system is now monitoring for orders automatically%RESET%
echo %BLUE%• Access dashboard: http://localhost:3000%RESET%
echo %BLUE%• Use desktop shortcut: "Invoice Automation Dashboard"%RESET%
echo %BLUE%• The service will auto-start with Windows%RESET%
echo.
echo %YELLOW%To test your setup:%RESET%
echo %BLUE%1. Open the dashboard%RESET%
echo %BLUE%2. Check that all status indicators are green%RESET%
echo %BLUE%3. Place a test order in your Squarespace store%RESET%
echo %BLUE%4. Wait for the sound alert and automatic printing%RESET%
echo.
echo %GREEN%Support: Check the INSTALLATION-GUIDE.md for troubleshooting%RESET%
echo.
echo %YELLOW%Press any key to open the dashboard...%RESET%
pause >nul

:: Open dashboard
start http://localhost:3000

echo.
echo %GREEN%Thank you for using Squarespace Invoice Automation!%RESET%
echo %BLUE%The system is now running in the background.%RESET%
pause 