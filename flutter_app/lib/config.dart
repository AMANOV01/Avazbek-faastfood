/// Backend manzili.
/// Android emulyatorda kompyuteringiz localhost'i: http://10.0.2.2:4000
/// Haqiqiy telefonda: kompyuter IP'si (masalan http://192.168.1.10:4000)
/// yoki serverga joylagan domeningiz.
const String apiBase = String.fromEnvironment('API_BASE', defaultValue: 'http://10.0.2.2:4000');

const String instagram = 'avazbek_fastfood';
const String phoneOrder = '+998972120393';
const String phoneDelivery = '+998888770810';
const int deliveryFee = 8000;
