# 🌸 مبيعات المحل / Shop Sales

نظام لتسجيل مبيعات محل الورد. المنسقون (رياض وسجيب) يسجلون كل عملية، والمدراء يستلمون تنبيه فوري على تيليجرام ويشوفون تقارير يومية وشهرية.
كل الشاشات مكتوبة **بالعربي والإنجليزي**.

## المميزات

- **تسجيل عملية / New Sale**:
  - نوع الطلب: جاهز / Ready-made، تنسيق من المنسق / Prepared by Coordinator، أخرى / Other
  - مع هدية؟ (سلسال أو غيره) بسعرها
  - الاستلام: استلام من المحل / Pickup، توصيل / Delivery
  - الدفع: كاش / Cash، شبكة / Card
  - المبلغ، واسم العميل وجواله والملاحظات (اختيارية)
- **تنبيه تيليجرام** لك ولسعود مع كل عملية جديدة
- **التقرير اليومي / Daily Report**: الإجمالي والكاش والشبكة، وتفصيل حسب الموظف ونوع الطلب والاستلام، وقائمة العمليات. يتحدث مباشرة أول ما تتسجل عملية.
- **التقرير الشهري / Monthly Report**: تقرير كل يوم بيومه وتاريخه، مع مجموع يطابق إجمالي الشهر
- **طباعة** أي تقرير
- **تصدير Excel** لأي يوم أو شهر
- **الصلاحيات**: الموظف يسجل ويشوف عملياته هو فقط. المدير يشوف كل شي ويقدر يحذف العملية الغلط.

## التقنيات

Next.js وSupabase (قاعدة بيانات PostgreSQL)، والاستضافة على Vercel. ويعمل على الجوال كتطبيق (PWA).

---

## خطوات التشغيل

### 1) إنشاء قاعدة البيانات على Supabase (مجاني)

1. سجّل في [supabase.com](https://supabase.com) وأنشئ مشروع جديد (اختر منطقة قريبة، مثلاً Frankfurt أو Mumbai).
2. افتح **SQL Editor** والصق محتوى ملف [`supabase/schema.sql`](supabase/schema.sql) كامل، ثم اضغط **Run**.
3. من **Project Settings → API** انسخ:
   - `Project URL`
   - `anon public key`

> **تحديثات قاعدة البيانات:** إذا كانت القاعدة منشأة من قبل، شغّل ملفات `supabase/migrations/` بالترتيب في SQL Editor (مثل `002_gifts.sql` لخانة الهدية).

### 2) إضافة المستخدمين

- **الموظفين** يدخلون برقم الجوال. في Supabase يتسجل الرقم كإيميل بهذا الشكل: `9665XXXXXXXX@shop.com` (الرقم يبدأ بـ 966 وبدون الصفر).
- **المدراء** يدخلون بإيميلهم.

من **Authentication → Users → Add user → Create new user** أنشئ حساب لكل شخص، وفعّل **Auto Confirm User**.

الحساب لحاله **ما يكفي**: لازم تضيف الشخص لقائمة النظام في **SQL Editor** (غيّر الإيميل والاسم):

```sql
insert into shop_staff (id, full_name, role)
select id, 'الاسم / Name', 'employee' from auth.users where email = '9665XXXXXXXX@shop.com';
-- للمدير: اكتب 'admin' بدل 'employee'
```

### 3) تنبيهات تيليجرام

1. في تيليجرام افتح **@BotFather** وأرسل `/newbot`، واختر اسم للبوت. يعطيك **token**.
2. سوِّ قروب، وأضف فيه المدراء والبوت، وأرسل أي رسالة في القروب.
3. في Vercel أضف `TELEGRAM_BOT_TOKEN`، وسوِّ **Redeploy**.
4. ادخل النظام كمدير وافتح `/api/telegram/chats`، وانسخ رقم القروب (يبدأ بـ `-`) إلى `TELEGRAM_CHAT_ID` في Vercel، وسوِّ **Redeploy**.

**الملخص اليومي (11 مساءً):** أضف في Vercel `SUPABASE_SECRET_KEY` (من Supabase: **Project Settings → API Keys → Secret key**)، و`CRON_SECRET` (أي كلمة طويلة عشوائية)، وسوِّ **Redeploy**.

### 4) النشر على Vercel (مجاني)

1. سجّل في [vercel.com](https://vercel.com) بحساب GitHub، واستورد مستودع `shop-sales`.
2. في **Environment Variables** أضف:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `TELEGRAM_BOT_TOKEN` و `TELEGRAM_CHAT_ID`
3. اضغط **Deploy**، وبيعطيك رابط مثل `shop-sales.vercel.app`.
4. افتح الرابط من جوال رياض وسجيب، واختر **إضافة إلى الشاشة الرئيسية / Add to Home Screen**، وبيصير مثل التطبيق.

### التشغيل على جهازك (للتطوير)

```bash
cp .env.example .env.local   # وعبّي القيم
npm install
npm run dev
```
