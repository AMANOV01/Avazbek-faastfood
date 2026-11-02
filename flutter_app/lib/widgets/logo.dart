import 'package:flutter/material.dart';
import '../theme.dart';

class Logo extends StatelessWidget {
  final double size;
  const Logo({super.key, this.size = 24});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('AVAZBEK',
            style: TextStyle(fontSize: size, fontWeight: FontWeight.w800, letterSpacing: size * 0.12, height: 1)),
        Text('LAVASH',
            style: TextStyle(
                fontSize: size * 0.45,
                color: accent(context),
                letterSpacing: size * 0.4,
                fontWeight: FontWeight.w600)),
      ],
    );
  }
}
