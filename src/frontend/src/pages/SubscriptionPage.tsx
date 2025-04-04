import React, { useState } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SubscriptionTier } from '../services/SubscriptionService';
import { useToken } from '../contexts/TokenContext';
import { Spinner } from '../components/Spinner';

const SubscriptionPage: React.FC = () => {
    const { 
        isLoading, 
        error, 
        subscriptionState, 
        availablePlans, 
        subscribe, 
        cancelSubscription 
    } = useSubscription();

    const { balance } = useToken();
    const [selectedMonths, setSelectedMonths] = useState(1);
    const [processingTier, setProcessingTier] = useState<SubscriptionTier | null>(null);

    const handleSubscribe = async (tier: SubscriptionTier) => {
        setProcessingTier(tier);
        try {
            await subscribe(tier, selectedMonths);
        } catch (err) {
            console.error('Failed to subscribe:', err);
        } finally {
            setProcessingTier(null);
        }
    };

    const handleCancel = async () => {
        try {
            await cancelSubscription();
        } catch (err) {
            console.error('Failed to cancel subscription:', err);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen">
            <Spinner />
        </div>;
    }

    if (error) {
        return <div className="text-red-500 text-center p-4">{error}</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-center mb-8">Subscription Plans</h1>
            
            {subscriptionState && (
                <div className="bg-gray-100 p-4 rounded-lg mb-8">
                    <h2 className="text-xl font-semibold mb-2">Current Subscription</h2>
                    <p>Tier: {subscriptionState.tier}</p>
                    <p>Valid until: {new Date(Number(subscriptionState.endTime) / 1000000).toLocaleDateString()}</p>
                    <p>Auto-renew: {subscriptionState.autoRenew ? 'Yes' : 'No'}</p>
                    <button
                        onClick={handleCancel}
                        className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                    >
                        Cancel Subscription
                    </button>
                </div>
            )}

            <div className="mb-8">
                <label htmlFor="subscription-duration" className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Duration
                </label>
                <select
                    id="subscription-duration"
                    value={selectedMonths}
                    onChange={(e) => setSelectedMonths(Number(e.target.value))}
                    className="block w-full p-2 border rounded"
                    aria-label="Select subscription duration"
                >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {availablePlans.map((plan) => (
                    <div key={plan.tier} className="border rounded-lg p-6 flex flex-col">
                        <h3 className="text-xl font-bold mb-4">{plan.tier}</h3>
                        <div className="text-2xl font-bold mb-4">
                            {plan.pricePerMonth} DINNER/month
                        </div>
                        <ul className="space-y-2 mb-6 flex-grow">
                            <li>✓ {plan.features.maxSwipesPerDay} swipes/day</li>
                            <li>✓ {plan.features.maxMessagesPerDay} messages/day</li>
                            {plan.features.canSeeWhoLikedYou && (
                                <li>✓ See who liked you</li>
                            )}
                            {plan.features.priorityMatching && (
                                <li>✓ Priority matching</li>
                            )}
                            {plan.features.profileBoosts > 0 && (
                                <li>✓ {plan.features.profileBoosts} profile boosts</li>
                            )}
                            {plan.features.hideAds && (
                                <li>✓ Ad-free experience</li>
                            )}
                            {plan.features.verifiedBadge && (
                                <li>✓ Verified badge</li>
                            )}
                            {plan.features.customTheme && (
                                <li>✓ Custom theme</li>
                            )}
                        </ul>
                        <button
                            onClick={() => handleSubscribe(plan.tier as SubscriptionTier)}
                            disabled={processingTier === plan.tier || balance < plan.pricePerMonth * selectedMonths}
                            className={`w-full py-2 px-4 rounded transition-colors ${
                                processingTier === plan.tier
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : balance < plan.pricePerMonth * selectedMonths
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                        >
                            {processingTier === plan.tier ? (
                                <Spinner size="sm" />
                            ) : balance < plan.pricePerMonth * selectedMonths ? (
                                'Insufficient Balance'
                            ) : (
                                'Subscribe'
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SubscriptionPage; 