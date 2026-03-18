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

function Wait-ForUrl {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 180
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
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

function Get-UserCount {
    $script = "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.count().then((count) => { console.log(count); }).catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.`$disconnect(); });"
    $output = & docker compose --env-file $EnvFile -p $ProjectName exec -T backend node -e $script
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to inspect database state.'
    }

    $lastLine = ($output | Select-Object -Last 1).ToString().Trim()
    return [int]$lastLine
}

function Sync-DatabaseSchema {
    Write-Step 'Synchronizing Prisma schema with the database'
    Invoke-BackendCommand -CommandArgs @('pnpm', 'exec', 'prisma', 'db', 'push', '--accept-data-loss')
}

Ensure-Command -Name 'docker' -Hint 'Install Docker Desktop and make sure the daemon is running.'
$envFilePath = Ensure-RootEnv -EnvFileName $EnvFile
$backendHostPort = Get-EnvValue -EnvFilePath $envFilePath -Name 'BACKEND_HOST_PORT' -DefaultValue '5050'
$gatewayHostPort = Get-EnvValue -EnvFilePath $envFilePath -Name 'NGINX_HOST_PORT' -DefaultValue '8080'

Write-Step 'Building and starting the local full-stack Docker environment'
Invoke-Compose -ComposeArgs @('up', '--build', '-d')

Write-Step 'Waiting for backend and unified gateway health checks'
Wait-ForUrl -Url "http://localhost:$backendHostPort/health"
Wait-ForUrl -Url "http://localhost:$gatewayHostPort/api/v1/health"

Sync-DatabaseSchema

if (-not $SkipSeed) {
    $shouldSeed = $ForceSeed

    if (-not $shouldSeed) {
        $userCount = Get-UserCount
        if ($userCount -eq 0) {
            $shouldSeed = $true
        } else {
            Write-Host "Seed skipped: detected $userCount existing users." -ForegroundColor Yellow
        }
    }

    if ($shouldSeed) {
        Write-Step 'Seeding demo accounts and subjects'
        Invoke-BackendCommand -CommandArgs @('pnpm', 'run', 'db:seed')
    }
}

if ($RunSmokeTest) {
    Write-Step 'Running backend smoke test'
    Invoke-BackendCommand -CommandArgs @('node', 'scripts/api-mock-smoke.js')
}

Write-Host ''
Write-Host 'Local environment is ready.' -ForegroundColor Green
Write-Host 'Frontend:' -NoNewline
Write-Host " http://localhost:$gatewayHostPort" -ForegroundColor White
Write-Host 'Backend:' -NoNewline
Write-Host "  http://localhost:$gatewayHostPort/api/v1/health" -ForegroundColor White
