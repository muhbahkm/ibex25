# Test Unified API Responses

Write-Host "Testing Unified API Responses" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Success Response
Write-Host "1. Testing Success Response (GET /):" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000" -Method GET
    Write-Host "  ✓ Success response structure:" -ForegroundColor Green
    Write-Host "    - success: $($response.success)" -ForegroundColor White
    Write-Host "    - data: $($response.data)" -ForegroundColor White
    if ($response.success -eq $true -and $null -ne $response.data) {
        Write-Host "  ✓ Response format is correct!" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Success Response with complex data
Write-Host "2. Testing Success Response (GET /customers/{id}/statement):" -ForegroundColor Yellow
$customerId = "192cf664-616c-4c83-a780-a9c9a7e6330b"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/customers/$customerId/statement" -Method GET
    Write-Host "  ✓ Success response structure:" -ForegroundColor Green
    Write-Host "    - success: $($response.success)" -ForegroundColor White
    Write-Host "    - data.customer exists: $($null -ne $response.data.customer)" -ForegroundColor White
    Write-Host "    - data.summary exists: $($null -ne $response.data.summary)" -ForegroundColor White
    if ($response.success -eq $true -and $null -ne $response.data) {
        Write-Host "  ✓ Response format is correct!" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Error Response (404)
Write-Host "3. Testing Error Response (404 Not Found):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/customers/00000000-0000-0000-0000-000000000000/statement" -Method GET -ErrorAction Stop
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    $json = $body | ConvertFrom-Json
    
    Write-Host "  ✓ Error response structure:" -ForegroundColor Green
    Write-Host "    - success: $($json.success)" -ForegroundColor White
    Write-Host "    - error.code: $($json.error.code)" -ForegroundColor White
    Write-Host "    - error.message: $($json.error.message)" -ForegroundColor White
    
    if ($json.success -eq $false -and $null -ne $json.error) {
        Write-Host "  ✓ Error response format is correct!" -ForegroundColor Green
    }
}

Write-Host ""

# Test 4: Error Response (400)
Write-Host "4. Testing Error Response (400 Bad Request):" -ForegroundColor Yellow
try {
    $statement = Invoke-RestMethod -Uri "http://localhost:3000/customers/192cf664-616c-4c83-a780-a9c9a7e6330b/statement" -Method GET
    $paidInvoice = ($statement.data.invoices | Where-Object { $_.status -eq 'PAID' })[0]
    
    try {
        Invoke-WebRequest -Uri "http://localhost:3000/invoices/$($paidInvoice.id)/settle" -Method POST -ErrorAction Stop
    } catch {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        $json = $body | ConvertFrom-Json
        
        Write-Host "  ✓ Error response structure:" -ForegroundColor Green
        Write-Host "    - success: $($json.success)" -ForegroundColor White
        Write-Host "    - error.code: $($json.error.code)" -ForegroundColor White
        Write-Host "    - error.message: $($json.error.message)" -ForegroundColor White
        
        if ($json.success -eq $false -and $null -ne $json.error) {
            Write-Host "  ✓ Error response format is correct!" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "All tests completed!" -ForegroundColor Cyan

