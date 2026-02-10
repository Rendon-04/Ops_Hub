import React from 'react';
import { LogIn } from 'lucide-react';

interface LoginProps {
  onGoogleLogin: () => void;
}

export function Login({ onGoogleLogin }: LoginProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-center mb-2">Ops Hub</h1>
          <p className="text-center text-gray-600">Sign in with your Neon Workspace account</p>
        </div>

        <button
          onClick={onGoogleLogin}
          className="w-full bg-[#e90786] text-white py-2.5 px-4 rounded-lg hover:bg-[#d10677] transition-colors inline-flex items-center justify-center gap-2"
        >
          <LogIn size={18} />
          Continue with Google
        </button>
        <p className="mt-6 text-center text-sm text-gray-500">
          Only <span className="font-medium text-black">@neon.work</span> accounts are allowed.
        </p>
      </div>
    </div>
  );
}
