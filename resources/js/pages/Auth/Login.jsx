import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, AlertCircle, Key, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const fillSuperAdminCredentials = () => {
        setEmail('superadmin@ecommerce.com');
        setPassword('SuperAdmin@2026');
        setError('');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Welcome Back</h1>
                <p className="text-slate-500 mt-2">Sign in to your admin account</p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center text-rose-700 animate-shake">
                    <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center mr-3">
                        <AlertCircle size={20} />
                    </div>
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-slate-700 placeholder-slate-400"
                            placeholder="Enter your email"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-slate-700 placeholder-slate-400"
                            placeholder="Enter your password"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 flex items-center justify-center space-x-2 group"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Signing in...</span>
                        </>
                    ) : (
                        <>
                            <span>Sign In</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            {/* Demo Credentials */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-500">Demo Access</span>
                </div>
            </div>

            <button
                type="button"
                onClick={fillSuperAdminCredentials}
                className="w-full bg-gradient-to-r from-slate-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50 border-2 border-blue-200 hover:border-blue-300 rounded-xl p-5 text-left transition-all duration-200 hover:shadow-lg group"
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <Sparkles className="text-white" size={22} />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="font-bold text-slate-800">Super Admin</span>
                                <span className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-0.5 rounded-full font-medium">Full Access</span>
                            </div>
                            <p className="text-sm text-slate-500">superadmin@ecommerce.com</p>
                        </div>
                    </div>
                    <div className="text-blue-500 group-hover:translate-x-1 transition-transform">
                        <ArrowRight size={20} />
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-3 pl-15">Click to auto-fill demo credentials</p>
            </button>
        </div>
    );
}
