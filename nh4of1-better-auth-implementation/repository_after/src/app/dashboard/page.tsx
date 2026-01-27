import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        return redirect("/sign-in");
    }

    return (
        <div style={{ padding: "2rem" }}>
            <h1>Dashboard (Protected)</h1>
            <p>This is a server-side protected page.</p>
            <p>Logged in as: <strong>{session.user.name}</strong> (@{session.user.username})</p>
            <pre>{JSON.stringify(session.user, null, 2)}</pre>
        </div>
    );
}
