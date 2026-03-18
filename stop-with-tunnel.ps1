[CmdletBinding()]
param(
    [string]$ProjectName = 'tutorconnect',
    [string]$EnvFile = '.env'
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path (Join-Path $ProjectRoot '.runtime') $ProjectName
$PidFile = Join-Path $RuntimeDir 'cloudflared.pid'
$LogFile = Join-Path $RuntimeDir 'cloudflared.log'
$UrlFile = Join-Path $RuntimeDir 'cloudflared-url.txt'

Set-Location $ProjectRoot

if (Test-Path $PidFile) {
    $existingPid = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).ToString().Trim()
    if ($existingPid -match '^\d+$') {
        $process = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $process.Id -Force
        }
    }
}

Remove-Item $PidFile, $LogFile, $UrlFile -ErrorAction SilentlyContinue

& (Join-Path $ProjectRoot 'stop-local.ps1') -ProjectName $ProjectName -EnvFile $EnvFile
