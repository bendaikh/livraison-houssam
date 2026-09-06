import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Save, AlertCircle, CheckCircle2, Loader2,
    User, Key, Eye, EyeOff, Mail
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
    const { t } = useTranslation();
    const { user, updateUser } = useAuth();
    const [message, setMessage] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [profileForm, setProfileForm] = useState({
        email: '',
        name: '',
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });

    useEffect(() => {
        if (user) {
            setProfileForm((prev) => ({
                ...prev,
                email: user.email || '',
                name: user.name || '',
            }));
        }
    }, [user]);

    const handleProfileChange = (key, value) => {
        setProfileForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        try {
            setSavingProfile(true);
            const response = await api.put('/profile', profileForm);
            updateUser(response.data.user);
            setMessage({
                type: 'success',
                text: t('admin.settings.profileUpdated') || 'Profile updated successfully!',
            });
            setProfileForm((prev) => ({
                ...prev,
                current_password: '',
                new_password: '',
                new_password_confirmation: '',
            }));
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            const errorMessage = error.response?.data?.message
                || error.response?.data?.errors?.current_password?.[0]
                || error.response?.data?.errors?.email?.[0]
                || error.response?.data?.errors?.name?.[0]
                || error.response?.data?.errors?.new_password?.[0]
                || t('admin.settings.profileUpdateFailed')
                || 'Failed to update profile';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setSavingProfile(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    {t('admin.settings.profileSettings') || 'Profile Settings'}
                </h1>
                <p className="mt-1 text-gray-600">
                    {t('admin.settings.profileDescription') || 'Update your name, email address and password'}
                </p>
            </div>

            {message && (
                <div className={`flex items-center space-x-3 rounded-xl border p-4 ${
                    message.type === 'success'
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle2 size={20} className="text-green-600" />
                    ) : (
                        <AlertCircle size={20} className="text-red-600" />
                    )}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleProfileSubmit} className="rounded-xl bg-white p-8 shadow-sm">
                <div className="space-y-6">
                    <div className="flex items-center space-x-3 border-b border-gray-200 pb-4">
                        <div className="rounded-xl bg-indigo-100 p-3">
                            <User className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {t('admin.settings.profile') || 'Profile'}
                            </h2>
                            <p className="text-sm text-gray-600">
                                {t('admin.settings.profileDescription') || 'Update your email address and password'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                {t('admin.settings.name') || 'Name'}
                            </label>
                            <input
                                type="text"
                                value={profileForm.name}
                                onChange={(e) => handleProfileChange('name', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                placeholder={t('admin.settings.namePlaceholder') || 'Your name'}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-2 flex items-center space-x-2 text-sm font-semibold text-gray-700">
                                <Mail size={16} />
                                <span>{t('auth.login.email') || 'Email Address'}</span>
                            </label>
                            <input
                                type="email"
                                value={profileForm.email}
                                onChange={(e) => handleProfileChange('email', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                placeholder={t('admin.settings.emailPlaceholder') || 'your@email.com'}
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {t('admin.settings.emailHint') || 'This is used for login and notifications'}
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                        <div className="mb-6 flex items-center space-x-3">
                            <div className="rounded-lg bg-amber-100 p-2">
                                <Key className="text-amber-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {t('admin.settings.changePassword') || 'Change Password'}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {t('admin.settings.changePasswordHint') || 'Leave blank to keep current password'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    {t('admin.settings.currentPassword') || 'Current Password'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={profileForm.current_password}
                                        onChange={(e) => handleProfileChange('current_password', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pe-12 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute inset-y-0 end-0 flex items-center pe-4 text-gray-400 hover:text-gray-600"
                                    >
                                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        {t('admin.settings.newPassword') || 'New Password'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={profileForm.new_password}
                                            onChange={(e) => handleProfileChange('new_password', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pe-12 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                            placeholder="••••••••"
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute inset-y-0 end-0 flex items-center pe-4 text-gray-400 hover:text-gray-600"
                                        >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {t('admin.settings.passwordMinLength') || 'Minimum 8 characters'}
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        {t('admin.settings.confirmPassword') || 'Confirm New Password'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={profileForm.new_password_confirmation}
                                            onChange={(e) => handleProfileChange('new_password_confirmation', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pe-12 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                            placeholder="••••••••"
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 end-0 flex items-center pe-4 text-gray-400 hover:text-gray-600"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end border-t border-gray-200 pt-6">
                        <button
                            type="submit"
                            disabled={savingProfile}
                            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-white shadow-lg transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {savingProfile ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>{t('admin.common.saving') || 'Saving...'}</span>
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    <span>{t('admin.settings.updateProfile') || 'Update Profile'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
