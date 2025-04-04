import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfilePage from '../pages/ProfilePage';
import MatchingPage from '../pages/MatchingPage';
import { MessagingPage } from '../pages/MessagingPage';
import StakingInterface from '../components/StakingInterface';
import SubscriptionPage from '../pages/SubscriptionPage';
import AuthPage from '../pages/AuthPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
};

export const AppRoutes: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/" element={
                isAuthenticated ? <Navigate to="/matching" /> : <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold mb-4">Welcome to IC Dinner</h1>
                        <p className="text-lg mb-8">Please connect your Internet Identity to continue</p>
                    </div>
                </div>
            } />
            <Route path="/profile" element={
                <ProtectedRoute>
                    <ProfilePage />
                </ProtectedRoute>
            } />
            <Route path="/matching" element={
                <ProtectedRoute>
                    <MatchingPage />
                </ProtectedRoute>
            } />
            <Route path="/messages" element={
                <ProtectedRoute>
                    <MessagingPage />
                </ProtectedRoute>
            } />
            <Route path="/staking" element={
                <ProtectedRoute>
                    <StakingInterface />
                </ProtectedRoute>
            } />
            <Route path="/subscription" element={
                <ProtectedRoute>
                    <SubscriptionPage />
                </ProtectedRoute>
            } />
            <Route path="/auth" element={<AuthPage />} />
        </Routes>
    );
}; 