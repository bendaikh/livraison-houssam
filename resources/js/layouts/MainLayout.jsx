import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { isAdminRole, isConfirmationAgentRole, isDeliveryPersonRole, isVendorRole } from '../utils/roles';
import { appPath, APP_BASE } from '../constants/appPaths';
import api from '../utils/api';
import { 
    LayoutDashboard, Package, ShoppingCart, Users, Store, DollarSign, 
    Box, Settings, LogOut, Bell, Menu, X, FileText, Link2, ChevronRight,
    Search, Moon, Sun, ChevronDown, List, Tags, Receipt, ShoppingBag, Shield, UserCog, Clock, CheckCircle, TrendingUp, Ban, Truck, UserRoundCheck, Globe, RefreshCw
} from 'lucide-react';

const getInitialDarkMode = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.sessionStorage.getItem('theme') === 'dark';
};

export default function MainLayout() {
    const { t, i18n } = useTranslation();
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [darkMode, setDarkMode] = useState(getInitialDarkMode);
    const [productsExpanded, setProductsExpanded] = useState(true);
    const [expensesExpanded, setExpensesExpanded] = useState(true);
    const [ordersExpanded, setOrdersExpanded] = useState(true);
    const [apiIntegrationsExpanded, setApiIntegrationsExpanded] = useState(true);
    const [userManagementExpanded, setUserManagementExpanded] = useState(true);
    const [billingExpanded, setBillingExpanded] = useState(true);
    const searchInputRef = useRef(null);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };
    
    const roleSlug = user?.role?.slug;
    const isVendor = roleSlug === 'vendor';
    const isAdmin = isAdminRole(roleSlug);
    const isConfirmationAgent = isConfirmationAgentRole(roleSlug);
    const isDeliveryPerson = isDeliveryPersonRole(roleSlug);
    const canAccessBilling = isAdmin || isConfirmationAgent || isDeliveryPerson || isVendorRole(roleSlug);
    const billingSubItems = useMemo(() => [
        (isAdmin || isVendor) ? { path: appPath('/billing/sellers'), icon: Store, label: t('admin.menu.sellerBilling'), description: t('admin.menu.sellerBillingDesc') } : null,
        (isAdmin || isDeliveryPerson) ? { path: appPath('/billing/delivery'), icon: Truck, label: t('admin.menu.deliveryBilling'), description: t('admin.menu.deliveryBillingDesc') } : null,
        (isAdmin || isConfirmationAgent) ? { path: appPath('/billing/confirmation'), icon: UserRoundCheck, label: t('admin.menu.confirmationBilling'), description: t('admin.menu.confirmationBillingDesc') } : null,
    ].filter(Boolean), [isAdmin, isVendor, isDeliveryPerson, isConfirmationAgent, t]);

    const canShowMenuItem = (item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.adminOrConfirmation && !(isAdmin || isConfirmationAgent)) return false;
        if (item.adminOrDelivery && !(isAdmin || isDeliveryPerson)) return false;
        if (item.confirmationOnly && !isConfirmationAgent) return false;
        if (item.deliveryOnly && !isDeliveryPerson) return false;
        if (item.billingOnly && !canAccessBilling) return false;
        if (item.hiddenForConfirmationAgent && isConfirmationAgent) return false;
        if (item.hiddenForDeliveryPerson && isDeliveryPerson) return false;

        return true;
    };

    const menuItems = useMemo(() => [
        { path: appPath('/'), icon: LayoutDashboard, label: t('admin.menu.dashboard'), description: t('admin.menu.dashboardDesc') },
        { 
            path: appPath('/products'), 
            icon: Package, 
            label: t('admin.menu.products'), 
            description: t('admin.menu.productsDesc'),
            expandKey: 'products',
            hasSubItems: true,
            adminOnly: true,
            hiddenForConfirmationAgent: true,
            hiddenForDeliveryPerson: true,
            subItems: [
                { path: appPath('/products'), icon: List, label: t('admin.menu.listProducts'), description: t('admin.menu.listProductsDesc') },
                { path: appPath('/categories'), icon: Tags, label: t('admin.menu.categories'), description: t('admin.menu.categoriesDesc') },
                { path: appPath('/profit-dashboard'), icon: TrendingUp, label: t('admin.menu.profitDashboard'), description: t('admin.menu.profitDashboardDesc') }
            ]
        },
        { path: appPath('/marketplace'), icon: ShoppingBag, label: t('admin.menu.marketplace'), description: t('admin.menu.marketplaceDesc'), hiddenForDeliveryPerson: true },
        { path: appPath('/stock'), icon: Box, label: t('admin.menu.stock'), description: t('admin.menu.stockDesc'), adminOnly: true, hiddenForDeliveryPerson: true },
        { 
            path: appPath('/orders'), 
            icon: ShoppingCart, 
            label: t('admin.menu.orders'), 
            description: t('admin.menu.ordersDesc'),
            expandKey: 'orders',
            hasSubItems: true,
            subItems: [
                { path: appPath('/orders'), icon: List, label: t('admin.menu.allOrders'), description: t('admin.menu.allOrdersDesc') },
                { path: appPath('/orders/pending'), icon: Clock, label: t('admin.menu.pending'), description: t('admin.menu.pendingDesc') },
                { path: appPath('/orders/confirmed'), icon: CheckCircle, label: t('admin.menu.confirmed'), description: t('admin.menu.confirmedDesc') },
                { path: appPath('/orders/shipped'), icon: Package, label: t('admin.menu.shipped'), description: t('admin.menu.shippedDesc') },
                { path: appPath('/orders/delivered'), icon: CheckCircle, label: t('admin.menu.delivered'), description: t('admin.menu.deliveredDesc') },
                { path: appPath('/orders/cancelled'), icon: X, label: t('admin.menu.cancelled'), description: t('admin.menu.cancelledDesc') },
                { path: appPath('/orders/refused'), icon: X, label: t('admin.menu.refused'), description: t('admin.menu.refusedDesc') },
                { path: appPath('/orders/returned'), icon: RefreshCw, label: t('admin.menu.returned'), description: t('admin.menu.returnedDesc') }
            ]
        },
        { path: appPath('/vendors'), icon: Store, label: t('admin.menu.sellers'), description: t('admin.menu.sellersDesc'), adminOnly: true, hiddenForConfirmationAgent: true, hiddenForDeliveryPerson: true },
        { 
            path: appPath('/expenses'), 
            icon: DollarSign, 
            label: t('admin.menu.expenses'), 
            description: t('admin.menu.expensesDesc'),
            expandKey: 'expenses',
            hasSubItems: true,
            adminOnly: true,
            hiddenForConfirmationAgent: true,
            hiddenForDeliveryPerson: true,
            subItems: [
                { path: appPath('/expenses'), icon: Receipt, label: t('admin.menu.listExpenses'), description: t('admin.menu.listExpensesDesc') },
                { path: appPath('/expense-categories'), icon: Tags, label: t('admin.menu.expenseCategories'), description: t('admin.menu.expenseCategoriesDesc') }
            ]
        },
        { 
            path: appPath('/api-integrations'), 
            icon: Link2, 
            label: t('admin.menu.apiIntegrations'), 
            description: t('admin.menu.apiIntegrationsDesc'),
            expandKey: 'api',
            hasSubItems: true,
            hiddenForConfirmationAgent: true,
            hiddenForDeliveryPerson: true,
            subItems: isVendor
                ? [
                    { path: appPath('/api-integrations/shopify'), icon: ShoppingCart, label: t('admin.menu.shopify'), description: t('admin.menu.shopifyDesc') },
                    { path: appPath('/api-integrations/google-sheet'), icon: FileText, label: t('admin.menu.googleSheets'), description: t('admin.menu.googleSheetsDesc') },
                    { path: appPath('/api-integrations/custom-api'), icon: Globe, label: t('admin.menu.customApi'), description: t('admin.menu.customApiDesc') },
                  ]
                : [
                    { path: appPath('/api-integrations/shopify'), icon: ShoppingCart, label: t('admin.menu.shopify'), description: t('admin.menu.shopifyDesc') },
                    { path: appPath('/api-integrations/google-sheet'), icon: FileText, label: t('admin.menu.googleSheets'), description: t('admin.menu.googleSheetsDesc') },
                    { path: appPath('/api-integrations/custom-api'), icon: Globe, label: t('admin.menu.customApi'), description: t('admin.menu.customApiDesc') },
                    { path: appPath('/api-integrations/tawsilex'), icon: Package, label: t('admin.menu.tawsilex'), description: t('admin.menu.tawsilexDesc') },
                    { path: appPath('/api-integrations/bmdelivery'), icon: Box, label: t('admin.menu.bmdelivery'), description: t('admin.menu.bmdeliveryDesc') }
                  ]
        },
        { 
            path: appPath('/user-management'), 
            icon: UserCog, 
            label: t('admin.menu.userManagement'), 
            description: t('admin.menu.userManagementDesc'),
            expandKey: 'userManagement',
            hasSubItems: true,
            adminOnly: true,
            hiddenForConfirmationAgent: true,
            hiddenForDeliveryPerson: true,
            subItems: [
                { path: appPath('/users'), icon: Users, label: t('admin.menu.users'), description: t('admin.menu.usersDesc') },
                { path: appPath('/roles'), icon: Shield, label: t('admin.menu.roles'), description: t('admin.menu.rolesDesc') }
            ]
        },
        { path: appPath('/billing'), icon: DollarSign, label: t('admin.menu.billing'), description: t('admin.menu.billingDesc'), expandKey: 'billing', hasSubItems: true, billingOnly: true, subItems: billingSubItems },
        { path: appPath('/blacklist'), icon: Ban, label: t('admin.menu.blacklist'), description: t('admin.menu.blacklistDesc'), adminOrConfirmation: true },
        { path: appPath('/settings'), icon: Settings, label: t('admin.menu.settings'), description: t('admin.menu.settingsDesc'), adminOnly: true, hiddenForConfirmationAgent: true, hiddenForDeliveryPerson: true },
    ], [billingSubItems, isAdmin, isConfirmationAgent, isDeliveryPerson, isVendor, t]);

    const searchableItems = useMemo(() => (
        menuItems
            .filter(canShowMenuItem)
            .flatMap((item) => {
                const parentItem = {
                    path: item.path,
                    label: item.label,
                    description: item.description,
                    section: t('admin.layout.mainNav'),
                    keywords: [item.label, item.description].filter(Boolean).join(' '),
                };

                if (!item.hasSubItems || !item.subItems?.length) {
                    return [parentItem];
                }

                return [
                    parentItem,
                    ...item.subItems.map((subItem) => ({
                        path: subItem.path,
                        label: subItem.label,
                        description: subItem.description,
                        section: item.label,
                        keywords: [item.label, subItem.label, subItem.description].filter(Boolean).join(' '),
                    })),
                ];
            })
            .filter((item, index, items) => items.findIndex((entry) => entry.path === item.path) === index)
    ), [menuItems, isAdmin, isConfirmationAgent, isDeliveryPerson, canAccessBilling, t]);

    const searchResults = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            return searchableItems.slice(0, 8);
        }

        return searchableItems
            .filter((item) => [item.label, item.description, item.section, item.keywords]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query)))
            .slice(0, 8);
    }, [searchQuery, searchableItems]);

    const isActive = (path) => location.pathname === path;

    const isParentActive = (path) => {
        if (path === APP_BASE) {
            return location.pathname === APP_BASE;
        }
        return location.pathname.startsWith(path);
    };

    const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-72';
    const isRTL = i18n.language === 'ar';
    const mainContentOffsetClass = sidebarOpen
        ? (sidebarCollapsed ? (isRTL ? 'lg:mr-20' : 'lg:ml-20') : (isRTL ? 'lg:mr-72' : 'lg:ml-72'))
        : '';
    const appShellClass = darkMode
        ? 'min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100'
        : 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900';
    const headerClass = darkMode
        ? 'bg-slate-950/80 border-b border-slate-800/80 shadow-lg shadow-black/10 backdrop-blur-xl'
        : 'bg-white/80 border-b border-slate-200/50 shadow-sm backdrop-blur-xl';
    const headerButtonClass = darkMode
        ? 'rounded-xl p-2.5 text-slate-300 transition-all hover:bg-slate-800 hover:text-white'
        : 'rounded-xl p-2.5 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700';
    const userMenuButtonClass = darkMode
        ? 'flex items-center space-x-3 rounded-xl p-2 transition-all hover:bg-slate-800'
        : 'flex items-center space-x-3 rounded-xl p-2 transition-all hover:bg-slate-100';
    const dropdownPanelClass = darkMode
        ? 'absolute end-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-900 py-2 shadow-2xl shadow-black/30 z-50'
        : 'absolute end-0 mt-2 w-80 rounded-2xl border border-slate-200/50 bg-white py-2 shadow-xl z-50';
    const searchWrapperClass = darkMode
        ? 'hidden md:flex items-center rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 w-80 shadow-sm'
        : 'hidden md:flex items-center rounded-xl border border-transparent bg-slate-100 px-4 py-2.5 w-80';
    const footerClass = darkMode
        ? 'border-t border-slate-800/70 bg-slate-950/60 px-6 py-4 lg:px-8'
        : 'border-t border-slate-200/50 bg-white/50 px-6 py-4 lg:px-8';

    const formatNotificationTime = (value) => {
        if (!value) {
            return t('admin.layout.justNow');
        }

        const timestamp = new Date(value);
        const diffInMinutes = Math.max(1, Math.round((Date.now() - timestamp.getTime()) / 60000));

        if (diffInMinutes < 60) {
            return t('admin.layout.minutesAgo', { count: diffInMinutes });
        }

        const diffInHours = Math.round(diffInMinutes / 60);
        if (diffInHours < 24) {
            return t('admin.layout.hoursAgo', { count: diffInHours });
        }

        const diffInDays = Math.round(diffInHours / 24);
        if (diffInDays < 7) {
            return t('admin.layout.daysAgo', { count: diffInDays });
        }

        const locale = i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-FR' : 'en-US';
        return timestamp.toLocaleDateString(locale);
    };

    const getNotificationTarget = (notification) => {
        if (notification?.data?.order_id) {
            return appPath(`/orders/${notification.data.order_id}`);
        }

        if (notification?.data?.product_id) {
            return appPath(`/products/${notification.data.product_id}`);
        }

        return null;
    };

    const loadNotifications = async (showLoader = true) => {
        if (showLoader) {
            setNotificationsLoading(true);
        }

        try {
            const [notificationsResponse, unreadResponse] = await Promise.all([
                api.get('/notifications', { params: { per_page: 6 } }),
                api.get('/notifications/unread-count'),
            ]);

            setNotifications(notificationsResponse.data?.data ?? []);
            setUnreadCount(unreadResponse.data?.count ?? 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            if (showLoader) {
                setNotificationsLoading(false);
            }
        }
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();

        if (!searchResults.length) {
            return;
        }

        navigate(searchResults[0].path);
        setSearchQuery('');
        setShowSearchResults(false);
    };

    const handleSearchResultSelect = (path) => {
        navigate(path);
        setSearchQuery('');
        setShowSearchResults(false);
    };

    const handleNotificationToggle = async () => {
        const nextState = !showNotificationsMenu;

        setShowNotificationsMenu(nextState);
        setShowUserMenu(false);
        setShowSearchResults(false);

        if (nextState) {
            await loadNotifications();
        }
    };

    const handleNotificationSelect = async (notification) => {
        try {
            if (!notification.is_read) {
                await api.patch(`/notifications/${notification.id}/read`);
                setNotifications((current) => current.map((item) => (
                    item.id === notification.id ? { ...item, is_read: true } : item
                )));
                setUnreadCount((current) => Math.max(current - 1, 0));
            }
        } catch (error) {
            console.error('Error updating notification:', error);
        }

        const targetPath = getNotificationTarget(notification);
        setShowNotificationsMenu(false);

        if (targetPath) {
            navigate(targetPath);
        }
    };

    const handleMarkAllNotificationsAsRead = async () => {
        try {
            await api.post('/notifications/mark-all-read');
            setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        document.body.classList.toggle('dark', darkMode);
        window.sessionStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    useEffect(() => {
        const isRTL = i18n.language === 'ar';
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    useEffect(() => {
        loadNotifications();

        const intervalId = window.setInterval(() => {
            loadNotifications(false);
        }, 60000);

        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        setShowUserMenu(false);
        setShowNotificationsMenu(false);
        setShowSearchResults(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchInputRef.current?.focus();
                setShowSearchResults(true);
                setShowUserMenu(false);
                setShowNotificationsMenu(false);
            }

            if (event.key === 'Escape') {
                setShowSearchResults(false);
                setShowUserMenu(false);
                setShowNotificationsMenu(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className={`app-theme-shell ${appShellClass} transition-colors duration-300`}>
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 z-50 ${isRTL ? 'right-0' : 'left-0'} ${sidebarWidth} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}`}>
                {/* Logo Section */}
                <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                    {!sidebarCollapsed && (
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <Package className="text-white" size={22} />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white tracking-tight">{settings.app_name}</h1>
                                <p className="text-xs text-slate-400">{settings.app_description}</p>
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
                        if (!canShowMenuItem(item)) return null;
                        
                        // Handle items with sub-items
                        if (item.hasSubItems && !sidebarCollapsed) {
                            const expandKey = item.expandKey || '';
                            const isExpanded = expandKey === 'products'
                                ? productsExpanded
                                : expandKey === 'expenses'
                                    ? expensesExpanded
                                    : expandKey === 'orders'
                                        ? ordersExpanded
                                        : expandKey === 'userManagement'
                                            ? userManagementExpanded
                                            : expandKey === 'billing'
                                                ? billingExpanded
                                                : apiIntegrationsExpanded;
                            const toggleExpanded = expandKey === 'products'
                                ? () => setProductsExpanded(!productsExpanded)
                                : expandKey === 'expenses'
                                    ? () => setExpensesExpanded(!expensesExpanded)
                                    : expandKey === 'orders'
                                        ? () => setOrdersExpanded(!ordersExpanded)
                                        : expandKey === 'userManagement'
                                            ? () => setUserManagementExpanded(!userManagementExpanded)
                                            : expandKey === 'billing'
                                                ? () => setBillingExpanded(!billingExpanded)
                                                : () => setApiIntegrationsExpanded(!apiIntegrationsExpanded);
                            
                            const active = isParentActive(item.path);
                            
                            return (
                                <div key={item.path}>
                                    <button
                                        onClick={toggleExpanded}
                                        className={`group w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                                            active
                                                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-white/10'
                                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <item.icon size={20} className={active ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
                                            <div className="flex-1 text-start">
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
                                        <div className="ms-4 mt-1 space-y-1 border-s-2 border-slate-700/50 ps-2">
                                            {item.subItems.map((subItem) => {
                                                const subActive = isActive(subItem.path);
                                                return (
                                                    <Link
                                                        key={subItem.path}
                                                        to={subItem.path}
                                                        className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                                            subActive
                                                                ? 'border border-blue-500/30 bg-slate-700/80 text-white shadow-inner shadow-black/10'
                                                                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                                                        }`}
                                                    >
                                                        <subItem.icon size={18} className={subActive ? 'text-sky-300' : 'text-slate-500 group-hover:text-slate-300'} />
                                                        <div className="flex-1">
                                                            <span className="font-medium text-sm">{subItem.label}</span>
                                                        </div>
                                                        {subActive && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-sky-300"></div>
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
                        const active = isActive(item.path);
                        
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all duration-200 relative ${
                                    active
                                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-white/10'
                                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                }`}
                                title={sidebarCollapsed ? item.label : ''}
                            >
                                <item.icon size={20} className={active ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
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
                                title={t('admin.layout.logout')}
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <div className={`transition-all duration-300 ${mainContentOffsetClass}`}>
                {/* Header */}
                <header className={`sticky top-0 z-40 ${headerClass}`}>
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className={`rounded-xl p-2 transition-all lg:hidden ${darkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <Menu size={22} />
                            </button>
                            
                            {/* Search Bar */}
                            <div className="relative">
                                <form className={searchWrapperClass} onSubmit={handleSearchSubmit}>
                                    <Search size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onFocus={() => {
                                            setShowSearchResults(true);
                                            setShowUserMenu(false);
                                            setShowNotificationsMenu(false);
                                        }}
                                        onChange={(event) => {
                                            setSearchQuery(event.target.value);
                                            setShowSearchResults(true);
                                        }}
                                        placeholder={t('admin.layout.searchPlaceholder')}
                                        className={`ms-3 w-full border-none bg-transparent text-sm outline-none ${darkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-600 placeholder-slate-400'}`}
                                    />
                                    <kbd className={`hidden rounded-lg px-2 py-1 text-xs lg:inline-flex ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-400 shadow-sm'}`}>⌘K</kbd>
                                </form>

                                {showSearchResults && (
                                    <div className={`absolute start-0 top-full mt-2 hidden w-80 overflow-hidden rounded-2xl border py-2 shadow-2xl md:block ${darkMode ? 'border-slate-800 bg-slate-900 shadow-black/30' : 'border-slate-200/70 bg-white'}`}>
                                        <div className={`px-4 pb-2 text-xs font-semibold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {searchQuery.trim() ? t('admin.layout.searchMatching') : t('admin.layout.searchQuickAccess')}
                                        </div>
                                        {searchResults.length > 0 ? (
                                            searchResults.map((result) => (
                                                <button
                                                    key={result.path}
                                                    type="button"
                                                    onClick={() => handleSearchResultSelect(result.path)}
                                                    className={`flex w-full items-start gap-3 px-4 py-3 text-start transition-colors ${darkMode ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'}`}
                                                >
                                                    <Search size={16} className={`mt-0.5 shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                                    <div className="min-w-0">
                                                        <p className={`truncate text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{result.label}</p>
                                                        <p className={`truncate text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{result.section} • {result.description}</p>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className={`px-4 py-3 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {t('admin.layout.searchNoResults')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {/* Language */}
                            <div className="relative group">
                                <button
                                    type="button"
                                    className={headerButtonClass}
                                    aria-label={t('admin.layout.language')}
                                >
                                    <Globe size={20} />
                                </button>
                                <div className={`absolute end-0 top-full z-50 mt-2 min-w-[140px] rounded-xl border py-1 shadow-lg opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                                    <button type="button" onClick={() => i18n.changeLanguage('fr')} className={`block w-full px-4 py-2 text-start text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'}`}>{t('admin.language.fr')}</button>
                                    <button type="button" onClick={() => i18n.changeLanguage('en')} className={`block w-full px-4 py-2 text-start text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'}`}>{t('admin.language.en')}</button>
                                    <button type="button" onClick={() => i18n.changeLanguage('ar')} className={`block w-full px-4 py-2 text-start text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'}`}>{t('admin.language.ar')}</button>
                                </div>
                            </div>

                            {/* Theme Toggle */}
                            <button 
                                onClick={() => setDarkMode((current) => !current)}
                                className={headerButtonClass}
                                aria-label={darkMode ? t('admin.layout.themeLight') : t('admin.layout.themeDark')}
                                title={darkMode ? t('admin.layout.themeLight') : t('admin.layout.themeDark')}
                            >
                                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={handleNotificationToggle}
                                    className={headerButtonClass}
                                    aria-label={t('admin.layout.openNotifications')}
                                    title={t('admin.layout.notifications')}
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className={`absolute end-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ${darkMode ? 'ring-slate-950' : 'ring-white'}`}>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {showNotificationsMenu && (
                                    <div className={dropdownPanelClass}>
                                        <div className={`flex items-center justify-between px-4 py-3 ${darkMode ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
                                            <div>
                                                <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{t('admin.layout.notifications')}</p>
                                                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{unreadCount === 1 ? t('admin.layout.unreadOne') : t('admin.layout.unreadMany', { count: unreadCount })}</p>
                                            </div>
                                            {unreadCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleMarkAllNotificationsAsRead}
                                                    className={`text-xs font-medium transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
                                                >
                                                    {t('admin.layout.markAllRead')}
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-96 overflow-y-auto">
                                            {notificationsLoading ? (
                                                <div className={`px-4 py-6 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {t('admin.layout.loadingNotifications')}
                                                </div>
                                            ) : notifications.length > 0 ? (
                                                notifications.map((notification) => (
                                                    <button
                                                        key={notification.id}
                                                        type="button"
                                                        onClick={() => handleNotificationSelect(notification)}
                                                        className={`flex w-full items-start gap-3 px-4 py-3 text-start transition-colors ${darkMode ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'} ${notification.is_read ? '' : darkMode ? 'bg-slate-800/40' : 'bg-blue-50/60'}`}
                                                    >
                                                        <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.is_read ? (darkMode ? 'bg-slate-700' : 'bg-slate-200') : 'bg-blue-500'}`}></div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <p className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{notification.title}</p>
                                                                <span className={`shrink-0 text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                    {formatNotificationTime(notification.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className={`mt-1 text-xs leading-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{notification.message}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className={`px-4 py-6 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {t('admin.layout.noNotifications')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Menu */}
                            <div className="relative">
                                <button 
                                    onClick={() => {
                                        setShowUserMenu((current) => !current);
                                        setShowNotificationsMenu(false);
                                        setShowSearchResults(false);
                                    }}
                                    className={userMenuButtonClass}
                                >
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="hidden md:block text-start">
                                        <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{user?.name}</p>
                                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{user?.role?.name}</p>
                                    </div>
                                    <ChevronDown size={16} className={`hidden md:block ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                </button>

                                {showUserMenu && (
                                    <div className={`absolute end-0 mt-2 w-56 rounded-2xl border py-2 z-50 ${darkMode ? 'border-slate-800 bg-slate-900 shadow-2xl shadow-black/30' : 'border-slate-200/50 bg-white shadow-xl'}`}>
                                        <div className={`px-4 py-3 ${darkMode ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
                                            <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{user?.name}</p>
                                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</p>
                                        </div>
                                        {isAdmin && (
                                            <Link to={appPath('/settings')} className={`flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                                <Settings size={18} />
                                                <span>{t('admin.layout.settings')}</span>
                                            </Link>
                                        )}
                                        <button 
                                            onClick={handleLogout}
                                            className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 transition-colors ${darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                                        >
                                            <LogOut size={18} />
                                            <span>{t('admin.layout.logout')}</span>
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
                <footer className={footerClass}>
                    <div className={`flex flex-col md:flex-row items-center justify-between text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <p>&copy; 2026 {settings.app_name}. {t('admin.layout.footerRights')}</p>
                        <p className="mt-2 md:mt-0">{t('admin.layout.footerTagline')}</p>
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

            {/* Click outside to close header popovers */}
            {(showUserMenu || showNotificationsMenu || showSearchResults) && (
                <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => {
                        setShowUserMenu(false);
                        setShowNotificationsMenu(false);
                        setShowSearchResults(false);
                    }}
                />
            )}
        </div>
    );
}
