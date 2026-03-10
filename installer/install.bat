@echo off
setlocal enabledelayedexpansion
title Marinara Engine — Installer
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   Marinara Engine — Windows Installer     ║
echo  ║   v1.3.0                                  ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── Choose install location ──
set "INSTALL_DIR=%USERPROFILE%\Marinara-Engine"
set "USER_INPUT="
set /p "USER_INPUT=  Install location [%INSTALL_DIR%]: "
if not "%USER_INPUT%"=="" set "INSTALL_DIR=%USER_INPUT%"

:: ── Check prerequisites ──
echo.
echo  [..] Checking prerequisites...

:: ── Node.js ──
set "NEED_NODE=0"
where node >nul 2>&1
if %errorlevel% neq 0 (
    set "NEED_NODE=1"
) else (
    for /f "tokens=1 delims=." %%a in ('node -v') do set "NODE_RAW=%%a"
    set "NODE_MAJOR=!NODE_RAW:v=!"
    if not defined NODE_MAJOR set "NEED_NODE=1"
    if defined NODE_MAJOR if !NODE_MAJOR! LSS 20 set "NEED_NODE=1"
)

if "!NEED_NODE!"=="1" (
    echo  [..] Node.js 20+ not found — downloading installer...
    set "NODE_MSI=%TEMP%\node-lts-install.msi"
    powershell -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi' -OutFile '!NODE_MSI!' -UseBasicParsing } catch { exit 1 }"
    if !errorlevel! neq 0 (
        echo  [ERROR] Failed to download Node.js. Please install manually from https://nodejs.org
        pause
        exit /b 1
    )
    echo  [..] Installing Node.js (this may request admin permissions)...
    msiexec /i "!NODE_MSI!" /qb
    if !errorlevel! neq 0 (
        echo  [ERROR] Node.js installation failed. Please install manually from https://nodejs.org
        pause
        exit /b 1
    )
    del "!NODE_MSI!" 2>nul
    :: Refresh PATH so node is available in this session
    for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%B"
    for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USR_PATH=%%B"
    set "PATH=!SYS_PATH!;!USR_PATH!"
    where node >nul 2>&1
    if !errorlevel! neq 0 (
        echo  [ERROR] Node.js was installed but not found in PATH. Please restart your terminal and re-run.
        pause
        exit /b 1
    )
    echo  [OK] Node.js installed successfully
)
echo  [OK] Node.js found:
node -v

:: ── Git ──
set "NEED_GIT=0"
where git >nul 2>&1
if %errorlevel% neq 0 set "NEED_GIT=1"

if "!NEED_GIT!"=="1" (
    echo  [..] Git not found — downloading installer...
    set "GIT_EXE=%TEMP%\git-install.exe"
    powershell -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $rel = Invoke-RestMethod -Uri 'https://api.github.com/repos/git-for-windows/git/releases/latest' -UseBasicParsing; $asset = $rel.assets | Where-Object { $_.name -match '64-bit\.exe$' } | Select-Object -First 1; Invoke-WebRequest -Uri $asset.browser_download_url -OutFile '!GIT_EXE!' -UseBasicParsing } catch { exit 1 }"
    if !errorlevel! neq 0 (
        echo  [ERROR] Failed to download Git. Please install manually from https://git-scm.com
        pause
        exit /b 1
    )
    echo  [..] Installing Git (this may request admin permissions)...
    "!GIT_EXE!" /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"
    if !errorlevel! neq 0 (
        echo  [ERROR] Git installation failed. Please install manually from https://git-scm.com
        pause
        exit /b 1
    )
    del "!GIT_EXE!" 2>nul
    :: Refresh PATH
    for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%B"
    for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USR_PATH=%%B"
    set "PATH=!SYS_PATH!;!USR_PATH!"
    where git >nul 2>&1
    if !errorlevel! neq 0 (
        echo  [ERROR] Git was installed but not found in PATH. Please restart your terminal and re-run.
        pause
        exit /b 1
    )
    echo  [OK] Git installed successfully
)
echo  [OK] Git found

:: ── Install pnpm if needed ──
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [..] Installing pnpm...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to install pnpm. Please run: npm install -g pnpm
        pause
        exit /b 1
    )
)
echo  [OK] pnpm found

:: ── Clone repository ──
echo.
if exist "%INSTALL_DIR%\.git" (
    echo  [..] Existing installation found, updating...
    cd /d "%INSTALL_DIR%"
    git pull
) else (
    echo  [..] Cloning Marinara Engine to %INSTALL_DIR%...
    git clone https://github.com/SpicyMarinara/Marinara-Engine.git "%INSTALL_DIR%"
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to clone repository.
        pause
        exit /b 1
    )
    cd /d "%INSTALL_DIR%"
)

:: ── Install dependencies ──
echo.
echo  [..] Installing dependencies (this may take a few minutes)...
call pnpm install
if %errorlevel% neq 0 (
    echo  [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo  [OK] Dependencies installed

:: ── Build ──
echo.
echo  [..] Building Marinara Engine...
call pnpm build
if %errorlevel% neq 0 (
    echo  [ERROR] Build failed.
    pause
    exit /b 1
)
echo  [OK] Build complete

:: ── Sync database ──
echo  [..] Setting up database...
call pnpm db:push 2>nul
echo  [OK] Database ready

:: ── Create desktop shortcut ──
echo  [..] Creating desktop shortcut...
set "SHORTCUT=%USERPROFILE%\Desktop\Marinara Engine.lnk"
set "VBS=%TEMP%\create_shortcut.vbs"

(
    echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
    echo sLinkFile = "%SHORTCUT%"
    echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
    echo oLink.TargetPath = "%INSTALL_DIR%\start.bat"
    echo oLink.WorkingDirectory = "%INSTALL_DIR%"
    echo oLink.Description = "Marinara Engine — AI Chat ^& Roleplay"
    echo oLink.Save
) > "%VBS%"
cscript //nologo "%VBS%"
del "%VBS%"
echo  [OK] Desktop shortcut created

:: ── Done ──
echo.
echo  ══════════════════════════════════════════
echo    Installation complete!
echo.
echo    To start: double-click "Marinara Engine"
echo    on your Desktop, or run start.bat in:
echo    %INSTALL_DIR%
echo.
echo    The app opens in your browser at:
echo    http://localhost:7860
echo  ══════════════════════════════════════════
echo.
pause
