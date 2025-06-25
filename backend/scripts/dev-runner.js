#!/usr/bin/env node

/**
 * Development Runner for SandiCoin
 * Runs tsx with auto-assigned ports and environment variables
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load base .env file
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const baseEnv = {};
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        baseEnv[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
  
  return baseEnv;
}

// Get environment variables from auto-port script
const autoPortScript = path.join(__dirname, 'auto-port.js');
const autoPort = spawn('node', [autoPortScript]);

let envVars = {};

autoPort.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.includes('=')) {
      const [key, value] = line.split('=');
      envVars[key] = value;
    }
  });
});

autoPort.stderr.on('data', (data) => {
  // Forward auto-port script logs to stderr
  process.stderr.write(data);
});

autoPort.on('close', (code) => {
  if (code !== 0) {
    console.error(`Auto-port script exited with code ${code}`);
    process.exit(1);
  }
  
  // Load base environment variables and merge
  const baseEnv = loadEnvFile();
  const fullEnv = {
    ...process.env,
    ...baseEnv,
    ...envVars
  };
  
  // Start tsx with the assigned environment variables
  const tsx = spawn('tsx', ['watch', 'src/server.ts'], {
    env: fullEnv,
    stdio: 'inherit'
  });
  
  // Handle tsx process events
  tsx.on('close', (code) => {
    console.error(`\n🛑 Node stopped (exit code: ${code})`);
    process.exit(code);
  });
  
  tsx.on('error', (error) => {
    console.error('Failed to start tsx:', error);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.error('\n🔄 Shutting down gracefully...');
    tsx.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    tsx.kill('SIGTERM');
  });
});