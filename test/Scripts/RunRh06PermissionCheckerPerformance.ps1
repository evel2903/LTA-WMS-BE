[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$PostgresBin,
  [string]$EvidenceDirectory = '',
  [ValidateRange(2, 10)]
  [int]$RunCount = 2,
  [switch]$RunFullSuite,
  [string]$FullSuiteResultPath = '',
  [switch]$OverwriteReports
)

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$postgresBinPath = [System.IO.Path]::GetFullPath($PostgresBin)
$requiredExecutables = @('initdb.exe', 'pg_ctl.exe', 'createdb.exe', 'dropdb.exe')
foreach ($executable in $requiredExecutables) {
  if (-not (Test-Path -LiteralPath (Join-Path $postgresBinPath $executable) -PathType Leaf)) {
    throw "Missing PostgreSQL executable: $(Join-Path $postgresBinPath $executable)"
  }
}

if ([string]::IsNullOrWhiteSpace($EvidenceDirectory)) {
  $EvidenceDirectory = Join-Path (Split-Path -Parent $repoRoot) 'LTA-WMS-Docs\BMAD\_bmad-output\implementation-artifacts\30.epic-rbac-hardening-and-reliability'
}
$evidencePath = [System.IO.Path]::GetFullPath($EvidenceDirectory)
if (-not (Test-Path -LiteralPath $evidencePath -PathType Container)) {
  throw "Evidence directory does not exist: $evidencePath"
}
if ($RunFullSuite -and [string]::IsNullOrWhiteSpace($FullSuiteResultPath)) {
  throw 'FullSuiteResultPath is required when RunFullSuite is enabled'
}
$finalReportPaths = 1..$RunCount | ForEach-Object {
  Join-Path $evidencePath "rh-06-permission-checker-performance-run-$_.json"
}
foreach ($reportPath in $finalReportPaths) {
  if ((Test-Path -LiteralPath $reportPath) -and -not $OverwriteReports) {
    throw "Report already exists; rerun with -OverwriteReports to replace it after all gates pass: $reportPath"
  }
}

$token = [guid]::NewGuid().ToString('N').Substring(0, 16)
$databaseName = "rh06_$token"
$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$runtimeRoot = [System.IO.Path]::GetFullPath((Join-Path $tempRoot "rh06-postgres-$token"))
if (-not $runtimeRoot.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing runtime outside the OS temp directory: $runtimeRoot"
}
$dataDirectory = Join-Path $runtimeRoot 'data'
$serverLog = Join-Path $runtimeRoot 'postgres.log'

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()

$environmentNames = @(
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'RH06_DATABASE_E2E',
  'RH06_DATABASE_OWNER_TOKEN',
  'RH06_BASELINE_COMMIT',
  'RH06_RUN_ID',
  'RH06_REPORT_PATH',
  'NODE_ENV'
)
$savedEnvironment = @{}
foreach ($name in $environmentNames) {
  $savedEnvironment[$name] = [System.Environment]::GetEnvironmentVariable($name, 'Process')
}

$serverStarted = $false
$databaseCreated = $false
$completedReports = @()
$stagedReports = @()
$completedFullSuiteResult = $null
$stagedFullSuiteResult = $null
$initDb = Join-Path $postgresBinPath 'initdb.exe'
$pgCtl = Join-Path $postgresBinPath 'pg_ctl.exe'
$createDb = Join-Path $postgresBinPath 'createdb.exe'
$dropDb = Join-Path $postgresBinPath 'dropdb.exe'

function Assert-LastExitCode([string]$operation) {
  if ($LASTEXITCODE -ne 0) {
    throw "$operation failed with exit code $LASTEXITCODE"
  }
}

