import { Outlet, createBrowserRouter, RouterProvider, Link } from 'react-router-dom';
import CustomerNavbar from './components/layout/CustomerNavbar';
import Footer from './components/layout/Footer';
import HomePage from './features/customer/pages/HomePage';
import MenuPage from './features/customer/pages/MenuPage';
import ItemPage from './features/customer/pages/ItemPage';
import CheckoutPage from './features/customer/pages/CheckoutPage';
import TrackingPage from './features/customer/pages/TrackingPage';
import { AboutPage, ContactPage, HelpPage } from './features/customer/pages/StaticPages';
import AdminLayout from './features/admin/AdminLayout';
import Dashboard from './features/admin/pages/Dashboard';
import AdminOrdersPage from './features/admin/pages/OrdersPage';
import DeliveryPage from './features/admin/pages/DeliveryPage';
import MenuManager from './features/admin/pages/MenuManager';
import {
  CustomersPage, RidersPage, FinancePage, InventoryPage, PromotionsPage,
  AnalyticsPage, StaffPage, AuditPage, SettingsPage,
} from './features/admin/pages/OpsPages';
import KitchenLayout from './features/kitchen/KitchenLayout';
import { Board } from './features/kitchen/pages/Board';
import RiderLayout from './features/rider/RiderLayout';
import { Jobs } from './features/rider/pages/Jobs';
import { ActiveDelivery } from './features/rider/pages/ActiveDelivery';
import { HistoryPage, EarningsPage, ProfilePage } from './features/rider/pages/RiderMisc';

function CustomerShell() {
  return (
    <div className="min-h-screen">
      <CustomerNavbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="container py-24 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">404</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-coal/60">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white">Back home</Link>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <CustomerShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'menu', element: <MenuPage /> },
      { path: 'menu/:id', element: <ItemPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'track/:id', element: <TrackingPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'help', element: <HelpPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'delivery', element: <DeliveryPage /> },
      { path: 'menu', element: <MenuManager /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'riders', element: <RidersPage /> },
      { path: 'finance', element: <FinancePage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'promotions', element: <PromotionsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'staff', element: <StaffPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '/kitchen',
    element: <KitchenLayout />,
    children: [{ index: true, element: <Board /> }],
  },
  {
    path: '/rider',
    element: <RiderLayout />,
    children: [
      { index: true, element: <Jobs /> },
      { path: 'active/:id', element: <ActiveDelivery /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'earnings', element: <EarningsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <CustomerShell /> , children: [{ path: '*', element: <NotFound /> }] },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
