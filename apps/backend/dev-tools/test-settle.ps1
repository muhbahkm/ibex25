# Test Invoice Settlement Endpoint

$customerId = "192cf664-616c-4c83-a780-a9c9a7e6330b"

Write-Host "Getting customer statement..." -ForegroundColor Cyan
$statement = Invoke-RestMethod -Uri "http://localhost:3000/customers/$customerId/statement"

# Find first UNPAID invoice
$unpaidInvoice = $statement.invoices | Where-Object { $_.status -eq "UNPAID" } | Select-Object -First 1

if ($unpaidInvoice) {
    Write-Host "`nFound UNPAID invoice:" -ForegroundColor Green
    Write-Host "  ID: $($unpaidInvoice.id)"
    Write-Host "  Amount: $($unpaidInvoice.totalAmount)"
    Write-Host ""
    
    Write-Host "Settling invoice..." -ForegroundColor Yellow
    $settleResponse = Invoke-RestMethod -Uri "http://localhost:3000/invoices/$($unpaidInvoice.id)/settle" -Method POST
    
    Write-Host "`n✓ Settlement successful!" -ForegroundColor Green
    $settleResponse | ConvertTo-Json
    
    Write-Host "`nVerifying statement after settlement..." -ForegroundColor Cyan
    $updatedStatement = Invoke-RestMethod -Uri "http://localhost:3000/customers/$customerId/statement"
    Write-Host "Outstanding balance: $($updatedStatement.summary.outstandingBalance)" -ForegroundColor Green
    Write-Host "Unpaid invoices: $($updatedStatement.summary.unpaidInvoices)" -ForegroundColor Green
    Write-Host "Paid invoices: $($updatedStatement.summary.paidInvoices)" -ForegroundColor Green
} else {
    Write-Host "No UNPAID invoices found" -ForegroundColor Red
}

