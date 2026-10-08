# 🌸 مبيعات المحل / Shop Sales

نظام لتسجيل مبيعات محل الورد. المنسقون (رياض وسجيب) يسجلون كل عملية، والمدراء يستلمون إشعار واتساب فوري ويشوفون تقارير يومية وشهرية.
كل الشاشات مكتوبة **بالعربي والإنجليزي**.

## المميزات

- **تسجيل عملية / New Sale**:
  - نوع الطلب: جاهز / Ready-made، تنسيق من المنسق / Prepared by Coordinator، أخرى / Other
  - مع هدية؟ (سلسال أو غيره) بسعرها
  - الاستلام: استلام من المحل / Pickup، توصيل / Delivery
  - الدفع: كاش / Cash، شبكة / Card
  - المبلغ، واسم العميل وجواله والملاحظات (اختيارية)
- **إشعار واتساب** لك ولسعود مع كل عملية جديدة
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

### 3) تفعيل إشعارات الواتساب (CallMeBot، مجاني)

**كل مدير** يسوي هذي الخطوة من جواله مرة وحدة:

1. افتح [callmebot.com](https://www.callmebot.com/blog/free-api-whatsapp-messages/) وخذ رقم CallMeBot الحالي المكتوب في الصفحة، واحفظه في جهات الاتصال.
2. أرسل له على الواتساب الرسالة: `I allow callmebot to send me messages`
3. يرد عليك برسالة فيها **apikey**.

بعدها حط الأرقام في المتغير `WHATSAPP_RECIPIENTS` بهذا الشكل (رقم الجوال بدون + ثم : ثم الـ apikey):

```
WHATSAPP_RECIPIENTS=966500000000:123456,966511111111:654321
```

> CallMeBot خدمة مجانية تناسب إرسال إشعارات لأرقامكم الشخصية. إذا احتجتوا بعدين شي رسمي أكثر، نقدر نحوّل إلى WhatsApp Business Cloud API من Meta، ويكون فيها تكلفة بسيطة على كل رسالة.

### 4) النشر على Vercel (مجاني)

1. سجّل في [vercel.com](https://vercel.com) بحساب GitHub، واستورد مستودع `shop-sales`.
2. في **Environment Variables** أضف:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `WHATSAPP_RECIPIENTS`
3. اضغط **Deploy**، وبيعطيك رابط مثل `shop-sales.vercel.app`.
4. افتح الرابط من جوال رياض وسجيب، واختر **إضافة إلى الشاشة الرئيسية / Add to Home Screen**، وبيصير مثل التطبيق.

### التشغيل على جهازك (للتطوير)

```bash
cp .env.example .env.local   # وعبّي القيم
npm install
npm run dev
```
