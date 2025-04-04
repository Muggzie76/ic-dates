import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center text-white">
                    <h1 className="text-5xl font-bold mb-8">
                        Find Your Perfect Match on IC Dates
                    </h1>
                    <p className="text-xl mb-12">
                        Join our decentralized dating platform powered by the Internet Computer.
                        Meet amazing people, earn rewards, and find meaningful connections.
                    </p>
                    {user ? (
                        <Link
                            to="/matching"
                            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-blue-50 transition-colors"
                        >
                            Start Matching
                        </Link>
                    ) : (
                        <Link
                            to="/login"
                            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-blue-50 transition-colors"
                        >
                            Get Started
                        </Link>
                    )}
                </div>

                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white bg-opacity-10 p-8 rounded-lg text-white text-center">
                        <h3 className="text-2xl font-semibold mb-4">
                            Smart Matching
                        </h3>
                        <p>
                            Our advanced algorithm finds compatible matches based on your interests,
                            preferences, and behavior.
                        </p>
                    </div>
                    <div className="bg-white bg-opacity-10 p-8 rounded-lg text-white text-center">
                        <h3 className="text-2xl font-semibold mb-4">
                            Earn Rewards
                        </h3>
                        <p>
                            Get rewarded with DINNER tokens for being active, making connections,
                            and contributing to the community.
                        </p>
                    </div>
                    <div className="bg-white bg-opacity-10 p-8 rounded-lg text-white text-center">
                        <h3 className="text-2xl font-semibold mb-4">
                            Premium Features
                        </h3>
                        <p>
                            Unlock advanced features like priority matching, unlimited swipes,
                            and profile boosts with our premium subscription.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage; 