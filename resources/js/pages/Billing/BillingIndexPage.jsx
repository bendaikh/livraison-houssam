import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminRole, isConfirmationAgentRole, isDeliveryPersonRole, isVendorRole } from '../../utils/roles';

export default function BillingIndexPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (isAdminRole(user?.role?.slug) || isVendorRole(user?.role?.slug)) {
        return <Navigate to="/billing/sellers" replace />;
    }

    if (isDeliveryPersonRole(user?.role?.slug)) {
        return <Navigate to="/billing/delivery" replace />;
    }

    if (isConfirmationAgentRole(user?.role?.slug)) {
        return <Navigate to="/billing/confirmation" replace />;
    }

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-6">
            <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-500">403</p>
                <h1 className="mt-3 text-2xl font-bold text-slate-900">Unauthorized</h1>
                <p className="mt-2 text-sm text-slate-600">You do not have access to billing.</p>
            </div>
        </div>
    );
}
