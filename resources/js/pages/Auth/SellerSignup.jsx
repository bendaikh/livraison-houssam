import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, ArrowLeft, ArrowRight, CheckCircle, Clock, Mail, Phone, Landmark } from 'lucide-react';
import axios from 'axios';
import { MOROCCAN_BANKS } from '../../constants/moroccanBanks';
import BankLogo from '../../components/BankLogo';

export default function SellerSignup() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isRTL = i18n.language === 'ar';
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [bankSearch, setBankSearch] = useState('');
    const [formData, setFormData] = useState({
        // Step 1 fields
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        address: '',
        city: '',
        agree_terms: false,
        // Step 2 fields
        company_name: '',
        seller_level: '',
        bank_name: '',
        rib: ''
    });

    const filteredBanks = useMemo(
        () => MOROCCAN_BANKS.filter((bank) =>
            bank.name.toLowerCase().includes(bankSearch.toLowerCase())
        ),
        [bankSearch]
    );

    const formatRibInput = (value) => {
        const digitsOnly = value.replace(/\D/g, '').slice(0, 34);
        return digitsOnly.replace(/(.{4})/g, '$1 ').trim();
    };

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateStep1 = () => {
        if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.password_confirmation) {
            setError(t('auth.signup.fillAllFields'));
            return false;
        }

        if (formData.password !== formData.password_confirmation) {
            setError(t('auth.signup.passwordMismatch'));
            return false;
        }

        if (!formData.agree_terms) {
            setError(t('auth.signup.agreeToTerms'));
            return false;
        }

        return true;
    };

    const handleNextStep = () => {
        setError('');
        if (validateStep1()) {
            setCurrentStep(2);
        }
    };

    const handlePrevStep = () => {
        setError('');
        setCurrentStep(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (currentStep === 1) {
            handleNextStep();
            return;
        }

        // Step 2 validation
        if (!formData.company_name || !formData.seller_level || !formData.bank_name || !formData.rib) {
            setError(t('auth.signup.fillAllFields'));
            return;
        }

        const ribDigits = formData.rib.replace(/\s/g, '');
        if (ribDigits.length === 0) {
            setError(t('auth.signup.fillAllFields'));
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('/api/seller/register', {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                password_confirmation: formData.password_confirmation,
                address: formData.address,
                city: formData.city,
                company_name: formData.company_name,
                seller_level: formData.seller_level,
                bank_name: formData.bank_name,
                rib: formData.rib
            });

            if (response.data.success) {
                setRegisteredEmail(formData.email);
                setRegistrationSuccess(true);
            }
        } catch (err) {
            setError(err.response?.data?.message || t('auth.signup.errorMessage'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-white ${isRTL ? 'font-arabic' : ''}`}>
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-2 text-gray-700 hover:text-teal-600">
                        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        <span>{t('home.nav.home')}</span>
                    </Link>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <button className="flex items-center gap-2 text-gray-700 hover:text-teal-600 transition">
                                <Globe className="w-5 h-5" />
                                <span className="text-sm font-medium">{i18n.language.toUpperCase()}</span>
                            </button>
                            <div className="absolute top-full mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                <button onClick={() => changeLanguage('ar')} className="block w-full text-start px-4 py-2 text-sm hover:bg-gray-100">العربية</button>
                                <button onClick={() => changeLanguage('fr')} className="block w-full text-start px-4 py-2 text-sm hover:bg-gray-100">Français</button>
                                <button onClick={() => changeLanguage('en')} className="block w-full text-start px-4 py-2 text-sm hover:bg-gray-100">English</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Page */}
            {registrationSuccess ? (
                <div className="py-12 px-4">
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
                            {/* Success Icon */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                                    <CheckCircle className="w-12 h-12 text-green-500" />
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                    {t('auth.signup.successTitle') || 'Registration Successful!'}
                                </h1>
                                <p className="text-lg text-gray-600 mb-8">
                                    {t('auth.signup.pendingApproval') || 'Your seller account has been created successfully.'}
                                </p>
                            </div>

                            {/* Information Cards */}
                            <div className="space-y-4 mb-8">
                                {/* Pending Approval Card */}
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <Clock className="w-8 h-8 text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-amber-900 mb-2">
                                                {t('auth.signup.awaitingApproval') || 'Awaiting Admin Approval'}
                                            </h3>
                                            <p className="text-sm text-amber-800">
                                                {t('auth.signup.approvalMessage') || 'Our team will review your application and approve your account within 24-48 hours. You will receive an email notification once your account is activated.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Email Confirmation Card */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <Mail className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-blue-900 mb-2">
                                                {t('auth.signup.checkEmail') || 'Check Your Email'}
                                            </h3>
                                            <p className="text-sm text-blue-800 mb-2">
                                                {t('auth.signup.emailSentTo') || 'A confirmation email has been sent to:'}
                                            </p>
                                            <p className="text-sm font-semibold text-blue-900">
                                                {registeredEmail}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Support Card */}
                                <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <Phone className="w-8 h-8 text-teal-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-teal-900 mb-2">
                                                {t('auth.signup.needHelp') || 'Need Help?'}
                                            </h3>
                                            <p className="text-sm text-teal-800">
                                                {t('auth.signup.contactSupport') || 'If you have any questions or need assistance, please contact our support team.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Next Steps */}
                            <div className="bg-gray-50 rounded-lg p-6 mb-8">
                                <h3 className="font-semibold text-gray-900 mb-4">
                                    {t('auth.signup.nextSteps') || 'What happens next?'}
                                </h3>
                                <ol className={`space-y-3 ${isRTL ? 'pr-5' : 'pl-5'} list-decimal text-sm text-gray-700`}>
                                    <li>{t('auth.signup.step1Review') || 'Our admin team will review your application and verify your information.'}</li>
                                    <li>{t('auth.signup.step2Approval') || 'Once approved, you will receive an email notification with login instructions.'}</li>
                                    <li>{t('auth.signup.step3Login') || 'You can then log in and start managing your products and orders.'}</li>
                                </ol>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    to="/"
                                    className="flex-1 text-center px-6 py-3 bg-white border-2 border-teal-500 text-teal-600 rounded-lg font-semibold hover:bg-teal-50 transition"
                                >
                                    {t('auth.signup.returnHome') || 'Return to Home'}
                                </Link>
                                <Link
                                    to="/"
                                    className="flex-1 text-center px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-xl transition transform hover:-translate-y-0.5"
                                >
                                    {t('auth.signup.goToLogin') || 'Go to Login'}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Registration Form */
            <div className="py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {t('auth.signup.title')}
                            </h1>
                            <p className="text-gray-600">
                                {t('auth.signup.subtitle')}
                            </p>
                        </div>

                        {/* Step Indicator */}
                        <div className="mb-8">
                            <div className="flex items-center justify-center gap-4">
                                <div className="flex items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep >= 1 ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        {currentStep > 1 ? <CheckCircle className="w-6 h-6" /> : '1'}
                                    </div>
                                    <span className={`ms-2 text-sm font-medium ${currentStep >= 1 ? 'text-teal-600' : 'text-gray-500'}`}>
                                        {t('auth.signup.step1Title')}
                                    </span>
                                </div>
                                <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-teal-500' : 'bg-gray-200'}`}></div>
                                <div className="flex items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep >= 2 ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        2
                                    </div>
                                    <span className={`ms-2 text-sm font-medium ${currentStep >= 2 ? 'text-teal-600' : 'text-gray-500'}`}>
                                        {t('auth.signup.step2Title')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Step 1: Basic Information */}
                            {currentStep === 1 && (
                                <>
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('auth.signup.name')}
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('auth.signup.email')}
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('auth.signup.phone')}
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            placeholder="+212 6XX-XXXXXX"
                                        />
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('auth.signup.address')}
                                        </label>
                                        <input
                                            type="text"
                                            name="address"
                                            required
                                            value={formData.address}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* City */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('auth.signup.city')}
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            required
                                            value={formData.city}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('auth.signup.password')}
                                        </label>
                                        <input
                                            type="password"
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('auth.signup.confirmPassword')}
                                        </label>
                                        <input
                                            type="password"
                                            name="password_confirmation"
                                            required
                                            value={formData.password_confirmation}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Terms */}
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            name="agree_terms"
                                            id="agree_terms"
                                            checked={formData.agree_terms}
                                            onChange={handleChange}
                                            className="mt-1 w-5 h-5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="agree_terms" className="text-sm text-gray-700">
                                            {t('auth.signup.agree')} <a href="#" className="text-teal-600 hover:underline">{t('auth.signup.terms')}</a>
                                        </label>
                                    </div>

                                    {/* Next Button */}
                                    <button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-4 rounded-lg font-semibold hover:shadow-xl transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                    >
                                        {t('auth.signup.nextStep')}
                                        <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                                    </button>
                                </>
                            )}

                            {/* Step 2: Store & Business Details */}
                            {currentStep === 2 && (
                                <>
                                    {/* Company Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('auth.signup.storeName')}
                                        </label>
                                        <input
                                            type="text"
                                            name="company_name"
                                            required
                                            value={formData.company_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            placeholder={t('auth.signup.storeNamePlaceholder')}
                                        />
                                    </div>

                                    {/* Seller Level */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('auth.signup.sellerLevel')}
                                        </label>
                                        <select
                                            name="seller_level"
                                            required
                                            value={formData.seller_level}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        >
                                            <option value="">{t('auth.signup.selectLevel')}</option>
                                            <option value="beginner">{t('auth.signup.levelBeginner')}</option>
                                            <option value="intermediate">{t('auth.signup.levelIntermediate')}</option>
                                            <option value="advanced">{t('auth.signup.levelAdvanced')}</option>
                                        </select>
                                    </div>

                                    {/* Bank Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Landmark className="inline w-4 h-4 me-1" />
                                            {t('auth.signup.selectBank')}
                                        </label>
                                        <input
                                            type="text"
                                            value={bankSearch}
                                            onChange={(e) => setBankSearch(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-2"
                                            placeholder={t('auth.signup.searchBank')}
                                        />
                                        {formData.bank_name && (
                                            <div className="mb-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200">
                                                <BankLogo bankName={formData.bank_name} size={20} />
                                                <span className="text-sm font-medium text-teal-900">{formData.bank_name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, bank_name: '' }));
                                                        setBankSearch('');
                                                    }}
                                                    className="text-xs text-gray-500 hover:text-red-600 ms-2"
                                                >
                                                    {t('auth.signup.clearBank')}
                                                </button>
                                            </div>
                                        )}
                                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50">
                                            {filteredBanks.length > 0 ? (
                                                filteredBanks.map((bank) => (
                                                    <button
                                                        key={bank.name}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, bank_name: bank.name }));
                                                            setBankSearch(bank.name);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-start transition-all ${
                                                            formData.bank_name === bank.name
                                                                ? 'bg-teal-100 border border-teal-300'
                                                                : 'hover:bg-gray-100 border border-transparent'
                                                        }`}
                                                    >
                                                        <BankLogo bankName={bank.name} logoUrl={bank.logo} size={24} className="flex-shrink-0" />
                                                        <span className="text-sm font-medium text-gray-700">{bank.name}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="text-sm text-gray-500 px-2 py-1">{t('auth.signup.noBanksFound')}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bank RIB */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('auth.signup.bankRIB')}
                                        </label>
                                        <input
                                            type="text"
                                            name="rib"
                                            required
                                            value={formData.rib}
                                            onChange={(e) => setFormData(prev => ({ ...prev, rib: formatRibInput(e.target.value) }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                                            placeholder={t('auth.signup.bankRIBPlaceholder')}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">{formData.rib.replace(/\s/g, '').length}/34</p>
                                    </div>

                                    {/* Navigation Buttons */}
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={handlePrevStep}
                                            className="flex-1 border-2 border-teal-500 text-teal-600 py-4 rounded-lg font-semibold hover:bg-teal-50 transition flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                                            {t('auth.signup.previousStep')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-4 rounded-lg font-semibold hover:shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? t('auth.signup.submitting') : t('auth.signup.submit')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-gray-600">
                                {t('auth.signup.haveAccount')}{' '}
                                <Link to="/" className="text-teal-600 hover:underline font-medium">
                                    {t('auth.signup.loginLink')}
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}
