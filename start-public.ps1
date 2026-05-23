# start-public.ps1 — Boot backend + cloudflared + redeploy frontend with the new tunnel URL.
# Run from the repo root: powershell -File .\start-public.ps1

$ErrorActionPreference = "Stop"

# --- Config -----------------------------------------------------------------
# Your stable Vercel production URL (does not change between deploys).
$VercelUrl = "https://co-watch-frontend.vercel.app/"
# ----------------------------------------------------------------------------

# 1. Start backend in a new window with CORS pointed at Vercel.
Write-Host "[1/4] Starting backend..." -ForegroundColor Cyan
$env:CLIENT_ORIGIN = $VercelUrl
$backend = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/k", "npm --workspace backend start" `
    -PassThru

# 2. Start cloudflared, redirecting output so we can scrape the URL.
Write-Host "[2/4] Starting cloudflared..." -ForegroundColor Cyan
$logFile = Join-Path $env:TEMP "cowatch-tunnel.log"
$errFile = "$logFile.err"
Remove-Item $logFile, $errFile -ErrorAction SilentlyContinue

$tunnel = Start-Process -FilePath "cloudflared" `
    -ArgumentList "tunnel", "--url", "http://localhost:3000" `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError $errFile `
    -NoNewWindow `
    -PassThru

# 3. Poll the log for the trycloudflare.com URL (cloudflared usually prints it within ~5s).
Write-Host "[3/4] Waiting for tunnel URL..." -ForegroundColor Cyan
$url = $null
$deadline = (Get-Date).AddSeconds(45)
while ((Get-Date) -lt $deadline -and -not $url) {
    Start-Sleep -Milliseconds 500
    foreach ($f in @($logFile, $errFile)) {
        if (Test-Path $f) {
            $content = Get-Content $f -Raw -ErrorAction SilentlyContinue
            if ($content -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
                $url = $matches[0]
                break
            }
        }
    }
}

if (-not $url) {
    Write-Host "Failed to capture tunnel URL within 45s." -ForegroundColor Red
    if (Test-Path $logFile) { Get-Content $logFile }
    if (Test-Path $errFile) { Get-Content $errFile }
    Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "    Tunnel URL: $url" -ForegroundColor Green

# 4. Deploy frontend to Vercel with the tunnel URL baked in as a build-time env var.
Write-Host "[4/4] Deploying frontend to Vercel..." -ForegroundColor Cyan
Push-Location frontend
try {
    vercel deploy --prod --build-env "VITE_SERVER_URL=$url" --yes
    if ($LASTEXITCODE -ne 0) { throw "vercel deploy failed" }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Live. Frontend: $VercelUrl  ->  Backend: $url" -ForegroundColor Green
Write-Host "Backend PID: $($backend.Id)   Tunnel PID: $($tunnel.Id)"
Write-Host "Press Ctrl+C in this window to tear down the tunnel. (Backend window stays separate.)"

# Block so the tunnel keeps running while you use the app.
Wait-Process -Id $tunnel.Id
