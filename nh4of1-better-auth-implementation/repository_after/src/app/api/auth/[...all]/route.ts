import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
    const auth = await getAuth();
    return toNextJsHandler(auth).GET(req);
};

export const POST = async (req: NextRequest) => {
    const auth = await getAuth();
    return toNextJsHandler(auth).POST(req);
};

export const dynamic = "force-dynamic";

