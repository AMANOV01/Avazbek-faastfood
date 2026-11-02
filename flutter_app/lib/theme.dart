import 'package:flutter/material.dart';

const Color kGreen = Color(0xFF8AB820);
const Color kGreenBright = Color(0xFFA4D62A);
const Color kGreenDeep = Color(0xFF4F7A0A);
const Color kInk = Color(0xFF0B0C0B);

// Mavzuga qarab o'zgaradigan ranglar (tun / kun)
bool isDark(BuildContext c) => Theme.of(c).brightness == Brightness.dark;
Color accent(BuildContext c) => isDark(c) ? kGreenBright : kGreenDeep;
Color muted(BuildContext c) => isDark(c) ? const Color(0xFF9A9F93) : const Color(0xFF62695A);
Color lineColor(BuildContext c) => isDark(c) ? const Color(0xFF2A2F26) : const Color(0xFFDFE3D6);
Color panelColor(BuildContext c) => isDark(c) ? const Color(0xFF141614) : Colors.white;
Color danger(BuildContext c) => isDark(c) ? const Color(0xFFFF7B72) : const Color(0xFFC62828);

ThemeData buildTheme(Brightness b) {
  final dark = b == Brightness.dark;
  final scheme = dark ? const ColorScheme.dark() : const ColorScheme.light();
  return ThemeData(
    useMaterial3: true,
    brightness: b,
    scaffoldBackgroundColor: dark ? kInk : const Color(0xFFF6F7F2),
    colorScheme: scheme.copyWith(
      primary: kGreen,
      onPrimary: kInk,
      surface: dark ? const Color(0xFF141614) : Colors.white,
    ),
  );
}

InputDecoration fieldDeco(BuildContext c, String label) {
  OutlineInputBorder border(Color color) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: color),
      );
  return InputDecoration(
    labelText: label,
    filled: true,
    fillColor: isDark(c) ? const Color(0xFF0E100E) : Colors.white,
    border: border(lineColor(c)),
    enabledBorder: border(lineColor(c)),
    focusedBorder: border(kGreen),
  );
}

String money(int n) {
  final s = n.toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(' ');
    b.write(s[i]);
  }
  return b.toString();
}
