# CMS Content Structure - General Purpose

## Standard Sections (for any website type)

### 1. Global Settings
```json
{
  "businessName": "Company Name",
  "tagline": "Company tagline/slogan",
  "description": "Business description",
  "logo": "logo-url.png",
  "favicon": "favicon.ico",
  "primaryColor": "#D4AF37",
  "secondaryColor": "#1a1a1a",
  "fonts": {
    "heading": "Cormorant Garamond",
    "body": "Montserrat"
  }
}
```

### 2. Navigation
```json
{
  "logo": { "text": "Logo", "icon": "icon-url" },
  "menuItems": [
    { "label": "Home", "url": "/", "active": true },
    { "label": "Services", "url": "/services", "active": false },
    { "label": "About", "url": "/about", "active": false },
    { "label": "Contact", "url": "/contact", "active": false }
  ],
  "ctaButton": { "label": "Contact Us", "url": "/contact" }
}
```

### 3. Hero Section (per page)
```json
{
  "badge": { "text": "New Feature", "icon": "star" },
  "title": "Main Headline",
  "subtitle": "Supporting text",
  "description": "Detailed description paragraph",
  "backgroundImage": "hero-bg.jpg",
  "backgroundVideo": "hero-video.mp4",
  "primaryButton": { "label": "Get Started", "url": "/contact" },
  "secondaryButton": { "label": "Learn More", "url": "/about" },
  "sideImage": "hero-side.png"
}
```

### 4. Services Section
```json
{
  "sectionTitle": "Our Services",
  "sectionSubtitle": "What we offer",
  "services": [
    {
      "id": "service-1",
      "icon": "icon-name",
      "title": "Service Name",
      "description": "Service description",
      "features": ["Feature 1", "Feature 2", "Feature 3"],
      "image": "service-1.jpg",
      "link": "/services/detail"
    }
  ]
}
```

### 5. About Section
```json
{
  "sectionTitle": "About Us",
  "mainText": "Main paragraph about the company",
  "secondaryText": "Additional information",
  "stats": [
    { "number": "25+", "label": "Years Experience" },
    { "number": "500+", "label": "Happy Clients" }
  ],
  "image": "about-team.jpg",
  "features": [
    { "icon": "check", "text": "Feature highlight 1" },
    { "icon": "check", "text": "Feature highlight 2" }
  ]
}
```

### 6. Team Section
```json
{
  "sectionTitle": "Our Team",
  "sectionSubtitle": "Meet the experts",
  "members": [
    {
      "id": "member-1",
      "name": "John Doe",
      "role": "CEO",
      "bio": "Short bio text",
      "image": "john.jpg",
      "social": {
        "linkedin": "url",
        "twitter": "url"
      }
    }
  ]
}
```

### 7. Testimonials Section
```json
{
  "sectionTitle": "What Clients Say",
  "testimonials": [
    {
      "id": "testimonial-1",
      "quote": "The service was excellent...",
      "author": "Jane Smith",
      "role": "Company CEO",
      "rating": 5,
      "image": "jane.jpg"
    }
  ]
}
```

### 8. Gallery/Portfolio Section
```json
{
  "sectionTitle": "Our Work",
  "items": [
    {
      "id": "item-1",
      "title": "Project Name",
      "category": "Web Design",
      "image": "project-1.jpg",
      "description": "Project description",
      "link": "/portfolio/project-1"
    }
  ]
}
```

### 9. Blog/News Section
```json
{
  "sectionTitle": "Latest News",
  "posts": [
    {
      "id": "post-1",
      "title": "Article Title",
      "excerpt": "Short excerpt...",
      "content": "Full article content",
      "image": "article-1.jpg",
      "date": "2024-01-15",
      "author": "Author Name",
      "category": "Business",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

### 10. Contact Section
```json
{
  "sectionTitle": "Get in Touch",
  "description": "Contact description text",
  "phone": "+1 234 567 890",
  "email": "contact@company.com",
  "address": "123 Street, City, Country",
  "hours": "Mon-Fri: 9AM - 6PM",
  "mapUrl": "https://maps.google.com/...",
  "formFields": [
    { "name": "name", "label": "Your Name", "type": "text", "required": true },
    { "name": "email", "label": "Email", "type": "email", "required": true },
    { "name": "message", "label": "Message", "type": "textarea", "required": true }
  ]
}
```

### 11. CTA Section
```json
{
  "title": "Ready to get started?",
  "subtitle": "Contact us today",
  "button": { "label": "Contact Now", "url": "/contact" },
  "background": "cta-bg.jpg"
}
```

### 12. Footer
```json
{
  "logo": { "text": "Logo", "image": "logo-white.png" },
  "description": "Company description",
  "columns": [
    {
      "title": "Quick Links",
      "links": [
        { "label": "Home", "url": "/" },
        { "label": "About", "url": "/about" }
      ]
    },
    {
      "title": "Services",
      "links": [
        { "label": "Service 1", "url": "/services/1" },
        { "label": "Service 2", "url": "/services/2" }
      ]
    }
  ],
  "socialLinks": {
    "facebook": "url",
    "instagram": "url",
    "linkedin": "url",
    "twitter": "url"
  },
  "copyright": "© 2024 Company Name. All rights reserved."
}
```

## Page Structure

Each page has:
- `meta` (title, description, keywords, ogImage)
- `sections[]` (array of section IDs in order)
- `sectionsData` (content for each section)

## CMS Dashboard Structure

### Site Settings
- Global settings (colors, fonts, logo)
- Navigation editor
- SEO defaults

### Pages
- Home
- Services/Products
- About
- Team
- Portfolio/Gallery
- Blog
- Contact
- Custom pages

### Each Page Editor
- Page settings (meta, slug)
- Section manager (add/remove/reorder sections)
- Section content editor (form fields based on section type)

### Media Library
- Images
- Videos
- Documents