try {
  [System.IO.Directory]::CreateDirectory($runtimeRoot) | Out-Null
  & $initDb -D $dataDirectory --username=postgres --auth-local=trust --auth-host=trust --encoding=UTF8 --no-locale
  Assert-LastExitCode 'initdb'

  & $pgCtl -D $dataDirectory -l $serverLog -o "-h 127.0.0.1 -p $port" -w start
  $serverStarted = Test-Path -LiteralPath (Join-Path $dataDirectory 'postmaster.pid')
  Assert-LastExitCode 'pg_ctl start'
  if (-not $serverStarted) {
    throw 'pg_ctl reported success without creating postmaster.pid'
  }

  & $createDb -h 127.0.0.1 -p $port -U postgres $databaseName
  Assert-LastExitCode 'createdb'
  $databaseCreated = $true

  $env:DB_HOST = '127.0.0.1'
  $env:DB_PORT = [string]$port
  $env:DB_USERNAME = 'postgres'
  $env:DB_PASSWORD = 'rh06-local-trust-only'
  $env:DB_DATABASE = $databaseName
  $env:RH06_DATABASE_E2E = '1'
  $env:RH06_DATABASE_OWNER_TOKEN = $token
  Push-Location $repoRoot
  try {
    $env:RH06_BASELINE_COMMIT = (& git rev-parse HEAD).Trim()
    Assert-LastExitCode 'git rev-parse HEAD'

    $env:NODE_ENV = 'production'
    & yarn.cmd migration:run | Out-Null
    Assert-LastExitCode 'migration:run'
    & yarn.cmd seed:run | Out-Null
    Assert-LastExitCode 'seed:run'
    [System.Environment]::SetEnvironmentVariable('NODE_ENV', $savedEnvironment['NODE_ENV'], 'Process')

    for ($run = 1; $run -le $RunCount; $run += 1) {
      $reportPath = Join-Path $runtimeRoot "run-$run.json"
      $env:RH06_RUN_ID = "$token-run-$run"
      $env:RH06_REPORT_PATH = $reportPath
      & yarn.cmd test --runInBand test/Helpers/QueryCounterLoggerSpec.ts test/Helpers/Rh06MeasurementSpec.ts test/Modules/AccessControl/AccessControl.PermissionCheckerPerformanceSpec.ts
      Assert-LastExitCode "RH-06 live run $run"
      if (-not (Test-Path -LiteralPath $reportPath -PathType Leaf)) {
        throw "RH-06 live run $run did not produce its report: $reportPath"
      }
      $stagedReports += $reportPath
    }

    if ($RunFullSuite) {
      $fullSuitePath = [System.IO.Path]::GetFullPath($FullSuiteResultPath)
      if (Test-Path -LiteralPath $fullSuitePath) {
        if (-not $OverwriteReports) {
          throw "Full-suite result already exists; rerun with -OverwriteReports to replace it: $fullSuitePath"
        }
      }
      $stagedFullSuiteResult = Join-Path $runtimeRoot 'full-suite-result.json'
      $env:RH06_RUN_ID = "$token-full-suite"
      $env:RH06_REPORT_PATH = $null
      & yarn.cmd test --runInBand --json --outputFile $stagedFullSuiteResult
      Assert-LastExitCode 'RH-06 full suite'
      if (-not (Test-Path -LiteralPath $stagedFullSuiteResult -PathType Leaf)) {
        throw "RH-06 full suite did not produce its staged JSON result: $stagedFullSuiteResult"
      }
    }

    for ($index = 0; $index -lt $stagedReports.Count; $index += 1) {
      $finalPath = $finalReportPaths[$index]
      if (Test-Path -LiteralPath $finalPath) {
        Remove-Item -LiteralPath $finalPath -Force
      }
      [System.IO.File]::Copy($stagedReports[$index], $finalPath, $false)
      $completedReports += $finalPath
    }
    if ($RunFullSuite) {
      $fullSuitePath = [System.IO.Path]::GetFullPath($FullSuiteResultPath)
      if (Test-Path -LiteralPath $fullSuitePath) {
        Remove-Item -LiteralPath $fullSuitePath -Force
      }
      [System.IO.File]::Copy($stagedFullSuiteResult, $fullSuitePath, $false)
      $completedFullSuiteResult = $fullSuitePath
    }
  } finally {
    Pop-Location
  }
} finally {
  try {
    if ($databaseCreated) {
      & $dropDb -h 127.0.0.1 -p $port -U postgres --if-exists --force $databaseName
      Assert-LastExitCode 'dropdb'
    }
  } finally {
    try {
      if ($serverStarted) {
        & $pgCtl -D $dataDirectory -m fast -w stop
        Assert-LastExitCode 'pg_ctl stop'
      }
    } finally {
      foreach ($name in $environmentNames) {
        [System.Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
      }
      if (Test-Path -LiteralPath $runtimeRoot) {
        [System.IO.Directory]::Delete($runtimeRoot, $true)
      }
    }
  }
}

if (Test-Path -LiteralPath $runtimeRoot) {
  throw "RH-06 runtime cleanup failed: $runtimeRoot"
}
$connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($connection) {
  throw "RH-06 PostgreSQL port is still listening after cleanup: $port"
}

[pscustomobject]@{
  Story = 'RH-06'
  Database = $databaseName
  LoopbackPort = $port
  RunCount = $RunCount
  Reports = $completedReports
  FullSuiteResult = $completedFullSuiteResult
  DatabaseDropped = $true
  ServerStopped = $true
  RuntimeDeleted = $true
} | ConvertTo-Json -Depth 4
