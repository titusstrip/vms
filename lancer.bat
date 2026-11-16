@echo off
rem Lance Mini Entrepot en mode developpement sous Windows (double-clic).
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n'est pas installe. Installez la version LTS depuis https://nodejs.org puis relancez ce fichier.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installation des composants, quelques minutes la premiere fois...
  call npm ci
  if errorlevel 1 (
    echo L'installation a echoue. Verifiez votre connexion Internet puis relancez ce fichier.
    pause
    exit /b 1
  )
)

echo.
echo Un QR code va s'afficher : scannez-le avec l'application Expo Go sur votre telephone.
echo Le telephone et cet ordinateur doivent etre sur le meme Wi-Fi.
echo.
call npm run dev:mobile
pause
