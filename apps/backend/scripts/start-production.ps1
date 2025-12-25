###############################################################################
# IBEX Backend - Production Startup Script (PowerShell)
###############################################################################
#
# ⚠️  IMPORTANT: Production-First System Architecture
#
# This script is designed for IBEX's production-first architecture where:
# - Neon PostgreSQL (Production) is the ONLY database source
# - No local PostgreSQL database exists or is allowed
# - All database connections MUST use DATABASE_URL from environment variables
# - Prisma schema uses env("DATABASE_URL") exclusively
#
# Architecture Principles:
# 1. Production-first: Neon PostgreSQL is the single source of truth
# 2. Environment-driven: All configuration comes from environment variables
# 3. No fallbacks: No hardcoded connection strings or local database fallbacks
#
###############################################################################

$ErrorActionPreference = "Stop"

Write-Host "🚀 IBEX Backend - Production Startup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable is not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set DATABASE_URL before running this script:" -ForegroundColor Yellow
    Write-Host "  `$env:DATABASE_URL='postgresql://user:password@host:port/database?sslmode=require'" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Validate DATABASE_URL format
if ($env:DATABASE_URL -notmatch '^postgresql://' -and $env:DATABASE_URL -notmatch '^postgres://') {
    Write-Host "❌ ERROR: DATABASE_URL must start with 'postgresql://' or 'postgres://'" -ForegroundColor Red
    Write-Host ""
    Write-Host "Current DATABASE_URL starts with: $($env:DATABASE_URL.Substring(0, [Math]::Min(20, $env:DATABASE_URL.Length)))..." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ DATABASE_URL is set" -ForegroundColor Green
$dbHost = ($env:DATABASE_URL -replace '.*@([^/]+)/.*', '$1')
Write-Host "   Database: $dbHost" -ForegroundColor Gray
Write-Host ""

# Ensure we're in the backend directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptDir
Set-Location $backendDir

Write-Host "📦 Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate

Write-Host ""
Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan
npx prisma migrate deploy

Write-Host ""
Write-Host "🏗️  Building application..." -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "✅ Starting NestJS application in production mode..." -ForegroundColor Green
$port = if ($env:PORT) { $env:PORT } else { "3000" }
Write-Host "   Listening on: http://0.0.0.0:$port" -ForegroundColor Gray
Write-Host ""

# Start the application
node dist/main

