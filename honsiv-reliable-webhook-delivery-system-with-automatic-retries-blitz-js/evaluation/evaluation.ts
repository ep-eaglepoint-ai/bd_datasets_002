#!/usr/bin/env npx tsx
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.dirname(__dirname);
const REPORTS_DIR = path.join(ROOT, "evaluation", "reports");

interface TestResult {
  passed: boolean;
  return_code: number;
  output: string;
}

interface RepositoryResult {
  tests: TestResult;
  metrics: Record<string, number | boolean>;
}

interface Report {
  run_id: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  environment: {
    node_version: string;
    platform: string;
  };
  after: RepositoryResult;
  success: boolean;
  error: string | null;
}

function environmentInfo() {
  return {
    node_version: process.version,
    platform: `${os.type()}-${os.arch()}`,
  };
}

function runTests(): TestResult {
  const env = { ...process.env };
  const isWin = process.platform === "win32";
  const pathKey = isWin && process.env.Path !== undefined ? "Path" : "PATH";
  const rootNodeModulesBin = path.join(ROOT, "node_modules", ".bin");
  const pathSeparator = isWin ? ";" : ":";
  
  env[pathKey] = `${rootNodeModulesBin}${pathSeparator}${env[pathKey] || ""}`;
  const npxCmd = isWin ? "npx.cmd" : "npx";

  // Generate Prisma client
  console.log("Generating Prisma client...");
  const prismaGen = spawnSync(npxCmd, ["prisma", "generate"], {
    cwd: path.join(ROOT, "repository_after"),
    env,
    encoding: "utf-8",
    timeout: 60000,
    shell: isWin,
  });

  if (prismaGen.status !== 0) {
    console.warn(`⚠️ Prisma generation failed: ${prismaGen.stderr}`);
  }

  const tempJsonFile = path.join(ROOT, `vitest-results-${Date.now()}.json`);
  const cmd = [npxCmd, "--yes", "vitest", "run", "tests", "--config", "vitest.config.ts", "--reporter=json", "--outputFile", tempJsonFile];
  
  console.log(`Running tests...`);
  const result = spawnSync(cmd[0], cmd.slice(1), {
    cwd: ROOT,
    env,
    encoding: "utf-8",
    timeout: 300000,
    shell: isWin,
  });

  let testsPassed = false;
  let output = (result.stdout || "") + "\n" + (result.stderr || "");

  if (fs.existsSync(tempJsonFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(tempJsonFile, "utf-8"));
      const passed = data.numPassedTests || 0;
      const failed = data.numFailedTests || 0;
      const total = data.numTotalTests || 0;

      testsPassed = failed === 0 && total > 0;
      
      const details = (data.testResults || []).flatMap((file: any) => 
        (file.assertionResults || []).map((test: any) => {
          const status = test.status === "passed" ? "✅" : "❌";
          return `${status} ${test.fullName || test.title}`;
        })
      );

      output = [
        `Tests: ${passed} passed, ${failed} failed, ${total} total`,
        ...details
      ].join("\n");

      fs.unlinkSync(tempJsonFile);
    } catch (err) {
      console.error(`Error parsing Vitest JSON: ${err}`);
    }
  }

  return {
    passed: testsPassed,
    return_code: result.status ?? -1,
    output: output.length > 8000 ? output.slice(0, 8000) + "... (truncated)" : output,
  };
}

function runEvaluation(): Report {
  const startedAt = new Date();
  console.log(`\n============================================================`);
  console.log(`WEBHOOK DELIVERY SYSTEM EVALUATION`);
  console.log(`============================================================`);

  const afterTests = runTests();
  const finishedAt = new Date();

  console.log(`\n============================================================`);
  console.log(`EVALUATION SUMMARY`);
  console.log(`============================================================`);
  console.log(`Tests: ${afterTests.passed ? "✅ PASSED" : "❌ FAILED"}`);

  return {
    run_id: randomUUID(),
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: (finishedAt.getTime() - startedAt.getTime()) / 1000,
    environment: environmentInfo(),
    after: { tests: afterTests, metrics: {} },
    success: afterTests.passed,
    error: null,
  };
}

function main() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  
  try {
    const report = runEvaluation();
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const outputDir = path.join(REPORTS_DIR, dateStr, timeStr);
    
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "report.json");
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    // Also save at the root of evaluation directory for the automated system
    const rootOutputPath = path.join(ROOT, "evaluation", "report.json");
    fs.writeFileSync(rootOutputPath, JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Report saved to: ${outputPath}`);
    console.log(`✅ Root report saved to: ${rootOutputPath}`);
    console.log(`Success: ${report.success ? "✅ YES" : "❌ NO"}`);
    process.exit(report.success ? 0 : 1);
  } catch (error) {
    console.error(`\nFATAL ERROR: ${error}`);
    process.exit(1);
  }
}

main();
