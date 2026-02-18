import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { 
    Plus, Search, Edit2, Trash2, X, Check, DollarSign, 
    Calendar, FileText, User, TrendingUp, TrendingDown,
    Receipt, Download, Filter, Tag
} from 'lucide-react';

export default function ExpenseList() {
    const { formatCurrency, settings } = useSettings();
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [filterCategory, setFilterCategory] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [formData, setFormData] = useState({
        expense_category_id: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        receipt: null
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchExpenses();
        fetchCategories();
    }, [filterCategory, dateFrom, dateTo]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterCategory) params.category_id = filterCategory;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            
            const response = await api.get('/expenses', { params });
            setExpenses(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/expense-categories');
            setCategories(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            const submitData = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== '') {
                    submitData.append(key, formData[key]);
                }
            });

            if (editingExpense) {
                await api.post(`/expenses/${editingExpense.id}`, submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/expenses', submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            
            fetchExpenses();
            handleCloseModal();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            console.error('Error saving expense:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setFormData({
            expense_category_id: expense.expense_category_id,
            amount: expense.amount,
            expense_date: expense.expense_date,
            description: expense.description || '',
            receipt: null
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;

        try {
            await api.delete(`/expenses/${id}`);
            fetchExpenses();
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Failed to delete expense.');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingExpense(null);
        setFormData({
            expense_category_id: '',
            amount: '',
            expense_date: new Date().toISOString().split('T')[0],
            description: '',
            receipt: null
        });
        setErrors({});
    };

    const stats = {
        total: expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
        count: expenses.length,
        thisMonth: expenses.filter(e => {
            const expenseDate = new Date(e.expense_date);
            const now = new Date();
            return expenseDate.getMonth() === now.getMonth() && 
                   expenseDate.getFullYear() === now.getFullYear();
        }).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
        byCategory: categories.map(cat => ({
            name: cat.name,
            total: expenses
                .filter(e => e.expense_category_id === cat.id)
                .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
        })).filter(c => c.total > 0)
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                        Expense Management
                    </h1>
                    <p className="text-slate-600 mt-1">Track and manage business expenses</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold shadow-lg shadow-red-500/30 transition-all flex items-center justify-center space-x-2"
                >
                    <Plus size={20} />
                    <span>Add Expense</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Expenses</p>
                            <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(stats.total)}</p>
                            <p className="text-xs text-slate-500 mt-1">{stats.count} transactions</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <DollarSign size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">This Month</p>
                            <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(stats.thisMonth)}</p>
                            <p className="text-xs text-slate-500 mt-1">Current period</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                            <Calendar size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Categories</p>
                            <p className="text-3xl font-bold text-slate-800 mt-2">{categories.length}</p>
                            <p className="text-xs text-slate-500 mt-1">Expense types</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Tag size={28} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">From Date</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">To Date</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Expenses List */}
            {loading && expenses.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-slate-600 mt-4">Loading expenses...</p>
                </div>
            ) : expenses.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Receipt size={40} className="text-red-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No expenses found</h3>
                    <p className="text-slate-500 mb-6">Start tracking your business expenses</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-medium transition-all"
                    >
                        <Plus size={18} />
                        <span>Add Expense</span>
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Date</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Category</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Description</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Amount</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Added By</th>
                                    <th className="text-center py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {expenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center space-x-2">
                                                <Calendar size={16} className="text-slate-400" />
                                                <span className="text-sm font-medium text-slate-700">
                                                    {new Date(expense.expense_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-purple-100 text-purple-700">
                                                {expense.category?.name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm text-slate-700 line-clamp-2">
                                                {expense.description || 'No description'}
                                            </p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-lg font-bold text-red-600">
                                                {formatCurrency(parseFloat(expense.amount))}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                                    {expense.user?.name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <span className="text-sm text-slate-600">{expense.user?.name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center space-x-2">
                                                {expense.receipt_path && (
                                                    <a
                                                        href={`/storage/${expense.receipt_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                        title="View Receipt"
                                                    >
                                                        <Receipt size={18} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(expense)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-2xl">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                                    <Receipt size={20} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800">
                                    {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                                </h2>
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
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                                    <div className="flex items-start">
                                        <X className="h-5 w-5 text-red-400 mt-0.5" />
                                        <div className="ml-3">
                                            <h3 className="text-sm font-semibold text-red-800">Validation Errors</h3>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Category *
                                    </label>
                                    <select
                                        value={formData.expense_category_id}
                                        onChange={(e) => setFormData({ ...formData, expense_category_id: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white"
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                    {errors.expense_category_id && (
                                        <p className="text-red-500 text-xs mt-1.5">⚠ {errors.expense_category_id[0]}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Amount *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{settings.currency_symbol}</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    {errors.amount && (
                                        <p className="text-red-500 text-xs mt-1.5">⚠ {errors.amount[0]}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.expense_date}
                                        onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                        required
                                    />
                                    {errors.expense_date && (
                                        <p className="text-red-500 text-xs mt-1.5">⚠ {errors.expense_date[0]}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Receipt
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => setFormData({ ...formData, receipt: e.target.files[0] })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                    />
                                    <p className="text-xs text-slate-500 mt-1.5">Upload receipt (Max 5MB)</p>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows="3"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                                        placeholder="Add notes about this expense..."
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
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
                                    className="px-8 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 disabled:from-slate-400 disabled:to-slate-500 font-semibold shadow-lg shadow-red-500/30 transition-all disabled:shadow-none flex items-center space-x-2"
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
                                            <span>{editingExpense ? 'Update Expense' : 'Add Expense'}</span>
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
