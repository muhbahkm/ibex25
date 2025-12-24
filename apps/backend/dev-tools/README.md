# Development Tools

This directory contains development and testing utilities for the IBEX backend.

**These files are NOT part of the production codebase and are for development/testing purposes only.**

## Files

### Test Scripts

- **`test-statement.html`** - HTML page for testing the customer statement endpoint in a browser
- **`test-statement.ps1`** - PowerShell script to test the statement endpoint
- **`test-statement-endpoint.ps1`** - PowerShell script to create test data and test the statement endpoint
- **`test-settle.ps1`** - PowerShell script to test the invoice settlement endpoint

### Test Data Creation

- **`create-test-data.js`** - Node.js script to create test data (stores, customers, products, invoices)
- **`create-test-data.ps1`** - PowerShell wrapper for the test data creation script

### Development Scripts

- **`start-dev-5433.ps1`** - PowerShell script to start the dev server with explicit database port 5433
- **`start-dev-5433.bat`** - Batch script to start the dev server with explicit database port 5433

### Notes

- **`sart1`** - Development notes file

## Usage

All scripts should be run from the `apps/backend` directory:

```powershell
# Example: Run test data creation
cd apps/backend
node dev-tools/create-test-data.js

# Example: Test settlement endpoint
cd apps/backend
powershell -ExecutionPolicy Bypass -File dev-tools/test-settle.ps1
```

## Important

- These files are NOT imported by production code
- These files are NOT required for the application to run
- These files are for development and testing purposes only

