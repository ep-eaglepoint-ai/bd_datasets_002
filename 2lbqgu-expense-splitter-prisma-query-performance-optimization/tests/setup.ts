import { execSync } from "child_process";

beforeAll(async () => {
  try {
    execSync("npx prisma db push --force-reset", { stdio: "inherit" });
  } catch (error) {
    console.warn("Database reset failed, continuing with existing state");
  }
});
