# 🔍 دليل تشخيص مشاكل الشبكة

## خطوات التشخيص السريع

### 1️⃣ تحقق من Backend
```powershell
# تأكد إن Backend شغال
curl http://localhost:8082/health
# أو افتح في المتصفح: http://localhost:8082/health
```

**المفروض تشوف:**
```json
{"status": "healthy"}
```

### 2️⃣ تحقق من IP الحالي
```powershell
ipconfig | findstr /i "IPv4"
```

**سجل IP هنا:** `_________________`

### 3️⃣ تحديث IP في app.json
افتح `frontend/app.json` وحدّث:
```json
"extra": {
  "devServerIp": "YOUR_IP_HERE"
}
```

### 4️⃣ تحقق من الاتصال من الموبايل
افتح المتصفح على الموبايل وجرب:
```
http://YOUR_IP:8082/health
```

لو شفت `{"status": "healthy"}`, معناه الاتصال شغال! ✅

### 5️⃣ تحقق من Firewall
```powershell
# Windows Firewall - تأكد إن Port 8082 مفتوح
netsh advfirewall firewall show rule name=all | findstr 8082
```

لو مش موجود، افتح Port:
```powershell
netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=8082
```

### 6️⃣ تحقق من الشبكة
- ✅ الموبايل والكمبيوتر على **نفس WiFi**
- ✅ Backend شغال على `0.0.0.0:8082` (مش localhost فقط)
- ✅ Firewall يسمح بـ Port 8082

## حلول بديلة

### استخدام Expo Tunnel (أبطأ لكن يعمل دائماً)
```powershell
cd frontend
npx expo start --tunnel
```

### استخدام ngrok (للتجربة السريعة)
```powershell
ngrok http 8082
```
ثم استخدم الـ URL اللي هيظهر في `app.json` -> `extra` -> `apiUrl`

## رسائل الخطأ الشائعة

### "Network request failed"
- ✅ Backend مش شغال
- ✅ IP غلط
- ✅ Firewall يمنع الاتصال
- ✅ الموبايل والكمبيوتر على شبكات مختلفة

### "Connection timeout"
- ✅ Backend شغال لكن مش مستمع على `0.0.0.0`
- ✅ Firewall يمنع الاتصال

### "CORS error" (في المتصفح فقط)
- ✅ Backend CORS settings مش مظبوطة
- ✅ Origin مش مضاف في `BACKEND_CORS_ORIGINS`

## نصائح

1. **استخدم `app.json`** لتحديد IP بدل تعديل الكود
2. **سجل IP** في ملف نصي علشان تتذكره
3. **استخدم Tunnel** لو IP بيتغير كتير
4. **اختبر من المتصفح** على الموبايل قبل ما تجرب التطبيق

