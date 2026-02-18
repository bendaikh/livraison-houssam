import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { Shield, Save, X, Plus, Trash2 } from 'lucide-react';

export default function RoleForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        permissions: []
    });
    const [errors, setErrors] = useState({});
    const [newPermission, setNewPermission] = useState('');

    // Available permissions list
    const availablePermissions = [
        'manage_products',
        'view_products',
        'manage_orders',
        'view_orders',
        'confirm_orders',
        'update_order_status',
        'manage_clients',
        'view_clients',
        'manage_vendors',
        'view_vendors',
        'manage_expenses',
        'view_expenses',
        'manage_stock',
        'view_stock',
        'manage_users',
        'view_users',
        'manage_roles',
        'view_roles',
        'manage_settings',
        'view_settings',
        'view_dashboard',
        'manage_api_integrations',
        'view_api_integrations',
        'view_reports',
        'manage_categories',
        'view_categories',
        'delete_anything',
        'access_everything',
        'view_assigned_orders',
        'update_delivery_status',
    ];

    useEffect(() => {
        if (isEditing) {
            fetchRole();
        }
    }, [id]);

    const fetchRole = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/roles/${id}`);
            setFormData({
                name: response.data.name || '',
                slug: response.data.slug || '',
                description: response.data.description || '',
                permissions: response.data.permissions || []
            });
        } catch (error) {
            console.error('Error fetching role:', error);
            alert('Error fetching role details');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            if (isEditing) {
                await api.put(`/roles/${id}`, formData);
            } else {
                await api.post('/roles', formData);
            }
            navigate('/roles');
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                alert('Error saving role');
            }
            console.error('Error saving role:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNameChange = (name) => {
        setFormData({ 
            ...formData, 
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
        });
    };

    const addPermission = (permission) => {
        if (!formData.permissions.includes(permission)) {
            setFormData({
                ...formData,
                permissions: [...formData.permissions, permission]
            });
        }
    };

    const removePermission = (permission) => {
        setFormData({
            ...formData,
            permissions: formData.permissions.filter(p => p !== permission)
        });
    };

    const addCustomPermission = () => {
        if (newPermission && !formData.permissions.includes(newPermission)) {
            setFormData({
                ...formData,
                permissions: [...formData.permissions, newPermission]
            });
            setNewPermission('');
        }
    };

    if (loading && isEditing) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isEditing ? 'Edit Role' : 'Create Role'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isEditing ? 'Update role details and permissions' : 'Create a new role with specific permissions'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/roles')}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    <X size={20} />
                    <span>Cancel</span>
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Sales Manager"
                                required
                            />
                            {errors.name && (
                                <p className="text-red-500 text-sm mt-1">{errors.name[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Slug *
                            </label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                                placeholder="e.g., sales_manager"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Auto-generated from name. Used internally to identify the role.
                            </p>
                            {errors.slug && (
                                <p className="text-red-500 text-sm mt-1">{errors.slug[0]}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Brief description of this role's responsibilities"
                            />
                            {errors.description && (
                                <p className="text-red-500 text-sm mt-1">{errors.description[0]}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h2>
                    
                    {/* Selected Permissions */}
                    {formData.permissions.length > 0 && (
                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                                Selected Permissions ({formData.permissions.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {formData.permissions.map((permission) => (
                                    <span
                                        key={permission}
                                        className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                    >
                                        <span>{permission}</span>
                                        <button
                                            type="button"
                                            onClick={() => removePermission(permission)}
                                            className="hover:text-blue-900"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Available Permissions */}
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                            Available Permissions
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                            {availablePermissions
                                .filter(p => !formData.permissions.includes(p))
                                .map((permission) => (
                                    <button
                                        key={permission}
                                        type="button"
                                        onClick={() => addPermission(permission)}
                                        className="text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm transition-colors"
                                    >
                                        {permission}
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Custom Permission */}
                    <div className="border-t border-gray-200 pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                            Add Custom Permission
                        </p>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={newPermission}
                                onChange={(e) => setNewPermission(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., custom_permission"
                            />
                            <button
                                type="button"
                                onClick={addCustomPermission}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <Plus size={20} />
                                <span>Add</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => navigate('/roles')}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={20} />
                        <span>{loading ? 'Saving...' : (isEditing ? 'Update Role' : 'Create Role')}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
