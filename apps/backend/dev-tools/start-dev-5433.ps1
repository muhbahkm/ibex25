# Script to start NestJS dev server with explicit database port 5433
$env:DATABASE_URL = "postgresql://postgres:444455555@localhost:5433/ibex_dev"
Write-Host "Starting NestJS with DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Green
npm run start:dev

