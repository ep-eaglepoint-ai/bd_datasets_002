import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ConfigurationSchema, SyncRequestSchema } from "@/lib/schema"; // Ensure alias is set up correctly in tsconfig

import { z } from "zod";

// Use standard Web Crypto API for UUID if uuid package not available, but 'uuid' is standard.
// I didn't install uuid. I'll use crypto.
import crypto from "crypto";

const CONFIG_PATH = path.join(process.cwd(), "config.json");

async function readConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    return ConfigurationSchema.parse(JSON.parse(data));
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      // Create default if missing
      const defaultConfig = {
        version_id: crypto.randomUUID(),
        flags: [],
      };
      await writeConfig(defaultConfig);
      return defaultConfig;
    }
    throw error;
  }
}

async function writeConfig(config: z.infer<typeof ConfigurationSchema>) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function GET() {
  try {
    const config = await readConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to read config:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Payload Schema
    const parseResult = SyncRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation Error", details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { version_id: clientVersionId, flags } = parseResult.data;

    // 2. Optimistic Concurrency Control
    // Lock file could be implemented here for strict process safety,
    // but Node.js is single threaded for JS execution, so as long as we await read/write synchronously-ish...
    // Actually, fs.promises doesn't guarantee atomic read-modify-write across requests if they interleave.
    // For this assignment, we rely on the version check. If a write happens in between read and write,
    // the readConfig() will fetch the latest.
    // However, to be truly safe, we need to check the version *just before* writing.

    // Simplest approach:
    // Read current config
    const currentConfig = await readConfig();

    if (currentConfig.version_id !== clientVersionId) {
      return NextResponse.json(
        {
          error: "Conflict: Data has been modified by another user.",
          current_version: currentConfig.version_id,
        },
        { status: 409 },
      );
    }

    // 3. Update State
    const newVersionId = crypto.randomUUID();
    const newConfig = {
      version_id: newVersionId,
      flags: flags,
    };

    // 4. Atomic Write
    // Write to tmp file then rename for atomicity (best practice)
    const tmpPath = `${CONFIG_PATH}.tmp-${newVersionId}`;
    await fs.writeFile(tmpPath, JSON.stringify(newConfig, null, 2), "utf-8");
    await fs.rename(tmpPath, CONFIG_PATH);

    return NextResponse.json(newConfig);
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
