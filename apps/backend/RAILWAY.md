# Railway Deployment Guide

## إعدادات Railway المطلوبة

### 1. Root Directory
في إعدادات المشروع على Railway:
- **Root Directory**: `apps/backend`

### 2. Environment Variables
أضف المتغيرات التالية في Railway → Variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_c76Mhunmfgbd@ep-young-flower-a1wp3ydx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
NODE_ENV=production
```

### 3. Build & Deploy
Railway سيقوم تلقائياً بـ:
1. `npm ci` - تثبيت الحزم
2. `npx prisma generate` - توليد Prisma Client
3. `npm run build` - بناء المشروع
4. `npx prisma migrate deploy` - تشغيل migrations
5. `node dist/main` - تشغيل التطبيق

### 4. Health Check
التطبيق يستمع على `PORT` الذي يحدده Railway تلقائياً.

## Troubleshooting

### Application failed to respond
1. تحقق من Deploy Logs في Railway
2. تأكد من أن `DATABASE_URL` صحيح
3. تأكد من أن migrations تم تشغيلها بنجاح
4. تحقق من أن `PORT` متغير موجود

### Database Connection Error
- تأكد من أن connection string صحيح
- تأكد من أن قاعدة البيانات متاحة من Railway
- تحقق من SSL settings في connection string

