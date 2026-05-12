import React from 'react';
import { useTranslation } from 'react-i18next';

export default function StockHistory() {
    const { t } = useTranslation();
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">{t('admin.stockHistory.title')}</h1>
            <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-600">{t('admin.stockHistory.subtitle')}</p>
            </div>
        </div>
    );
}
