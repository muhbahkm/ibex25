# أوامر تشغيل IBEX

## تشغيل Backend (السيرفر)

### الطريقة الموصى بها:
```powershell
cd apps/backend
npm run start:dev:5433
```

### طرق بديلة:

#### PowerShell:
```powershell
cd apps/backend
$env:DATABASE_URL="postgresql://postgres:444455555@localhost:5433/ibex_dev"
npm run start:dev
```

#### CMD:
```cmd
cd apps\backend
set DATABASE_URL=postgresql://postgres:444455555@localhost:5433/ibex_dev
npm run start:dev
```

#### استخدام السكريبت:
```powershell
cd apps/backend
.\dev-tools\start-dev-5433.ps1
```

**السيرفر سيعمل على:** `http://localhost:3000`

---

## تشغيل Frontend

```powershell
cd apps/frontend
npm run dev
```

**Frontend سيعمل على:** `http://localhost:3000` (إذا كان Backend متوقف) أو `http://localhost:3001` (إذا كان Backend يعمل على 3000)

---

## تشغيل Backend و Frontend معاً

### Terminal 1 (Backend):
```powershell
cd apps/backend
npm run start:dev:5433
```

### Terminal 2 (Frontend):
```powershell
cd apps/frontend
npm run dev
```

---

## ملاحظات مهمة

### قبل تشغيل Backend:
1. ✅ تأكد من أن **PostgreSQL Desktop** يعمل
2. ✅ تأكد من أن قاعدة البيانات `ibex_dev` موجودة
3. ✅ تأكد من أن PostgreSQL يعمل على المنفذ **5433**

### متغيرات البيئة للـ Frontend:
ملف `.env.local` موجود في `apps/frontend/` ويحتوي على:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_CUSTOMER_ID=192cf664-616c-4c83-a780-a9c9a7e6330b
```

**ملاحظة مهمة:** بعد إنشاء أو تعديل ملف `.env.local`، يجب إعادة تشغيل Frontend (أوقف السيرفر ثم شغله مرة أخرى).

---

## أوامر إضافية مفيدة

### Backend:
```powershell
# توليد Prisma Client
cd apps/backend
npm run prisma:generate

# تشغيل Prisma Studio (واجهة قاعدة البيانات)
cd apps/backend
npm run prisma:studio

# بناء المشروع للإنتاج
cd apps/backend
npm run build
```

### Frontend:
```powershell
# بناء المشروع للإنتاج
cd apps/frontend
npm run build

# تشغيل النسخة المبنية
cd apps/frontend
npm run start
```

