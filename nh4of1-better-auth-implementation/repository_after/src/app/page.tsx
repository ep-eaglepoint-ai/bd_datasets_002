"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Better Auth Minimal Demo</h1>
      {session ? (
        <div>
          <p>Welcome, {session.user.name}!</p>
          <p>Email: {session.user.email}</p>
          <Link href="/dashboard" style={{ marginRight: "1rem" }}>Go to Dashboard</Link>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div>
          <p>You are not logged in.</p>
          <Link href="/sign-in" style={{ marginRight: "1rem" }}>Sign In</Link>
          <Link href="/sign-up">Sign Up</Link>
        </div>
      )}
    </div>
  );
}
