import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileService, Profile, Location } from '../services/ProfileService';

interface ProfileFormProps {
    existingProfile?: Profile;
    onSubmit: (profile: Profile) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ existingProfile, onSubmit }) => {
    const { principal } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({
        name: '',
        age: 18,
        gender: '',
        bio: '',
        photos: [] as string[],
        interests: [] as string[],
        location: {
            latitude: 0,
            longitude: 0,
            city: '',
            country: ''
        },
        preferences: {
            minAge: 18,
            maxAge: 99,
            genderPreference: '',
            maxDistance: 50
        }
    });

    useEffect(() => {
        if (existingProfile) {
            setFormData({
                name: existingProfile.name,
                age: existingProfile.age,
                gender: existingProfile.gender,
                bio: existingProfile.bio,
                photos: existingProfile.photos,
                interests: existingProfile.interests,
                location: existingProfile.location,
                preferences: existingProfile.preferences
            });
        }
    }, [existingProfile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                [name]: name.includes('Age') || name === 'maxDistance' ? parseInt(value) : value
            }
        }));
    };

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            location: {
                ...prev.location,
                [name]: name.includes('latitude') || name.includes('longitude') ? parseFloat(value) : value
            }
        }));
    };

    const handleInterestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const interests = e.target.value.split(',').map(i => i.trim());
        setFormData(prev => ({
            ...prev,
            interests
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const profileData = {
                ...formData,
                id: principal!
            };

            if (existingProfile) {
                await profileService.updateProfile(profileData);
            } else {
                await profileService.createProfile(profileData);
            }

            onSubmit(profileData as Profile);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        aria-label="Name"
                        placeholder="Enter your name"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Age</label>
                    <input
                        type="number"
                        name="age"
                        min="18"
                        value={formData.age}
                        onChange={handleInputChange}
                        required
                        aria-label="Age"
                        placeholder="Enter your age"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        required
                        aria-label="Gender"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={4}
                        aria-label="Bio"
                        placeholder="Tell us about yourself"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Interests (comma-separated)</label>
                    <input
                        type="text"
                        value={formData.interests.join(', ')}
                        onChange={handleInterestsChange}
                        aria-label="Interests"
                        placeholder="e.g. reading, hiking, cooking"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Minimum Age Preference</label>
                        <input
                            type="number"
                            name="minAge"
                            min="18"
                            value={formData.preferences.minAge}
                            onChange={handlePreferenceChange}
                            aria-label="Minimum Age Preference"
                            placeholder="Minimum age"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Maximum Age Preference</label>
                        <input
                            type="number"
                            name="maxAge"
                            min="18"
                            value={formData.preferences.maxAge}
                            onChange={handlePreferenceChange}
                            aria-label="Maximum Age Preference"
                            placeholder="Maximum age"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : existingProfile ? 'Update Profile' : 'Create Profile'}
                </button>
            </div>
        </form>
    );
};

export default ProfileForm; 