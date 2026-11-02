import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/logo.dart';
import '../widgets/product_row.dart';
import 'cart_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  Future<void> _open(String url) async {
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final color = accent(context);

    return DefaultTabController(
      length: state.categories.isEmpty ? 1 : state.categories.length,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          surfaceTintColor: Colors.transparent,
          centerTitle: true,
          title: const Logo(size: 22),
          actions: [
            IconButton(
              tooltip: isDark(context) ? 'Kunduzgi mavzu' : 'Tungi mavzu',
              icon: Icon(isDark(context) ? Icons.light_mode_outlined : Icons.dark_mode_outlined, color: color),
              onPressed: () => context.read<AppState>().toggleTheme(),
            ),
            IconButton(
              tooltip: 'Qo\'ng\'iroq',
              icon: Icon(Icons.phone, color: color),
              onPressed: () => _open('tel:$phoneOrder'),
            ),
            IconButton(
              tooltip: 'Instagram',
              icon: Icon(Icons.camera_alt_outlined, color: color),
              onPressed: () => _open('https://instagram.com/$instagram'),
            ),
          ],
          bottom: state.categories.isEmpty
              ? null
              : TabBar(
                  isScrollable: true,
                  indicatorColor: kGreen,
                  labelColor: color,
                  unselectedLabelColor: muted(context),
                  tabAlignment: TabAlignment.start,
                  tabs: [for (final c in state.categories) Tab(text: c.name)],
                ),
        ),
        body: _body(context, state),
        floatingActionButton: state.count == 0
            ? null
            : FloatingActionButton.extended(
                backgroundColor: kGreen,
                foregroundColor: kInk,
                icon: const Icon(Icons.shopping_cart),
                label: Text('${state.count} ta · ${money(state.subtotal)} so\'m'),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CartScreen()),
                ),
              ),
      ),
    );
  }

  Widget _body(BuildContext context, AppState state) {
    if (state.loading) {
      return const Center(child: CircularProgressIndicator(color: kGreen));
    }
    if (state.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(state.error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: state.load, child: const Text('Qayta urinish')),
            ],
          ),
        ),
      );
    }
    return TabBarView(
      children: [
        for (final c in state.categories)
          ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  height: 170,
                  color: Colors.black, // rasmlarning foni qora
                  child: Image.asset(c.asset, fit: BoxFit.contain),
                ),
              ),
              const SizedBox(height: 12),
              for (final p in state.byCategory(c.id)) ProductRow(product: p),
            ],
          ),
      ],
    );
  }
}
