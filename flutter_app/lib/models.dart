class Category {
  final String id;
  final String name;
  final String image; // assets/images/<image>.jpg
  Category({required this.id, required this.name, required this.image});

  factory Category.fromJson(Map<String, dynamic> j) =>
      Category(id: j['id'], name: j['name'], image: j['image'] ?? j['id']);

  String get asset => 'assets/images/$image.jpg';
}

class Product {
  final int id;
  final String category;
  final String name;
  final int price;
  Product({required this.id, required this.category, required this.name, required this.price});

  factory Product.fromJson(Map<String, dynamic> j) => Product(
        id: j['id'],
        category: j['category'],
        name: j['name'],
        price: j['price'],
      );
}

class CartLine {
  final Product product;
  int qty;
  CartLine(this.product, this.qty);
}
