import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../state.dart';
import '../theme.dart';
import 'order_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController(text: '+998 ');
  final _address = TextEditingController();
  final _comment = TextEditingController();
  bool _delivery = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit(AppState state) async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final order = await Api.createOrder(
        name: _name.text.trim(),
        phone: _phone.text.trim(),
        type: _delivery ? 'delivery' : 'pickup',
        address: _address.text.trim(),
        comment: _comment.text.trim(),
        lines: state.cart.values.toList(),
      );
      state.clear();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => OrderScreen(orderId: order['id'] as int)),
      );
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Serverga ulanib bo\'lmadi');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final fee = state.feeFor(_delivery);
    final color = accent(context);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        centerTitle: true,
        title: const Text('Savat'),
      ),
      body: state.cart.isEmpty
          ? Center(child: Text('Savat bo\'sh', style: TextStyle(color: muted(context))))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  color: panelColor(context),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: lineColor(context)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      children: [
                        for (final l in state.cart.values)
                          Row(
                            children: [
                              Expanded(child: Text(l.product.name)),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                onPressed: () => state.remove(l.product),
                                icon: Icon(Icons.remove_circle_outline, color: color),
                              ),
                              Text('${l.qty}', style: const TextStyle(fontWeight: FontWeight.w700)),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                onPressed: () => state.add(l.product),
                                icon: Icon(Icons.add_circle, color: color),
                              ),
                              SizedBox(
                                width: 84,
                                child: Text(money(l.product.price * l.qty),
                                    textAlign: TextAlign.right,
                                    style: TextStyle(color: color, fontWeight: FontWeight.w700)),
                              ),
                            ],
                          ),
                        Divider(color: lineColor(context)),
                        _sum(context, 'Mahsulotlar', state.subtotal),
                        _sum(context, 'Yetkazib berish', fee),
                        _sum(context, 'Jami', state.subtotal + fee, bold: true),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Form(
                  key: _form,
                  child: Column(
                    children: [
                      SegmentedButton<bool>(
                        style: SegmentedButton.styleFrom(
                          selectedBackgroundColor: kGreen,
                          selectedForegroundColor: kInk,
                        ),
                        segments: const [
                          ButtonSegment(value: true, label: Text('Yetkazib berish'), icon: Icon(Icons.delivery_dining)),
                          ButtonSegment(value: false, label: Text('Olib ketish'), icon: Icon(Icons.storefront)),
                        ],
                        selected: {_delivery},
                        onSelectionChanged: (s) => setState(() => _delivery = s.first),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _name,
                        decoration: fieldDeco(context, 'Ismingiz'),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Ismni kiriting' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        decoration: fieldDeco(context, 'Telefon'),
                        validator: (v) => (v == null || v.replaceAll(RegExp(r'\D'), '').length < 9)
                            ? 'Telefon raqamini kiriting'
                            : null,
                      ),
                      if (_delivery) ...[
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _address,
                          decoration: fieldDeco(context, 'Manzil'),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Manzilni kiriting' : null,
                        ),
                      ],
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _comment,
                        maxLines: 2,
                        decoration: fieldDeco(context, 'Izoh (ixtiyoriy)'),
                      ),
                    ],
                  ),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(_error!, style: TextStyle(color: danger(context))),
                  ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _busy ? null : () => _submit(state),
                    child: Text(_busy ? 'Yuborilmoqda…' : 'Buyurtma berish'),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _sum(BuildContext context, String label, int value, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
            Text('${money(value)}${bold ? " so'm" : ''}',
                style: TextStyle(
                    color: accent(context), fontWeight: FontWeight.w700, fontSize: bold ? 18 : 15)),
          ],
        ),
      );
}
