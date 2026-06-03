# خطة التنفيذ

## 1. حذف تبويبة "المبرمجون"
- إزالة `/dashboard/programmers` من `AppSidebar.tsx` و `App.tsx` و `Dashboard.tsx`
- حذف ملف `src/pages/Programmers.tsx`
- إزالة مفاتيح الترجمة `nav.programmers` و `prog.*` من `i18n.tsx`

## 2. خاصية التوثيق بالذكاء الاصطناعي
**قاعدة البيانات** (migration):
- إضافة أعمدة على `profiles`:
  - `is_verified boolean default false`
  - `verification_status text` ('none' | 'pending' | 'approved' | 'rejected')
  - `verification_score int`
  - `verification_notes text`
  - `verification_submitted_at timestamptz`
- جدول جديد `verification_requests`:
  - `id, user_id, bio, skills, portfolio_links[], github_url, experience_years, ai_score, ai_analysis, status, created_at, reviewed_at`
  - RLS + GRANT للمصادق عليهم

**Edge function** `verify-profile`:
- يأخذ بيانات المستخدم، يستدعي Lovable AI (`google/gemini-3-flash-preview`) لتحليل الملف
- يُرجع score (0-100) + تحليل
- إذا score ≥ 70 → `is_verified = true` تلقائياً

**واجهة**:
- صفحة `Profile.tsx`: زر "طلب التوثيق" + نموذج
- شارة التوثيق (Verified badge ✓ أزرق) تظهر في:
  - `PublicProfile.tsx`
  - بطاقات المستخدمين في `Teachers` و `Groups` و `Messages`
- مرئية للجميع

## 3. تبويبة "الأساتذة المتخصصون"
- صفحة جديدة `src/pages/Teachers.tsx`:
  - فلترة `profiles` حيث `specialty IN ('programming','cybersecurity')` و `is_verified = true`
  - تبويبات فرعية: برمجة / أمن سيبراني
- إضافة عمود `specialty text` و `is_teacher boolean` على `profiles`
- إضافة في القائمة الجانبية + Dashboard + Routes
- مفاتيح ترجمة `nav.teachers` + `teachers.*`

## 4. تشفير المحادثات الخاصة (E2EE)
- مكتبة: استخدام Web Crypto API (AES-GCM) مع مفتاح مشتق من زوج مفاتيح RSA لكل مستخدم
- عمود جديد على `profiles`: `public_key text` (RSA-OAEP exported JWK)
- المفتاح الخاص يُخزن في `localStorage` للمستخدم فقط
- عند الإرسال:
  - توليد مفتاح AES عشوائي لكل رسالة
  - تشفير المحتوى بـ AES-GCM
  - تشفير مفتاح AES بمفتاحَي المرسل والمستلم العامين
  - تخزين: `ciphertext`, `iv`, `key_for_sender`, `key_for_recipient`
- عند الاستلام: فك بالمفتاح الخاص
- migration: إضافة الأعمدة على `direct_messages`، الإبقاء على `content` للرسائل القديمة (legacy)
- ملف `src/lib/crypto.ts` يضم: `generateKeyPair`, `ensureUserKeys`, `encryptMessage`, `decryptMessage`
- تعديل `Messages.tsx` لاستخدامه

## 5. إرفاق ملفات في الشات
- إنشاء bucket `chat-files` (خاص)
- إضافة عمود `attachment_url text`, `attachment_name text`, `attachment_type text` على `direct_messages`
- زر "📎" في `Messages.tsx` يفتح file picker، يرفع، ثم يرسل الرسالة مع المرفق
- عرض المرفق:
  - صور inline
  - باقي الملفات كرابط تحميل
- ملاحظة: المرفقات لن تكون مشفرة (تخزن في Storage مباشرة) — الرسالة النصية فقط هي المشفرة

## 6. ترجمة كاملة 3 لغات
- مراجعة `src/lib/i18n.tsx`: التأكد أن كل المفاتيح موجودة بـ `ar/fr/en`
- استبدال أي نص ثابت متبقي في المكونات بـ `t("...")`
- LanguageSwitcher موجود مسبقاً ويعمل

## ملاحظات تقنية
- لن نتمكن من فك تشفير الرسائل القديمة قبل التحديث (ستبقى نصاً صريحاً عبر `content`)
- المفتاح الخاص محلي على المتصفح: إذا غيّر المستخدم الجهاز، الرسائل القديمة لن تُفك. سنضيف تنبيهاً.
- مرفقات الشات غير مشفرة (قيد عملي للحفاظ على البساطة)

## الترتيب
1. Migrations (DB schema + bucket + RLS) — call واحد
2. Edge function `verify-profile`
3. كود Frontend: i18n, crypto lib, صفحات جديدة، تعديلات
4. تنظيف Programmers

هل أبدأ التنفيذ؟
