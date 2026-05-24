---
description: How to run the lawyer premium theme locally
---

# Lawyer Premium Theme - Development Workflow

## Running the Theme Locally

The lawyer premium theme is a static HTML/CSS/JS website that can be previewed directly in the browser.

### Method 1: Direct Browser (Simplest)

Open any HTML file directly in your browser:

```bash
# Navigate to the theme folder
cd templates/lawyer-premium

# Open index.html in default browser
open index.html  # macOS
start index.html # Windows
```

### Method 2: Local HTTP Server (Recommended)

Use Python or Node.js to serve files with proper MIME types:

**Using Python (usually pre-installed):**
```bash
cd templates/lawyer-premium

# Python 3
python3 -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

**Using Node.js (npx):**
```bash
cd templates/lawyer-premium
npx http-server -p 8080
```

**Using VS Code:**
1. Install "Live Server" extension
2. Right-click on `index.html` > "Open with Live Server"

Then open http://localhost:8080 in your browser.

## File Structure

```
templates/lawyer-premium/
├── index.html      # Home page
├── servicii.html   # Services page
├── cazuri.html     # Cases/portfolio page
├── echipa.html     # Team page
├── contact.html    # Contact page
├── blog.html       # Blog page
├── css/
│   └── style.css   # Shared styles
└── js/
    └── main.js     # Shared scripts
```

## Features

- **6 fully functional pages** with navigation
- **Responsive design** (mobile-first)
- **Animations and effects** (loader, scroll reveal, counters)
- **Mobile menu** with overlay
- **Smooth scrolling** for anchor links
- **Working contact form** (frontend simulation)

## Testing Checklist

- [ ] All 6 pages load correctly
- [ ] Navigation works between pages
- [ ] Mobile menu opens/closes
- [ ] Scroll animations trigger on scroll
- [ ] Counter animations work
- [ ] Contact form validates inputs
- [ ] All images load properly
- [ ] No console errors

## Customization

Edit these files to customize the theme:

- **Colors:** Edit CSS variables in `css/style.css` (lines 1-30)
- **Content:** Edit the HTML files directly
- **Images:** Replace image URLs with your own
- **Contact:** Update email/phone in `contact.html` footer
