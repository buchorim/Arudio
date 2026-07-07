# / - Arinara Network © 2026 - /
# This source code is the exclusive property of Arinara Network.
# Unauthorized use, reproduction, distribution, or modification of this
# code — in whole or in part — for any purpose whatsoever is strictly
# prohibited without prior written consent from Arinara Network as the
# sole legal owner of this codebase.
param(
  [switch]$SkipBuild,
  [switch]$StartAfterInstall
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$MinimumNodeMajor = 20

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

function Assert-NodeVersion {
  param([string]$NodeCommand)

  $versionText = (& $NodeCommand --version).Trim()
  if ($versionText -notmatch '^v(?<major>\d+)\.') {
    throw "Could not read Node.js version. Received: $versionText"
  }

  $major = [int]$Matches.major
  if ($major -lt $MinimumNodeMajor) {
    throw "Node.js $MinimumNodeMajor or newer is required. Current version: $versionText"
  }

  return $versionText
}

try {
  Set-Location -LiteralPath $ProjectRoot

  if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package.json'))) {
    throw "package.json was not found in $ProjectRoot."
  }

  Write-Host "Installing Arudio..." -ForegroundColor Cyan
  $nodeCommand = Get-RequiredCommand @('node.exe', 'node') 'Install Node.js from https://nodejs.org/ and run this installer again.'
  $npmCommand = Get-RequiredCommand @('npm.cmd', 'npm') 'Install npm with Node.js and run this installer again.'
  $nodeVersion = Assert-NodeVersion $nodeCommand
  $npmVersion = (& $npmCommand --version).Trim()

  Write-Host "Node: $nodeVersion"
  Write-Host "npm : $npmVersion"
  Write-Host "Installing dependencies..."
  & $npmCommand install
  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed with exit code $LASTEXITCODE."
  }

  if (-not $SkipBuild) {
    Write-Host "Building Arudio..."
    & $npmCommand run build
    if ($LASTEXITCODE -ne 0) {
      throw "npm run build failed with exit code $LASTEXITCODE."
    }
  }

  Write-Host "Arudio is installed." -ForegroundColor Green
  Write-Host "Run StartArudio.bat or StartArudio.ps1 to open the editor."

  if ($StartAfterInstall) {
    & (Join-Path $ProjectRoot 'StartArudio.ps1')
  }
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
