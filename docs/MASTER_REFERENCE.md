الوثيقة المرجعية الشاملة للمشروع

Master Project Reference

الجزء الأول
الرؤية، المشكلة، نموذج العمل، والفلسفة الهندسية
1. تعريف المشروع (What is IBEX?)

IBEX هو نواة نظام محاسبي–مالي سحابي (SaaS) مصمم ليعمل في بيئات غير مستقرة تقنيًا وتنظيميًا، مع قابلية توسع عالمية، دون التضحية بالصرامة المحاسبية أو السلامة المعمارية.

IBEX ليس:

برنامج فواتير بسيط

لوحة تحكم CRUD

واجهة أمامية جميلة فوق منطق هش

IBEX هو:

Accounting-first system

Backend-governed platform

SaaS-ready by design

Audit-safe by construction

2. توصيف المشكلة (Problem Statement)
المشكلة في السوق ليست تقنية فقط، بل بنيوية:

أغلب أنظمة المحاسبة في الأسواق الناشئة:

تخلط بين العرض والمنطق

تخزن الأرصدة بدل تسجيل الحركات

تسمح بتعديل الماضي

لا تملك audit trail حقيقي

معظم حلول SaaS:

تبدأ بالواجهة ثم “تُلحق” المحاسبة لاحقًا

تفشل عند أول توسع أو التزام قانوني

تنكسر عند أول سيناريو حقيقي (refunds, disputes, partial payments)

الحلول المحلية:

غير قابلة للتوسع

غير متعددة المستأجرين (multi-tenant)

غير قابلة للتكامل مع بوابات الدفع الحديثة

3. الحل الذي يقدمه IBEX (Solution)

IBEX يعكس المعادلة:

نبدأ بالحقيقة المحاسبية، ثم نبني كل شيء حولها.

المبادئ الأساسية للحل:

Ledger هو المصدر الوحيد للحقيقة

لا أرصدة مخزنة

لا تعديل على الماضي

كل شيء append-only

كل عملية قابلة للتتبع auditably

كل منطق حساس في الـ backend فقط

4. نموذج العمل (Business Model)

IBEX مصمم كنظام SaaS تجاري قابل للتوسع.

نموذج الإيرادات:

اشتراكات شهرية/سنوية

خطط (Plans) بحدود استخدام

تسعير مرن (B1–B4)

Billing مستقل عن المحاسبة

BillingAccount داخلي

Stripe (أو غيره) مجرد منفّذ

النظام هو مصدر الحقيقة

قابل للتدرج

Free / Starter / Pro / Enterprise

Usage-based limits (C2)

5. الفلسفة الهندسية (Engineering Philosophy)
5.1 Backend كدستور (Backend as Constitution)

الـ backend هو القانون

الـ frontend هو مترجم عرض فقط

لا منطق أعمال في الواجهة

لا حسابات مالية في الواجهة

لا افتراضات

أي شاشة لا تجد API صريحًا لها → تتوقف.

5.2 Accounting Invariants (ثوابت غير قابلة للكسر)

تم تجميد هذه القواعد رسميًا (Phase K):

Invoice lifecycle:

DRAFT → ISSUED → UNPAID → PAID
                  ↘ CANCELLED


Payment:

واحد فقط لكل فاتورة

غير قابل للتعديل

Ledger:

SALE واحد لكل فاتورة

RECEIPT واحد لكل فاتورة

append-only

no balances

no deletes

no updates

5.3 SaaS by Design (وليس بالصدفة)

Tenant = Store

StoreScopeGuard في كل نقطة حساسة

Defense in depth:

Guards

Service checks

Logging

No cross-tenant access possible

6. المعمارية العامة (High-Level Architecture)
Frontend (Next.js)
  |
  |  REST (Contracts Frozen)
  v
Backend (NestJS)
  |
  |  Prisma ORM
  v
PostgreSQL

Domains واضحة ومفصولة:

Invoices

Ledger

Reports

Billing

Usage

Audit

Auth

SaaS Core

7. الأدوات والتقنيات (Technology Stack)
Backend

NestJS

TypeScript

PostgreSQL

Prisma ORM

Stripe SDK (B4)

Header-based Auth (مرحلي)

Frontend

Next.js (App Router)

React

TypeScript

TailwindCSS

Design System داخلي

RTL-first

8. لماذا هذا النهج بطيء في البداية لكنه رابح؟

لأن:

كل shortcut في المحاسبة = دين تقني قاتل

كل منطق في الواجهة = فشل حتمي

كل SaaS بدون tenant discipline = كارثة قانونية

IBEX اختار:

الطريق الصعب أولًا… ليكون الطريق السهل لاحقًا.

⏸️ نهاية الجزء الأول

(الرؤية، المشكلة، الحل، نموذج العمل، الفلسفة)

الجزء الثاني
التنفيذ خطوة بخطوة، حالة المشروع، وكيف يجب العمل عليه
9. خارطة التنفيذ الفعلية (What Was Built)
9.1 Core Accounting (E → F → G)

Payment model

Ledger skeleton

Ledger guards

Auth skeleton

Idempotency

9.2 Read-only Expansion (I → R)

Ledger UI + API

Date filters

CSV export

Profit & Loss reporting

9.3 Governance & Freeze (K)

API contracts frozen

Accounting invariants documented

Error model unified

Tags created

10. SaaS Hardening (S Phases)

S1: SaaS readiness

S2: Partial enforcement

S3: Invoice domain hardening

كلها:

بدون كسر API

بدون كسر invariants

11. Billing Journey (B1 → B4)

B1: Plans & limits

B2: Pricing (read-only)

B3: Internal billing control

B4: Stripe integration

BillingAccount هو الحقيقة، Stripe مجرد منفّذ.

12. Operational Safety (C Phases)

Rate limiting

Write throttling

Usage metering

Central error codes

13. حالة المشروع الحالية (بصراحة تامة)
Backend:

مكتمل بنسبة ~90%

Stable

Frozen

Ready for production iteration

Frontend:

Logic complete

Screens implemented

UI Sprint قيد التنفيذ

لا منطق، لا حسابات، لا افتراضات

14. لماذا جُمّد الـ Backend أثناء Sprint UI؟

لأن:

تغيير backend أثناء UI = فوضى

كسر العقود = شاشات مكسورة

الفريق يحتاج “أرضية صلبة”

هذا قرار احترافي، لا كسول.

15. النسق التصميمي (Design System)

Typography hierarchy

Numeric typography

Status badges

Buttons

Tables

Empty / Loading / Error states

RTL-first

الهدف:

واجهة هادئة، تنفيذية، غير صاخبة.

16. قواعد العمل المستقبلية (غير قابلة للتفاوض)

لا API جديد بدون وثيقة

لا شاشة بدون endpoint

لا حساب مالي في الواجهة

لا تعديل تاريخي

لا cross-tenant access

Backend أولًا دائمًا

17. لمن هذه الوثيقة؟

مطور Backend جديد

مطور Frontend

مهندس معماري

شريك تقني

مستثمر تقني واعٍ

هذه الوثيقة هي “عقل المشروع المكتوب”.

18. الخلاصة (Executive Summary)

IBEX ليس مشروعًا صغيرًا كبر صدفة.
IBEX مشروع كبير بُني بصبر.

ما تم:

صحيح

صلب

قابل للنمو

وما تبقى:

UI polish

Market validation

Deployment strategy

Go-to-market