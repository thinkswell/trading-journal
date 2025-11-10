import React, { useState, useEffect } from 'react';
import { User, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { LogoutIcon } from './icons/LogoutIcon';
import { UserIcon } from './icons/UserIcon';
import { auth } from '../firebase';

interface ProfilePageProps {
    user: User | null;
    firstName: string;
    lastName: string;
    onUpdateProfile: (firstName: string, lastName: string) => Promise<void>;
    onLogout: () => void;
}

const InputField: React.FC<{label: string, id: string, type: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, id, type, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-semibold text-[#E0E0E0] mb-2">{label}</label>
        <input
            type={type}
            id={id}
            value={value}
            onChange={onChange}
            className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                      focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                      transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
        />
    </div>
);

const ProfilePage: React.FC<ProfilePageProps> = ({ user, firstName, lastName, onUpdateProfile, onLogout }) => {
    const [editFirstName, setEditFirstName] = useState(firstName);
    const [editLastName, setEditLastName] = useState(lastName);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setEditFirstName(firstName);
        setEditLastName(lastName);
    }, [firstName, lastName]);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onUpdateProfile(editFirstName, editLastName);
            showNotification('Profile updated successfully!', 'success');
        } catch (error) {
            showNotification('Failed to update profile.', 'error');
        }
    };
    
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showNotification('New passwords do not match.', 'error');
            return;
        }
        if (!user || !user.email) {
             showNotification('No user is signed in.', 'error');
            return;
        }
        
        const credential = EmailAuthProvider.credential(user.email, currentPassword);

        try {
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            showNotification('Password updated successfully!', 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            showNotification(error.message, 'error');
        }
    };

    if (!user) {
        return <div className="text-center text-gray-400">Please log in to view your profile.</div>;
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-white via-zinc-200 to-zinc-300 bg-clip-text text-transparent flex items-center gap-3">
                <UserIcon />
                My Profile
            </h1>

            {/* Personal Information */}
            <div className="glass-card p-6 rounded-xl shadow-sm">
                <h2 className="text-2xl font-bold mb-6 text-white border-b border-[rgba(255,255,255,0.1)] pb-3">Personal Information</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-5">
                    <p className="text-[#A0A0A0] text-sm">Your email address is <span className="font-semibold text-[#E0E0E0]">{user.email}</span>.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="First Name" id="firstName" type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                        <InputField label="Last Name" id="lastName" type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                    </div>
                    <div className="flex justify-end pt-4 border-t border-[rgba(255,255,255,0.1)]">
                        <button type="submit"                         className="bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-6 rounded-lg 
                                  shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Security */}
            <div className="glass-card p-6 rounded-xl shadow-sm">
                <h2 className="text-2xl font-bold mb-6 text-white border-b border-[rgba(255,255,255,0.1)] pb-3">Security</h2>
                <form onSubmit={handlePasswordChange} className="space-y-5">
                     <InputField label="Current Password" id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="New Password" id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        <InputField label="Confirm New Password" id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                     </div>
                     <div className="flex justify-end pt-4 border-t border-[rgba(255,255,255,0.1)]">
                        <button type="submit"                         className="bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-6 rounded-lg 
                                  shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                            Change Password
                        </button>
                    </div>
                </form>
            </div>

            {/* Logout */}
            <div className="glass-card p-6 rounded-xl shadow-xl flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">Logout</h2>
                    <p className="text-[#A0A0A0] text-sm">End your current session.</p>
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 bg-[#DC3545] hover:bg-[#e85d75] text-white font-bold py-3 px-6 rounded-lg 
                              shadow-sm shadow-[#DC3545]/10 hover:shadow-md hover:shadow-[#DC3545]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <LogoutIcon />
                    Logout
                </button>
            </div>

            {/* Notification Toast */}
            {notification && (
                 <div className={`fixed bottom-5 right-5 p-4 rounded-xl shadow-lg text-white font-semibold animate-scale-in ${
                   notification.type === 'success' 
                     ? 'bg-[#28A745] border border-[#28A745]/30' 
                     : 'bg-[#DC3545] border border-[#DC3545]/30'
                 }`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
};

export default ProfilePage;