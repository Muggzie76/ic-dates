import React, { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { useToken } from '../contexts/TokenContext';

interface TokenBalanceProps {
    showTransfer?: boolean;
}

const TokenBalance: React.FC<TokenBalanceProps> = ({ showTransfer = false }) => {
    const { balance, symbol, name, decimals, loading, error, transfer } = useToken();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [transferError, setTransferError] = useState<string | null>(null);
    const [transferLoading, setTransferLoading] = useState(false);

    const formatBalance = (raw: bigint): string => {
        const divisor = BigInt(10 ** decimals);
        const integerPart = raw / divisor;
        const fractionalPart = raw % divisor;
        return `${integerPart}.${fractionalPart.toString().padStart(decimals, '0')}`;
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        setTransferError(null);
        setTransferLoading(true);

        try {
            // Convert amount to raw value (considering decimals)
            const rawAmount = BigInt(parseFloat(amount) * (10 ** decimals));
            
            // Validate recipient principal
            let recipientPrincipal: Principal;
            try {
                recipientPrincipal = Principal.fromText(recipient);
            } catch {
                throw new Error('Invalid recipient address');
            }

            // Perform transfer
            const success = await transfer(recipientPrincipal, rawAmount);
            if (success) {
                setAmount('');
                setRecipient('');
            } else {
                throw new Error('Transfer failed');
            }
        } catch (err) {
            setTransferError(err instanceof Error ? err.message : 'Transfer failed');
        } finally {
            setTransferLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse flex space-x-4">
                <div className="h-6 w-24 bg-gray-200 rounded"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-600">
                Failed to load balance: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white shadow rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900">{name} Balance</h3>
                <p className="mt-1 text-2xl font-semibold text-indigo-600">
                    {formatBalance(balance)} {symbol}
                </p>
            </div>

            {showTransfer && (
                <div className="bg-white shadow rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Transfer Tokens</h4>
                    <form onSubmit={handleTransfer} className="space-y-4">
                        <div>
                            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
                                Recipient Address
                            </label>
                            <input
                                type="text"
                                id="recipient"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                placeholder="Enter recipient's principal ID"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                                Amount
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    type="number"
                                    id="amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-indigo-500 focus:ring-indigo-500"
                                    placeholder="0.00"
                                    step="any"
                                    min="0"
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-500 sm:text-sm">{symbol}</span>
                                </div>
                            </div>
                        </div>

                        {transferError && (
                            <div className="text-red-600 text-sm">
                                {transferError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={transferLoading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {transferLoading ? 'Processing...' : 'Transfer'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default TokenBalance; 