#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT_STATE_FILE = path.join(__dirname, '..', '.port-state.json');

/**
 * Kill all SandiCoin nodes and reset network state
 */
async function killAllNodes() {
  console.error('🔥 Killing all SandiCoin nodes...');
  
  try {
    // Load current port state to see which ports might be in use
    let state = { nodes: [], nextNodeIndex: 0 };
    try {
      if (fs.existsSync(PORT_STATE_FILE)) {
        const data = fs.readFileSync(PORT_STATE_FILE, 'utf8');
        state = JSON.parse(data);
      }
    } catch (error) {
      console.error('⚠️  Could not read port state file, continuing anyway...');
    }

    // Method 1: Kill by port numbers (API ports 3000-3010)
    console.error('🎯 Killing processes on API ports 3000-3010...');
    for (let port = 3000; port <= 3010; port++) {
      try {
        // Find processes using the port
        const result = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: 'pipe' });
        const pids = result.trim().split('\n').filter(pid => pid);
        
        if (pids.length > 0) {
          console.error(`  💀 Killing processes on port ${port}: ${pids.join(', ')}`);
          execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'pipe' });
        }
      } catch (error) {
        // No processes on this port - that's fine
      }
    }

    // Method 2: Kill by socket ports (5001-5010)
    console.error('🔌 Killing processes on socket ports 5001-5010...');
    for (let port = 5001; port <= 5010; port++) {
      try {
        // Find processes using the port
        const result = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: 'pipe' });
        const pids = result.trim().split('\n').filter(pid => pid);
        
        if (pids.length > 0) {
          console.error(`  💀 Killing processes on socket port ${port}: ${pids.join(', ')}`);
          execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'pipe' });
        }
      } catch (error) {
        // No processes on this port - that's fine
      }
    }

    // Method 3: Kill by process name (tsx processes running server.ts)
    console.error('📜 Killing SandiCoin server processes...');
    try {
      // Find tsx processes running server.ts
      const result = execSync(`pgrep -f "tsx.*server.ts"`, { encoding: 'utf8', stdio: 'pipe' });
      const pids = result.trim().split('\n').filter(pid => pid);
      
      if (pids.length > 0) {
        console.error(`  💀 Killing SandiCoin server processes: ${pids.join(', ')}`);
        execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'pipe' });
      }
    } catch (error) {
      // No matching processes - that's fine
    }

    // Method 4: Kill Node.js processes that might be SandiCoin related
    console.error('🔍 Scanning for other SandiCoin-related processes...');
    try {
      // Find node processes with SandiCoin in command line
      const result = execSync(`pgrep -f "node.*sandicoin\\|sandicoin.*node"`, { encoding: 'utf8', stdio: 'pipe' });
      const pids = result.trim().split('\n').filter(pid => pid);
      
      if (pids.length > 0) {
        console.error(`  💀 Killing SandiCoin-related processes: ${pids.join(', ')}`);
        execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'pipe' });
      }
    } catch (error) {
      // No matching processes - that's fine
    }

    // Wait a moment for processes to fully terminate
    console.error('⏳ Waiting for processes to fully terminate...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify no processes are still running
    console.error('🔍 Verifying all processes are terminated...');
    try {
      const remainingProcesses = execSync(`lsof -nP -i :3000-3010 | grep LISTEN`, { encoding: 'utf8', stdio: 'pipe' });
      if (remainingProcesses.trim()) {
        console.error('⚠️  Some processes may still be running:');
        console.error(remainingProcesses);
      }
    } catch (error) {
      // No processes running - this is what we want
      console.error('✅ All processes confirmed terminated');
    }

    // Reset the port state file
    console.error('🧹 Resetting port state file...');
    const emptyState = { 
      nodes: [], 
      nextNodeIndex: 0,
      lastCleanup: new Date().toISOString()
    };
    fs.writeFileSync(PORT_STATE_FILE, JSON.stringify(emptyState, null, 2));

    console.error('✅ All SandiCoin nodes have been terminated');
    console.error('🚀 You can now start fresh nodes with npm run dev');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    console.error('💡 You may need to manually kill remaining processes');
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.error('🔥 SandiCoin Node Killer');
  console.error('');
  console.error('Usage: npm run dev:kill');
  console.error('       npm run dev:reset');
  console.error('');
  console.error('This script will:');
  console.error('  - Kill all processes on ports 3000-3010 (API ports)');
  console.error('  - Kill all processes on ports 5001-5010 (socket ports)');
  console.error('  - Kill tsx processes running server.ts');
  console.error('  - Reset the port state file');
  console.error('');
  process.exit(0);
}

// Main execution
if (require.main === module) {
  killAllNodes().catch(error => {
    console.error('❌ Fatal error during cleanup:', error);
    process.exit(1);
  });
}

module.exports = { killAllNodes };