param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeDirectory = Join-Path $projectRoot "backend\node"
$mlDirectory = Join-Path $projectRoot "backend\ml"
$mlEngineDirectory = Join-Path $projectRoot "backend\mlengine"
$mlPython = Join-Path $mlEngineDirectory ".venv\Scripts\python.exe"

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm.cmd was not found. Install Node.js 20+ and try again."
}

if (-not (Test-Path $mlPython)) {
    throw "ML engine virtual environment is missing. Create backend/mlengine/.venv and install backend/mlengine/requirements.txt first."
}

if (-not (Test-Path (Join-Path $nodeDirectory "node_modules"))) {
    throw "Node gateway dependencies are missing. Run 'npm install' from backend/node, then retry."
}

try {
    & $mlPython -c "import fastapi, uvicorn, xgboost" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "missing Python packages"
    }
} catch {
    throw "ML engine dependencies are missing. Run '.venv\\Scripts\\python.exe -m pip install -r requirements.txt' from backend/mlengine, then retry."
}

function Get-ListeningPortOwners {
    param([int]$Port)

    # Include loopback and all-interface IPv4/IPv6 bindings. Node commonly
    # reports an all-interface IPv6 listener as [::]:5000 / :::5000.
    $pattern = "^\s*TCP\s+(?:127\.0\.0\.1|0\.0\.0\.0|\[::1\]|\[::\]|::):$Port\s+.*\s+LISTENING\s+(\d+)\s*$"
    return @(
        & netstat.exe -ano -p TCP |
            Select-String -Pattern $pattern |
            ForEach-Object { $_.Matches[0].Groups[1].Value } |
            Sort-Object -Unique
    )
}

$occupiedPorts = @()
for ($attempt = 1; $attempt -le 3; $attempt++) {
    $occupiedPorts = @(
        @(5000, 8000, 8001) | ForEach-Object {
            $owners = Get-ListeningPortOwners -Port $_
            if ($owners.Count -gt 0) {
                "Port $_ is already in use by process ID(s): $($owners -join ', ')."
            }
        }
    )

    if ($occupiedPorts.Count -eq 0 -or $attempt -eq 3) {
        break
    }

    # A stopped Uvicorn reloader can leave a short-lived socket entry. Give it
    # a moment to close before treating it as a real port conflict.
    Start-Sleep -Seconds 1
}

if ($occupiedPorts.Count -gt 0) {
    Write-Host ($occupiedPorts -join [Environment]::NewLine) -ForegroundColor Red
    Write-Host "Stop the earlier GridSense terminal(s), then run npm run dev:backend again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting GridSense backend services..." -ForegroundColor Cyan
Write-Host "  XGBoost engine: http://localhost:8001" -ForegroundColor DarkGray
Write-Host "  ML service:   http://localhost:8000" -ForegroundColor DarkGray
Write-Host "  Node gateway: http://localhost:5000" -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor DarkGray

$mlEngineJob = Start-Job -Name "GridSense XGBoost Engine" -ScriptBlock {
    param($workingDirectory, $pythonPath)
    Set-Location $workingDirectory
    # The parent script already supervises this process. Do not use Uvicorn's
    # reloader here: its extra watcher process can make the PowerShell job look
    # stopped even while the child server is still accepting requests.
    & $pythonPath -m uvicorn app.main:app --host 127.0.0.1 --port 8001
} -ArgumentList $mlEngineDirectory, $mlPython

$mlJob = Start-Job -Name "GridSense ML" -ScriptBlock {
    param($workingDirectory, $pythonPath)
    Set-Location $workingDirectory
    & $pythonPath -m uvicorn app.main:app --host 127.0.0.1 --port 8000
} -ArgumentList $mlDirectory, $mlPython

$nodeJob = Start-Job -Name "GridSense Gateway" -ScriptBlock {
    param($workingDirectory)
    Set-Location $workingDirectory
    npm.cmd run dev
} -ArgumentList $nodeDirectory

function Show-JobOutput {
    param([System.Management.Automation.Job]$Job)

    # Uvicorn emits routine startup and access logs through stderr. Merge that
    # stream before displaying it so $ErrorActionPreference does not mistake a
    # normal log line for a failed PowerShell command.
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        Receive-Job -Job $Job -ErrorAction Continue 2>&1 | ForEach-Object { Write-Host $_ }
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
}

try {
    while ($true) {
        Show-JobOutput -Job $mlEngineJob
        Show-JobOutput -Job $mlJob
        Show-JobOutput -Job $nodeJob

        $failedJob = @($mlEngineJob, $mlJob, $nodeJob) | Where-Object { $_.State -in @("Failed", "Stopped", "Completed") } | Select-Object -First 1
        if ($failedJob) {
            throw "$($failedJob.Name) stopped unexpectedly."
        }

        Start-Sleep -Seconds 1
    }
} finally {
    @($mlEngineJob, $mlJob, $nodeJob) | ForEach-Object {
        if ($_.State -eq "Running") {
            Stop-Job -Job $_
        }
        Receive-Job -Job $_ -ErrorAction SilentlyContinue 2>&1 | Out-Null
        Remove-Job -Job $_ -Force -ErrorAction SilentlyContinue
    }
}
