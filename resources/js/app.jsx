import './bootstrap';
import './i18n/config';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { isAdminRole, isConfirmationAgentRole, isDeliveryPersonRole, isVendorRole } from './utils/roles';
import { appPath } from './constants/appPaths';
import ScrollToTop from './components/ScrollToTop';

// Layout
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Public Pages
import HomePage from './pages/Public/HomePage';

// Auth Pages
import Login from './pages/Auth/Login';
import SellerSignup from './pages/Auth/SellerSignup';

// Dashboard
import Dashboard from './pages/Dashboard/Dashboard';
import ProfitDashboard from './pages/Dashboard/ProfitDashboard';

// Products
import ProductList from './pages/Products/ProductList';
import ProductDetail from './pages/Products/ProductDetail';
import ProductForm from './pages/Products/ProductForm';

// Categories
import CategoryList from './pages/Categories/CategoryList';

// Orders
import OrderList from './pages/Orders/OrderList';
import OrderForm from './pages/Orders/OrderForm';
import OrderDetail from './pages/Orders/OrderDetail';

// Clients
import ClientList from './pages/Clients/ClientList';
import ClientDetail from './pages/Clients/ClientDetail';

// Sellers
import VendorList from './pages/Vendors/VendorList';
import VendorDetail from './pages/Vendors/VendorDetail';

// Expenses
import ExpenseList from './pages/Expenses/ExpenseList';
import ExpenseCategoryList from './pages/Expenses/ExpenseCategoryList';

// Stock
import StockManagement from './pages/Stock/StockManagement';
import StockHistory from './pages/Stock/StockHistory';

// API Integrations
import ApiIntegrations from './pages/ApiIntegrations/ApiIntegrations';
import ShopifyIntegrationPage from './pages/ApiIntegrations/ShopifyIntegrationPage';
import TawsilexIntegrationPage from './pages/ApiIntegrations/TawsilexIntegrationPage';
import BMDeliveryIntegrationPage from './pages/ApiIntegrations/BMDeliveryIntegrationPage';
import GoogleSheetIntegrationPage from './pages/ApiIntegrations/GoogleSheetIntegrationPage';
import CustomApiIntegrationPage from './pages/ApiIntegrations/CustomApiIntegrationPage';

// Marketplace
import MarketplaceProducts from './pages/Marketplace/MarketplaceProducts';
import BlacklistPage from './pages/Blacklist/BlacklistPage';

// Users
import UserList from './pages/Users/UserList';

// Roles
import RoleList from './pages/Roles/RoleList';
import RoleForm from './pages/Roles/RoleForm';

// Settings
import Settings from './pages/Settings/Settings';
import BillingIndexPage from './pages/Billing/BillingIndexPage';
import SellerBillingPage from './pages/Billing/SellerBillingPage';
import DeliveryBillingPage from './pages/Billing/DeliveryBillingPage';
import ConfirmationBillingPage from './pages/Billing/ConfirmationBillingPage';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const { t } = useTranslation();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">{t('admin.common.loading')}</div>;
    }

    return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth();
    const { t } = useTranslation();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">{t('admin.common.loading')}</div>;
    }

    if (isAdminRole(user?.role?.slug)) {
        return children;
    }

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-6">
            <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-500">{t('admin.common.code403')}</p>
                <h1 className="mt-3 text-2xl font-bold text-slate-900">{t('admin.common.unauthorized')}</h1>
                <p className="mt-2 text-sm text-slate-600">{t('admin.common.adminOnlyPage')}</p>
            </div>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <SettingsProvider>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/seller/signup" element={<SellerSignup />} />

                    {/* Auth Routes */}
                    <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />

                    {/* Protected Routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                        <Route index element={<Dashboard />} />
                        <Route path="profit-dashboard" element={<ProfitDashboard />} />
                        
                        {/* Products */}
                        <Route path="products" element={<ProductList />} />
                        <Route path="products/create" element={<ProductForm />} />
                        <Route path="products/:id/edit" element={<ProductForm />} />
                        <Route path="products/:id" element={<ProductDetail />} />
                        
                        {/* Categories */}
                        <Route path="categories" element={<CategoryList />} />
                        
                        {/* Orders */}
                        <Route path="orders" element={<OrderList />} />
                        <Route path="orders/pending" element={<OrderList status="pending" />} />
                        <Route path="orders/confirmed" element={<OrderList status="confirmed" />} />
                        <Route path="orders/shipped" element={<OrderList status="shipped" />} />
                        <Route path="orders/delivered" element={<OrderList status="delivered" />} />
                        <Route path="orders/cancelled" element={<OrderList status="cancelled" />} />
                        <Route path="orders/refused" element={<OrderList status="refused" />} />
                        <Route path="orders/returned" element={<OrderList status="returned" />} />
                        <Route path="orders/create" element={<OrderForm />} />
                        <Route path="orders/:id" element={<OrderDetail />} />
                        <Route path="orders/:id/edit" element={<OrderForm />} />
                        
                        {/* Clients */}
                        <Route path="clients" element={<ClientList />} />
                        <Route path="clients/:id" element={<ClientDetail />} />
                        
                        {/* Sellers */}
                        <Route path="vendors" element={<VendorList />} />
                        <Route path="vendors/:id" element={<VendorDetail />} />
                        
                        {/* Expenses */}
                        <Route path="expenses" element={<ExpenseList />} />
                        <Route path="expense-categories" element={<ExpenseCategoryList />} />
                        
                        {/* Stock */}
                        <Route path="stock" element={<StockManagement />} />
                        <Route path="stock/history" element={<StockHistory />} />
                        
                        {/* API Integrations */}
                        <Route path="api-integrations" element={<ApiIntegrations />} />
                        <Route path="api-integrations/shopify" element={<ShopifyIntegrationPage />} />
                        <Route path="api-integrations/google-sheet" element={<GoogleSheetIntegrationPage />} />
                        <Route path="api-integrations/custom-api" element={<CustomApiIntegrationPage />} />
                        <Route path="api-integrations/tawsilex" element={<TawsilexIntegrationPage />} />
                        <Route path="api-integrations/bmdelivery" element={<BMDeliveryIntegrationPage />} />
                        
                        {/* Marketplace */}
                        <Route path="marketplace" element={<MarketplaceProducts />} />
                        <Route path="blacklist" element={<BlacklistPage />} />
                        
                        {/* Users & Roles */}
                        <Route path="users" element={<UserList />} />
                        <Route path="roles" element={<RoleList />} />
                        <Route path="roles/create" element={<RoleForm />} />
                        <Route path="roles/:id/edit" element={<RoleForm />} />
                        
                        {/* Settings */}
                        <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
                        <Route path="billing" element={<BillingIndexPage />} />
                        <Route path="billing/sellers" element={<SellerBillingPage />} />
                        <Route path="billing/delivery" element={<DeliveryBillingPage />} />
                        <Route path="billing/confirmation" element={<ConfirmationBillingPage />} />
                        <Route path="confirmation-billing" element={<Navigate to={appPath('/billing/confirmation')} replace />} />
                        <Route path="delivery-billing" element={<Navigate to={appPath('/billing/delivery')} replace />} />
                    </Route>
                </Routes>
            </SettingsProvider>
        </AuthProvider>
    );
}

export default App;

if (document.getElementById('app')) {
    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(
        <React.StrictMode>
            <BrowserRouter>
                <ScrollToTop />
                <App />
            </BrowserRouter>
        </React.StrictMode>
    );
}
