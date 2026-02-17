import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    LayoutDashboard, Package, ShoppingCart, Users, Store, DollarSign, 
    Box, Settings, LogOut, Bell, Menu, X, FileText, Link2, ChevronRight,
    Search, Moon, Sun, User, ChevronDown, List, Tags, Receipt
} from 'lucide-react';

export default function MainLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [productsExpanded, setProductsExpanded] = useState(true);
    const [expensesExpanded, setExpensesExpanded] = useState(true);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview & Analytics' },
        { 
            path: '/products', 
            icon: Package, 
            label: 'Products', 
            description: 'Manage inventory',
            hasSubItems: true,
            subItems: [
                { path: '/products', icon: List, label: 'List Products', description: 'View all products' },
                { path: '/categories', icon: Tags, label: 'Categories', description: 'Product categories' }
            ]
        },
        { path: '/stock', icon: Box, label: 'Stock', description: 'Inventory control' },
        { path: '/orders', icon: ShoppingCart, label: 'Orders', description: 'Order management' },
        { path: '/clients', icon: Users, label: 'Clients', description: 'Customer database' },
        { path: '/vendors', icon: Store, label: 'Vendors', description: 'Supplier management' },
        { 
            path: '/expenses', 
            icon: DollarSign, 
            label: 'Expenses', 
            description: 'Track expenses',
            hasSubItems: true,
            subItems: [
                { path: '/expenses', icon: Receipt, label: 'List Expenses', description: 'View all expenses' },
                { path: '/expense-categories', icon: Tags, label: 'Expense Categories', description: 'Expense types' }
            ]
        },
        { path: '/api-integrations', icon: Link2, label: 'API Integrations', description: 'External APIs' },
        { path: '/users', icon: Users, label: 'Users', description: 'User management', adminOnly: true },
        { path: '/settings', icon: Settings, label: 'Settings', description: 'System settings' },
    ];

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-72';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 ${sidebarWidth} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo Section */}
                <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                    {!sidebarCollapsed && (
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <Package className="text-white" size={22} />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white tracking-tight">Livraison</h1>
                                <p className="text-xs text-slate-400">Admin Panel</p>
                            </div>
                        </div>
                    )}
                    {sidebarCollapsed && (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                            <Package className="text-white" size={22} />
                        </div>
                    )}
                    <button 
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
                        className={`text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700/50 ${sidebarCollapsed ? 'hidden lg:block mx-auto mt-3' : ''}`}
                    >
                        <ChevronRight size={18} className={`transform transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
                    </button>
                </div>
                
                {/* Navigation */}
                <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-180px)] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {menuItems.map((item) => {
                        if (item.adminOnly && !['admin', 'superadmin'].includes(user?.role?.slug)) return null;
                        
                        const active = isActive(item.path);
                        
                        // Handle items with sub-items
                        if (item.hasSubItems && !sidebarCollapsed) {
                            const isExpanded = item.label === 'Products' ? productsExpanded : expensesExpanded;
                            const toggleExpanded = item.label === 'Products' 
                                ? () => setProductsExpanded(!productsExpanded)
                                : () => setExpensesExpanded(!expensesExpanded);
                            
                            return (
                                <div key={item.path}>
                                    <button
                                        onClick={toggleExpanded}
                                        className={`group w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                                            active
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <item.icon size={20} className={active ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                                            <div className="flex-1 text-left">
                                                <span className="font-medium text-sm">{item.label}</span>
                                                {!active && (
                                                    <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5">{item.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight 
                                            size={16} 
                                            className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''} ${active ? 'text-white' : 'text-slate-400'}`}
                                        />
                                    </button>
                                    
                                    {/* Sub-items */}
                                    {isExpanded && (
                                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-700/50 pl-2">
                                            {item.subItems.map((subItem) => {
                                                const subActive = isActive(subItem.path);
                                                return (
                                                    <Link
                                                        key={subItem.path}
                                                        to={subItem.path}
                                                        className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                                            subActive
                                                                ? 'bg-slate-700/50 text-white'
                                                                : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
                                                        }`}
                                                    >
                                                        <subItem.icon size={18} className={subActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} />
                                                        <div className="flex-1">
                                                            <span className="font-medium text-sm">{subItem.label}</span>
                                                        </div>
                                                        {subActive && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        
                        // Regular menu items
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all duration-200 relative ${
                                    active
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                }`}
                                title={sidebarCollapsed ? item.label : ''}
                            >
                                <item.icon size={20} className={active ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                                {!sidebarCollapsed && (
                                    <div className="flex-1">
                                        <span className="font-medium text-sm">{item.label}</span>
                                        {!active && (
                                            <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5">{item.description}</p>
                                        )}
                                    </div>
                                )}
                                {active && !sidebarCollapsed && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section at Bottom */}
                {!sidebarCollapsed && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-semibold shadow-lg">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                <p className="text-xs text-slate-400 truncate">{user?.role?.name}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <div className={`transition-all duration-300 ${sidebarOpen ? (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72') : ''}`}>
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50 sticky top-0 z-40">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all lg:hidden"
                            >
                                <Menu size={22} />
                            </button>
                            
                            {/* Search Bar */}
                            <div className="hidden md:flex items-center bg-slate-100 rounded-xl px-4 py-2.5 w-80">
                                <Search size={18} className="text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search anything..." 
                                    className="bg-transparent border-none outline-none ml-3 text-sm text-slate-600 placeholder-slate-400 w-full"
                                />
                                <kbd className="hidden lg:inline-flex px-2 py-1 text-xs text-slate-400 bg-white rounded-lg shadow-sm">⌘K</kbd>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {/* Theme Toggle */}
                            <button 
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            {/* Notifications */}
                            <button className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                                )}
                            </button>

                            {/* User Menu */}
                            <div className="relative">
                                <button 
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center space-x-3 p-2 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="hidden md:block text-left">
                                        <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
                                        <p className="text-xs text-slate-500">{user?.role?.name}</p>
                                    </div>
                                    <ChevronDown size={16} className="text-slate-400 hidden md:block" />
                                </button>

                                {showUserMenu && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/50 py-2 z-50">
                                        <div className="px-4 py-3 border-b border-slate-100">
                                            <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
                                            <p className="text-xs text-slate-500">{user?.email}</p>
                                        </div>
                                        <Link to="/settings" className="flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                            <Settings size={18} />
                                            <span>Settings</span>
                                        </Link>
                                        <button 
                                            onClick={handleLogout}
                                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <LogOut size={18} />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6 lg:p-8">
                    <Outlet />
                </main>

                {/* Footer */}
                <footer className="px-6 lg:px-8 py-4 border-t border-slate-200/50 bg-white/50">
                    <div className="flex flex-col md:flex-row items-center justify-between text-sm text-slate-500">
                        <p>&copy; 2026 Livraison Admin. All rights reserved.</p>
                        <p className="mt-2 md:mt-0">Made with care for better management</p>
                    </div>
                </footer>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Click outside to close user menu */}
            {showUserMenu && (
                <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowUserMenu(false)}
                />
            )}
        </div>
    );
}
