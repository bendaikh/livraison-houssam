import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';
import { useSettings } from '../../contexts/SettingsContext';
import BankLogo from '../../components/BankLogo';
import { 
    ArrowLeft, Mail, Phone, MapPin, Store, Calendar, 
    Package, DollarSign, Building2, FileText,
    CheckCircle, XCircle, Landmark
} from 'lucide-react';

export default function VendorDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const [vendor, setVendor] = useState(null);
    const [billing, setBilling] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVendorDetails();
    }, [id]);

    const fetchVendorDetails = async () => {
        try {
            setLoading(true);
            const [vendorResponse, productsResponse] = await Promise.all([
                api.get(`/vendors/${id}`),
                api.get(`/products?vendor_id=${id}`)
            ]);
            
            // Handle the response structure from backend
            const vendorPayload = vendorResponse.data || {};
            const vendorData = {
                ...(vendorPayload.vendor || vendorPayload.data || vendorPayload),
                ...(vendorPayload.statistics || {}),
            };
            setVendor(vendorData);
            setBilling(vendorPayload.billing || null);
            setProducts(productsResponse.data.data || productsResponse.data);
        } catch (error) {
            console.error('Error fetching vendor details:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatShortDate = (dateString) => {
        if (!dateString) return 'Not generated yet';

        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-900 mb-2">Seller Not Found</h2>
                    <p className="text-red-700 mb-4">The seller you're looking for doesn't exist.</p>
                    <button
                        onClick={() => navigate(appPath('/vendors'))}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Back to Sellers
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate(appPath('/vendors'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                            {vendor.name}
                        </h1>
                        <p className="text-slate-600 mt-1">Seller Details</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate(appPath('/vendors'))}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 font-semibold shadow-lg shadow-orange-500/30 transition-all flex items-center space-x-2"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Sellers</span>
                </button>
            </div>

            {/* Vendor Information Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info Card */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                            <Store size={24} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Contact Information</h2>
                    </div>

                    <div className="space-y-4">
                        {/* Name */}
                        <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                            <Store size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-slate-500">Contact Name</p>
                                <p className="text-lg font-semibold text-slate-800">{vendor.name}</p>
                            </div>
                        </div>

                        {/* Company Name */}
                        {vendor.company_name && (
                            <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
                                <Building2 size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Company Name</p>
                                    <p className="text-lg font-semibold text-orange-900">{vendor.company_name}</p>
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        {vendor.email && (
                            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                                <Mail size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Email Address</p>
                                    <a href={`mailto:${vendor.email}`} className="text-lg font-semibold text-orange-600 hover:text-orange-700">
                                        {vendor.email}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Phone */}
                        {vendor.phone && (
                            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                                <Phone size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Phone Number</p>
                                    <a href={`tel:${vendor.phone}`} className="text-lg font-semibold text-orange-600 hover:text-orange-700">
                                        {vendor.phone}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Address */}
                        {vendor.address && (
                            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                                <MapPin size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Address</p>
                                    <p className="text-lg font-semibold text-slate-800">{vendor.address}</p>
                                </div>
                            </div>
                        )}

                        {/* Tax ID */}
                        {vendor.tax_id && (
                            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                                <FileText size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Tax ID</p>
                                    <p className="text-lg font-semibold text-slate-800">{vendor.tax_id}</p>
                                </div>
                            </div>
                        )}

                        {(vendor.bank_name || vendor.rib) && (
                            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <Landmark size={20} className="text-blue-600 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Bank Payment Details</p>
                                    {vendor.bank_name && (
                                        <div className="flex items-center space-x-2 mt-1">
                                            <BankLogo
                                                bankName={vendor.bank_name}
                                                size={24}
                                                className="border-blue-100"
                                            />
                                            <p className="text-base font-semibold text-blue-900">{vendor.bank_name}</p>
                                        </div>
                                    )}
                                    {vendor.rib && (
                                        <p className="text-sm font-mono text-blue-800 mt-1">RIB: {vendor.rib}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Status */}
                        <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                            {vendor.is_active ? (
                                <CheckCircle size={20} className="text-green-600 mt-1 flex-shrink-0" />
                            ) : (
                                <XCircle size={20} className="text-red-600 mt-1 flex-shrink-0" />
                            )}
                            <div>
                                <p className="text-sm font-medium text-slate-500">Status</p>
                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold mt-1 ${
                                    vendor.is_active 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    {vendor.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                            <FileText size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-slate-500">Billing Frequency</p>
                                <p className="text-lg font-semibold text-slate-800">
                                    {vendor.billing_frequency === 'twice_weekly' ? 'Twice weekly' : 'Weekly'}
                                </p>
                            </div>
                        </div>

                        {/* Created Date */}
                        <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl">
                            <Calendar size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-slate-500">Seller Since</p>
                                <p className="text-lg font-semibold text-slate-800">{formatDate(vendor.created_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">Statistics</h2>
                        
                        <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
                                <div className="flex items-center justify-between mb-2">
                                    <Package size={24} className="text-orange-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-600">Total Products</p>
                                <p className="text-3xl font-bold text-orange-600 mt-1">{vendor.products_count || 0}</p>
                            </div>

                            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                <div className="flex items-center justify-between mb-2">
                                    <DollarSign size={24} className="text-green-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-600">Total Sales</p>
                                <p className="text-3xl font-bold text-green-600 mt-1">
                                    {formatCurrency(parseFloat(vendor.total_sales || 0))}
                                </p>
                            </div>
                        </div>
                    </div>

                    {billing && (
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Commission Billing</h2>
                                    <p className="text-sm text-slate-500 mt-1">How much this seller will receive after commission.</p>
                                </div>
                                <FileText size={24} className="text-orange-500" />
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <DollarSign size={24} className="text-emerald-600" />
                                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                            {billing.unpaid_orders_count || 0} unpaid orders
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">What Seller Will Get</p>
                                    <p className="text-3xl font-bold text-emerald-700 mt-1">
                                        {formatCurrency(billing.estimated_payout || 0)}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Delivered Sales</p>
                                        <p className="text-lg font-bold text-slate-800 mt-2">
                                            {formatCurrency(billing.gross_sales || 0)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                        <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Platform Commission</p>
                                        <p className="text-lg font-bold text-amber-800 mt-2">
                                            {formatCurrency(billing.commission_amount || 0)}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Billing cadence</span>
                                        <span className="font-semibold text-slate-900">{billing.billing_frequency_label || 'Weekly'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Commission rate</span>
                                        <span className="font-semibold text-slate-900">{Number(billing.commission_rate || 0).toFixed(2)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Open billing reports</span>
                                        <span className="font-semibold text-slate-900">{billing.open_invoices || 0}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-semibold text-orange-900">Latest Billing Report</p>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                            billing.latest_invoice?.status === 'paid'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {billing.latest_invoice?.status === 'paid' ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>

                                    {billing.latest_invoice ? (
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-600">Period</span>
                                                <span className="font-semibold text-slate-900">
                                                    {formatShortDate(billing.latest_invoice.period_start)} - {formatShortDate(billing.latest_invoice.period_end)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-600">Payout</span>
                                                <span className="font-semibold text-emerald-700">
                                                    {formatCurrency(billing.latest_invoice.settlement_amount || 0)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-600">Generated</span>
                                                <span className="font-semibold text-slate-900">
                                                    {formatShortDate(billing.latest_invoice.generated_at)}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-600">No billing report generated yet for this seller.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Products */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Products</h2>
                
                {products.length === 0 ? (
                    <div className="text-center py-12">
                        <Package size={48} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No products yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {products.map((product) => (
                            <Link
                                key={product.id}
                                to={appPath(`/products/${product.id}`)}
                                className="bg-slate-50 rounded-xl p-4 hover:shadow-md transition-all border border-slate-200 hover:border-orange-300"
                            >
                                {product.image_url && (
                                    <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-full h-32 object-cover rounded-lg mb-3"
                                    />
                                )}
                                <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2">
                                    {product.name}
                                </h3>
                                <p className="text-sm text-slate-500 mb-2">SKU: {product.sku}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-orange-600">
                                        {formatCurrency(product.price)}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Stock: {product.stock}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
