[CmdletBinding()]
param(
    [switch]$ForceSeed,
    [switch]$SkipSeed,
    [switch]$RunSmokeTest,
    [int]$TunnelTimeoutSeconds = 90,
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

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-RootEnv {
    param([string]$EnvFileName)

    $envFile = Join-Path $ProjectRoot $EnvFileName
    $envExample = Join-Path $ProjectRoot '.env.example'

    if (-not (Test-Path $envFile)) {
        if (-not (Test-Path $envExample)) {
            throw 'Missing .env and .env.example.'
        }

        Copy-Item $envExample $envFile
        Write-Host "Created $EnvFileName from .env.example" -ForegroundColor Yellow
    }

    return $envFile
}

function Get-EnvValue {
    param(
        [string]$EnvFilePath,
        [string]$Name,
        [string]$DefaultValue
    )

    if (-not (Test-Path $EnvFilePath)) {
        return $DefaultValue
    }

    $pattern = '^\s*' + [regex]::Escape($Name) + '\s*=\s*(.+?)\s*$'
    $match = Select-String -Path $EnvFilePath -Pattern $pattern | Select-Object -First 1
    if (-not $match) {
        return $DefaultValue
    }

    return $match.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'")
}

function Stop-ExistingTunnel {
    if (-not (Test-Path $PidFile)) {
        return
    }

    $existingPid = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).ToString().Trim()
    if ($existingPid -match '^\d+$') {
        $process = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $process.Id -Force
        }
    }

    Remove-Item $PidFile -ErrorAction SilentlyContinue
}

function Wait-ForTunnelUrl {
    param([int]$TimeoutSeconds)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path $LogFile) {
            $content = Get-Content $LogFile -ErrorAction SilentlyContinue
            $match = [regex]::Match(($content -join "`n"), 'https://[-a-z0-9]+\.trycloudflare\.com')
            if ($match.Success) {
                return $match.Value
            }
        }

        Start-Sleep -Seconds 2
    }

    throw "Timed out waiting for Cloudflare Tunnel URL. Check $LogFile"
}

function Wait-ForPublicHealth {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 90
    )

    $healthUrl = "$Url/api/v1/health"
    $hostName = ([uri]$Url).Host
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $headers = @{ Origin = $Url }

    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $healthUrl -Headers $headers -UseBasicParsing -TimeoutSec 10 | Out-Null
            return
        } catch {
            try {
                $fallbackIp = Resolve-DnsName $hostName -Server 1.1.1.1 -Type A -ErrorAction Stop |
                    Select-Object -First 1 -ExpandProperty IPAddress
                $resolveEntry = '{0}:443:{1}' -f $hostName, $fallbackIp
                & curl.exe --silent --show-error --fail --resolve $resolveEntry -H "Origin: $Url" $healthUrl | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    return
                }
            } catch {
            }
        }

        Start-Sleep -Seconds 5
    }

    throw "Timed out waiting for public health endpoint: $healthUrl"
}

function Test-DefaultDnsResolution {
    param([string]$Url)

    try {
        Resolve-DnsName ([uri]$Url).Host -Type A -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    throw 'cloudflared not found. Install it first with pnpm add -g cloudflared'
}

$envFilePath = Ensure-RootEnv -EnvFileName $EnvFile
$gatewayHostPort = Get-EnvValue -EnvFilePath $envFilePath -Name 'NGINX_HOST_PORT' -DefaultValue '8080'

New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null
Stop-ExistingTunnel
Remove-Item $LogFile, $UrlFile -ErrorAction SilentlyContinue

$localArgs = @{
    ProjectName = $ProjectName
    EnvFile = $EnvFile
}
if ($ForceSeed) { $localArgs.ForceSeed = $true }
if ($SkipSeed) { $localArgs.SkipSeed = $true }
if ($RunSmokeTest) { $localArgs.RunSmokeTest = $true }
$previousTryCloudflareCors = [Environment]::GetEnvironmentVariable('ALLOW_TRYCLOUDFLARE_CORS', 'Process')
$env:ALLOW_TRYCLOUDFLARE_CORS = 'true'

Write-Step 'Starting local Docker stack before exposing it externally'
try {
    & (Join-Path $ProjectRoot 'start-local.ps1') @localArgs
} finally {
    if ($null -eq $previousTryCloudflareCors) {
        Remove-Item Env:ALLOW_TRYCLOUDFLARE_CORS -ErrorAction SilentlyContinue
    } else {
        $env:ALLOW_TRYCLOUDFLARE_CORS = $previousTryCloudflareCors
    }
}

$command = 'cloudflared tunnel --url http://localhost:{0} --no-autoupdate --logfile "{1}" --pidfile "{2}"' -f $gatewayHostPort, $LogFile, $PidFile

Write-Step 'Launching Cloudflare Tunnel in the background'
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $command -WindowStyle Hidden | Out-Null

$publicUrl = Wait-ForTunnelUrl -TimeoutSeconds $TunnelTimeoutSeconds
Set-Content -Path $UrlFile -Value $publicUrl -Encoding ascii

Write-Step 'Verifying the public tunnel health endpoint and CORS'
Wait-ForPublicHealth -Url $publicUrl

Write-Host ''
Write-Host 'Remote tunnel is ready.' -ForegroundColor Green
Write-Host 'Public URL:' -NoNewline
Write-Host " $publicUrl" -ForegroundColor White

if (-not (Test-DefaultDnsResolution -Url $publicUrl)) {
    Write-Host ''
    Write-Host 'Local/default DNS cannot resolve the tunnel host yet.' -ForegroundColor Yellow
    Write-Host 'Open it with:' -NoNewline
    Write-Host " .\\open-tunnel-in-browser.ps1 -Url $publicUrl" -ForegroundColor White
}
