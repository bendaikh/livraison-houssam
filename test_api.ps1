# Test API Integrations Endpoint
$token = "3|EdPKTdgcocHcTJ12DYBRdwM8ZAkWNE3rsr3JNkM2ee5ed2d8"
$url = "http://localhost:8000/api/api-integrations"

Write-Host "Testing API endpoint..." -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Gray
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Accept" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    
    Write-Host "Success! Found integrations:" -ForegroundColor Green
    Write-Host ""
    
    foreach ($integration in $response) {
        Write-Host "ID: $($integration.id)" -ForegroundColor Yellow
        Write-Host "Name: $($integration.name)"
        Write-Host "Type: $($integration.type)"
        Write-Host "Provider: $($integration.provider)"
        Write-Host "Active: $($integration.is_active)"
        Write-Host "---"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "1. Laravel server is running"
    Write-Host "2. The token is valid"
    Write-Host "3. The database has integrations"
}
