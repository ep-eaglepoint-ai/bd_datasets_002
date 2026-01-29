import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // For stateless JWT, logout is handled client-side by removing the token
  // In a production app, you might want to implement token blacklisting
  return NextResponse.json({ message: 'Logged out successfully' });
}