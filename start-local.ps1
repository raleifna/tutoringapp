[CmdletBinding()]
param(
    [switch]$ForceSeed,
    [switch]$SkipSeed,
    [switch]$RunSmokeTest,
    [string]$ProjectName = 'tutorconnect',
    [string]$EnvFile = '.env'
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-Command {
    param(
        [string]$Name,
        [string]$Hint
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name not found. $Hint"
    }
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

function Invoke-Compose {
    param([string[]]$ComposeArgs)

    & docker compose --env-file $EnvFile -p $ProjectName @ComposeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose $($ComposeArgs -join ' ') failed."
    }
}

function Invoke-BackendCommand {
    param([string[]]$CommandArgs)

    & docker compose --env-file $EnvFile -p $ProjectName exec -T backend @CommandArgs
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose exec backend $($CommandArgs -join ' ') failed."
    }
}

function Test-BackendScript {
    param([string]$ScriptName)

    $packageJson = Join-Path $ProjectRoot 'backend/package.json'
    if (-not (Test-Path $packageJson)) {
        return $false
    }

    $package = Get-Content $packageJson -Raw | ConvertFrom-Json
    return $null -ne $package.scripts.PSObject.Properties[$ScriptName]
}

function Wait-ForUrl {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 180
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $supportsSkipCertificateCheck = (Get-Command Invoke-WebRequest).Parameters.ContainsKey('SkipCertificateCheck')
            if ($Url.StartsWith('https://') -and -not $supportsSkipCertificateCheck) {
                [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
            }

            $requestParams = @{
                Uri = $Url
                UseBasicParsing = $true
                TimeoutSec = 5
            }
            if ($supportsSkipCertificateCheck) {
                $requestParams.SkipCertificateCheck = $true
            }

            $response = Invoke-WebRequest @requestParams
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        } catch {
            Start-Sleep -Seconds 2
            continue
        }

        Start-Sleep -Seconds 2
    }

    throw "Timed out waiting for $Url"
}

function Sync-DatabaseSchema {
    Write-Step 'Synchronizing Prisma schema with the database'
    Invoke-BackendCommand -CommandArgs @('pnpm', 'exec', 'prisma', 'db', 'push', '--accept-data-loss')
}

function Ensure-HttpsCertificate {
    param([string]$CertHost = 'localhost')

    $certDir = Join-Path $ProjectRoot 'nginx/certs'
    $certFile = Join-Path $certDir 'localhost.crt'
    $keyFile = Join-Path $certDir 'localhost.key'

    if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
        return
    }

    Write-Step 'Generating a local self-signed HTTPS certificate'
    New-Item -ItemType Directory -Path $certDir -Force | Out-Null

    $opensslConfig = New-TemporaryFile
    @"
[req]
distinguished_name = dn
x509_extensions = v3_req
prompt = no

[dn]
CN = localhost

[v3_req]
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = $CertHost
IP.1 = 127.0.0.1
IP.2 = ::1
"@ | Set-Content -Path $opensslConfig -Encoding ascii

    & openssl req `
        -x509 `
        -nodes `
        -newkey rsa:2048 `
        -sha256 `
        -days 3650 `
        -keyout $keyFile `
        -out $certFile `
        -subj '/CN=localhost' `
        -config $opensslConfig *> $null

    Remove-Item $opensslConfig -Force

    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to generate local HTTPS certificate with OpenSSL.'
    }
}

if ($ForceSeed) {
    Write-Host '--force-seed is now the default; seeding runs unless -SkipSeed is provided.' -ForegroundColor Yellow
}

Ensure-Command -Name 'docker' -Hint 'Install Docker Desktop and make sure the daemon is running.'
$envFilePath = Ensure-RootEnv -EnvFileName $EnvFile
$backendHostPort = Get-EnvValue -EnvFilePath $envFilePath -Name 'BACKEND_HOST_PORT' -DefaultValue '5050'
$gatewayHostPort = Get-EnvValue -EnvFilePath $envFilePath -Name 'NGINX_HOST_PORT' -DefaultValue '8443'
$mailboxHostPort = Get-EnvValue -EnvFilePath $envFilePath -Name 'MAILPIT_UI_HOST_PORT' -DefaultValue '8025'
$httpsCertHost = Get-EnvValue -EnvFilePath $envFilePath -Name 'HTTPS_CERT_HOST' -DefaultValue 'localhost'
$gatewayUrl = (Get-EnvValue -EnvFilePath $envFilePath -Name 'FRONTEND_URL' -DefaultValue "http://localhost:$gatewayHostPort").TrimEnd('/')

Write-Step 'Building and starting the local full-stack Docker environment'
Invoke-Compose -ComposeArgs @('up', '--build', '-d')

Write-Step 'Waiting for backend and unified gateway health checks'
Wait-ForUrl -Url "http://localhost:$backendHostPort/health"
Wait-ForUrl -Url "$gatewayUrl/api/v1/health"

Sync-DatabaseSchema

if (-not $SkipSeed) {
    if (Test-BackendScript -ScriptName 'db:seed') {
        Write-Step 'Seeding demo accounts and subjects'
        Invoke-BackendCommand -CommandArgs @('pnpm', 'run', 'db:seed')
    } else {
        Write-Host 'Seed skipped: backend/package.json does not define db:seed.' -ForegroundColor Yellow
    }
}

if ($RunSmokeTest) {
    $smokeScript = Join-Path $ProjectRoot 'backend/scripts/api-mock-smoke.js'
    if (Test-Path $smokeScript) {
        Write-Step 'Running backend smoke test'
        Invoke-BackendCommand -CommandArgs @('node', 'scripts/api-mock-smoke.js')
    } else {
        Write-Host 'Smoke test skipped: backend/scripts/api-mock-smoke.js not found.' -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host 'Local environment is ready.' -ForegroundColor Green
Write-Host 'Frontend:' -NoNewline
Write-Host " $gatewayUrl" -ForegroundColor White
Write-Host 'Backend:' -NoNewline
Write-Host "  $gatewayUrl/api/v1/health" -ForegroundColor White
Write-Host 'Mailbox:' -NoNewline
Write-Host "  http://localhost:$mailboxHostPort" -ForegroundColor White
