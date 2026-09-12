param(
    [string]$GatewayBaseUrl = "http://localhost:5000/api"
)

$ErrorActionPreference = "Stop"
$GatewayBaseUrl = $GatewayBaseUrl.TrimEnd("/")

function Assert-Condition {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw "E2E assertion failed: $Message"
    }
}

function Get-ApiJson {
    param([string]$Path)
    return Invoke-RestMethod -Uri "$GatewayBaseUrl$Path" -Headers @{ Accept = "application/json" }
}

Write-Host "Checking GridSense gateway at $GatewayBaseUrl" -ForegroundColor Cyan

$health = Get-ApiJson "/health"
Assert-Condition ($health.status -eq "ok") "Gateway health endpoint must return status=ok."
Assert-Condition ($health.ml_service.status -eq "connected") "Gateway must be connected to the Python ML service."

$sites = Get-ApiJson "/sites"
Assert-Condition ($sites.Count -eq 3) "Expected the three GridSense data-pack sites."
Assert-Condition (@($sites | Where-Object { $_.id -eq "SITE_001" }).Count -eq 1) "SITE_001 must be present."

$aliasSite = Get-ApiJson "/sites/solar-01"
Assert-Condition ($aliasSite.id -eq "SITE_001") "solar-01 must resolve to SITE_001."
Assert-Condition ($null -ne $aliasSite.currentGenerationMw) "Resolved site must include telemetry-derived generation."

$forecast = Get-ApiJson "/forecast/solar-01?hours=24"
Assert-Condition ($forecast.total_points -eq 24) "Forecast must contain 24 XGBoost points."
Assert-Condition ($forecast.forecast.Count -eq 24) "Forecast response array must contain 24 points."
Assert-Condition ($null -ne $forecast.forecast[0].expected) "Forecast points must include an expected generation value."

$events = Get-ApiJson "/events/solar-01"
Assert-Condition ($events.Count -gt 0) "Risk endpoint must return model-derived events for the replay horizon."

$recommendation = Get-ApiJson "/recommendations/solar-01"
Assert-Condition (-not [string]::IsNullOrWhiteSpace($recommendation.action)) "Recommendation must include an action."

$dashboard = Get-ApiJson "/dashboard/solar-01"
Assert-Condition ($dashboard.meta.source -eq "ml_service") "Dashboard must be sourced from the ML service, not a mock fallback."
Assert-Condition ($dashboard.kpis.Count -eq 4) "Dashboard must contain four model-derived KPIs."

$systemStatus = Get-ApiJson "/system/status"
Assert-Condition ($systemStatus.Count -eq 4) "System status must report four subsystems."
Assert-Condition (@($systemStatus | Where-Object { $_.status -ne "Operational" }).Count -eq 0) "All runtime subsystem checks must be operational."

$scenarioPayload = @{ cloudCoverChange = 20; demandChange = 10; batteryAvailable = $false; backupAvailable = $false } | ConvertTo-Json
$scenario = Invoke-RestMethod -Uri "$GatewayBaseUrl/simulate" -Method Post -ContentType "application/json" -Body $scenarioPayload
Assert-Condition ($scenario.recommendation -eq "CRITICAL_SHORTFALL_GRID_IMPORT") "Stress scenario must use the XGBoost dispatch result."
Assert-Condition ($scenario.shortfallMwh -gt 0) "Stress scenario must report a positive shortfall."

Write-Host "GridSense API E2E smoke test passed." -ForegroundColor Green
