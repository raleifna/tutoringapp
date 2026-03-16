// src/app/(auth)/login/page.jsx - Login Page
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AcademicCapIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import toast from 'react-hot-toast';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
    const router = useRouter()
    const { setAuth } = useAuthStore()

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (values) => {
        setIsLoading(true);
        try {
            const response = await authApi.login(values);
            const data = response.data.data;

            setAuth({
                user: data.user,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            });
            toast.success('Welcome back!');
            router.push('/dashboard');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <div className="px-4 pt-4">
                <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <span>←</span> Back
                </Link>
            </div>

            <div className="flex-1 w-full max-w-md mx-auto px-6 pt-8 pb-8">
                {/* the logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
                        <AcademicCapIcon className="w-9 h-9 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h1>
                    <p className="text-sm text-gray-500">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* enter email */}
                    <div>
                        <label className="label">Email</label>
                        <input 
                            {...register('email')}
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            className="input" 
                        />  
                        {errors.email && (
                            <p className="error-text">{errors.email.message}</p>
                        )}
                    </div>
                    
                    {/* enter password */}
                    <div>
                        <label className="label">Password</label>
                        <div className="relative">
                            <input 
                                {...register('password')}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                className="input pr-10"
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                {showPassword ? (
                                    <EyeSlashIcon className="h-4 w-4" />
                                ) : (
                                    <EyeIcon className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {errors.password && <p className="error-text">{errors.password.message}</p>}
                    </div>
                    <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary btn-lg w-full justify-center rounded-2xl"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Sign In'
                            )}
                    </button>
                </form>
                <p className="text-center text-sm text-gray-500 mt-6 pb-8">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-primary-600 font-semibold">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
