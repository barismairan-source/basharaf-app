import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

export interface TestServer {
  baseUrl: string;
  stop: () => Promise<void>;
}

/**
 * یک نمونه‌ی واقعی Next.js (`next start`) را روی یک پورت محلی آزاد بالا
 * می‌آورد — تا integration testها بتوانند با fetch واقعی، route handlerها
 * (PATCH/DELETE و ...) را با لایه‌ی auth/session واقعی صدا بزنند.
 *
 * نیازمند build قبلی است: `npm run build` (next start بدون `.next` کار نمی‌کند).
 */
export async function startServer(): Promise<TestServer> {
  const buildIdPath = path.resolve(process.cwd(), '.next', 'BUILD_ID');
  if (!existsSync(buildIdPath)) {
    throw new Error(
      'پوشه‌ی .next پیدا نشد — قبل از اجرای integration test باید `npm run build` اجرا شود.'
    );
  }

  const port = 3100 + Math.floor(Math.random() * 200);
  const baseUrl = `http://127.0.0.1:${port}`;
  const nextBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'next');

  const proc: ChildProcessWithoutNullStreams = spawn(nextBin, ['start', '-p', String(port)], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  });

  let stderr = '';
  proc.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`next start زودتر از موعد بسته شد:\n${stderr}`);
    }
    try {
      await fetch(`${baseUrl}/api/auth/me`);
      return { baseUrl, stop: () => stopServer(proc) };
    } catch {
      // سرور هنوز آماده‌ی پذیرش اتصال نیست — دوباره تلاش کن
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  await stopServer(proc);
  throw new Error(`next start ظرف ${READY_TIMEOUT_MS}ms آماده نشد:\n${stderr}`);
}

async function stopServer(proc: ChildProcessWithoutNullStreams): Promise<void> {
  if (proc.exitCode !== null) return;
  proc.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    proc.once('exit', () => resolve());
    setTimeout(resolve, 5000).unref();
  });
}
