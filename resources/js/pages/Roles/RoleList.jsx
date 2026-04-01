import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { appPath } from '../../constants/appPaths';
import { Shield, Plus, Edit, Trash2, Users, CheckCircle } from 'lucide-react';

export default function RoleList() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const response = await api.get('/roles');
            setRoles(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('admin.roles.deleteConfirm'))) return;

        try {
            await api.delete(`/roles/${id}`);
            fetchRoles();
        } catch (error) {
            console.error('Error deleting role:', error);
            alert(t('admin.roles.deleteFailed'));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('admin.roles.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('admin.roles.subtitle')}</p>
                </div>
                <button
                    onClick={() => navigate(appPath('/roles/create'))}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    <span>{t('admin.roles.addRole')}</span>
                </button>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => (
                    <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        {/* Role Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                    <Shield className="text-white" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                                    <p className="text-sm text-gray-500">{role.slug}</p>
                                </div>
                            </div>
                        </div>

                        {/* Role Description */}
                        {role.description && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                {role.description}
                            </p>
                        )}

                        {/* Permissions Count */}
                        <div className="flex items-center space-x-2 mb-4 text-sm">
                            <CheckCircle size={16} className="text-green-500" />
                            <span className="text-gray-600">
                                {Array.isArray(role.permissions) ? role.permissions.length : 0} {t('admin.roles.permissions')}
                            </span>
                        </div>

                        {/* Users Count */}
                        <div className="flex items-center space-x-2 mb-4 text-sm">
                            <Users size={16} className="text-blue-500" />
                            <span className="text-gray-600">
                                {role.users_count || 0} {t('admin.roles.users')}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => navigate(appPath(`/roles/${role.id}/edit`))}
                                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Edit size={16} />
                                <span>{t('admin.common.edit')}</span>
                            </button>
                            <button
                                onClick={() => handleDelete(role.id)}
                                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                disabled={['admin', 'superadmin'].includes(role.slug)}
                            >
                                <Trash2 size={16} />
                                <span>{t('admin.common.delete')}</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {roles.length === 0 && (
                <div className="text-center py-12">
                    <Shield className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-500 text-lg">{t('admin.roles.noRoles')}</p>
                    <button
                        onClick={() => navigate(appPath('/roles/create'))}
                        className="mt-4 text-blue-600 hover:text-blue-800"
                    >
                        {t('admin.roles.createFirst')}
                    </button>
                </div>
            )}
        </div>
    );
}
