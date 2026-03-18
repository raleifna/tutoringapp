[CmdletBinding()]
param(
    [string]$ProjectName = 'tutorconnect',
    [string]$EnvFile = '.env'
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

& docker compose --env-file $EnvFile -p $ProjectName down
if ($LASTEXITCODE -ne 0) {
    throw 'docker compose down failed.'
}

Write-Host 'Local Docker environment stopped.' -ForegroundColor Green
