import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';
import { useSettings } from '../../contexts/SettingsContext';
import { MOROCCAN_BANKS } from '../../constants/moroccanBanks';
import BankLogo from '../../components/BankLogo';
import { 
    Plus, Search, Edit2, Trash2, X, Check, Store, 
    Mail, Phone, MapPin, DollarSign, Package, 
    Building2, AlertCircle, TrendingUp, FileText, Landmark
} from 'lucide-react';

export default function VendorList() {
    const { t } = useTranslation();
    const { formatCurrency } = useSettings();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(15);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
        from: 0,
        to: 0,
    });
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        totalSales: 0,
    });
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        company_name: '',
        billing_frequency: 'weekly',
        bank_name: '',
        rib: '',
        password: '',
        password_confirmation: '',
        is_active: true
    });
    const [errors, setErrors] = useState({});
    const [bankSearch, setBankSearch] = useState('');

    useEffect(() => {
        fetchVendors();
    }, [searchTerm, filterStatus, currentPage, perPage]);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const params = {
                search: searchTerm || undefined,
                page: currentPage,
                per_page: perPage,
            };
            
            if (filterStatus === 'active') params.is_active = 1;
            if (filterStatus === 'inactive') params.is_active = 0;
            
            const response = await api.get('/vendors', { params });
            const payload = response.data;
            setVendors(payload.data || payload);
            setPagination({
                current_page: payload.current_page || 1,
                last_page: payload.last_page || 1,
                per_page: payload.per_page || perPage,
                total: payload.total || 0,
                from: payload.from || 0,
                to: payload.to || 0,
            });
            if (payload.stats) {
                setStats({
                    total: payload.stats.total || 0,
                    active: payload.stats.active || 0,
                    inactive: payload.stats.inactive || 0,
                    totalSales: parseFloat(payload.stats.total_sales) || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        // Basic frontend validation for common typos
        if (formData.email.match(/\.([a-z]{2,})\.\1$/i)) {
            setErrors({ email: ['The email address contains a repeated extension (e.g., .com.com).'] });
            return;
        }
        if (formData.email.includes('..')) {
            setErrors({ email: ['The email address cannot contain consecutive dots.'] });
            return;
        }

        setLoading(true);

        try {
            if (editingVendor) {
                await api.put(`/vendors/${editingVendor.id}`, formData);
            } else {
                await api.post('/vendors', formData);
                setCurrentPage(1);
            }
            
            await fetchVendors();
            handleCloseModal();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            console.error('Error saving vendor:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (vendor) => {
        setEditingVendor(vendor);
        setFormData({
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone || '',
            address: vendor.address || '',
            company_name: vendor.company_name || '',
            billing_frequency: vendor.billing_frequency || 'weekly',
            bank_name: vendor.bank_name || '',
            rib: vendor.rib || '',
            password: '',
            password_confirmation: '',
            is_active: vendor.is_active
        });
        setBankSearch(vendor.bank_name || '');
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this vendor?')) return;

        try {
            await api.delete(`/vendors/${id}`);
            fetchVendors();
        } catch (error) {
            console.error('Error deleting vendor:', error);
            alert('Failed to delete vendor. They may have associated products or orders.');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingVendor(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            address: '',
            company_name: '',
            billing_frequency: 'weekly',
            bank_name: '',
            rib: '',
            password: '',
            password_confirmation: '',
            is_active: true
        });
        setBankSearch('');
        setErrors({});
    };

    const filteredVendors = vendors;
    const filteredBanks = MOROCCAN_BANKS.filter((bank) =>
        bank.name.toLowerCase().includes(bankSearch.toLowerCase())
    );
    const formatRibInput = (value) => {
        const digitsOnly = value.replace(/\D/g, '').slice(0, 34);
        return digitsOnly.replace(/(.{4})/g, '$1 ').trim();
    };

    const goToPage = (page) => {
        if (page < 1 || page > pagination.last_page || page === currentPage) return;
        setCurrentPage(page);
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        {t('admin.vendors.title')}
                    </h1>
                    <p className="text-slate-600 mt-1">{t('admin.vendors.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 font-semibold shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center space-x-2"
                >
                    <Plus size={20} />
                    <span>{t('admin.vendors.addVendor')}</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">{t('admin.vendors.totalVendors')}</p>
                            <p className="text-3xl font-bold text-slate-800 mt-2">{stats.total}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                            <Store size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">{t('admin.vendors.activeVendors')}</p>
                            <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.active}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">{t('admin.common.inactive')}</p>
                            <p className="text-3xl font-bold text-slate-600 mt-2">{stats.inactive}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center">
                            <AlertCircle size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">{t('admin.vendors.totalSales')}</p>
                            <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(stats.totalSales)}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <DollarSign size={28} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or company..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setFilterStatus('all');
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'all'
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => {
                                setFilterStatus('active');
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'active'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => {
                                setFilterStatus('inactive');
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                filterStatus === 'inactive'
                                    ? 'bg-slate-600 text-white shadow-lg shadow-slate-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>
            </div>

            {/* Vendors List */}
            {loading && vendors.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="text-slate-600 mt-4">Loading sellers...</p>
                </div>
            ) : filteredVendors.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Store size={40} className="text-orange-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No sellers found</h3>
                    <p className="text-slate-500 mb-6">
                        {searchTerm ? 'Try a different search term' : 'Get started by adding your first seller'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 font-medium transition-all"
                        >
                            <Plus size={18} />
                            <span>Add Seller</span>
                        </button>
                    )}
                </div>
            ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVendors.map((vendor) => (
                        <div
                            key={vendor.id}
                            className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all group"
                        >
                            {/* Vendor Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                                        {vendor.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{vendor.name}</h3>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium mt-1 ${
                                            vendor.is_active 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {vendor.is_active ? '● Active' : '○ Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Company Info */}
                            {vendor.company_name && (
                                <div className="mb-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
                                    <div className="flex items-center space-x-2">
                                        <Building2 size={16} className="text-orange-600 flex-shrink-0" />
                                        <span className="text-sm font-semibold text-orange-900">{vendor.company_name}</span>
                                    </div>
                                </div>
                            )}

                            <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center space-x-2 text-sm text-slate-700">
                                    <FileText size={16} className="text-slate-500 flex-shrink-0" />
                                    <span className="font-medium">
                                        Billing cadence: {vendor.billing_frequency === 'twice_weekly' ? 'Twice weekly' : 'Weekly'}
                                    </span>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-3 mb-4">
                                {vendor.email && (
                                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <Mail size={16} className="text-orange-500 flex-shrink-0" />
                                        <span className="truncate">{vendor.email}</span>
                                    </div>
                                )}
                                {vendor.phone && (
                                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <Phone size={16} className="text-orange-500 flex-shrink-0" />
                                        <span>{vendor.phone}</span>
                                    </div>
                                )}
                                {vendor.address && (
                                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <MapPin size={16} className="text-orange-500 flex-shrink-0" />
                                        <span className="truncate">{vendor.address}</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
                                <div>
                                    <p className="text-xs text-slate-500">Products</p>
                                    <p className="text-lg font-bold text-slate-800">{vendor.products_count || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Total Sales</p>
                                    <p className="text-lg font-bold text-orange-600">{formatCurrency(parseFloat(vendor.total_sales || 0))}</p>
                                </div>
                            </div>

                            {/* Tax ID */}
                            {vendor.tax_id && (
                                <div className="mb-4">
                                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                                        <FileText size={14} />
                                        <span>Tax ID: {vendor.tax_id}</span>
                                    </div>
                                </div>
                            )}

                            {(vendor.bank_name || vendor.rib) && (
                                <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                                    {vendor.bank_name && (
                                        <div className="flex items-center space-x-2 text-sm text-blue-900">
                                            <Landmark size={14} className="text-blue-600 flex-shrink-0" />
                                            <BankLogo
                                                bankName={vendor.bank_name}
                                                size={20}
                                                className="border-blue-100"
                                            />
                                            <span className="font-semibold">{vendor.bank_name}</span>
                                        </div>
                                    )}
                                    {vendor.rib && (
                                        <div className="flex items-center space-x-2 text-xs text-blue-700">
                                            <FileText size={13} className="flex-shrink-0" />
                                            <span className="font-mono tracking-wide">RIB: {vendor.rib}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center space-x-2 pt-4 border-t border-slate-200">
                                <Link
                                    to={appPath(`/vendors/${vendor.id}`)}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all text-center text-sm"
                                >
                                    View Details
                                </Link>
                                <button
                                    onClick={() => handleEdit(vendor)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Edit"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(vendor.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {pagination.last_page > 1 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-600">
                            Showing {pagination.from}-{pagination.to} of {pagination.total} sellers
                        </span>
                        <div className="flex gap-2 flex-wrap justify-center">
                            <button
                                onClick={() => goToPage(pagination.current_page - 1)}
                                disabled={pagination.current_page === 1}
                                className={`px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                                    pagination.current_page === 1
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
                                }`}
                            >
                                ◀ Previous
                            </button>
                            {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                                .filter(
                                    (page) =>
                                        page === 1 ||
                                        page === pagination.last_page ||
                                        (page >= pagination.current_page - 1 && page <= pagination.current_page + 1)
                                )
                                .map((page, index, array) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="px-2 text-slate-400">•••</span>
                                        )}
                                        <button
                                            onClick={() => goToPage(page)}
                                            className={`px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                                                pagination.current_page === page
                                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30'
                                                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                ))}
                            <button
                                onClick={() => goToPage(pagination.current_page + 1)}
                                disabled={pagination.current_page === pagination.last_page}
                                className={`px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                                    pagination.current_page === pagination.last_page
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
                                }`}
                            >
                                Next ▶
                            </button>
                        </div>
                    </div>
                )}
                </>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto border border-slate-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-2xl">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                                    <Store size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">
                                        {editingVendor ? 'Edit Seller' : 'Create New Seller'}
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Profile, login access, and payout information
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Error Display */}
                            {Object.keys(errors).length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-start">
                                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                                        <div className="ml-3">
                                            <h3 className="text-sm font-semibold text-red-800">Please fix these fields</h3>
                                            <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                                                {Object.entries(errors).map(([field, messages]) => (
                                                    <li key={field}>
                                                        <strong>{field}:</strong> {Array.isArray(messages) ? messages[0] : messages}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Basic Information */}
                            <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                                    <Store size={20} className="text-orange-600" />
                                    <span>Basic Information</span>
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Contact Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder="John Doe"
                                            required
                                        />
                                        {errors.name && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center">
                                                <span className="mr-1">⚠</span>{errors.name[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.company_name}
                                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder="ABC Suppliers Inc."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder="vendor@example.com"
                                            required
                                        />
                                        {errors.email && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center">
                                                <span className="mr-1">⚠</span>{errors.email[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Billing Frequency
                                        </label>
                                        <select
                                            value={formData.billing_frequency}
                                            onChange={(e) => setFormData({ ...formData, billing_frequency: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                        >
                                            <option value="weekly">Weekly</option>
                                            <option value="twice_weekly">Twice weekly</option>
                                        </select>
                                        <p className="text-xs text-slate-500 mt-1.5">
                                            Weekly sellers get one settlement window. Twice-weekly sellers are billed in two windows per week.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Login Credentials */}
                            <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                    <span>Login Credentials</span>
                                </h3>
                                
                                {!editingVendor && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                        <p className="text-sm text-blue-800">
                                            <strong>Note:</strong> The seller will be able to login to the system using their email and password.
                                        </p>
                                    </div>
                                )}

                                {editingVendor && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                        <p className="text-sm text-amber-800">
                                            <strong>Note:</strong> Leave password fields empty to keep the current password.
                                        </p>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Password {!editingVendor && '*'}
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder={editingVendor ? "Leave empty to keep current" : "Enter password"}
                                            required={!editingVendor}
                                            minLength="8"
                                        />
                                        {errors.password && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center">
                                                <span className="mr-1">⚠</span>{errors.password[0]}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Confirm Password {!editingVendor && '*'}
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password_confirmation}
                                            onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder={editingVendor ? "Leave empty to keep current" : "Confirm password"}
                                            required={!editingVendor}
                                        />
                                        {errors.password_confirmation && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center">
                                                <span className="mr-1">⚠</span>{errors.password_confirmation[0]}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Address Information */}
                            <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                                    <MapPin size={20} className="text-orange-600" />
                                    <span>Address Information</span>
                                </h3>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Address
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        rows="3"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                                        placeholder="123 Business Street, City, State, ZIP"
                                    />
                                </div>
                            </div>

                            {/* Bank Information */}
                            <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                                    <Landmark size={20} className="text-orange-600" />
                                    <span>Bank Information</span>
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Search Bank (Morocco)
                                        </label>
                                        <input
                                            type="text"
                                            value={bankSearch}
                                            onChange={(e) => setBankSearch(e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder="Type to search banks..."
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-semibold text-slate-700">
                                                Select Bank
                                            </label>
                                            {formData.bank_name && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, bank_name: '' });
                                                        setBankSearch('');
                                                    }}
                                                    className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
                                                >
                                                    Clear selection
                                                </button>
                                            )}
                                        </div>
                                        {formData.bank_name && (
                                            <div className="mb-2 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-100 border border-orange-200">
                                                <BankLogo bankName={formData.bank_name} size={18} />
                                                <span className="text-xs font-semibold text-orange-900">{formData.bank_name}</span>
                                            </div>
                                        )}
                                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                                            {filteredBanks.length > 0 ? (
                                                filteredBanks.map((bank) => (
                                                    <button
                                                        key={bank.name}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, bank_name: bank.name });
                                                            setBankSearch(bank.name);
                                                        }}
                                                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all ${
                                                            formData.bank_name === bank.name
                                                                ? 'bg-orange-100 border border-orange-300'
                                                                : 'hover:bg-slate-100 border border-transparent'
                                                        }`}
                                                    >
                                                        <BankLogo
                                                            bankName={bank.name}
                                                            logoUrl={bank.logo}
                                                            size={28}
                                                            className="flex-shrink-0"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">{bank.name}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="text-sm text-slate-500 px-2 py-1">No banks found for this search.</p>
                                            )}
                                        </div>
                                        {errors.bank_name && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center">
                                                <span className="mr-1">⚠</span>{errors.bank_name[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            RIB
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.rib}
                                            onChange={(e) => setFormData({ ...formData, rib: formatRibInput(e.target.value) })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-mono"
                                            placeholder="Type seller RIB (numbers only)"
                                        />
                                        {errors.rib && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center">
                                                <span className="mr-1">⚠</span>{errors.rib[0]}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-xs text-slate-500">When RIB is entered, a bank must be selected.</p>
                                            <p className="text-xs text-slate-500">{formData.rib.replace(/\s/g, '').length}/34</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                                <label className="flex items-center cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-emerald-500 transition-all"></div>
                                        <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all peer-checked:translate-x-7"></div>
                                    </div>
                                    <div className="ml-4">
                                        <span className="text-sm font-semibold text-slate-700">Active Status</span>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {formData.is_active ? 'Vendor is active and can receive orders' : 'Vendor is inactive'}
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 sticky bottom-0 bg-white pb-1">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2.5 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 disabled:from-slate-400 disabled:to-slate-500 font-semibold shadow-lg shadow-orange-500/30 transition-all disabled:shadow-none flex items-center space-x-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={20} />
                                            <span>{editingVendor ? 'Update Seller' : 'Create Seller'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
