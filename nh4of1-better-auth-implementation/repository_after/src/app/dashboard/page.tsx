import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import "../auth.css";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
    const auth = await getAuth();
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        return redirect("/sign-in");
    }

    return (
        <div className="login-root">
            <div className="box-root flex-flex flex-direction--column" style={{ minHeight: '100vh', flexGrow: 1 }}>
                <div className="loginbackground box-background--white padding-top--64">
                    <div className="loginbackground-gridContainer">
                        <div className="box-root flex-flex" style={{ gridArea: 'top / start / 8 / end' }}>
                            <div className="box-root" style={{ backgroundImage: 'linear-gradient(white 0%, rgb(247, 250, 252) 33%)', flexGrow: 1 }}>
                            </div>
                        </div>
                        <div className="box-root flex-flex" style={{ gridArea: '4 / 2 / auto / 5' }}>
                            <div className="box-root box-divider--light-all-2 animationLeftRight tans3s" style={{ flexGrow: 1 }}></div>
                        </div>
                        <div className="box-root flex-flex" style={{ gridArea: '6 / start / auto / 2' }}>
                            <div className="box-root box-background--blue800" style={{ flexGrow: 1 }}></div>
                        </div>
                        <div className="box-root flex-flex" style={{ gridArea: '7 / start / auto / 4' }}>
                            <div className="box-root box-background--blue animationLeftRight" style={{ flexGrow: 1 }}></div>
                        </div>
                        <div className="box-root flex-flex" style={{ gridArea: '8 / 4 / auto / 6' }}>
                            <div className="box-root box-background--gray100 animationLeftRight tans3s" style={{ flexGrow: 1 }}></div>
                        </div>
                        <div className="box-root flex-flex" style={{ gridArea: '2 / 15 / auto / end' }}>
                            <div className="box-root box-background--cyan200 animationRightLeft tans4s" style={{ flexGrow: 1 }}></div>
                        </div>
                        <div className="box-root flex-flex" style={{ gridArea: '3 / 14 / auto / end' }}>
                            <div className="box-root box-background--blue animationRightLeft" style={{ flexGrow: 1 }}></div>
                        </div>
                        <div className="box-root flex-flex" style={{ gridArea: '4 / 17 / auto / 20' }}>
                            <div className="box-root box-background--gray100 animationRightLeft tans4s" style={{ flexGrow: 1 }}></div>
                        </div>
                        <div className="box-root flex-flex" style={{ gridArea: '5 / 14 / auto / 17' }}>
                            <div className="box-root box-divider--light-all-2 animationRightLeft tans3s" style={{ flexGrow: 1 }}></div>
                        </div>
                    </div>
                </div>

                <div className="box-root padding-top--24 flex-flex flex-direction--column" style={{ flexGrow: 1, zIndex: 9 }}>
                    <div className="box-root padding-top--48 padding-bottom--24 flex-flex flex-justifyContent--center">
                        <h1><a href="#" rel="dofollow">Better Auth Dashboard</a></h1>
                    </div>
                    <div className="formbg-outer">
                        <div className="dashboard-bg">
                            <div className="formbg-inner padding-horizontal--48">
                                <div className="flex justify-between items-center padding-bottom--24" style={{ marginBottom: '24px', borderBottom: '1px solid #e3e8ee' }}>
                                    <div className="flex items-center space-x-3">

                                        <span className="text-lg font-semibold text-[#1a1f36]">@{session.user.username}</span>
                                    </div>
                                    <SignOutButton />
                                </div>

                                <div className="padding-bottom--24">
                                    <h2 className="text-xl font-bold text-[#1a1f36] mb-2">
                                        Welcome back, <span className="text-[#5469d4]">{session.user.name}</span>
                                    </h2>
                                    <p className="text-[#697386] text-base mb-6">
                                        You have successfully authenticated using Better-Auth. This is your protected dashboard area.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="field padding-bottom--24">
                                            <label className="block text-sm font-bold text-[#5469d4] uppercase tracking-wider mb-2">Your Profile</label>
                                            <div className="bg-[#f7fafc] p-4 rounded border border-[#e3e8ee]">
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-[#697386]">Email:</span>
                                                    <span className="text-[#1a1f36] font-medium">{session.user.email}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[#697386]">User ID:</span>
                                                    <span className="text-[#1a1f36] font-mono text-xs">{session.user.id}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="field padding-bottom--24">
                                            <label className="block text-sm font-bold text-[#5469d4] uppercase tracking-wider mb-2">Debugging</label>
                                            <div className="bg-[#fffff] p-4 rounded border border-[#e3e8ee] overflow-auto max-h-[150px]">
                                                <pre className="text-xs text-white font-mono">{JSON.stringify(session.user, null, 2)}</pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="footer-link padding-top--24">
                            <div className="listing padding-top--24 padding-bottom--24 flex-flex center-center">
                                <span><a href="#">© Better Auth</a></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
