import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Shield, TrendingUp, Users } from 'lucide-react';

export default function AuthLayout({ children }) {
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const isRTL = i18n.language === 'ar';
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    const features = [
        { icon: Package, title: t('admin.authLayout.featureProductsTitle'), description: t('admin.authLayout.featureProductsDesc') },
        { icon: TrendingUp, title: t('admin.authLayout.featureAnalyticsTitle'), description: t('admin.authLayout.featureAnalyticsDesc') },
        { icon: Users, title: t('admin.authLayout.featureClientsTitle'), description: t('admin.authLayout.featureClientsDesc') },
        { icon: Shield, title: t('admin.authLayout.featureSecurityTitle'), description: t('admin.authLayout.featureSecurityDesc') },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex">
            <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 -start-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
                    <div className="absolute top-1/2 -end-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute bottom-0 start-1/3 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000"></div>
                </div>

                <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
                    <div className="flex items-center gap-4 mb-12">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Package className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Livraison</h1>
                            <p className="text-slate-400 text-sm">{t('admin.authLayout.brandSubtitle')}</p>
                        </div>
                    </div>

                    <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                        {t('admin.authLayout.headlineBefore')}<br />
                        <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            {t('admin.authLayout.headlineAccent')}
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg mb-12 max-w-md">
                        {t('admin.authLayout.tagline')}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        {features.map((feature, index) => (
                            <div 
                                key={index}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center mb-3">
                                    <feature.icon className="text-blue-400" size={20} />
                                </div>
                                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                                <p className="text-slate-500 text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 pt-8 border-t border-white/10">
                        <p className="text-slate-500 text-sm">
                            {t('admin.authLayout.footerNote')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-slate-50 via-white to-blue-50">
                <div className="w-full max-w-md">
                    <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Package className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Livraison</h1>
                            <p className="text-slate-500 text-xs">{t('admin.authLayout.brandSubtitle')}</p>
                        </div>
                    </div>
                    
                    {children}
                </div>
            </div>
        </div>
    );
}
