import React, { useState } from 'react';
import { useTokenStaking } from '../contexts/TokenStakingContext';

const StakingInterface: React.FC = () => {
    const {
        stakes,
        stakingConfig,
        stake,
        unstake,
        refreshStakes,
        loading,
        error
    } = useTokenStaking();

    const [amount, setAmount] = useState<string>('');
    const [selectedDuration, setSelectedDuration] = useState<number>(0);

    const handleStake = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !stakingConfig) return;

        const stakeAmount = BigInt(amount);
        if (stakeAmount < stakingConfig.minStake || stakeAmount > stakingConfig.maxStake) {
            alert(`Stake amount must be between ${stakingConfig.minStake} and ${stakingConfig.maxStake}`);
            return;
        }

        try {
            await stake(stakeAmount, selectedDuration);
            setAmount('');
        } catch (err) {
            console.error('Error staking tokens:', err);
        }
    };

    const handleUnstake = async (index: number) => {
        try {
            const amount = await unstake(index);
            alert(`Successfully unstaked ${amount} tokens!`);
        } catch (err) {
            console.error('Error unstaking tokens:', err);
        }
    };

    const formatDuration = (duration: bigint): string => {
        const days = Number(duration) / (24 * 60 * 60 * 1000000000);
        return `${days} days`;
    };

    if (!stakingConfig) {
        return <div className="p-4">Loading staking configuration...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6">Token Staking</h2>

            {/* Staking Form */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Stake Tokens</h3>
                <form onSubmit={handleStake} className="space-y-4">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                            Amount
                        </label>
                        <input
                            type="number"
                            id="amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min={stakingConfig.minStake.toString()}
                            max={stakingConfig.maxStake.toString()}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                            Duration
                        </label>
                        <select
                            id="duration"
                            value={selectedDuration}
                            onChange={(e) => setSelectedDuration(Number(e.target.value))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            {stakingConfig.durations.map((duration, index) => (
                                <option key={index} value={index}>
                                    {formatDuration(duration)} - {stakingConfig.aprRates[index].toString()}% APR
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Stake Tokens'}
                    </button>
                </form>
            </div>

            {/* Active Stakes */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">Active Stakes</h3>
                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
                        {error}
                    </div>
                )}
                {stakes.length === 0 ? (
                    <p className="text-gray-500">No active stakes</p>
                ) : (
                    <div className="space-y-4">
                        {stakes.map((stake, index) => (
                            <div key={index} className="border rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">Amount: {stake.amount.toString()} tokens</p>
                                        <p className="text-sm text-gray-500">
                                            Duration: {formatDuration(stake.duration)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Start Time: {new Date(Number(stake.startTime) / 1000000).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {!stake.claimed && (
                                        <button
                                            onClick={() => handleUnstake(index)}
                                            disabled={loading || stake.claimed}
                                            className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                                        >
                                            Unstake
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StakingInterface; 