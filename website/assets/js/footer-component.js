// Footer Component for MultiBot Website
(function() {
    'use strict';

    const footerHTML = `
        <footer class="glass-effect mt-20 py-12">
            <div class="container mx-auto px-4">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <!-- Brand -->
                    <div>
                        <h3 class="text-xl font-bold text-white mb-4">
                            <i class="fab fa-twitch"></i>
                            <span class="ml-2">MultiBot</span>
                        </h3>
                        <p class="text-white/80 text-sm">
                            Powerful Twitch bot management platform for streamers.
                        </p>
                    </div>
                    
                    <!-- Quick Links -->
                    <div>
                        <h4 class="text-white font-semibold mb-4">Quick Links</h4>
                        <ul class="space-y-2">
                            <li><a href="/" class="text-white/80 hover:text-white text-sm">Home</a></li>
                            <li><a href="/features.html" class="text-white/80 hover:text-white text-sm">Features</a></li>
                            <li><a href="/pricing.html" class="text-white/80 hover:text-white text-sm">Pricing</a></li>
                            <li><a href="/about.html" class="text-white/80 hover:text-white text-sm">About</a></li>
                        </ul>
                    </div>
                    
                    <!-- Resources -->
                    <div>
                        <h4 class="text-white font-semibold mb-4">Resources</h4>
                        <ul class="space-y-2">
                            <li><a href="/blog/blogs.html" class="text-white/80 hover:text-white text-sm">Blog</a></li>
                            <li><a href="/contact.html" class="text-white/80 hover:text-white text-sm">Contact</a></li>
                            <li><a href="/dashboard" class="text-white/80 hover:text-white text-sm">Dashboard</a></li>
                        </ul>
                    </div>
                    
                    <!-- Social -->
                    <div>
                        <h4 class="text-white font-semibold mb-4">Connect</h4>
                        <div class="flex gap-4">
                            <a href="#" class="text-white/80 hover:text-white text-xl">
                                <i class="fab fa-twitch"></i>
                            </a>
                            <a href="#" class="text-white/80 hover:text-white text-xl">
                                <i class="fab fa-twitter"></i>
                            </a>
                            <a href="#" class="text-white/80 hover:text-white text-xl">
                                <i class="fab fa-github"></i>
                            </a>
                        </div>
                    </div>
                </div>
                
                <div class="border-t border-white/20 mt-8 pt-8 text-center">
                    <p class="text-white/60 text-sm">
                        &copy; ${new Date().getFullYear()} MultiBot. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    `;

    // Insert footer into page
    function initFooter() {
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (footerPlaceholder) {
            footerPlaceholder.innerHTML = footerHTML;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFooter);
    } else {
        initFooter();
    }
})();
