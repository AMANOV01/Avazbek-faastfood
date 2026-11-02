import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../state.dart';
import '../theme.dart';

class ProductRow extends StatelessWidget {
  final Product product;
  const ProductRow({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final qty = state.qtyOf(product.id);
    final color = accent(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(child: Text(product.name, style: const TextStyle(fontSize: 15))),
          Text(money(product.price),
              style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(width: 10),
          if (qty == 0)
            SizedBox(
              height: 34,
              child: FilledButton(
                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12)),
                onPressed: () => state.add(product),
                child: const Text('+'),
              ),
            )
          else
            Row(
              children: [
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => state.remove(product),
                  icon: Icon(Icons.remove_circle_outline, color: color),
                ),
                Text('$qty', style: const TextStyle(fontWeight: FontWeight.w700)),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => state.add(product),
                  icon: Icon(Icons.add_circle, color: color),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
