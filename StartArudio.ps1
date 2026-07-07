# / - Arinara Network © 2026 - /
# This source code is the exclusive property of Arinara Network.
# Unauthorized use, reproduction, distribution, or modification of this
# code — in whole or in part — for any purpose whatsoever is strictly
# prohibited without prior written consent from Arinara Network as the
# sole legal owner of this codebase.
param(
  [switch]$NoBrowser,
  [switch]$NoStart,
  [int]$TimeoutSeconds = 75
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DefaultUrl = 'http://127.0.0.1:3000/'
$LogPath = Join-Path $ProjectRoot 'DevServer.log'
$ErrorLogPath = Join-Path $ProjectRoot 'DevServer.err.log'

function Test-ArudioServerReady {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Get-ViteLocalUrlFromLog {
  if (-not (Test-Path -LiteralPath $LogPath)) {
    return $null
  }

  $logText = Get-Content -LiteralPath $LogPath -Raw -ErrorAction SilentlyContinue
  if ([string]::IsNullOrWhiteSpace($logText)) {
    return $null
  }

  $matches = [regex]::Matches($logText, 'http://(localhost|127\.0\.0\.1):\d+/')
  if ($matches.Count -eq 0) {
    return $null
  }

  return $matches[$matches.Count - 1].Value.Replace('http://localhost:', 'http://127.0.0.1:')
}

function Get-ReadyLocalUrl {
  $loggedUrl = Get-ViteLocalUrlFromLog
  if ($loggedUrl -and (Test-ArudioServerReady $loggedUrl)) {
    return $loggedUrl
  }

  if (Test-ArudioServerReady $DefaultUrl) {
    return $DefaultUrl
  }

  return $null
}

function Open-ArudioBrowser {
  param([string]$Url)

  if (-not $NoBrowser) {
    $browserUrl = $Url.Replace('http://127.0.0.1:', 'http://localhost:')
    Start-Process $browserUrl
  }
}

function Get-RequiredCommand {
  param(
    [string[]]$Names,
    [string]$InstallHint
  )

  foreach ($name in $Names) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command) {
      return $command.Source
    }
  }

  throw "Missing required command: $($Names -join ' or '). $InstallHint"
}

function Wait-ForArudioServer {
  param([int]$Timeout)

  $deadline = (Get-Date).AddSeconds($Timeout)
  do {
    $readyUrl = Get-ReadyLocalUrl
    if ($readyUrl) {
      return $readyUrl
    }

    Start-Sleep -Milliseconds 700
  } while ((Get-Date) -lt $deadline)

  return $null
}

try {
  Set-Location -LiteralPath $ProjectRoot

  $readyUrl = Get-ReadyLocalUrl
  if ($readyUrl) {
    Open-ArudioBrowser $readyUrl
    exit 0
  }

  if ($NoStart) {
    throw "Arudio is not running at $DefaultUrl, and -NoStart was requested."
  }

  if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package.json'))) {
    throw "package.json was not found in $ProjectRoot."
  }

  $nodeCommand = Get-RequiredCommand @('node.exe', 'node') 'Install Node.js before launching Arudio.'
  $npmCommand = Get-RequiredCommand @('npm.cmd', 'npm') 'Install npm before launching Arudio.'
  & $nodeCommand --version | Out-Null

  $viteDependencyPath = Join-Path $ProjectRoot 'node_modules\vite'
  if (-not (Test-Path -LiteralPath $viteDependencyPath)) {
    & $npmCommand install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed with exit code $LASTEXITCODE."
    }
  }

  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Set-Content -LiteralPath $LogPath -Value "[$timestamp] Starting Arudio dev server..."
  Set-Content -LiteralPath $ErrorLogPath -Value ''

  Start-Process `
    -FilePath 'cmd.exe' `
    -ArgumentList @('/c', 'npm.cmd run dev >> "DevServer.log" 2>> "DevServer.err.log"') `
    -WorkingDirectory $ProjectRoot `
    -WindowStyle Hidden | Out-Null

  $startedUrl = Wait-ForArudioServer $TimeoutSeconds
  if (-not $startedUrl) {
    throw "Arudio dev server did not become ready within $TimeoutSeconds seconds. Check DevServer.log and DevServer.err.log."
  }

  Open-ArudioBrowser $startedUrl
  exit 0
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  Start-Sleep -Seconds 8
  exit 1
}
