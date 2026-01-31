/**
 * Railway Start Script with Automatic Database Initialization
 * 
 * This script automatically initializes the database if needed, then starts the server.
 * Safe to run on every container startup - database init is idempotent.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Checking database initialization...');
    
    const initScript = spawn('node', [join(__dirname, 'init-db-railway.js')], {
      stdio: 'inherit',
      env: process.env
    });

    initScript.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Database check complete\n');
        resolve();
      } else {
        console.error(`❌ Database initialization failed with code ${code}`);
        // Don't fail startup - let the app try to start anyway
        // Database might be in a partial state that's still usable
        console.log('⚠️  Continuing with server startup...\n');
        resolve(); // Resolve anyway to allow server to start
      }
    });

    initScript.on('error', (error) => {
      console.error('❌ Error running database initialization:', error.message);
      console.log('⚠️  Continuing with server startup...\n');
      resolve(); // Resolve anyway to allow server to start
    });
  });
}

function startServer() {
  console.log('🚀 Starting server...\n');
  
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: process.env
  });

  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

  server.on('close', (code) => {
    console.log(`\n⚠️  Server exited with code ${code}`);
    process.exit(code || 0);
  });

  // Handle termination signals - forward them to the server process
  process.on('SIGTERM', () => {
    console.log('\n📴 Received SIGTERM, shutting down gracefully...');
    server.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('\n📴 Received SIGINT, shutting down gracefully...');
    server.kill('SIGINT');
  });

  // Return the server process (though we don't await it)
  return server;
}

// Main execution
async function main() {
  try {
    // Initialize database first (idempotent - safe to run every time)
    await initializeDatabase();
    
    // Start the server (runs indefinitely)
    startServer();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
