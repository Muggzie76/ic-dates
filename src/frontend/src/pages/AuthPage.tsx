import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/Spinner';

const AuthPage: React.FC = () => {
    const { login, isLoading, error } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            await login();
            navigate('/matching');
        } catch (err) {
            console.error('Login failed:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="text-center text-white mb-8">
                <h1 className="text-4xl font-bold mb-4">Welcome to IC Dates</h1>
                <p className="text-xl">Find your perfect match on the Internet Computer</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                    Get Started
                </h2>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleLogin}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Connect with Internet Identity
                </button>

                <div className="mt-6 text-center text-sm text-gray-600">
                    <p>By continuing, you agree to our</p>
                    <div className="mt-2">
                        <a href="#" className="text-blue-500 hover:underline">Terms of Service</a>
                        {' '}&amp;{' '}
                        <a href="#" className="text-blue-500 hover:underline">Privacy Policy</a>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center text-white text-sm">
                <p>© 2024 IC Dates. All rights reserved.</p>
            </div>
        </div>
    );
};

export default AuthPage; 