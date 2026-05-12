import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { Plus, Edit2, Trash2, X, Check, Tag, AlertCircle } from 'lucide-react';

export default function ExpenseCategoryList() {
    const { t } = useTranslation();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await api.get('/expense-categories');
            setCategories(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            if (editingCategory) {
                await api.put(`/expense-categories/${editingCategory.id}`, formData);
            } else {
                await api.post('/expense-categories', formData);
            }
            
            fetchCategories();
            handleCloseModal();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('admin.expenseCategories.deleteConfirm'))) return;

        try {
            await api.delete(`/expense-categories/${id}`);
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert(t('admin.expenseCategories.deleteFailed'));
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCategory(null);
        setFormData({
            name: '',
            description: ''
        });
        setErrors({});
    };

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                        {t('admin.expenseCategories.title')}
                    </h1>
                    <p className="text-slate-600 mt-1">{t('admin.expenseCategories.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold shadow-lg shadow-red-500/30 transition-all flex items-center space-x-2"
                >
                    <Plus size={20} />
                    <span>{t('admin.expenseCategories.addCategory')}</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6">
                <input
                    type="text"
                    placeholder={t('admin.expenseCategories.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && categories.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                        <p className="text-slate-600 mt-4">{t('admin.expenseCategories.loadingCategories')}</p>
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-xl border border-slate-200/50">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Tag size={40} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">{t('admin.expenseCategories.noCategoriesFound')}</h3>
                        <p className="text-slate-500 mb-4">
                            {searchTerm ? t('admin.expenseCategories.tryDifferentSearch') : t('admin.expenseCategories.getStarted')}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-medium transition-all inline-flex items-center space-x-2"
                            >
                                <Plus size={18} />
                                <span>{t('admin.expenseCategories.createCategory')}</span>
                            </button>
                        )}
                    </div>
                ) : (
                    filteredCategories.map((category) => (
                        <div
                            key={category.id}
                            className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                                        <Tag size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{category.name}</h3>
                                    </div>
                                </div>
                            </div>

                            {category.description && (
                                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                    {category.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                <div className="text-xs text-slate-500">
                                    {category.expenses_count || 0} {t('admin.expenseCategories.expenses')}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleEdit(category)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title={t('admin.expenseCategories.edit')}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(category.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title={t('admin.expenseCategories.delete')}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                                    <Tag size={20} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800">
                                    {editingCategory ? t('admin.expenseCategories.editCategory') : t('admin.expenseCategories.createNewCategory')}
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
                                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                                        <div className="ml-3">
                                            <h3 className="text-sm font-semibold text-red-800">{t('admin.expenseCategories.validationErrors')}</h3>
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

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    {t('admin.expenseCategories.categoryName')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                    placeholder={t('admin.expenseCategories.categoryNamePlaceholder')}
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
                                    {t('admin.expenseCategories.description')}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                                    placeholder={t('admin.expenseCategories.descriptionPlaceholder')}
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2.5 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-all"
                                >
                                    {t('admin.expenseCategories.cancel')}
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
                                            <span>{t('admin.expenseCategories.saving')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={20} />
                                            <span>{editingCategory ? t('admin.expenseCategories.updateCategory') : t('admin.expenseCategories.createCategory')}</span>
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
