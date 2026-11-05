import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import MenuView from '../views/MenuView.vue';
import CartView from '../views/CartView.vue';
import OrderView from '../views/OrderView.vue';
import OrdersView from '../views/OrdersView.vue';
import AdminView from '../views/AdminView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/menu', component: MenuView },
    { path: '/cart', component: CartView },
    { path: '/orders', component: OrdersView },
    { path: '/order/:id', component: OrderView, props: true },
    { path: '/admin', component: AdminView, meta: { admin: true } },
    { path: '/panel', redirect: '/admin' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
