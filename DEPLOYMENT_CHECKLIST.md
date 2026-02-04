# ✅ قائمة التحقق قبل النشر على المتاجر

## 📋 المتطلبات الأساسية

### 1. الحسابات المطلوبة:
- [ ] حساب **Expo** (مجاني) - [expo.dev](https://expo.dev)
- [ ] حساب **Google Play Console** (25$ مرة واحدة) - [play.google.com/console](https://play.google.com/console)
- [ ] حساب **Apple Developer** (99$/سنة) - [developer.apple.com](https://developer.apple.com)

### 2. الإعدادات في `app.json`:
- [x] ✅ اسم التطبيق: `AltayarVIP`
- [x] ✅ Bundle ID (iOS): `com.altayarvip.app`
- [x] ✅ Package Name (Android): `com.altayarvip.app`
- [x] ✅ رقم الإصدار: `1.0.0`
- [x] ✅ الأيقونات موجودة
- [ ] ⚠️ **مطلوب:** إضافة `projectId` في `app.json` بعد تسجيل الدخول لـ Expo

### 3. الأصول (Assets):
- [x] ✅ `icon.png` (1024x1024)
- [x] ✅ `adaptive-icon.png` (1024x1024)
- [x] ✅ `splash-image.png`
- [x] ✅ `favicon.png`

### 4. إعدادات API:
- [ ] ⚠️ **مهم جداً:** ضبط `API_URL` في `app.json` → `extra.apiUrl`
- [ ] ⚠️ **مهم جداً:** تأكد أن Backend يعمل على HTTPS في الإنتاج
- [ ] ⚠️ **مهم جداً:** إضافة CORS للـ Backend للسماح بالدومين الجديد

---

## 🚀 خطوات النشر

### الخطوة 1: إعداد Expo Project

```powershell
cd frontend
npm install -g eas-cli
eas login
eas build:configure
```

**عند السؤال:**
- Platform: `All` (Android + iOS)
- هينشئ `eas.json` (موجود بالفعل ✅)

**بعد تسجيل الدخول:**
- هيديك `projectId`
- ضيفه في `app.json` → `extra.eas.projectId`

---

### الخطوة 2: بناء APK للتجربة (Android)

```powershell
cd frontend
eas build --platform android --profile preview
```

**الخطوات:**
1. هيسألك عن Package Name: `com.altayarvip.app`
2. هيسألك عن Keystore: اختار `Yes` (EAS هينشئه تلقائياً)
3. انتظر 5-15 دقيقة
4. حمّل APK واختبره على موبايل

---

### الخطوة 3: بناء AAB للنشر (Android)

```powershell
cd frontend
eas build --platform android --profile production
```

**الخطوات:**
1. نفس خطوات APK
2. انتظر 5-15 دقيقة
3. حمّل AAB

---

### الخطوة 4: رفع على Google Play Store

1. **إنشاء حساب:**
   - روح [play.google.com/console](https://play.google.com/console)
   - ادفع 25$ (مرة واحدة)
   - أكمل البيانات

2. **إنشاء تطبيق:**
   - اضغط **Create app**
   - الاسم: `AltayarVIP`
   - اللغة: `العربية`
   - النوع: `App`
   - مجاني/مدفوع: `Free`

3. **ملء البيانات:**
   - Privacy Policy URL (مطلوب!)
   - App description (عربي + إنجليزي)
   - Screenshots (مطلوب!)
   - Category: `Travel`
   - Content rating

4. **رفع AAB:**
   - Production → Create new release
   - Upload ملف `.aab`
   - اكتب Release notes
   - Review → Start rollout

---

### الخطوة 5: بناء IPA لـ iOS (يحتاج Mac)

```bash
cd frontend
eas build --platform ios --profile production
```

**الخطوات:**
1. هيسألك عن Apple ID
2. هيسألك عن Two-Factor Authentication
3. انتظر 10-20 دقيقة
4. حمّل IPA

---

### الخطوة 6: رفع على Apple App Store

1. **إنشاء App:**
   - روح [appstoreconnect.apple.com](https://appstoreconnect.apple.com/)
   - My Apps → + → New App
   - Bundle ID: `com.altayarvip.app`
   - Name: `AltayarVIP`

2. **ملء البيانات:**
   - Privacy Policy URL
   - Description
   - Screenshots (مطلوب!)
   - Category: `Travel`
   - Keywords

3. **رفع IPA:**
   ```bash
   eas submit --platform ios
   ```
   أو استخدم **Transporter** app

4. **إرسال للمراجعة:**
   - اختار Build
   - اكتب "What's New"
   - Submit for Review

---

## ⚠️ ملاحظات مهمة

### 1. Backend URL:
**قبل النشر، لازم تعدل `app.json`:**

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.altayarvip.app/api",
      "eas": {
        "projectId": "your-project-id-from-expo"
      }
    }
  }
}
```

**ملاحظة:** بعد شراء الدومين `altayarvip.app`:
- Landing Page: `https://altayarvip.app`
- API Backend: `https://api.altayarvip.app`
- راجع `DOMAIN_SETUP_GUIDE.md` للتفاصيل الكاملة

### 2. CORS في Backend:
تأكد أن Backend يسمح بالدومين الجديد:

```python
# في backend/config/settings.py
CORS_ORIGINS = [
    "https://your-app-domain.com",
    "exp://your-expo-url",
    # ... إلخ
]
```

### 3. HTTPS:
- **مطلوب** أن Backend يعمل على HTTPS في الإنتاج
- Google Play و App Store يرفضوا HTTP

### 4. Privacy Policy:
- **مطلوب** Privacy Policy URL
- لازم يكون على موقعك أو GitHub Pages

### 5. Screenshots:
- **مطلوب** screenshots للتطبيق
- Android: 2-8 صور
- iOS: 3-10 صور (أحجام مختلفة)

---

## 📝 Checklist النهائي

### قبل البناء:
- [ ] عدّلت `app.json` (projectId, apiUrl)
- [ ] اختبرت التطبيق محلياً
- [ ] تأكدت من كل الأيقونات موجودة
- [ ] Backend يعمل على HTTPS
- [ ] CORS مضبوط في Backend

### قبل الرفع:
- [ ] Privacy Policy جاهز
- [ ] Screenshots جاهزة
- [ ] Description مكتوب (عربي + إنجليزي)
- [ ] Keywords محددة
- [ ] Category محددة

### بعد الرفع:
- [ ] اختبرت على TestFlight (iOS) أو Internal Testing (Android)
- [ ] راجعت Crashes
- [ ] جهّزت للرد على Reviews

---

## 💰 التكاليف

| الخدمة | التكلفة |
|--------|---------|
| Google Play Console | 25$ (مرة واحدة) |
| Apple Developer | 99$/سنة |
| EAS Build (Free) | 30 build/شهر |
| EAS Build (Production) | 99$/شهر (unlimited) |

---

## 🔗 روابط مفيدة

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com/)

---

**بالتوفيق! 🚀**

