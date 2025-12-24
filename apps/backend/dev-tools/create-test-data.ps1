# Script to create test data and test the statement endpoint

$env:DATABASE_URL = "postgresql://postgres:444455555@localhost:5433/ibex_dev"

Write-Host "Creating test data..." -ForegroundColor Cyan
Write-Host ""

# We'll use Prisma Client directly via Node.js script
$testScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Create or get a store
    let store = await prisma.store.findFirst();
    if (!store) {
      store = await prisma.store.create({
        data: { name: 'Test Store' }
      });
      console.log('Created store:', store.id);
    } else {
      console.log('Using existing store:', store.id);
    }

    // Create or get a user
    let user = await prisma.user.findFirst({
      where: { storeId: store.id }
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          storeId: store.id
        }
      });
      console.log('Created user:', user.id);
    } else {
      console.log('Using existing user:', user.id);
    }

    // Create a customer
    const customer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        storeId: store.id,
        isGuest: false
      }
    });
    console.log('Created customer:', customer.id);

    // Create some products
    const product1 = await prisma.product.create({
      data: {
        name: 'Product 1',
        price: 100.00,
        stock: 100,
        storeId: store.id
      }
    });

    const product2 = await prisma.product.create({
      data: {
        name: 'Product 2',
        price: 50.00,
        stock: 100,
        storeId: store.id
      }
    });

    console.log('Created products');

    // Create some invoices
    // Unpaid invoice
    const unpaidInvoice = await prisma.invoice.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        status: 'UNPAID',
        totalAmount: 250.00,
        createdBy: user.id,
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 2,
              unitPrice: 100.00
            },
            {
              productId: product2.id,
              quantity: 1,
              unitPrice: 50.00
            }
          ]
        }
      }
    });
    console.log('Created unpaid invoice:', unpaidInvoice.id);

    // Paid invoice
    const paidInvoice = await prisma.invoice.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        status: 'PAID',
        totalAmount: 150.00,
        createdBy: user.id,
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              unitPrice: 100.00
            },
            {
              productId: product2.id,
              quantity: 1,
              unitPrice: 50.00
            }
          ]
        }
      }
    });
    console.log('Created paid invoice:', paidInvoice.id);

    // Another unpaid invoice
    const unpaidInvoice2 = await prisma.invoice.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        status: 'UNPAID',
        totalAmount: 100.00,
        createdBy: user.id,
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              unitPrice: 100.00
            }
          ]
        }
      }
    });
    console.log('Created another unpaid invoice:', unpaidInvoice2.id);

    console.log('\nTest data created successfully!');
    console.log('Customer ID:', customer.id);
    console.log('\nYou can now test the endpoint:');
    console.log(\`GET http://localhost:3000/customers/\${customer.id}/statement\`);

    return customer.id;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await prisma.\$disconnect();
  }
}

main()
  .then((customerId) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
"@

# Save script to temp file
$tempFile = [System.IO.Path]::GetTempFileName() + ".js"
$testScript | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Running test data creation script..." -ForegroundColor Yellow
$result = node $tempFile 2>&1

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
        Write-Host ""
        
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

# Clean up
Remove-Item $tempFile -ErrorAction SilentlyContinue

