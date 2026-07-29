#!/usr/bin/env node
/**
 * Maritime Platform — Self-healing server wrapper
 * Runs the Next.js standalone server and auto-restarts on crash.
 * Designed for containerized environments with process time limits.
 */
const { spawn } = require('child_process');
const http = require('http');

const MAX_RESTARTS = 100;
const HEALTH_CHECK_INTERVAL = 15000; // ping self every 15s to keep process alive
const SERVER_STARTUP_WAIT = 5000;

let restartCount = 0;
let serverProcess = null;

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    console.log(`[supervisor] Max restarts (${MAX_RESTARTS}) reached, exiting.`);
    process.exit(1);
  }

  restartCount++;
  const startTime = Date.now();
  console.log(`[supervisor] Start #${restartCount} at ${new Date().toISOString()}`);

  serverProcess = spawn('node', ['.next/standalone/server.js'], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  serverProcess.on('exit', (code, signal) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[supervisor] Server exited after ${elapsed}s (code: ${code}, signal: ${signal})`);
    if (code !== 0 || signal) {
      console.log(`[supervisor] Restarting in 1s...`);
      setTimeout(startServer, 1000);
    }
  });

  serverProcess.on('error', (err) => {
    console.error(`[supervisor] Server error: ${err.message}`);
    setTimeout(startServer, 2000);
  });
}

// Health-check pinger to keep the supervisor process active in K8s
function startHealthPinger() {
  setInterval(() => {
    const req = http.get('http://localhost:3000/api/health', (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(body);
          console.log(`[ping] ${health.status} | uptime: ${health.uptimeHuman || '?'} | mem: ${health.memory?.rss || '?'}`);
        } catch {}
      });
    });
    req.on('error', () => {});
    req.setTimeout(5000, () => req.destroy());
  }, HEALTH_CHECK_INTERVAL);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[supervisor] SIGTERM received, shutting down...');
  if (serverProcess) serverProcess.kill('SIGTERM');
  setTimeout(() => process.exit(0), 2000);
});

process.on('SIGINT', () => {
  console.log('[supervisor] SIGINT received, shutting down...');
  if (serverProcess) serverProcess.kill('SIGINT');
  setTimeout(() => process.exit(0), 2000);
});

// Start everything
console.log('=== Maritime Analytics Platform — Self-Healing Supervisor ===');
startServer();
startHealthPinger();
