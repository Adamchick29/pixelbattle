$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $taskRoot '.env'
if (Test-Path -LiteralPath $envPath) { throw '.env уже существует. Существующие пароли не перезаписаны.' }
function New-HexSecret {
    $bytes = [byte[]]::new(24)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToHexString($bytes).ToLowerInvariant()
}
$databasePassword = New-HexSecret
$redisPassword = New-HexSecret
$monitorPassword = New-HexSecret
$monitorHash = docker run --rm caddy:2-alpine caddy hash-password --plaintext $monitorPassword
if ($LASTEXITCODE -ne 0) { throw 'Не удалось запустить Docker для генерации пароля мониторинга.' }
$envText = @"
APP_BIND=127.0.0.1
APP_PORT=8787
APP_ORIGIN=http://localhost:8787
SESSION_COOKIE_SECURE=false
POSTGRES_PASSWORD=$databasePassword
REDIS_PASSWORD=$redisPassword
MONITORING_USER=monitor
MONITORING_PASSWORD_HASH='$monitorHash'
IMAGE_PREFIX=pixel-battle
IMAGE_TAG=local
"@
[IO.File]::WriteAllText($envPath, $envText.Replace("`r`n", "`n") + "`n", [Text.UTF8Encoding]::new($false))
$localDir = Join-Path $taskRoot '.local'
New-Item -ItemType Directory -Force $localDir | Out-Null
[IO.File]::WriteAllText((Join-Path $localDir 'monitoring-password.txt'), $monitorPassword, [Text.UTF8Encoding]::new($false))
Write-Host 'Создан .env. Локальный запуск: docker compose up --build -d --wait'
Write-Host "VMUI: http://localhost:8787/monitoring/vmui/ | пользователь: monitor | пароль: $monitorPassword"
