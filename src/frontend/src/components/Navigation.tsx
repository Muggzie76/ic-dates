import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToken } from '../contexts/TokenRewardContext';

const Navigation: React.FC = () => {
    const { isAuthenticated, signIn, signOut } = useAuth();
    const { balance } = useToken();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    if (!isAuthenticated) {
        return (
            <nav className="bg-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold">IC Dinner</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={signIn}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Connect Internet Identity
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <nav className="bg-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold">IC Dinner</span>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                to="/matching"
                                className={`${
                                    isActive('/matching')
                                        ? 'border-indigo-500 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                            >
                                Matching
                            </Link>
                            <Link
                                to="/messages"
                                className={`${
                                    isActive('/messages')
                                        ? 'border-indigo-500 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                            >
                                Messages
                            </Link>
                            <Link
                                to="/profile"
                                className={`${
                                    isActive('/profile')
                                        ? 'border-indigo-500 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                            >
                                Profile
                            </Link>
                            <Link
                                to="/staking"
                                className={`${
                                    isActive('/staking')
                                        ? 'border-indigo-500 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                            >
                                Staking
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium text-gray-900">
                            Balance: {balance?.toString() || '0'} DINNER
                        </div>
                        <button
                            onClick={signOut}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation; 