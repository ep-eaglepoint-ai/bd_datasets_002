import React from 'react';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Sign Up</h2>
      <SignUp />
    </div>
  );
}
