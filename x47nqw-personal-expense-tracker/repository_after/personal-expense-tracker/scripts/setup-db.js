const { spawn } = require("child_process");

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
      } else {
        resolve();
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

async function setup() {
  try {
    console.log("Setting up database...");
    
    console.log("Running Prisma migrations...");
    await runCommand("npx", ["prisma", "migrate", "dev", "--name", "init"]);

    console.log("Seeding database...");
    await runCommand("npx", ["prisma", "db", "seed"]);

    console.log("Database setup complete!");
  } catch (error) {
    console.error("Setup failed:", error);
    process.exit(1);
  }
}

setup();
