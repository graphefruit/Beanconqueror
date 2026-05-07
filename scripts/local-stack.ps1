param(
  [ValidateSet('up', 'down', 'logs', 'reset', 'status')]
  [string] $Command = 'up'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$dockerBin = 'C:\Program Files\Docker\Docker\resources\bin'
if (Test-Path $dockerBin) {
  $env:Path = "$dockerBin;$env:Path"
}

function Require-Docker {
  $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
  if ($dockerCommand) {
    $script:Docker = $dockerCommand.Source
    return
  }

  $dockerDesktopCli = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
  if (Test-Path $dockerDesktopCli) {
    $script:Docker = $dockerDesktopCli
    return
  }

  if (-not $script:Docker) {
    throw 'Docker Desktop is required for full-stack local testing. Install Docker, start it, then rerun scripts/local-stack.ps1 up.'
  }
}

function Wait-For-Health {
  $deadline = (Get-Date).AddMinutes(3)
  do {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080/health' -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        Write-Host 'Beanconqueror local stack ready: http://localhost:8080'
        return
      }
    } catch {
      Start-Sleep -Seconds 3
    }
  } while ((Get-Date) -lt $deadline)

  & $script:Docker compose ps
  throw 'Beanconqueror did not become healthy within 3 minutes. Run scripts/local-stack.ps1 logs.'
}

Require-Docker

switch ($Command) {
  'up' {
    & $script:Docker compose up --build -d
    Wait-For-Health
  }
  'down' {
    & $script:Docker compose down
  }
  'logs' {
    & $script:Docker compose logs -f beanconqueror mariadb
  }
  'reset' {
    & $script:Docker compose down -v
    & $script:Docker compose up --build -d
    Wait-For-Health
  }
  'status' {
    & $script:Docker compose ps
  }
}
