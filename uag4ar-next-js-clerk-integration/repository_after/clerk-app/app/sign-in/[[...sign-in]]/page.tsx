import React from 'react';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Sign In</h2>
      <SignIn />
    </div>
  );
}
