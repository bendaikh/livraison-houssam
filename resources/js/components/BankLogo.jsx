import React, { useState } from 'react';
import { getBankLogoByName } from '../constants/moroccanBanks';

export default function BankLogo({ bankName, logoUrl = null, size = 24, className = '' }) {
    const [imageError, setImageError] = useState(false);
    const resolvedLogo = logoUrl || getBankLogoByName(bankName);

    if (!resolvedLogo || imageError) {
        return null;
    }

    return (
        <img
            src={resolvedLogo}
            alt={bankName || 'Bank logo'}
            className={`rounded-full object-contain bg-white border border-slate-200 ${className}`}
            style={{ width: size, height: size }}
            onError={() => setImageError(true)}
        />
    );
}
