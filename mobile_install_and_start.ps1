# Script de démarrage rapide VibeSync Mobile Expo (SDK 54)
Write-Host "⚡ VibeSync Mobile — Initialisation et Lancement (SDK 54)..." -ForegroundColor Cyan

Set-Location -Path "mobile"

Write-Host "📦 Vérification des dépendances Expo SDK 54..." -ForegroundColor Yellow
npm install --no-audit --no-fund --legacy-peer-deps

Write-Host "🚀 Lancement du serveur de développement Expo (avec cache nettoyé)..." -ForegroundColor Green
npx expo start -c
