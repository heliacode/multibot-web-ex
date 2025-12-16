/**
 * Browser-based test to verify GIF position and size rendering
 * This script will be injected into the OBS source page to test rendering
 */

// This will be injected into the browser console or run as a test
const testGifRendering = () => {
    const results = [];
    
    // Mock command data with different positions and sizes
    const testCases = [
        { position: 'top-left', size: 'small', expected: { top: '10px', left: '10px', maxWidth: '128px' } },
        { position: 'top-right', size: 'medium', expected: { top: '10px', right: '10px', maxWidth: '512px' } },
        { position: 'center', size: 'original', expected: { top: '50%', left: '50%', maxWidth: '90%' } }
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\n🧪 Test ${index + 1}: Position=${testCase.position}, Size=${testCase.size}`);
        
        // Get the showGifCommand function from the page
        const commandData = {
            type: 'gif_command',
            gifUrl: 'https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif',
            position: testCase.position,
            size: testCase.size,
            duration: 10000 // Longer duration for testing
        };
        
        // Call the function
        if (typeof showGifCommand === 'function') {
            showGifCommand(commandData);
            
            // Wait a bit for the GIF to load
            setTimeout(() => {
                const gifContainer = document.getElementById('gif-container');
                const gifElement = gifContainer?.querySelector('img');
                
                if (gifElement) {
                    const computed = window.getComputedStyle(gifElement);
                    const result = {
                        testCase,
                        computed: {
                            position: computed.position,
                            top: computed.top,
                            left: computed.left,
                            right: computed.right,
                            bottom: computed.bottom,
                            maxWidth: computed.maxWidth,
                            maxHeight: computed.maxHeight
                        },
                        passed: true
                    };
                    
                    // Verify position
                    if (testCase.position.includes('top')) {
                        result.passed = result.passed && computed.top !== '0px' && computed.top !== 'auto';
                    }
                    if (testCase.position.includes('bottom')) {
                        result.passed = result.passed && computed.bottom !== '0px' && computed.bottom !== 'auto';
                    }
                    if (testCase.position.includes('left')) {
                        result.passed = result.passed && computed.left !== '0px' && computed.left !== 'auto';
                    }
                    if (testCase.position.includes('right')) {
                        result.passed = result.passed && computed.right !== '0px' && computed.right !== 'auto';
                    }
                    
                    // Verify size
                    if (testCase.size === 'small') {
                        result.passed = result.passed && (parseInt(computed.maxWidth) <= 128 || parseInt(computed.maxHeight) <= 128);
                    } else if (testCase.size === 'medium') {
                        result.passed = result.passed && (parseInt(computed.maxWidth) <= 512 || parseInt(computed.maxHeight) <= 512);
                    }
                    
                    results.push(result);
                    console.log(`   Result: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
                    console.log(`   Computed:`, result.computed);
                    
                    // Clear for next test
                    gifContainer.innerHTML = '';
                } else {
                    console.log('   ❌ FAIL: GIF element not found');
                    results.push({ testCase, passed: false, error: 'GIF element not found' });
                }
            }, 2000);
        } else {
            console.log('   ❌ FAIL: showGifCommand function not found');
            results.push({ testCase, passed: false, error: 'showGifCommand not found' });
        }
    });
    
    // Return results after all tests
    setTimeout(() => {
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
        return results;
    }, 10000);
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = testGifRendering;
} else {
    window.testGifRendering = testGifRendering;
}

