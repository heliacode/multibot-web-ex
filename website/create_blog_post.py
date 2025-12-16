#!/usr/bin/env python3
"""
MultiBot Blog Post Creator
Quickly create new blog posts from a template.
"""

import sys
import re
from datetime import datetime
from pathlib import Path

TEMPLATE_FILE = Path(__file__).parent / "templates" / "blog-post-template.html"
POSTS_DIR = Path(__file__).parent / "blog" / "posts"

def slugify(text):
    """Convert text to URL-friendly slug."""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')

def create_blog_post(title):
    """Create a new blog post from template."""
    if not TEMPLATE_FILE.exists():
        print(f"Template not found: {TEMPLATE_FILE}")
        return None
    
    # Generate filename
    filename = f"{slugify(title)}.html"
    filepath = POSTS_DIR / filename
    
    if filepath.exists():
        print(f"Post already exists: {filename}")
        response = input("Overwrite? (y/N): ")
        if response.lower() != 'y':
            return None
    
    # Read template
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        template = f.read()
    
    # Get current date
    now = datetime.now()
    date_str = now.strftime('%Y-%m-%d')
    formatted_date = now.strftime('%B %d, %Y')
    published_time = now.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    # Replace placeholders
    content = template
    content = content.replace('{{TITLE}}', title)
    content = content.replace('{{DATE}}', date_str)
    content = content.replace('{{FORMATTED_DATE}}', formatted_date)
    content = content.replace('{{PUBLISHED_TIME}}', published_time)
    content = content.replace('{{FILENAME}}', filename)
    content = content.replace('{{EXCERPT}}', f"Learn about {title.lower()} and how it can help enhance your Twitch stream.")
    content = content.replace('{{DESCRIPTION}}', f"{title} - Learn how to enhance your Twitch stream with MultiBot.")
    content = content.replace('{{KEYWORDS}}', 'twitch bot, stream management')
    content = content.replace('{{READ_TIME}}', '5')  # Default, can be updated manually
    content = content.replace('{{CONTENT}}', f"""
                <p class="text-white/90 text-lg leading-relaxed mb-6">
                    This is a placeholder blog post. Edit this file to add your content.
                </p>
                
                <h2 class="text-3xl font-bold text-white mt-8 mb-4">Getting Started</h2>
                <p class="text-white/90 text-lg leading-relaxed mb-6">
                    Add your content here...
                </p>
    """)
    
    # Ensure posts directory exists
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Write file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Created blog post: {filepath}")
    print(f"Edit the file to add your content, then run:")
    print(f"  python blog_automation.py --action full")
    
    return filepath

def main():
    if len(sys.argv) < 2:
        print("Usage: python create_blog_post.py \"Your Blog Post Title\"")
        sys.exit(1)
    
    title = sys.argv[1]
    create_blog_post(title)

if __name__ == "__main__":
    main()
