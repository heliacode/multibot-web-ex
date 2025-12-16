// Header Component for MultiBot Website
(function() {
    'use strict';

    const headerHTML = `
        <nav class="navbar glass-effect w-full shadow-lg sticky top-0 z-50">
            <div class="container mx-auto px-4">
                <div class="flex items-center justify-between w-full">
                    <!-- Logo -->
                    <div class="flex-1">
                        <a href="/" class="btn btn-ghost text-xl text-white">
                            <i class="fab fa-twitch"></i>
                            <span class="ml-2 font-bold">MultiBot</span>
                        </a>
                    </div>
                    
                    <!-- Desktop Navigation -->
                    <div class="hidden md:flex flex-1 justify-center gap-4">
                        <a href="/" class="btn btn-ghost text-white">Home</a>
                        <a href="/features.html" class="btn btn-ghost text-white">Features</a>
                        <a href="/pricing.html" class="btn btn-ghost text-white">Pricing</a>
                        <a href="/blog/blogs.html" class="btn btn-ghost text-white">Blog</a>
                        <a href="/about.html" class="btn btn-ghost text-white">About</a>
                        <a href="/contact.html" class="btn btn-ghost text-white">Contact</a>
                    </div>
                    
                    <!-- CTA Button -->
                    <div class="flex-1 flex justify-end">
                        <a href="/dashboard" class="btn btn-primary text-white">
                            <i class="fas fa-sign-in-alt"></i>
                            <span class="ml-2">Dashboard</span>
                        </a>
                    </div>
                    
                    <!-- Mobile Menu Toggle -->
                    <div class="md:hidden">
                        <button id="mobile-menu-toggle" class="btn btn-square btn-ghost text-white">
                            <i class="fas fa-bars text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Mobile Menu -->
                <div id="mobile-menu" class="hidden md:hidden mt-4 pb-4">
                    <div class="flex flex-col gap-2">
                        <a href="/" class="btn btn-ghost text-white justify-start">Home</a>
                        <a href="/features.html" class="btn btn-ghost text-white justify-start">Features</a>
                        <a href="/pricing.html" class="btn btn-ghost text-white justify-start">Pricing</a>
                        <a href="/blog/blogs.html" class="btn btn-ghost text-white justify-start">Blog</a>
                        <a href="/about.html" class="btn btn-ghost text-white justify-start">About</a>
                        <a href="/contact.html" class="btn btn-ghost text-white justify-start">Contact</a>
                        <a href="/dashboard" class="btn btn-primary text-white justify-start">
                            <i class="fas fa-sign-in-alt"></i>
                            <span class="ml-2">Dashboard</span>
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    `;

    // Insert header into page
    function initHeader() {
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (headerPlaceholder) {
            headerPlaceholder.innerHTML = headerHTML;
            
            // Mobile menu toggle
            const toggle = document.getElementById('mobile-menu-toggle');
            const menu = document.getElementById('mobile-menu');
            if (toggle && menu) {
                toggle.addEventListener('click', () => {
                    menu.classList.toggle('hidden');
                });
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeader);
    } else {
        initHeader();
    }
})();
