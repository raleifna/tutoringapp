// src/app/(app)/profile/page.jsx - User Profile Edit Page
'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { authApi, userApi } from '../../../lib/api-entry';
import { getAvatarUrl } from '../../../lib/avatar';
import { useAuthStore } from '../../../lib/store';

const profileSchema = z.object({
  firstName: z.string().min(2, 'At least 2 characters'),
  lastName: z.string().min(2, 'At least 2 characters'),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const formatIpAddress = (value) => {
  const ipAddress = String(value || '').trim();
  return ipAddress || null;
};

const formatLocationLabel = (value) => {
  const locationLabel = String(value || '').trim();
  return locationLabel || null;
};

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const currentIpAddress = user?.ipAddress?.trim() || null;
  const currentLocationLabel = user?.ipLocationLabel?.trim() || null;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
    },
  });

  const {
    register: registerPwd,
    handleSubmit: handlePwdSubmit,
    formState: { errors: pwdErrors },
    reset: resetPwd,
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => userApi.updateProfile(data),
    onSuccess: async () => {
      toast.success('Profile updated');
      await fetchMe();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Update failed');
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return userApi.uploadAvatar(formData);
    },
    onSuccess: async () => {
      toast.success('Avatar updated');
      await fetchMe();
    },
    onError: () => {
      toast.error('Avatar upload failed');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      resetPwd();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Password change failed');
    },
  });

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }

    avatarMutation.mutate(file);
  };

  return (
    <div className="relative max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="page-title flex-1">My Profile</h1>
      </div>
      <div className="card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
        <div className="relative">
          <img
            src={getAvatarUrl(user?.avatar, user?.firstName, user?.lastName, {
              fallbackName: 'User',
              ignoreTemporary: true,
            })}
            alt={user?.firstName || 'User'}
            className="w-20 h-20 rounded-full object-cover"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 border border-gray-200 shadow hover:bg-gray-50 transition-colors"
          >
            {avatarMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CameraIcon className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="badge bg-primary-50 text-primary-700 text-xs">{user?.role}</span>
            {currentIpAddress && (
              <span className="badge bg-gray-100 text-gray-700 text-xs">
                Current IP: {currentIpAddress}
              </span>
            )}
            {currentLocationLabel && (
              <span className="badge bg-gray-100 text-gray-700 text-xs">
                Region: {currentLocationLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
        {['profile', 'security'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-4 py-2.5 -mb-px text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'profile' ? (
              <span className="flex items-center gap-1.5">
                <UserCircleIcon className="w-4 h-4" />
                Profile Info
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <KeyIcon className="w-4 h-4" />
                Security
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="card p-6">
          <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">First Name</label>
                <input {...register('firstName')} className="input" />
                {errors.firstName && <p className="error-text">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">Last Name</label>
                <input {...register('lastName')} className="input" />
                {errors.lastName && <p className="error-text">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input
                value={user?.email || ''}
                disabled
                className="input bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="label">Phone (optional)</label>
              <input
                {...register('phone')}
                type="tel"
                className="input"
                placeholder="+61 400 000 000"
              />
            </div>

            <div>
              <label className="label">Bio (optional)</label>
              <textarea
                {...register('bio')}
                rows={3}
                className="input resize-none"
                placeholder="Tell us about yourself..."
              />
              {errors.bio && <p className="error-text">{errors.bio.message}</p>}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={updateMutation.isPending || !isDirty}
                className="btn-primary"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
          <form
            onSubmit={handlePwdSubmit((data) => passwordMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <input
                  {...registerPwd('currentPassword')}
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="input pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {pwdErrors.currentPassword && (
                <p className="error-text">{pwdErrors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  {...registerPwd('newPassword')}
                  type={showNewPassword ? 'text' : 'password'}
                  className="input pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {pwdErrors.newPassword && (
                <p className="error-text">{pwdErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <input
                  {...registerPwd('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {pwdErrors.confirmPassword && (
                <p className="error-text">{pwdErrors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="btn-primary"
            >
              {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
