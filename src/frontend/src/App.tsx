import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TokenRewardProvider } from './contexts/TokenRewardContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import MatchingPage from './pages/MatchingPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import SubscriptionPage from './pages/SubscriptionPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
                <TokenRewardProvider>
                    <SubscriptionProvider>
                        <div className="min-h-screen bg-gray-100">
                            <Navigation />
                            <Routes>
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/" element={<HomePage />} />
                                <Route
                                    path="/matching"
                                    element={
                                        <ProtectedRoute>
                                            <MatchingPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/messages"
                                    element={
                                        <ProtectedRoute>
                                            <MessagesPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/profile"
                                    element={
                                        <ProtectedRoute>
                                            <ProfilePage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/subscription"
                                    element={
                                        <ProtectedRoute>
                                            <SubscriptionPage />
                                        </ProtectedRoute>
                                    }
                                />
                            </Routes>
                        </div>
                    </SubscriptionProvider>
                </TokenRewardProvider>
            </AuthProvider>
        </Router>
    );
};

export default App; 