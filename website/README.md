# MultiBot Marketing Website

This is the marketing website for MultiBot, built with static HTML, Tailwind CSS, and DaisyUI.

## Structure

```
website/
├── index.html              # Homepage
├── about.html              # About page
├── features.html           # Features page
├── pricing.html            # Pricing page
├── contact.html            # Contact page
├── blog/
│   ├── blogs.html          # Blog listing page
│   ├── posts/              # Individual blog posts
│   │   ├── manifest.json   # Auto-generated post index
│   │   └── *.html          # Blog post files
│   └── static/             # Auto-generated static versions
├── assets/
│   ├── css/
│   │   └── style.css       # Custom styles
│   ├── js/
│   │   ├── header-component.js  # Reusable header
│   │   └── footer-component.js   # Reusable footer
│   └── images/             # Images and logos
├── templates/
│   └── blog-post-template.html  # Blog post template
├── blog_automation.py      # Blog automation script
├── create_blog_post.py     # Blog post creator
└── sitemap.xml             # SEO sitemap
```

## Blog System

The blog system is fully automated and uses static HTML files.

### Creating a New Blog Post

```bash
cd website
python create_blog_post.py "Your Blog Post Title"
```

This will:
1. Create a new HTML file in `blog/posts/`
2. Generate a filename from the title (slugified)
3. Fill in all SEO meta tags
4. Use the template structure

### Updating Blog Manifest

After creating or editing blog posts, run:

```bash
python blog_automation.py full
```

This will:
1. Discover all blog posts
2. Generate/update `manifest.json`
3. Create static versions for SEO
4. Update `sitemap.xml`

### Blog Automation Actions

- `discover` - List all discovered posts
- `manifest` - Generate manifest.json only
- `static` - Create static versions only
- `sitemap` - Update sitemap only
- `full` - Run all actions (recommended)

## Design System

The website uses the same design system as the MultiBot dashboard:

- **Gradient Background**: Cyan/blue gradient matching the app
- **Glass Morphism**: Glass-effect and glass-card classes
- **Typography**: Varela Round font family
- **Icons**: Font Awesome
- **Framework**: Tailwind CSS + DaisyUI

## Pages

### Homepage (`index.html`)
- Hero section with value proposition
- Feature highlights
- Call-to-action buttons

### About (`about.html`)
- Mission and vision
- What we do
- Why MultiBot

### Features (`features.html`)
- Detailed feature descriptions
- Feature grid layout

### Pricing (`pricing.html`)
- Free tier
- Pro tier ($6.99/month)
- FAQ section

### Contact (`contact.html`)
- Contact information
- Social links
- Support resources

### Blog (`blog/blogs.html`)
- Dynamic blog listing
- Loads from manifest.json
- Fallback system if manifest fails

## SEO Features

- Complete meta tags (title, description, keywords)
- Open Graph tags for social sharing
- Twitter Card support
- Structured data (JSON-LD)
- Auto-updated sitemap.xml
- Canonical URLs

## Server Integration

The website is served as the root of the application. The Express server serves:
- `/` → `website/index.html`
- `/about.html` → `website/about.html`
- `/blog/*` → `website/blog/*`
- `/dashboard` → App dashboard (unchanged)
- `/api/*` → API routes (unchanged)

## Development

1. Edit HTML files directly
2. Run blog automation after creating posts
3. Test locally with `npm start`
4. The website is automatically served by the Express server

## Notes

- All pages use shared header and footer components
- Blog posts are automatically discovered
- Manifest system ensures fast blog loading
- Static versions are generated for SEO optimization
