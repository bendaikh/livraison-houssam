import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
    Globe,
    Lock,
    Mail,
    AlertCircle,
    Eye,
    EyeOff,
    ArrowRight,
    Package,
    Truck,
    TrendingUp,
    ShieldCheck,
    UserPlus,
    CheckCircle,
    Store,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { appPath } from '../../constants/appPaths';

export default function HomePage() {
    const { t, i18n } = useTranslation();
    const { settings } = useSettings();
    const { login, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const appName = settings.app_name || 'Livraison';
    const isRTL = i18n.language === 'ar';

    const [activeTab, setActiveTab] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [i18n.language, isRTL]);

    useEffect(() => {
        if (!authLoading && user) {
            navigate(appPath('/'), { replace: true });
        }
    }, [user, authLoading, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate(appPath('/'));
        } catch (err) {
            setError(err.response?.data?.message || t('admin.login.invalidCredentials'));
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: Package, title: t('home.gateway.feature1Title'), desc: t('home.gateway.feature1Desc') },
        { icon: Truck, title: t('home.gateway.feature2Title'), desc: t('home.gateway.feature2Desc') },
        { icon: TrendingUp, title: t('home.gateway.feature3Title'), desc: t('home.gateway.feature3Desc') },
        { icon: ShieldCheck, title: t('home.gateway.feature4Title'), desc: t('home.gateway.feature4Desc') },
    ];

    const signupBenefits = [
        t('home.gateway.signupBenefit1'),
        t('home.gateway.signupBenefit2'),
        t('home.gateway.signupBenefit3'),
        t('home.gateway.signupBenefit4'),
    ];

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex ${isRTL ? 'font-arabic' : ''}`}>
            {/* Branding Panel */}
            <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-950">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute -top-24 -start-24 h-96 w-96 rounded-full bg-teal-400 blur-3xl" />
                    <div className="absolute top-1/3 end-0 h-80 w-80 rounded-full bg-emerald-500 blur-3xl" />
                    <div className="absolute bottom-0 start-1/4 h-72 w-72 rounded-full bg-cyan-400 blur-3xl" />
                </div>

                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '32px 32px',
                }} />

                <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-16">
                    <div>
                        <div className="flex items-center gap-4 mb-16">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/30">
                                <Store className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">{appName}</h1>
                                <p className="text-sm text-teal-300/80">{t('home.gateway.sellerPortal')}</p>
                            </div>
                        </div>

                        <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-5">
                            {t('home.gateway.headline')}
                            <br />
                            <span className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
                                {t('home.gateway.headlineAccent')}
                            </span>
                        </h2>
                        <p className="text-lg text-slate-300 max-w-lg leading-relaxed">
                            {t('home.gateway.tagline')}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 my-10">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:bg-white/10"
                            >
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20">
                                    <feature.icon className="h-5 w-5 text-teal-300" />
                                </div>
                                <h3 className="font-semibold text-white text-sm mb-1">{feature.title}</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-8 pt-6 border-t border-white/10">
                        <div>
                            <div className="text-2xl font-bold text-white">500+</div>
                            <div className="text-xs text-slate-400">{t('home.stats.sellers')}</div>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div>
                            <div className="text-2xl font-bold text-white">50+</div>
                            <div className="text-xs text-slate-400">{t('home.stats.cities')}</div>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div>
                            <div className="text-2xl font-bold text-white">24/7</div>
                            <div className="text-xs text-slate-400">{t('home.gateway.support')}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Auth Panel */}
            <div className="flex flex-1 flex-col bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
                <div className="flex items-center justify-between p-5 sm:p-6">
                    <div className="flex items-center gap-3 lg:hidden">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-md">
                            <Store className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-slate-800">{appName}</span>
                    </div>

                    <div className="relative group ms-auto">
                        <button
                            type="button"
                            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-teal-200 hover:text-teal-700 transition"
                        >
                            <Globe className="h-4 w-4" />
                            <span>{i18n.language.toUpperCase()}</span>
                        </button>
                        <div className="absolute end-0 top-full z-20 mt-2 min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible">
                            <button type="button" onClick={() => i18n.changeLanguage('ar')} className="block w-full px-4 py-2.5 text-start text-sm text-slate-700 hover:bg-teal-50">العربية</button>
                            <button type="button" onClick={() => i18n.changeLanguage('fr')} className="block w-full px-4 py-2.5 text-start text-sm text-slate-700 hover:bg-teal-50">Français</button>
                            <button type="button" onClick={() => i18n.changeLanguage('en')} className="block w-full px-4 py-2.5 text-start text-sm text-slate-700 hover:bg-teal-50">English</button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
                    <div className="w-full max-w-md">
                        {/* Tab Switcher */}
                        <div className="mb-8 flex rounded-2xl bg-slate-100 p-1.5">
                            <button
                                type="button"
                                onClick={() => { setActiveTab('login'); setError(''); }}
                                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                                    activeTab === 'login'
                                        ? 'bg-white text-teal-700 shadow-md shadow-slate-200/50'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Lock className="h-4 w-4" />
                                {t('home.gateway.signIn')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('signup'); setError(''); }}
                                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                                    activeTab === 'signup'
                                        ? 'bg-white text-teal-700 shadow-md shadow-slate-200/50'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <UserPlus className="h-4 w-4" />
                                {t('home.gateway.signUp')}
                            </button>
                        </div>

                        {activeTab === 'login' ? (
                            <div className="animate-in fade-in duration-300">
                                <div className="mb-8 text-center">
                                    <h2 className="text-2xl font-bold text-slate-900">{t('admin.login.welcomeBack')}</h2>
                                    <p className="mt-2 text-slate-500">{t('home.gateway.loginSubtitle')}</p>
                                </div>

                                {error && (
                                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        <span className="text-sm font-medium">{error}</span>
                                    </div>
                                )}

                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            {t('auth.login.email')}
                                        </label>
                                        <div className="relative group">
                                            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4">
                                                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 ps-12 pe-4 text-slate-700 placeholder-slate-400 transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500"
                                                placeholder={t('admin.login.emailPlaceholder')}
                                                required
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            {t('auth.login.password')}
                                        </label>
                                        <div className="relative group">
                                            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4">
                                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 ps-12 pe-12 text-slate-700 placeholder-slate-400 transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500"
                                                placeholder={t('admin.login.passwordPlaceholder')}
                                                required
                                                dir="ltr"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 end-0 flex items-center pe-4 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-4 font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:from-teal-700 hover:to-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                <span>{t('admin.login.signingIn')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{t('auth.login.submit')}</span>
                                                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <p className="mt-8 text-center text-sm text-slate-500">
                                    {t('auth.login.noAccount')}{' '}
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('signup')}
                                        className="font-semibold text-teal-600 hover:text-teal-700 transition"
                                    >
                                        {t('auth.login.signupLink')}
                                    </button>
                                </p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-300">
                                <div className="mb-8 text-center">
                                    <h2 className="text-2xl font-bold text-slate-900">{t('auth.signup.title')}</h2>
                                    <p className="mt-2 text-slate-500">{t('home.gateway.signupSubtitle')}</p>
                                </div>

                                <div className="mb-8 space-y-3">
                                    {signupBenefits.map((benefit, index) => (
                                        <div key={index} className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3">
                                            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                                            <span className="text-sm text-slate-700">{benefit}</span>
                                        </div>
                                    ))}
                                </div>

                                <Link
                                    to="/seller/signup"
                                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-4 font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:from-teal-700 hover:to-emerald-700 hover:shadow-xl"
                                >
                                    <UserPlus className="h-5 w-5" />
                                    <span>{t('home.gateway.createSellerAccount')}</span>
                                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                                </Link>

                                <p className="mt-8 text-center text-sm text-slate-500">
                                    {t('home.gateway.alreadyHaveAccount')}{' '}
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('login')}
                                        className="font-semibold text-teal-600 hover:text-teal-700 transition"
                                    >
                                        {t('home.gateway.signIn')}
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pb-6 text-center text-xs text-slate-400">
                    &copy; 2026 {appName}. {t('home.footer.rights')}
                </div>
            </div>
        </div>
    );
}
