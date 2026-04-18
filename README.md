# ElOsta Auto (Vite + React + API)

## تشغيل محليًا
- تثبيت الحزم: `npm install`
- تشغيل الواجهة + الـAPI معًا: `npm run dev`
  - الويب: `http://localhost:5173` (أو بورت قريب حسب المتاح)
  - الـAPI: `http://localhost:3001/api/health`

## متغيرات البيئة (Gemini)
هذا المشروع يدعم Gemini اختياريًا.
- انسخ `.env.example` إلى `.env` وضع القيم محليًا.
- على Vercel: لا ترفع `.env` إلى GitHub. أضف القيم من:
  - Project Settings → Environment Variables
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL` (اختياري)

## النشر على Vercel
تم تجهيز الـAPI للعمل كـ Serverless Function عبر الملف `api/[...path].ts`.

### خطوات سريعة
1) ارفع المشروع على GitHub.
2) افتح Vercel واختر **New Project** ثم **Import** من GitHub.
3) إعدادات البناء:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4) أضف Environment Variables (إن كنت تستخدم Gemini) ثم أعد النشر.

### ملاحظات
- أي مسار يبدأ بـ `/api/...` يُخدم من دالة Vercel.
- الواجهة الأمامية تستدعي `/api/diagnose` و `/api/follow-up`.
