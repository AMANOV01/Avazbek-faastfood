import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';
import 'models.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class Api {
  static const _timeout = Duration(seconds: 12);

  static Future<dynamic> _decode(http.Response r) async {
    final body = r.body.isEmpty ? <String, dynamic>{} : jsonDecode(utf8.decode(r.bodyBytes));
    if (r.statusCode >= 400) {
      throw ApiException(body is Map && body['error'] != null ? '${body['error']}' : 'Xatolik yuz berdi');
    }
    return body;
  }

  static Future<List<Category>> categories() async {
    final r = await http.get(Uri.parse('$apiBase/api/categories')).timeout(_timeout);
    return (await _decode(r) as List).map((e) => Category.fromJson(e)).toList();
  }

  static Future<List<Product>> products() async {
    final r = await http.get(Uri.parse('$apiBase/api/products')).timeout(_timeout);
    return (await _decode(r) as List).map((e) => Product.fromJson(e)).toList();
  }

  static Future<Map<String, dynamic>> createOrder({
    required String name,
    required String phone,
    required String type,
    required String address,
    required String comment,
    required List<CartLine> lines,
  }) async {
    final r = await http
        .post(
          Uri.parse('$apiBase/api/orders'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'name': name,
            'phone': phone,
            'type': type,
            'address': address,
            'comment': comment,
            'items': lines.map((l) => {'productId': l.product.id, 'qty': l.qty}).toList(),
          }),
        )
        .timeout(_timeout);
    return Map<String, dynamic>.from(await _decode(r));
  }

  static Future<Map<String, dynamic>> orderStatus(int id) async {
    final r = await http.get(Uri.parse('$apiBase/api/orders/$id')).timeout(_timeout);
    return Map<String, dynamic>.from(await _decode(r));
  }
}
