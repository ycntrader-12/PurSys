@echo off
setlocal enabledelayedexpansion
title PurSys - Desktop System Maintenance and Optimization

echo ==============================================================
echo       PurSys - Modular Cross-Platform Desktop Utility         
echo ==============================================================
echo.

:: Se positionner dans le dossier du projet
cd /d "%~dp0"

:: Verification de Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'a pas ete detecte dans le PATH.
    echo Veuillez installer Node.js depuis https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Verification des dependances node_modules
if not exist "node_modules\electron" (
    echo [*] Installation des dependances Electron...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERREUR] L'installation via npm install a echoue.
        pause
        exit /b 1
    )
)

:: Verification de la chaine Rust (Cargo)
where cargo >nul 2>&1
if %errorlevel% equ 0 (
    if not exist "src-rust\target\release\pursys-core.exe" (
        echo [*] Compilateur Rust detecte. Compilation de pursys-core en mode release...
        call cargo build --manifest-path src-rust/Cargo.toml --release
    ) else (
        echo [*] Moteur natif Rust detecte : src-rust\target\release\pursys-core.exe
    )
) else (
    echo [*] Compilateur Cargo non installe sur cette machine : activation automatique du moteur fallback integre.
)

echo.
echo [*] Lancement de PurSys Desktop...
echo.

call npm start

if %errorlevel% neq 0 (
    echo.
    echo [!] L'application s'est fermee avec un code d'erreur : %errorlevel%
    pause
)
