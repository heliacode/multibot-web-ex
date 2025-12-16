/**
 * Test script to verify GIF position and size are correctly passed and applied
 * This creates a test HTML page and verifies the functionality
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../../config/database.js';
import { getGifCommandById } from '../../models/gifCommand.js';
import { getActiveBitTriggersByTwitchUserId } from '../../models/bitTrigger.js';
import { processBitsDonation } from '../../services/twitchChat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_TWITCH_USER_ID = '25019517';

let results = {
    passed: 0,
    failed: 0,
    errors: []
};

function logTest(name, passed, error = null) {
    if (passed) {
        console.log(`   ✅ ${name}`);
        results.passed++;
    } else {
        console.log(`   ❌ ${name}`);
        if (error) {
            console.log(`      Error: ${error}`);
            results.errors.push(`${name}: ${error}`);
        }
        results.failed++;
    }
}

async function testGifPositionSize() {
    console.log('🧪 Testing GIF Position and Size Functionality...\n');
    console.log('='.repeat(60));
    
    try {
        // Test 1: Check database for GIF commands with position/size
        console.log('\n1️⃣  Checking database for GIF commands...\n');
        const gifCommands = await pool.query(`
            SELECT id, command, position, size 
            FROM gif_commands 
            WHERE twitch_user_id = $1 AND is_active = true
            LIMIT 5
        `, [TEST_TWITCH_USER_ID]);
        
        logTest('GIF commands found', gifCommands.rows.length > 0);
        
        if (gifCommands.rows.length === 0) {
            console.log('⚠️  No GIF commands found to test');
            return;
        }
        
        console.log(`   Found ${gifCommands.rows.length} GIF command(s):`);
        gifCommands.rows.forEach(cmd => {
            console.log(`   - ${cmd.command}: position="${cmd.position}", size="${cmd.size}"`);
            logTest(`Command "${cmd.command}" has position`, cmd.position !== null && cmd.position !== undefined);
            logTest(`Command "${cmd.command}" has size`, cmd.size !== null && cmd.size !== undefined);
        });
        
        // Test 2: Test getGifCommandById returns position/size
        console.log('\n2️⃣  Testing getGifCommandById...\n');
        const testCommand = gifCommands.rows[0];
        const retrievedCommand = await getGifCommandById(testCommand.id, null);
        
        logTest('getGifCommandById returns command', retrievedCommand !== null);
        if (retrievedCommand) {
            logTest('Retrieved command has position', retrievedCommand.position !== null && retrievedCommand.position !== undefined);
            logTest('Retrieved command has size', retrievedCommand.size !== null && retrievedCommand.size !== undefined);
            console.log(`   Position: "${retrievedCommand.position}", Size: "${retrievedCommand.size}"`);
        }
        
        // Test 3: Test bit triggers with GIF commands
        console.log('\n3️⃣  Testing bit triggers with GIF commands...\n');
        const bitTriggers = await getActiveBitTriggersByTwitchUserId(TEST_TWITCH_USER_ID);
        const gifBitTriggers = bitTriggers.filter(t => t.command_type === 'gif');
        
        logTest('GIF bit triggers found', gifBitTriggers.length > 0);
        
        if (gifBitTriggers.length > 0) {
            const testTrigger = gifBitTriggers[0];
            console.log(`   Testing trigger: ${testTrigger.bit_amount} bits -> GIF command ${testTrigger.command_id}`);
            
            // Simulate bits donation
            const result = await processBitsDonation(TEST_TWITCH_USER_ID, testTrigger.bit_amount, 'test_user');
            
            logTest('processBitsDonation returns result', result !== null);
            if (result) {
                logTest('Result is GIF type', result.type === 'gif');
            }
        }
        
        // Test 4: Create test HTML page to verify CSS generation
        console.log('\n4️⃣  Creating test HTML page...\n');
        const testHtml = `<!DOCTYPE html>
<html>
<head>
    <title>GIF Position/Size Test</title>
    <style>
        body { margin: 0; padding: 20px; background: #1a1a1a; color: white; font-family: monospace; }
        .test-container { width: 1920px; height: 1080px; position: relative; border: 2px solid #444; background: #000; margin: 20px auto; }
        .test-info { margin: 20px; }
        .test-result { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .pass { background: #0a5; }
        .fail { background: #a50; }
    </style>
</head>
<body>
    <div class="test-info">
        <h1>GIF Position and Size Test</h1>
        <div id="test-results"></div>
    </div>
    <div class="test-container" id="gif-container"></div>
    
    <script>
        const testResults = [];
        
        // Test position styles
        function getPositionStyles(position) {
            const positions = {
                'top-left': 'top: 10px; left: 10px; transform: translate(0, 0);',
                'top-center': 'top: 10px; left: 50%; transform: translate(-50%, 0);',
                'top-right': 'top: 10px; right: 10px; transform: translate(0, 0);',
                'center-left': 'top: 50%; left: 10px; transform: translate(0, -50%);',
                'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
                'center-right': 'top: 50%; right: 10px; transform: translate(0, -50%);',
                'bottom-left': 'bottom: 10px; left: 10px; transform: translate(0, 0);',
                'bottom-center': 'bottom: 10px; left: 50%; transform: translate(-50%, 0);',
                'bottom-right': 'bottom: 10px; right: 10px; transform: translate(0, 0);'
            };
            return positions[position] || positions['center'];
        }
        
        function getSizeStyles(size) {
            const sizes = {
                'small': 'max-width: 128px; max-height: 128px; width: auto; height: auto;',
                'medium': 'max-width: 512px; max-height: 512px; width: auto; height: auto;',
                'original': 'max-width: 90%; max-height: 90%; width: auto; height: auto;'
            };
            return sizes[size] || sizes['medium'];
        }
        
        function testPositionSize(position, size, gifUrl) {
            const container = document.getElementById('gif-container');
            container.innerHTML = '';
            
            const positionStyles = getPositionStyles(position);
            const sizeStyles = getSizeStyles(size);
            
            const gifElement = document.createElement('img');
            gifElement.src = gifUrl || 'https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif';
            gifElement.style.cssText = \`
                position: absolute;
                \${positionStyles}
                \${sizeStyles}
                object-fit: contain;
                pointer-events: none;
                z-index: 9999;
            \`;
            
            container.appendChild(gifElement);
            
            // Wait for image to load, then check computed styles
            gifElement.onload = () => {
                const computed = window.getComputedStyle(gifElement);
                const result = {
                    position: position,
                    size: size,
                    computed: {
                        position: computed.position,
                        top: computed.top,
                        left: computed.left,
                        right: computed.right,
                        bottom: computed.bottom,
                        maxWidth: computed.maxWidth,
                        maxHeight: computed.maxHeight,
                        width: computed.width,
                        height: computed.height
                    },
                    passed: true
                };
                
                // Verify position
                if (position === 'top-left') {
                    result.passed = result.passed && (computed.top !== '0px' || computed.left !== '0px');
                } else if (position === 'top-right') {
                    result.passed = result.passed && (computed.right !== '0px');
                } else if (position === 'bottom-left') {
                    result.passed = result.passed && (computed.bottom !== '0px' || computed.left !== '0px');
                } else if (position === 'bottom-right') {
                    result.passed = result.passed && (computed.bottom !== '0px' && computed.right !== '0px');
                } else if (position === 'center') {
                    result.passed = result.passed && (computed.top.includes('50%') || computed.left.includes('50%'));
                }
                
                // Verify size
                if (size === 'small') {
                    result.passed = result.passed && (parseInt(computed.maxWidth) <= 128 || parseInt(computed.maxHeight) <= 128);
                } else if (size === 'medium') {
                    result.passed = result.passed && (parseInt(computed.maxWidth) <= 512 || parseInt(computed.maxHeight) <= 512);
                }
                
                testResults.push(result);
                displayResults();
            };
        }
        
        function displayResults() {
            const resultsDiv = document.getElementById('test-results');
            resultsDiv.innerHTML = testResults.map(r => \`
                <div class="test-result \${r.passed ? 'pass' : 'fail'}">
                    <strong>Position: \${r.position}, Size: \${r.size}</strong><br>
                    Top: \${r.computed.top}, Left: \${r.computed.left}, Right: \${r.computed.right}, Bottom: \${r.computed.bottom}<br>
                    MaxWidth: \${r.computed.maxWidth}, MaxHeight: \${r.computed.maxHeight}<br>
                    Width: \${r.computed.width}, Height: \${r.computed.height}<br>
                    <strong>Result: \${r.passed ? 'PASS' : 'FAIL'}</strong>
                </div>
            \`).join('');
        }
        
        // Run tests
        const testCases = [
            { position: 'top-left', size: 'small' },
            { position: 'top-right', size: 'medium' },
            { position: 'center', size: 'original' }
        ];
        
        let testIndex = 0;
        function runNextTest() {
            if (testIndex < testCases.length) {
                const test = testCases[testIndex];
                console.log(\`Testing position: \${test.position}, size: \${test.size}\`);
                testPositionSize(test.position, test.size);
                testIndex++;
                setTimeout(runNextTest, 2000);
            }
        }
        
        // Start tests after page load
        window.addEventListener('load', () => {
            setTimeout(runNextTest, 500);
        });
    </script>
</body>
</html>`;
        
        const testHtmlPath = path.join(__dirname, '..', 'public', 'test-gif-position-size.html');
        fs.writeFileSync(testHtmlPath, testHtml);
        console.log(`   ✓ Created test page: ${testHtmlPath}`);
        console.log(`   Open http://localhost:3000/test-gif-position-size.html to view tests`);
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary:');
        console.log(`   ✅ Passed: ${results.passed}`);
        console.log(`   ❌ Failed: ${results.failed}`);
        
        if (results.errors.length > 0) {
            console.log('\n❌ Errors:');
            results.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error}`);
            });
        }
        
        console.log('='.repeat(60));
        
        if (results.failed === 0) {
            console.log('\n✅ All database tests passed!');
            console.log('\n💡 Next steps:');
            console.log('   1. Open http://localhost:3000/test-gif-position-size.html');
            console.log('   2. Verify GIFs appear in correct positions and sizes');
            console.log('   3. Check console for any errors');
            process.exit(0);
        } else {
            console.log(`\n⚠️  ${results.failed} test(s) failed`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

testGifPositionSize();

