import React from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';

type VerificationLevel = 'Basic' | 'Advanced' | 'Premium';

type VerificationDetails = {
    verifiedAt: bigint;
    verificationLevel: VerificationLevel;
    verificationProof: string;
    expiresAt: bigint | null;
};

interface VerificationBadgeProps {
    isVerified: boolean;
    details?: VerificationDetails;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
    isVerified,
    details,
    size = 'md',
    showTooltip = true
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };

    const levelColors = {
        Basic: 'text-blue-500',
        Advanced: 'text-purple-500',
        Premium: 'text-yellow-500'
    };

    const tooltipText = details
        ? `${details.verificationLevel} Verified · ${
              details.expiresAt
                  ? `Expires ${new Date(Number(details.expiresAt / BigInt(1000000))).toLocaleDateString()}`
                  : 'Never expires'
          }`
        : 'Verified User';

    if (!isVerified) return null;

    return (
        <div className="relative inline-flex items-center">
            <div
                className={`${sizeClasses[size]} ${
                    details ? levelColors[details.verificationLevel] : 'text-green-500'
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-full h-full"
                >
                    <path
                        fillRule="evenodd"
                        d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                        clipRule="evenodd"
                    />
                </svg>
            </div>
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    {tooltipText}
                </div>
            )}
        </div>
    );
};

export default VerificationBadge; 