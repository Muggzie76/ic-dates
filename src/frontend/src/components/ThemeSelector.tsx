import React from 'react';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const ThemeSelector: React.FC = () => {
    const { theme, setTheme, availableThemes } = useTheme();
    const { checkFeatureAccess } = useSubscription();
    const [hasCustomThemes, setHasCustomThemes] = React.useState(false);

    React.useEffect(() => {
        const checkAccess = async () => {
            const hasAccess = await checkFeatureAccess('customTheme');
            setHasCustomThemes(hasAccess);
        };
        checkAccess();
    }, [checkFeatureAccess]);

    const handleThemeChange = (selectedTheme: Theme) => {
        setTheme(selectedTheme);
    };

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Theme Settings</h3>
            <div className="grid grid-cols-2 gap-4">
                {availableThemes.map((t) => (
                    <button
                        key={t.name}
                        onClick={() => handleThemeChange(t)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            theme.name === t.name
                                ? 'border-primary-500 shadow-lg'
                                : 'border-gray-200 hover:border-primary-300'
                        }`}
                        style={{
                            backgroundColor: t.colors.background,
                            color: t.colors.text
                        }}
                    >
                        <div className="flex flex-col gap-2">
                            <span className="font-medium">{t.name}</span>
                            <div className="flex gap-2">
                                {Object.entries(t.colors)
                                    .filter(([key]) => ['primary', 'secondary', 'accent'].includes(key))
                                    .map(([key, color]) => (
                                        <div
                                            key={key}
                                            className="w-6 h-6 rounded-full"
                                            style={{ backgroundColor: color }}
                                            title={key}
                                        />
                                    ))}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            {!hasCustomThemes && availableThemes.length < 4 && (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        🌟 Upgrade to Premium to unlock more themes!
                    </p>
                </div>
            )}
        </div>
    );
};

export default ThemeSelector; 