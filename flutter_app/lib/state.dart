import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'config.dart';
import 'models.dart';

class AppState extends ChangeNotifier {
  List<Category> categories = [];
  List<Product> products = [];
  final Map<int, CartLine> cart = {};
  bool loading = true;
  String? error;

  // Mavzu: dark = tun (standart), light = kun
  ThemeMode themeMode = ThemeMode.dark;

  Future<void> loadTheme() async {
    try {
      final p = await SharedPreferences.getInstance();
      themeMode = p.getString('theme') == 'light' ? ThemeMode.light : ThemeMode.dark;
      notifyListeners();
    } catch (_) {
      // saqlangan mavzu o'qilmasa, standart (tun) qoladi
    }
  }

  Future<void> toggleTheme() async {
    themeMode = themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
    try {
      final p = await SharedPreferences.getInstance();
      await p.setString('theme', themeMode == ThemeMode.light ? 'light' : 'dark');
    } catch (_) {}
  }

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final res = await Future.wait([Api.categories(), Api.products()]);
      categories = res[0] as List<Category>;
      products = res[1] as List<Product>;
    } catch (e) {
      error = 'Menyuni yuklab bo\'lmadi. Internetni va server manzilini tekshiring.';
    }
    loading = false;
    notifyListeners();
  }

  List<Product> byCategory(String id) => products.where((p) => p.category == id).toList();

  int qtyOf(int id) => cart[id]?.qty ?? 0;
  int get count => cart.values.fold(0, (n, l) => n + l.qty);
  int get subtotal => cart.values.fold(0, (n, l) => n + l.product.price * l.qty);
  int feeFor(bool delivery) => delivery ? deliveryFee : 0;

  void add(Product p) {
    final line = cart[p.id];
    if (line != null) {
      line.qty++;
    } else {
      cart[p.id] = CartLine(p, 1);
    }
    notifyListeners();
  }

  void remove(Product p) {
    final line = cart[p.id];
    if (line == null) return;
    if (line.qty > 1) {
      line.qty--;
    } else {
      cart.remove(p.id);
    }
    notifyListeners();
  }

  void clear() {
    cart.clear();
    notifyListeners();
  }
}
