import React from 'react';
import { SignInButton, SignUpButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold">Welcome to the Clerk-integrated App</h2>
      <p className="mt-4 text-gray-700">This app is integrated with Clerk using the App Router.</p>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <SignInButton>
          <button>Sign In</button>
        </SignInButton>
        <SignUpButton>
          <button>Sign Up</button>
        </SignUpButton>
      </div>
    </div>
  );
}
