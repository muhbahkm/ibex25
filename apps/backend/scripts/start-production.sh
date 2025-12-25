#!/bin/bash

###############################################################################
# IBEX Backend - Production Startup Script
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

set -e  # Exit on any error

echo "🚀 IBEX Backend - Production Startup"
echo "======================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set DATABASE_URL before running this script:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database?sslmode=require'"
    echo ""
    exit 1
fi

# Validate DATABASE_URL format
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]] && [[ ! "$DATABASE_URL" =~ ^postgres:// ]]; then
    echo "❌ ERROR: DATABASE_URL must start with 'postgresql://' or 'postgres://'"
    echo ""
    echo "Current DATABASE_URL starts with: ${DATABASE_URL:0:20}..."
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo "   Database: $(echo $DATABASE_URL | sed -E 's|.*@([^/]+)/.*|\1|')"
echo ""

# Ensure we're in the backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

echo "📦 Generating Prisma Client..."
npx prisma generate

echo ""
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo ""
echo "🏗️  Building application..."
npm run build

echo ""
echo "✅ Starting NestJS application in production mode..."
echo "   Listening on: http://0.0.0.0:${PORT:-3000}"
echo ""

# Start the application
exec node dist/main

