import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { appPath } from '../../constants/appPaths';
import { Lock, Mail, AlertCircle, Eye, EyeOff, ArrowRight, Sparkles, Globe } from 'lucide-react';

export default function Login() {
    const { t, i18n } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const isRTL = i18n.language === 'ar';
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    const handleSubmit = async (e) => {
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

    const fillSuperAdminCredentials = () => {
        setEmail('superadmin@ecommerce.com');
        setPassword('SuperAdmin@2026');
        setError('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <div className="relative group">
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                        aria-label={t('admin.layout.language')}
                    >
                        <Globe className="h-4 w-4" />
                        <span>{i18n.language.toUpperCase()}</span>
                    </button>
                    <div className="absolute end-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg opacity-0 invisible transition-all group-hover:opacity-100 group-hover:visible">
                        <button type="button" onClick={() => i18n.changeLanguage('fr')} className="block w-full px-4 py-2 text-start text-sm text-slate-700 hover:bg-slate-50">{t('admin.language.fr')}</button>
                        <button type="button" onClick={() => i18n.changeLanguage('en')} className="block w-full px-4 py-2 text-start text-sm text-slate-700 hover:bg-slate-50">{t('admin.language.en')}</button>
                        <button type="button" onClick={() => i18n.changeLanguage('ar')} className="block w-full px-4 py-2 text-start text-sm text-slate-700 hover:bg-slate-50">{t('admin.language.ar')}</button>
                    </div>
                </div>
                <Link to="/" className="ms-3 rounded-lg px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
                    {t('home.nav.home')}
                </Link>
            </div>

            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('admin.login.welcomeBack')}</h1>
                <p className="text-slate-500 mt-2">{t('admin.login.subtitle')}</p>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center text-rose-700 animate-shake">
                    <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center me-3">
                        <AlertCircle size={20} />
                    </div>
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.login.email')}</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                            <Mail className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full ps-12 pe-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-slate-700 placeholder-slate-400"
                            placeholder={t('admin.login.emailPlaceholder')}
                            required
                            dir="ltr"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('auth.login.password')}</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                            <Lock className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full ps-12 pe-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-slate-700 placeholder-slate-400"
                            placeholder={t('admin.login.passwordPlaceholder')}
                            required
                            dir="ltr"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 end-0 pe-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 flex items-center justify-center gap-2 group"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>{t('admin.login.signingIn')}</span>
                        </>
                    ) : (
                        <>
                            <span>{t('auth.login.submit')}</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                        </>
                    )}
                </button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-500">{t('admin.login.demoAccess')}</span>
                </div>
            </div>

            <button
                type="button"
                onClick={fillSuperAdminCredentials}
                className="w-full bg-gradient-to-r from-slate-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50 border-2 border-blue-200 hover:border-blue-300 rounded-xl p-5 text-start transition-all duration-200 hover:shadow-lg group"
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <Sparkles className="text-white" size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-800">{t('admin.login.superAdmin')}</span>
                                <span className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-0.5 rounded-full font-medium">{t('admin.login.fullAccess')}</span>
                            </div>
                            <p className="text-sm text-slate-500">superadmin@ecommerce.com</p>
                        </div>
                    </div>
                    <div className="text-blue-500 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1">
                        <ArrowRight size={20} />
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-3 ps-16">{t('admin.login.demoHint')}</p>
            </button>
        </div>
    );
}
