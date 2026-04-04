$ErrorActionPreference = 'Stop'

function Set-EnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string]$Key,
        [Parameter(Mandatory = $true)][string]$Value
    )

    if (-not (Test-Path -LiteralPath $FilePath)) {
        New-Item -ItemType File -Path $FilePath -Force | Out-Null
    }

    $lines = @(Get-Content -LiteralPath $FilePath -ErrorAction Stop)
    $pattern = '^(\s*)' + [Regex]::Escape($Key) + '\s*=.*$'
    $replacement = "${Key}=${Value}"

    $found = $false
    $newLines = @(
        foreach ($line in $lines) {
            if ($line -match $pattern) {
                $found = $true
                $replacement
            }
            else {
                $line
            }
        }
    )

    if (-not $found) {
        if ($newLines.Count -gt 0 -and $newLines[$newLines.Count - 1].Trim() -ne '') {
            $newLines += ''
        }
        $newLines += $replacement
    }

    Set-Content -LiteralPath $FilePath -Value $newLines -Encoding UTF8
}

$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envExample = Join-Path $backendDir '.env.example'
$envFile = Join-Path $backendDir '.env'

if (-not (Test-Path -LiteralPath $envFile)) {
    if (Test-Path -LiteralPath $envExample) {
        Copy-Item -LiteralPath $envExample -Destination $envFile -Force
    }
    else {
        New-Item -ItemType File -Path $envFile -Force | Out-Null
    }
}

Write-Host "NexTech DEV email setup (no SMTP password needed)" -ForegroundColor Cyan
Write-Host "- EMAIL_MODE=file will save emails to instance\\emails\\ as .eml files" -ForegroundColor Cyan
Write-Host "- backend/.env is ignored by git" -ForegroundColor Yellow

Set-EnvValue -FilePath $envFile -Key 'USE_SQLITE' -Value '1'
Set-EnvValue -FilePath $envFile -Key 'EMAIL_MODE' -Value 'file'

Write-Host "Done. Next steps:" -ForegroundColor Green
Write-Host "1) Generate a test email file:" -ForegroundColor Green
Write-Host "   .\\.venv\\Scripts\\python.exe backend\\send_test_email.py --to any@example.com"
Write-Host "2) Check saved emails at: .\\instance\\emails\\" -ForegroundColor Green
Write-Host "3) Run backend:" -ForegroundColor Green
Write-Host "   .\\.venv\\Scripts\\python.exe backend\\app.py"
