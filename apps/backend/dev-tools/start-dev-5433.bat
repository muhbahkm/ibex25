@echo off
REM Script to start NestJS dev server with explicit database port 5433
set DATABASE_URL=postgresql://postgres:444455555@localhost:5433/ibex_dev
echo Starting NestJS with DATABASE_URL: %DATABASE_URL%
call npm run start:dev

