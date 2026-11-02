import 'dart:async';
import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';

class OrderScreen extends StatefulWidget {
  final int orderId;
  const OrderScreen({super.key, required this.orderId});

  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  Map<String, dynamic>? _order;
  String? _error;
  Timer? _timer;

  static const _labels = <String, String>{
    'new': 'Qabul qilindi',
    'cooking': 'Tayyorlanmoqda',
    'delivering': 'Yo\'lda',
    'done': 'Yakunlandi',
    'cancelled': 'Bekor qilindi',
  };
  static const _icons = <String, IconData>{
    'new': Icons.schedule,
    'cooking': Icons.local_fire_department,
    'delivering': Icons.delivery_dining,
    'done': Icons.check_circle_outline,
    'cancelled': Icons.cancel_outlined,
  };

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final o = await Api.orderStatus(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = o;
        _error = null;
      });
      if (o['status'] == 'done' || o['status'] == 'cancelled') _timer?.cancel();
    } catch (e) {
      if (mounted) setState(() => _error = 'Holatni olib bo\'lmadi');
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _order?['status'] as String?;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        centerTitle: true,
        title: Text('Buyurtma #${widget.orderId}'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _order == null
              ? (_error != null ? Text(_error!) : const CircularProgressIndicator(color: kGreen))
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_icons[status] ?? Icons.schedule,
                        size: 84, color: status == 'cancelled' ? danger(context) : accent(context)),
                    const SizedBox(height: 8),
                    Text(_labels[status] ?? '', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Text('${money(_order!['total'] as int)} so\'m',
                        style: TextStyle(color: accent(context), fontSize: 22, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 16),
                    Text('Holat har 10 soniyada yangilanadi.', style: TextStyle(color: muted(context))),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
                      child: const Text('Menyuga qaytish'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
