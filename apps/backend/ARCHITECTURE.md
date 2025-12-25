# IBEX Backend - Architecture Documentation

## 🏗️ Production-First System Architecture

IBEX Backend follows a **Production-First** architecture where Neon PostgreSQL (Production) is the single source of truth for all database operations.

---

## 📋 Core Principles

### 1. **Production-First Database**
- **Neon PostgreSQL (Production)** is the ONLY database source
- No local PostgreSQL database exists or is allowed
- All database connections MUST use `DATABASE_URL` from environment variables
- Prisma schema uses `env("DATABASE_URL")` exclusively

### 2. **Environment-Driven Configuration**
- All configuration comes from environment variables
- No hardcoded connection strings
- No `.env` files for production (use Railway/Neon environment variables)
- No fallback mechanisms to local databases

### 3. **Single Source of Truth**
- Database schema is managed through Prisma migrations
- Migrations are applied to Neon PostgreSQL only
- No schema drift between environments

---

## 🔧 Database Configuration

### Prisma Schema
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // ← Only environment variable, no hardcoded values
}
```

### Environment Variables
- **`DATABASE_URL`** (Required): Neon PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database?sslmode=require`
  - Must be set in Railway environment variables
  - Must be set when running production scripts locally

---

## 🚀 Production Startup

### Using Railway (Recommended)
Railway automatically:
1. Sets `DATABASE_URL` from environment variables
2. Runs `npx prisma generate`
3. Runs `npx prisma migrate deploy`
4. Builds the application
5. Starts with `node dist/main`

### Using Production Scripts Locally
For local testing against production database:

**Linux/macOS:**
```bash
export DATABASE_URL='postgresql://...'
./scripts/start-production.sh
```

**Windows (PowerShell):**
```powershell
$env:DATABASE_URL='postgresql://...'
.\scripts\start-production.ps1
```

---

## ⚠️ Important Restrictions

### ❌ What is NOT Allowed:
1. **No local PostgreSQL**: Local PostgreSQL is stopped and not allowed
2. **No hardcoded connection strings**: All connections must use `DATABASE_URL`
3. **No `.env` for production**: Use Railway environment variables only
4. **No fallback mechanisms**: No local database fallbacks
5. **No `prisma migrate dev` in production**: Use `prisma migrate deploy` only

### ✅ What IS Allowed:
1. **Development scripts**: Scripts in `dev-tools/` are for development only
2. **Local testing**: Can test against production database using production scripts
3. **Environment variables**: All configuration via environment variables

---

## 📁 Project Structure

```
apps/backend/
├── scripts/
│   ├── start-production.sh      # Production startup (Linux/macOS)
│   └── start-production.ps1     # Production startup (Windows)
├── prisma/
│   ├── schema.prisma            # Uses env("DATABASE_URL") only
│   └── migrations/              # Production migrations
├── src/
│   └── prisma.service.ts        # Uses PrismaClient with DATABASE_URL
└── package.json                 # Production scripts
```

---

## 🔍 Verification

### Check Prisma Configuration
```bash
# Verify schema uses env("DATABASE_URL")
grep -A 2 "datasource db" prisma/schema.prisma
```

### Check Environment Variables
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL
```

### Test Production Connection
```bash
# Test connection to Neon
npx prisma db execute --stdin <<< "SELECT 1;"
```

---

## 📚 Related Documentation

- [Railway Setup Guide](./RAILWAY_SETUP.md)
- [API Documentation](./docs/api.md)

---

**Last Updated:** 2025-12-24  
**Architecture Version:** 1.0 (Production-First)

