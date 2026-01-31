/**
 * Social Media Share Utilities
 * Handles sharing with context-aware hashtags
 */

// Twitter character limit (280 characters)
const TWITTER_MAX_LENGTH = 280;

/**
 * Topic detection and hashtag mapping
 */
const TOPIC_HASHTAGS = {
    // Trading Card Games
    'magic the gathering': ['#mtg', '#magicthegathering', '#tcg', '#mtgarena', '#mtgo', '#wotc'],
    'mtg': ['#mtg', '#magicthegathering', '#tcg', '#mtgarena', '#mtgo', '#wotc'],
    'pokemon': ['#pokemon', '#pokemontcg', '#tcg', '#pokemongo', '#nintendo'],
    'yugioh': ['#yugioh', '#yugiohtcg', '#tcg', '#konami'],
    'hearthstone': ['#hearthstone', '#hs', '#blizzard', '#cardgame'],
    'tcg': ['#tcg', '#tradingcardgame', '#cardgame', '#collectibles'],
    
    // Streaming & Gaming
    'twitch': ['#twitch', '#streaming', '#twitchstreamer', '#livestream', '#gaming'],
    'streaming': ['#streaming', '#twitch', '#livestream', '#gaming', '#contentcreator'],
    'gaming': ['#gaming', '#gamer', '#videogames', '#twitch', '#streaming'],
    'esports': ['#esports', '#gaming', '#competitive', '#progaming'],
    'content creator': ['#contentcreator', '#streaming', '#twitch', '#youtube', '#gaming'],
    
    // Technology
    'tech': ['#tech', '#technology', '#innovation', '#software'],
    'web development': ['#webdev', '#webdevelopment', '#coding', '#programming', '#javascript'],
    'javascript': ['#javascript', '#js', '#webdev', '#coding', '#programming'],
    'nodejs': ['#nodejs', '#node', '#javascript', '#webdev', '#backend'],
    'react': ['#react', '#reactjs', '#javascript', '#webdev', '#frontend'],
    'python': ['#python', '#coding', '#programming', '#webdev', '#datascience'],
    'ai': ['#ai', '#artificialintelligence', '#machinelearning', '#tech', '#innovation'],
    
    // Default
    'default': ['#multibot', '#twitch', '#streaming']
};

/**
 * Detect topic from text content
 */
function detectTopic(text, title, keywords) {
    if (!text) text = '';
    if (!title) title = '';
    if (!keywords) keywords = '';
    
    const combined = (text + ' ' + title + ' ' + keywords).toLowerCase();
    
    // Check for specific topics
    for (const [topic, hashtags] of Object.entries(TOPIC_HASHTAGS)) {
        if (topic === 'default') continue;
        
        // Check if topic keywords appear in the content
        const topicWords = topic.split(' ');
        const matches = topicWords.filter(word => combined.includes(word));
        
        if (matches.length === topicWords.length || combined.includes(topic)) {
            return topic;
        }
    }
    
    return 'default';
}

/**
 * Get hashtags for a topic
 */
function getHashtagsForTopic(topic) {
    return TOPIC_HASHTAGS[topic] || TOPIC_HASHTAGS['default'];
}

/**
 * Truncate text to fit within Twitter's character limit
 * Accounts for URL length (23 characters) and hashtags
 */
function truncateForTwitter(text, url, hashtags) {
    const urlLength = 23; // Twitter shortens URLs to 23 chars
    const hashtagsText = hashtags.join(' ');
    const hashtagsLength = hashtagsText.length;
    const spacing = 3; // Spaces between text, URL, and hashtags
    
    const availableLength = TWITTER_MAX_LENGTH - urlLength - hashtagsLength - spacing;
    
    if (text.length <= availableLength) {
        return text;
    }
    
    // Truncate and add ellipsis
    return text.substring(0, availableLength - 3) + '...';
}

/**
 * Generate Twitter share URL with context-aware hashtags
 */
function generateTwitterShareUrl(text, url, title, keywords) {
    // Detect topic from content
    const topic = detectTopic(text, title, keywords);
    const hashtags = getHashtagsForTopic(topic);
    
    // Build the tweet text
    let tweetText = text || title || '';
    
    // Truncate if necessary
    tweetText = truncateForTwitter(tweetText, url, hashtags);
    
    // Build the full tweet with URL and hashtags
    const hashtagsText = hashtags.join(' ');
    const fullTweet = `${tweetText} ${url} ${hashtagsText}`.trim();
    
    // Encode for URL
    const encodedTweet = encodeURIComponent(fullTweet);
    
    return `https://twitter.com/intent/tweet?text=${encodedTweet}`;
}

/**
 * Generate Facebook share URL
 */
function generateFacebookShareUrl(url) {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/**
 * Copy URL to clipboard
 */
async function copyToClipboard(url) {
    try {
        await navigator.clipboard.writeText(url);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

/**
 * Initialize share buttons on page load
 */
function initShareButtons() {
    // Find all share buttons
    const twitterButtons = document.querySelectorAll('a[data-share="twitter"]');
    const facebookButtons = document.querySelectorAll('a[data-share="facebook"]');
    const copyButtons = document.querySelectorAll('a[data-share="copy"]');
    
    // Get page metadata
    const pageUrl = window.location.href;
    const pageTitle = document.querySelector('meta[property="og:title"]')?.content || 
                     document.title || 
                     '';
    const pageDescription = document.querySelector('meta[property="og:description"]')?.content ||
                          document.querySelector('meta[name="description"]')?.content ||
                          '';
    const pageKeywords = document.querySelector('meta[name="keywords"]')?.content || '';
    
    // Get article content for topic detection
    const articleContent = document.querySelector('article')?.textContent || '';
    
    // Setup Twitter buttons
    twitterButtons.forEach(button => {
        const customText = button.getAttribute('data-text');
        const customUrl = button.getAttribute('data-url') || pageUrl;
        const text = customText || pageDescription || pageTitle;
        
        button.href = generateTwitterShareUrl(text, customUrl, pageTitle, pageKeywords);
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
    });
    
    // Setup Facebook buttons
    facebookButtons.forEach(button => {
        const customUrl = button.getAttribute('data-url') || pageUrl;
        button.href = generateFacebookShareUrl(customUrl);
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
    });
    
    // Setup copy buttons
    copyButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const customUrl = button.getAttribute('data-url') || pageUrl;
            const success = await copyToClipboard(customUrl);
            
            if (success) {
                // Show feedback
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i>';
                button.style.color = '#10b981'; // green
                
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.style.color = '';
                }, 2000);
            } else {
                alert('Failed to copy URL. Please copy manually: ' + customUrl);
            }
        });
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShareButtons);
} else {
    initShareButtons();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateTwitterShareUrl,
        generateFacebookShareUrl,
        copyToClipboard,
        detectTopic,
        getHashtagsForTopic
    };
}
