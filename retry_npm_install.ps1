$maxRetries = 20
$retryCount = 0
$success = $false

Write-Host "Démarrage de l'installation forcée de NPM..." -ForegroundColor Cyan

while (-not $success -and $retryCount -lt $maxRetries) {
    Write-Host "`n--- Tentative d'installation ($($retryCount + 1)/$maxRetries) ---" -ForegroundColor Cyan
    
    # Exécution de npm install
    npm install --no-audit --no-fund --legacy-peer-deps
    
    if ($LASTEXITCODE -eq 0) {
        $success = $true
        Write-Host "`n✅ Installation terminée avec succès !" -ForegroundColor Green
    } else {
        $retryCount++
        Write-Host "`n❌ L'installation a été interrompue. Reprise automatique dans 3 secondes..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
}

if (-not $success) {
    Write-Host "`n🚨 L'installation n'a pas pu aboutir après $maxRetries tentatives. La connexion est peut-être trop instable." -ForegroundColor Red
}
