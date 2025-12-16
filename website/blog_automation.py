#!/usr/bin/env python3
"""
MultiBot Blog Automation Script
Automatically discovers blog posts, generates manifest, and updates sitemap.
"""

import os
import json
import re
from datetime import datetime
from pathlib import Path

# Configuration
BLOG_POSTS_DIR = Path(__file__).parent / "blog" / "posts"
MANIFEST_FILE = BLOG_POSTS_DIR / "manifest.json"
STATIC_DIR = Path(__file__).parent / "blog" / "static"
SITEMAP_FILE = Path(__file__).parent / "sitemap.xml"
BASE_URL = "https://multibot.com"

def extract_metadata(html_file):
    """Extract metadata from HTML file."""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    metadata = {
        'filename': html_file.name,
        'title': '',
        'date': '',
        'excerpt': '',
        'url': f"{BASE_URL}/blog/posts/{html_file.name}"
    }
    
    # Extract title
    title_match = re.search(r'<title>(.*?)\s*\|\s*MultiBot</title>', content)
    if title_match:
        metadata['title'] = title_match.group(1).strip()
    
    # Extract date
    date_match = re.search(r'<meta\s+name=["\']date["\']\s+content=["\']([^"\']+)["\']', content)
    if date_match:
        metadata['date'] = date_match.group(1)
    
    # Extract excerpt
    excerpt_match = re.search(r'<meta\s+name=["\']excerpt["\']\s+content=["\']([^"\']+)["\']', content)
    if excerpt_match:
        metadata['excerpt'] = excerpt_match.group(1)
    
    # Extract published time
    published_match = re.search(r'<meta\s+property=["\']article:published_time["\']\s+content=["\']([^"\']+)["\']', content)
    if published_match:
        metadata['published_time'] = published_match.group(1)
    
    return metadata

def discover_posts():
    """Discover all blog posts in the posts directory."""
    posts = []
    
    if not BLOG_POSTS_DIR.exists():
        print(f"Blog posts directory not found: {BLOG_POSTS_DIR}")
        return posts
    
    for html_file in BLOG_POSTS_DIR.glob("*.html"):
        if html_file.name == "manifest.json":
            continue
        
        try:
            metadata = extract_metadata(html_file)
            if metadata['title']:  # Only include if we found a title
                posts.append(metadata)
        except Exception as e:
            print(f"Error processing {html_file.name}: {e}")
    
    # Sort by date (newest first)
    posts.sort(key=lambda x: x.get('date', ''), reverse=True)
    
    return posts

def generate_manifest(posts):
    """Generate manifest.json file."""
    manifest = {
        'posts': posts,
        'lastUpdated': datetime.now().isoformat(),
        'totalPosts': len(posts)
    }
    
    with open(MANIFEST_FILE, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    
    print(f"Generated manifest with {len(posts)} posts")
    return manifest

def create_static_version(html_file):
    """Create a simplified static version for SEO."""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract article content (simplified)
    # This is a basic implementation - you might want to improve it
    article_match = re.search(r'<article[^>]*>(.*?)</article>', content, re.DOTALL)
    if article_match:
        article_content = article_match.group(1)
        
        # Create static directory if it doesn't exist
        STATIC_DIR.mkdir(parents=True, exist_ok=True)
        
        # Write simplified version
        static_file = STATIC_DIR / html_file.name
        with open(static_file, 'w', encoding='utf-8') as f:
            f.write(f"<article>{article_content}</article>")
        
        return static_file
    
    return None

def update_sitemap(posts):
    """Update sitemap.xml with blog posts."""
    urls = [
        f"{BASE_URL}/",
        f"{BASE_URL}/about.html",
        f"{BASE_URL}/features.html",
        f"{BASE_URL}/pricing.html",
        f"{BASE_URL}/contact.html",
        f"{BASE_URL}/blog/blogs.html"
    ]
    
    # Add blog posts
    for post in posts:
        urls.append(post['url'])
    
    sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
"""
    
    for url in urls:
        sitemap += f"""    <url>
        <loc>{url}</loc>
        <lastmod>{datetime.now().strftime('%Y-%m-%d')}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
"""
    
    sitemap += "</urlset>"
    
    with open(SITEMAP_FILE, 'w', encoding='utf-8') as f:
        f.write(sitemap)
    
    print(f"Updated sitemap with {len(urls)} URLs")

def main():
    """Main function."""
    import sys
    
    action = sys.argv[1] if len(sys.argv) > 1 else 'full'
    
    if action == 'discover':
        posts = discover_posts()
        print(f"Discovered {len(posts)} blog posts:")
        for post in posts:
            print(f"  - {post['filename']}: {post['title']}")
    
    elif action == 'manifest':
        posts = discover_posts()
        generate_manifest(posts)
    
    elif action == 'static':
        posts = discover_posts()
        for post in posts:
            html_file = BLOG_POSTS_DIR / post['filename']
            if html_file.exists():
                create_static_version(html_file)
        print(f"Created static versions for {len(posts)} posts")
    
    elif action == 'sitemap':
        posts = discover_posts()
        update_sitemap(posts)
    
    elif action == 'full':
        print("Running full blog automation...")
        posts = discover_posts()
        print(f"Discovered {len(posts)} posts")
        
        if posts:
            generate_manifest(posts)
            
            # Create static versions
            for post in posts:
                html_file = BLOG_POSTS_DIR / post['filename']
                if html_file.exists():
                    create_static_version(html_file)
            
            update_sitemap(posts)
            print("Blog automation complete!")
        else:
            print("No blog posts found.")
    
    else:
        print(f"Unknown action: {action}")
        print("Available actions: discover, manifest, static, sitemap, full")

if __name__ == "__main__":
    main()
