Param(
    [Parameter(Mandatory = $false)]
    [string]$Email,

    [Parameter(Mandatory = $false)]
    [SecureString]$AppPassword,

    # Optional: set a default test recipient for the next step message
    [Parameter(Mandatory = $false)]
    [string]$TestTo
)

$ErrorActionPreference = 'Stop'

function ConvertFrom-SecureStringPlainText {
    param([Parameter(Mandatory = $true)][SecureString]$Secure)

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Get-GmailAppPasswordPlainText {
    param(
        [Parameter(Mandatory = $false)][SecureString]$Secure
    )

    $attempt = 0
    while ($true) {
        if (-not $Secure) {
            $Secure = Read-Host -Prompt 'Enter Gmail App Password (SMTP_PASS)' -AsSecureString
        }

        $plain = ConvertFrom-SecureStringPlainText -Secure $Secure
        # Google shows app passwords with spaces; strip any whitespace.
        $plain = ($plain -replace '\s', '')

        if ($plain.Length -eq 16) {
            return $plain
        }

        $attempt++
        $Secure = $null
        if ($attempt -ge 3) {
            throw "Invalid Gmail App Password length ($($plain.Length)). Expected 16 characters. Make sure 2-Step Verification is enabled and you created an App Password." 
        }

        Write-Host "App Password should be 16 characters (spaces ignored). Please try again." -ForegroundColor Yellow
    }
}

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

    # Match lines like: KEY=... (ignore commented lines)
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

function Initialize-BackendEnv {
    param(
        [Parameter(Mandatory = $true)][string]$BackendDir
    )

    $envExample = Join-Path $BackendDir '.env.example'
    $envFile = Join-Path $BackendDir '.env'

    if (-not (Test-Path -LiteralPath $envFile)) {
        if (Test-Path -LiteralPath $envExample) {
            Copy-Item -LiteralPath $envExample -Destination $envFile -Force
        }
        else {
            New-Item -ItemType File -Path $envFile -Force | Out-Null
        }
    }

    return $envFile
}

# Resolve paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = $scriptDir
$envFile = Initialize-BackendEnv -BackendDir $backendDir

Write-Host "NexTech Gmail SMTP setup (will write to: $envFile)" -ForegroundColor Cyan
Write-Host "Note: backend/.env is ignored by git. Do NOT share your App Password." -ForegroundColor Yellow

if ([string]::IsNullOrWhiteSpace($Email)) {
    $Email = Read-Host -Prompt 'Enter your Gmail address (SMTP_USER)'
}
$Email = $Email.Trim()

if (-not $AppPassword) {
    # Read interactively (validated)
    $plainPass = Get-GmailAppPasswordPlainText
}

if ([string]::IsNullOrWhiteSpace($Email) -or ($Email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$')) {
    throw "Invalid email address: '$Email'"
}

if (-not $plainPass) {
    # Provided via parameter (validated)
    $plainPass = Get-GmailAppPasswordPlainText -Secure $AppPassword
}

# Compose values (quote when needed)
$fromValue = '"NexTech Store <' + $Email + '>' + '"'

# Make it runnable without MySQL
Set-EnvValue -FilePath $envFile -Key 'USE_SQLITE' -Value '1'

# Ensure we send real emails (override DEV mode: EMAIL_MODE=file/console)
Set-EnvValue -FilePath $envFile -Key 'EMAIL_MODE' -Value 'smtp'

# Gmail SMTP defaults
Set-EnvValue -FilePath $envFile -Key 'SMTP_HOST' -Value 'smtp.gmail.com'
Set-EnvValue -FilePath $envFile -Key 'SMTP_PORT' -Value '587'
Set-EnvValue -FilePath $envFile -Key 'SMTP_TLS' -Value 'true'
Set-EnvValue -FilePath $envFile -Key 'SMTP_SSL' -Value 'false'
Set-EnvValue -FilePath $envFile -Key 'SMTP_TIMEOUT' -Value '10'

# Credentials
Set-EnvValue -FilePath $envFile -Key 'SMTP_USER' -Value $Email
Set-EnvValue -FilePath $envFile -Key 'SMTP_PASS' -Value $plainPass

# From (friendly)
Set-EnvValue -FilePath $envFile -Key 'SMTP_FROM' -Value $fromValue

# Reduce chance of leaking secret in memory
$plainPass = $null

Write-Host "Done. Next steps:" -ForegroundColor Green
Write-Host "1) Test SMTP:" -ForegroundColor Green
if ([string]::IsNullOrWhiteSpace($TestTo)) {
    Write-Host "   .\\.venv\\Scripts\\python.exe backend\\send_test_email.py --to your_receiver@example.com"
}
else {
    Write-Host "   .\\.venv\\Scripts\\python.exe backend\\send_test_email.py --to $TestTo"
}
Write-Host "2) Run backend:" -ForegroundColor Green
Write-Host "   .\\.venv\\Scripts\\python.exe backend\\app.py"
Write-Host "" 
Write-Host "If SMTP auth fails, create a Gmail App Password (Google Account -> Security -> App passwords)." -ForegroundColor Yellow
