import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { MatchingProvider } from './contexts/MatchingContext';
import { MessagingProvider } from './contexts/MessagingContext';
import { TokenRewardProvider } from './contexts/TokenRewardContext';
import { TokenStakingProvider } from './contexts/TokenStakingContext';
import Navigation from './components/Navigation';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <TokenRewardProvider>
                    <TokenStakingProvider>
                        <ProfileProvider>
                            <MatchingProvider>
                                <MessagingProvider>
                                    <div className="min-h-screen bg-gray-100">
                                        <Navigation />
                                        <AppRoutes />
                                    </div>
                                </MessagingProvider>
                            </MatchingProvider>
                        </ProfileProvider>
                    </TokenStakingProvider>
                </TokenRewardProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}; 