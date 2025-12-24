# Test script for GET /customers/{customerId}/statement endpoint

Write-Host "Testing GET /customers/{customerId}/statement endpoint" -ForegroundColor Cyan
Write-Host ""

# First, let's check if the server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -UseBasicParsing
    Write-Host "✓ Server is running on http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "✗ Server is not running. Please start it first with: npm run start:dev" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Note: You need to provide a valid customerId from your database." -ForegroundColor Yellow
Write-Host "Example usage:" -ForegroundColor Yellow
Write-Host "  curl http://localhost:3000/customers/{customerId}/statement" -ForegroundColor White
Write-Host ""
Write-Host "To get a customer ID, you can:" -ForegroundColor Yellow
Write-Host "  1. Check your database using Prisma Studio: npx prisma studio" -ForegroundColor White
Write-Host "  2. Or use the API to list customers (if that endpoint exists)" -ForegroundColor White
Write-Host ""

# Ask user for customerId
$customerId = Read-Host "Enter a customer ID to test (or press Enter to skip)"

if ($customerId -ne "") {
    Write-Host ""
    Write-Host "Testing with customerId: $customerId" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        $statementResponse = Invoke-RestMethod -Uri "http://localhost:3000/customers/$customerId/statement" -Method GET
        Write-Host "✓ Success! Statement retrieved:" -ForegroundColor Green
        Write-Host ""
        $statementResponse | ConvertTo-Json -Depth 10
    } catch {
        Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Skipped test. You can test manually using:" -ForegroundColor Yellow
    Write-Host "  curl http://localhost:3000/customers/{customerId}/statement" -ForegroundColor White
}

