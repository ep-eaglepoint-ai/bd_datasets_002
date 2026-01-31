import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const appDir = path.join(rootDir, 'repository_after', 'personal-expense-tracker');

function waitForPort(port: number, timeout: number = 120000): Promise<void> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            if (Date.now() - start > timeout) {
                reject(new Error(`Timeout waiting for port ${port}`));
                return;
            }
            const req = http.get(`http://127.0.0.1:${port}`, (res) => {
                if (res.statusCode === 200) {
                    res.on('data', () => { });
                    res.on('end', () => resolve());
                } else {
                    setTimeout(check, 1000);
                }
            });
            req.on('error', () => {
                setTimeout(check, 1000);
            });
        };
        check();
    });
}

async function main() {
    let appProcess: ChildProcess | null = null;
    try {
        console.log('Setting up database...');
        execSync('npx prisma db push', { cwd: appDir, stdio: 'inherit' });

        console.log('Starting app in background...');
        appProcess = spawn('npm', ['run', 'dev', '--', '-p', '4000'], {
            cwd: appDir,
            stdio: 'ignore',
            shell: true as any,
            env: {
                ...process.env,
                NEXTAUTH_URL: 'http://localhost:4000',
                NEXTAUTH_SECRET: 'secret',
                DATABASE_URL: 'file:./dev.db'
            }
        });

        console.log('Waiting for app to start on port 4000...');
        await waitForPort(4000);
        console.log('App is ready!');

        // Run the command passed as arguments
        const args = process.argv.slice(2);
        const command = args[0] || 'npx vitest run --config tests/vitest.config.ts';
        const remainingArgs = args.slice(1);

        console.log(`Executing: ${command} ${remainingArgs.join(' ')}`);

        execSync(`${command} ${remainingArgs.join(' ')}`, {
            stdio: 'inherit',
            shell: true as any,
            encoding: 'utf8',
            env: { ...process.env, TEST_URL: 'http://localhost:4000' }
        });

    } catch (error) {
        console.error('Test execution failed:', error);
        process.exit(1);
    } finally {
        if (appProcess) {
            console.log('Stopping app...');
            const killed = appProcess.kill();
            if (!killed) {
                try {
                    if (process.platform === 'win32') {
                        execSync(`taskkill /pid ${appProcess.pid} /f /t`);
                    } else {
                        execSync(`kill -9 ${appProcess.pid}`);
                    }
                } catch (e) {
                    // Ignore
                }
            }
        }
    }
}

main();
