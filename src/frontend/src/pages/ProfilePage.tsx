import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import ProfileForm from '../components/ProfileForm';
import TokenBalance from '../components/TokenBalance';
import { Profile } from '../services/ProfileService';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { profile, loading, error, createProfile, updateProfile } = useProfile();

    const handleSubmit = async (profileData: Profile) => {
        try {
            if (profile) {
                await updateProfile(profileData);
            } else {
                await createProfile(profileData);
            }
            navigate('/dashboard');
        } catch (err) {
            console.error('Failed to save profile:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Token Balance Section */}
                    <div className="md:col-span-1">
                        <TokenBalance showTransfer={true} />
                    </div>

                    {/* Profile Form Section */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold text-gray-900">
                                    {profile ? 'Edit Profile' : 'Create Profile'}
                                </h1>
                                <p className="mt-2 text-sm text-gray-600">
                                    {profile 
                                        ? 'Update your profile information below.'
                                        : 'Fill out your profile information to get started.'}
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    {error}
                                </div>
                            )}

                            <ProfileForm
                                existingProfile={profile || undefined}
                                onSubmit={handleSubmit}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage; 