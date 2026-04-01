import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Globe, Package, TrendingUp, Headphones, Truck, ShieldCheck, Menu, X, UserPlus, ShoppingCart, Megaphone, BarChart3, CheckCircle, Wallet, Laptop, Home, Heart, Shirt, GraduationCap, Cpu } from 'lucide-react';
import axios from 'axios';
import { useSettings } from '../../contexts/SettingsContext';

export default function HomePage() {
    const { t, i18n } = useTranslation();
    const { settings } = useSettings();
    const appName = settings.app_name || 'Livraison';
    const [products, setProducts] = useState([]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isRTL = i18n.language === 'ar';

    useEffect(() => {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
        fetchProducts();
    }, [i18n.language, isRTL]);

    const fetchProducts = async () => {
        try {
            const response = await axios.get('/api/public/products');
            setProducts(response.data.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    const features = [
        {
            icon: <Package className="w-8 h-8" />,
            title: t('home.features.feature1.title'),
            description: t('home.features.feature1.description'),
            color: 'from-teal-500 to-emerald-500'
        },
        {
            icon: <Headphones className="w-8 h-8" />,
            title: t('home.features.feature2.title'),
            description: t('home.features.feature2.description'),
            color: 'from-blue-500 to-cyan-500'
        },
        {
            icon: <Truck className="w-8 h-8" />,
            title: t('home.features.feature3.title'),
            description: t('home.features.feature3.description'),
            color: 'from-purple-500 to-pink-500'
        },
        {
            icon: <ShieldCheck className="w-8 h-8" />,
            title: t('home.features.feature4.title'),
            description: t('home.features.feature4.description'),
            color: 'from-amber-500 to-orange-500'
        }
    ];

    const stats = [
        { value: '500+', label: t('home.stats.sellers') },
        { value: '5000+', label: t('home.stats.products') },
        { value: '1000+', label: t('home.stats.orders') },
        { value: '50+', label: t('home.stats.cities') }
    ];

    const howItWorksSteps = [
        {
            number: '01',
            icon: <UserPlus className="w-6 h-6" />,
            title: t('home.howItWorks.step1.title'),
            description: t('home.howItWorks.step1.description'),
            color: 'from-teal-500 to-cyan-500'
        },
        {
            number: '02',
            icon: <Package className="w-6 h-6" />,
            title: t('home.howItWorks.step2.title'),
            description: t('home.howItWorks.step2.description'),
            color: 'from-blue-500 to-indigo-500'
        },
        {
            number: '03',
            icon: <Megaphone className="w-6 h-6" />,
            title: t('home.howItWorks.step3.title'),
            description: t('home.howItWorks.step3.description'),
            color: 'from-purple-500 to-pink-500'
        },
        {
            number: '04',
            icon: <BarChart3 className="w-6 h-6" />,
            title: t('home.howItWorks.step4.title'),
            description: t('home.howItWorks.step4.description'),
            color: 'from-pink-500 to-rose-500'
        },
        {
            number: '05',
            icon: <CheckCircle className="w-6 h-6" />,
            title: t('home.howItWorks.step5.title'),
            description: t('home.howItWorks.step5.description'),
            color: 'from-emerald-500 to-teal-500'
        },
        {
            number: '06',
            icon: <Wallet className="w-6 h-6" />,
            title: t('home.howItWorks.step6.title'),
            description: t('home.howItWorks.step6.description'),
            color: 'from-amber-500 to-orange-500'
        }
    ];

    const categories = [
        {
            icon: <Laptop className="w-8 h-8" />,
            title: t('home.categories.electronics'),
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50'
        },
        {
            icon: <Shirt className="w-8 h-8" />,
            title: t('home.categories.fashion'),
            color: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-50'
        },
        {
            icon: <Home className="w-8 h-8" />,
            title: t('home.categories.home'),
            color: 'from-orange-500 to-amber-500',
            bgColor: 'bg-orange-50'
        },
        {
            icon: <Heart className="w-8 h-8" />,
            title: t('home.categories.health'),
            color: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50'
        },
        {
            icon: <Heart className="w-8 h-8" />,
            title: t('home.categories.beauty'),
            color: 'from-pink-500 to-rose-500',
            bgColor: 'bg-pink-50'
        },
        {
            icon: <GraduationCap className="w-8 h-8" />,
            title: t('home.categories.food'),
            color: 'from-indigo-500 to-purple-500',
            bgColor: 'bg-indigo-50'
        }
    ];

    const integrations = [
        {
            name: 'Custom API',
            title: t('home.integrations.customApi.title'),
            description: t('home.integrations.customApi.description'),
            logo: <Cpu className="w-12 h-12" />,
            bgColor: 'bg-yellow-50',
            badge: t('home.integrations.badge.connected'),
            badgeColor: 'bg-green-500'
        },
        {
            name: 'Google Sheets',
            title: t('home.integrations.googleSheets.title'),
            description: t('home.integrations.googleSheets.description'),
            logo: '📊',
            bgColor: 'bg-green-50',
            badge: t('home.integrations.badge.connected'),
            badgeColor: 'bg-green-500'
        },
        {
            name: 'WooCommerce',
            title: t('home.integrations.woocommerce.title'),
            description: t('home.integrations.woocommerce.description'),
            logo: '🛒',
            bgColor: 'bg-purple-50',
            badge: t('home.integrations.badge.soon'),
            badgeColor: 'bg-orange-500'
        },
        {
            name: 'Shopify',
            title: t('home.integrations.shopify.title'),
            description: t('home.integrations.shopify.description'),
            logo: '🛍️',
            bgColor: 'bg-green-50',
            badge: t('home.integrations.badge.soon'),
            badgeColor: 'bg-orange-500'
        },
        {
            name: 'YouCan',
            title: t('home.integrations.youcan.title'),
            description: t('home.integrations.youcan.description'),
            logo: '🇾',
            bgColor: 'bg-pink-50',
            badge: t('home.integrations.badge.soon'),
            badgeColor: 'bg-orange-500'
        }
    ];

    return (
        <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-white ${isRTL ? 'font-arabic' : ''}`}>
            {/* Navigation */}
            <nav className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center">
                            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xl">
                                {appName}
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
                            <a href="#home" className="text-gray-700 hover:text-teal-600 transition">{t('home.nav.home')}</a>
                            <a href="#products" className="text-gray-700 hover:text-teal-600 transition">{t('home.nav.products')}</a>
                            <a href="#about" className="text-gray-700 hover:text-teal-600 transition">{t('home.nav.about')}</a>
                            <a href="#contact" className="text-gray-700 hover:text-teal-600 transition">{t('home.nav.contact')}</a>
                        </div>

                        {/* Language Switcher & Auth Buttons */}
                        <div className="flex items-center gap-4">
                            {/* Language Dropdown */}
                            <div className="relative group">
                                <button className="flex items-center gap-2 text-gray-700 hover:text-teal-600 transition">
                                    <Globe className="w-5 h-5" />
                                    <span className="text-sm font-medium">{i18n.language.toUpperCase()}</span>
                                </button>
                                <div className="absolute top-full mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                    <button onClick={() => changeLanguage('ar')} className="block w-full text-start px-4 py-2 text-sm hover:bg-gray-100">العربية</button>
                                    <button onClick={() => changeLanguage('fr')} className="block w-full text-start px-4 py-2 text-sm hover:bg-gray-100">Français</button>
                                    <button onClick={() => changeLanguage('en')} className="block w-full text-start px-4 py-2 text-sm hover:bg-gray-100">English</button>
                                </div>
                            </div>

                            {/* Auth Buttons */}
                            <div className="hidden md:flex items-center gap-3">
                                <Link to="/login" className="text-gray-700 hover:text-teal-600 font-medium transition">
                                    {t('home.nav.login')}
                                </Link>
                                <Link to="/seller/signup" className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-5 py-2 rounded-lg font-medium hover:shadow-lg transition transform hover:-translate-y-0.5">
                                    {t('home.nav.signup')}
                                </Link>
                            </div>

                            {/* Mobile Menu Button */}
                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-gray-700">
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden py-4 border-t">
                            <a href="#home" className="block py-2 text-gray-700">{t('home.nav.home')}</a>
                            <a href="#products" className="block py-2 text-gray-700">{t('home.nav.products')}</a>
                            <a href="#about" className="block py-2 text-gray-700">{t('home.nav.about')}</a>
                            <a href="#contact" className="block py-2 text-gray-700">{t('home.nav.contact')}</a>
                            <div className="pt-4 flex flex-col gap-2">
                                <Link to="/login" className="text-center py-2 text-gray-700 border rounded-lg">
                                    {t('home.nav.login')}
                                </Link>
                                <Link to="/seller/signup" className="text-center bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-2 rounded-lg">
                                    {t('home.nav.signup')}
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section id="home" className="relative py-20 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-emerald-50 to-transparent opacity-50"></div>
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
                    <div>
                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
                            {t('home.hero.title')}
                        </h1>
                        <p className="text-xl text-gray-600 mb-4">
                            {t('home.hero.subtitle')}
                        </p>
                        <p className="text-lg text-gray-500 mb-8">
                            {t('home.hero.description')}
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link to="/seller/signup" className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition transform hover:-translate-y-1">
                                {t('home.hero.startNow')}
                            </Link>
                            <a href="#about" className="border-2 border-teal-500 text-teal-600 px-8 py-4 rounded-lg font-semibold hover:bg-teal-50 transition">
                                {t('home.hero.learnMore')}
                            </a>
                        </div>
                    </div>
                    <div className="relative">
                        <img src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&h=500&fit=crop" 
                             alt="E-commerce" 
                             className="rounded-2xl shadow-2xl" />
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 bg-gradient-to-r from-teal-500 to-emerald-500">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center text-white">
                                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                                <div className="text-teal-100">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            {t('home.howItWorks.title')}
                        </h2>
                        <p className="text-xl text-teal-600 font-semibold mb-2">
                            {t('home.howItWorks.subtitle')}
                        </p>
                        <p className="text-lg text-gray-600">
                            {t('home.howItWorks.description')}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {howItWorksSteps.map((step, index) => (
                            <div key={index} className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition group">
                                <div className="absolute top-4 end-4 text-6xl font-bold text-gray-100 group-hover:text-teal-100 transition">
                                    {step.number}
                                </div>
                                <div className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center text-white mb-6 relative z-10 group-hover:scale-110 transition`}>
                                    {step.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10">
                                    {step.title}
                                </h3>
                                <p className="text-gray-600 relative z-10">
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <section className="py-20 px-4 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            {t('home.categories.title')}
                        </h2>
                        <p className="text-xl text-gray-600">
                            {t('home.categories.subtitle')}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {categories.map((category, index) => (
                            <div key={index} className="group cursor-pointer">
                                <div className={`${category.bgColor} rounded-2xl p-8 aspect-square flex flex-col items-center justify-center transition hover:shadow-xl hover:-translate-y-2`}>
                                    <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition`}>
                                        {category.icon}
                                    </div>
                                    <h3 className="text-center font-semibold text-gray-900 text-sm leading-tight">
                                        {category.title}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Integrations Section */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            {t('home.integrations.title')}
                        </h2>
                        <p className="text-xl text-gray-600">
                            {t('home.integrations.subtitle')}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {integrations.map((integration, index) => (
                            <div key={index} className={`${integration.bgColor} rounded-2xl p-6 text-center hover:shadow-xl transition relative group`}>
                                <div className="absolute top-3 end-3">
                                    <span className={`${integration.badgeColor} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
                                        {integration.badge}
                                    </span>
                                </div>
                                <div className="text-5xl mb-4 group-hover:scale-110 transition">
                                    {typeof integration.logo === 'string' ? integration.logo : integration.logo}
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">
                                    {integration.name}
                                </h3>
                                <p className="text-gray-600 text-sm leading-snug">
                                    {integration.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            {t('home.features.title')}
                        </h2>
                        <p className="text-xl text-gray-600">
                            {t('home.features.subtitle')}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition transform hover:-translate-y-2">
                                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center text-white mb-6`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Products Section */}
            <section id="products" className="py-20 px-4 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            {t('home.products.title')}
                        </h2>
                        <p className="text-xl text-gray-600">
                            {t('home.products.subtitle')}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {products.slice(0, 8).map((product) => (
                            <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition transform hover:-translate-y-2">
                                <div className="aspect-square bg-gray-200 overflow-hidden">
                                    {product.images && product.images[0] ? (
                                        <img src={`/storage/${product.images[0]}`} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-16 h-16 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 mb-2 truncate">{product.name}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-bold text-teal-600">{product.price} DH</span>
                                        {product.stock_quantity > 0 ? (
                                            <button className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-600 transition">
                                                {t('home.products.addToCart')}
                                            </button>
                                        ) : (
                                            <span className="text-red-500 text-sm">{t('home.products.outOfStock')}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {products.length > 8 && (
                        <div className="text-center mt-12">
                            <button className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition">
                                {t('home.products.viewAll')}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 bg-gradient-to-r from-teal-500 to-emerald-500">
                <div className="max-w-4xl mx-auto text-center text-white">
                    <h2 className="text-4xl font-bold mb-6">
                        {t('home.cta.title')}
                    </h2>
                    <p className="text-xl mb-8 text-teal-100">
                        {t('home.cta.description')}
                    </p>
                    <Link to="/seller/signup" className="inline-block bg-white text-teal-600 px-10 py-4 rounded-lg font-bold text-lg hover:shadow-2xl transition transform hover:-translate-y-1">
                        {t('home.cta.button')}
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12 px-4">
                <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
                    <div>
                        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xl mb-4 inline-block">
                            {appName}
                        </div>
                        <p className="text-gray-400 mt-4">
                            {t('home.footer.aboutText')}
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-4">{t('home.footer.quickLinks')}</h3>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="#home" className="hover:text-teal-400 transition">{t('home.nav.home')}</a></li>
                            <li><a href="#products" className="hover:text-teal-400 transition">{t('home.nav.products')}</a></li>
                            <li><a href="#about" className="hover:text-teal-400 transition">{t('home.nav.about')}</a></li>
                            <li><a href="#contact" className="hover:text-teal-400 transition">{t('home.nav.contact')}</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-4">{t('home.footer.support')}</h3>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="#" className="hover:text-teal-400 transition">{t('home.footer.faq')}</a></li>
                            <li><a href="#" className="hover:text-teal-400 transition">{t('home.footer.contact')}</a></li>
                            <li><a href="#" className="hover:text-teal-400 transition">{t('home.footer.terms')}</a></li>
                            <li><a href="#" className="hover:text-teal-400 transition">{t('home.footer.privacy')}</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-4">{t('home.footer.contact')}</h3>
                        <ul className="space-y-2 text-gray-400">
                            <li>{t('home.footer.emailLabel')}</li>
                            <li>Tel: +212 5XX-XXXXXX</li>
                            <li>Casablanca, Morocco</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
                    <p>&copy; 2026 {appName}. {t('home.footer.rights')}</p>
                </div>
            </footer>
        </div>
    );
}
