# Android sozlamalari (bir marta)

Loyiha papkasida `flutter create .` buyrug'ini ishga tushiring — u `android/`, `ios/` papkalarini yaratadi,
`lib/` va `pubspec.yaml` ga tegmaydi.

Keyin `android/app/src/main/AndroidManifest.xml` ichida `<manifest>` ichiga qo'shing:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<queries>
  <intent><action android:name="android.intent.action.VIEW"/><data android:scheme="https"/></intent>
  <intent><action android:name="android.intent.action.VIEW"/><data android:scheme="tel"/></intent>
</queries>
```

Agar backend `http://` (HTTPS emas) bo'lsa, `<application ...>` ga `android:usesCleartextTraffic="true"` qo'shing.

Ishga tushirish:
```
flutter pub get
flutter run --dart-define=API_BASE=http://10.0.2.2:4000      # emulyator
flutter run --dart-define=API_BASE=http://192.168.1.10:4000  # haqiqiy telefon (kompyuter IP'si)
flutter build apk --dart-define=API_BASE=https://sizning-domen.uz
```
