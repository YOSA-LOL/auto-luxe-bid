param(
  [Parameter(Mandatory = $true)]
  [string]$Password
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$schema = Join-Path $root "schema.mysql.sql"
$envFile = Join-Path $root ".env"

if (-not (Test-Path $mysql)) {
  throw "MySQL client not found at $mysql"
}

$encoded = [uri]::EscapeDataString($Password)
$dbUrl = "mysql://root:$encoded@127.0.0.1:3306/car_showroom"

Write-Host "Creating database car_showroom..."
& $mysql -u root "-p$Password" -e "CREATE DATABASE IF NOT EXISTS car_showroom CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

Write-Host "Applying schema..."
Get-Content $schema | & $mysql -u root "-p$Password" car_showroom

if (Test-Path $envFile) {
  $content = Get-Content $envFile -Raw
  if ($content -match "(?m)^DATABASE_URL=.*$") {
    $content = [regex]::Replace($content, "(?m)^DATABASE_URL=.*$", "DATABASE_URL=$dbUrl")
  } else {
    $content += "`nDATABASE_URL=$dbUrl`n"
  }
  Set-Content -Path $envFile -Value $content -NoNewline
  Write-Host "Updated .env DATABASE_URL"
}

Write-Host "MySQL setup complete."
