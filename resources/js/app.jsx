import './bootstrap';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';

// Layout
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import Login from './pages/Auth/Login';

// Dashboard
import Dashboard from './pages/Dashboard/Dashboard';

// Products
import ProductList from './pages/Products/ProductList';
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

// Vendors
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

// Marketplace
import MarketplaceProducts from './pages/Marketplace/MarketplaceProducts';

// Users
import UserList from './pages/Users/UserList';

// Settings
import Settings from './pages/Settings/Settings';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return user ? children : <Navigate to="/login" />;
}

function App() {
    return (
        <AuthProvider>
            <SettingsProvider>
                <Routes>
                    {/* Auth Routes */}
                    <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />

                    {/* Protected Routes */}
                    <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                        <Route index element={<Dashboard />} />
                        
                        {/* Products */}
                        <Route path="products" element={<ProductList />} />
                        <Route path="products/create" element={<ProductForm />} />
                        <Route path="products/:id/edit" element={<ProductForm />} />
                        
                        {/* Categories */}
                        <Route path="categories" element={<CategoryList />} />
                        
                        {/* Orders */}
                        <Route path="orders" element={<OrderList />} />
                        <Route path="orders/create" element={<OrderForm />} />
                        <Route path="orders/:id" element={<OrderDetail />} />
                        
                        {/* Clients */}
                        <Route path="clients" element={<ClientList />} />
                        <Route path="clients/:id" element={<ClientDetail />} />
                        
                        {/* Vendors */}
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
                        <Route path="api-integrations/tawsilex" element={<TawsilexIntegrationPage />} />
                        <Route path="api-integrations/bmdelivery" element={<BMDeliveryIntegrationPage />} />
                        
                        {/* Marketplace */}
                        <Route path="marketplace" element={<MarketplaceProducts />} />
                        
                        {/* Users */}
                        <Route path="users" element={<UserList />} />
                        
                        {/* Settings */}
                        <Route path="settings" element={<Settings />} />
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
                <App />
            </BrowserRouter>
        </React.StrictMode>
    );
}
