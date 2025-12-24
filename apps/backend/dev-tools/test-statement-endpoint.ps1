# Script to create test data and test the statement endpoint

$env:DATABASE_URL = "postgresql://postgres:444455555@localhost:5433/ibex_dev"

Write-Host "Creating test data..." -ForegroundColor Cyan
Write-Host ""

# Run the Node.js script to create test data
$result = node create-test-data.js 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host $result
    Write-Host ""
    
    # Extract customer ID from output
    $customerIdMatch = $result | Select-String -Pattern "Customer ID: ([a-f0-9-]+)"
    if ($customerIdMatch) {
        $customerId = $customerIdMatch.Matches[0].Groups[1].Value
        Write-Host "✓ Test data created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Testing the statement endpoint..." -ForegroundColor Cyan
        Write-Host "Customer ID: $customerId" -ForegroundColor Yellow
        Write-Host ""
        
        Start-Sleep -Seconds 1
        
        try {
            $statementResponse = Invoke-RestMethod -Uri "http://localhost:3000/customers/$customerId/statement" -Method GET
            Write-Host "✓ Success! Statement retrieved:" -ForegroundColor Green
            Write-Host ""
            $statementResponse | ConvertTo-Json -Depth 10
        } catch {
            Write-Host "✗ Error testing endpoint: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "Response: $responseBody" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "Could not extract customer ID from output" -ForegroundColor Yellow
        Write-Host "Output was:" -ForegroundColor Yellow
        Write-Host $result
    }
} else {
    Write-Host "✗ Error creating test data:" -ForegroundColor Red
    Write-Host $result
}

