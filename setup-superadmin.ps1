# 🚀 Quick Setup Script for SuperAdmin

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Advanced eCommerce - SuperAdmin Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if database exists
if (Test-Path "database\database.sqlite") {
    Write-Host "✓ Database file exists" -ForegroundColor Green
    
    $resetDb = Read-Host "Do you want to reset the database? This will create the SuperAdmin account (y/n)"
    
    if ($resetDb -eq 'y' -or $resetDb -eq 'Y') {
        Write-Host ""
        Write-Host "Resetting database and creating SuperAdmin..." -ForegroundColor Yellow
        php artisan migrate:fresh --seed
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "  ✓ DATABASE SETUP COMPLETE!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "👑 SuperAdmin Account Created!" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Email:    " -NoNewline -ForegroundColor White
            Write-Host "superadmin@ecommerce.com" -ForegroundColor Yellow
            Write-Host "Password: " -NoNewline -ForegroundColor White
            Write-Host "SuperAdmin@2026" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
        } else {
            Write-Host "✗ Database setup failed!" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "Creating database..." -ForegroundColor Yellow
    New-Item -ItemType File -Path "database\database.sqlite" -Force | Out-Null
    
    Write-Host "Running migrations and seeders..." -ForegroundColor Yellow
    php artisan migrate:fresh --seed
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✓ DATABASE SETUP COMPLETE!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "👑 SuperAdmin Account Created!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Email:    " -NoNewline -ForegroundColor White
        Write-Host "superadmin@ecommerce.com" -ForegroundColor Yellow
        Write-Host "Password: " -NoNewline -ForegroundColor White
        Write-Host "SuperAdmin@2026" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host "✗ Database setup failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: php artisan serve" -ForegroundColor White
Write-Host "2. Run: npm run dev (in another terminal)" -ForegroundColor White
Write-Host "3. Open: http://localhost:8000" -ForegroundColor White
Write-Host "4. Login with SuperAdmin credentials above" -ForegroundColor White
Write-Host ""
Write-Host "For more details, see: SUPERADMIN_CREDENTIALS.md" -ForegroundColor Green
Write-Host ""
