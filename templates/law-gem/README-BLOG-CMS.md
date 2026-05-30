# LAW GEM - Blog CMS Schema

## Prezentare Generală
Acest template include un sistem de blog complet CMS-ready. Articolele sunt marcate cu `data-article-id` și fiecare câmp are `data-field` pentru editare în CMS.

## Structură Blog

### Pagina Principală: blog.html
**Container articole:** `<section class="blog-cms-grid" data-section="blog-articles">`

### Schema Articol
Fiecare articol urmează această structură:

```html
<article class="blog-article-card" data-article-id="{unique-id}">
  <img data-field="article-{id}-image">
  <div class="blog-article-content">
    <span data-field="article-{id}-category">Categorie</span>
    <span data-field="article-{id}-date">Data</span>
    <span data-field="article-{id}-read-time">Timp citire</span>
    <h3 data-field="article-{id}-title">Titlu</h3>
    <p data-field="article-{id}-excerpt">Excerpt</p>
    <ul data-field="article-{id}-bullets">
      <li data-list-item="1">Punct 1</li>
      <li data-list-item="2">Punct 2</li>
    </ul>
    <div data-field="article-{id}-tags">
      <span class="blog-tag">Tag1</span>
      <span class="blog-tag">Tag2</span>
    </div>
  </div>
</article>
```

## Câmpuri Disponibile per Articol

### Câmpuri de Bază (Obligatorii)
- `article-{id}-title` - Titlul articolului (text)
- `article-{id}-slug` - URL-friendly slug (text)
- `article-{id}-category` - Categoria (text/select)
- `article-{id}-date` - Data publicării (date)
- `article-{id}-read-time` - Timp estimat citire (text)
- `article-{id}-image` - Imagine featured (image)
- `article-{id}-excerpt` - Rezumat/scurt descriere (textarea)
- `article-{id}-content` - Conținut complet (rich text/HTML)

### Câmpuri Opționale (Extensibile)
- `article-{id}-bullets` - Lista bullet points (array)
- `article-{id}-key-points` - Puncte cheie (array)
- `article-{id}-tags` - Taguri (array)
- `article-{id}-meta-title` - SEO Title (text)
- `article-{id}-meta-description` - SEO Description (textarea)
- `article-{id}-featured` - Articol featured (boolean)
- `article-{id}-status` - Published/Draft (select)
- `article-{id}-author-name` - Nume autor (text)
- `article-{id}-author-image` - Poza autor (image)
- `article-{id}-author-role` - Rol autor (text)

## Tipuri de Câmpuri Suportate

| Tip | Descriere | Exemplu |
|-----|-----------|---------|
| `text` | Input text simplu | Titlu, categorie |
| `textarea` | Text multi-line | Excerpt, descriere |
| `rich-text` | Editor WYSIWYG | Content complet |
| `image` | Upload imagine | Featured image, autor photo |
| `date` | Date picker | Data publicării |
| `select` | Dropdown | Categorie, status |
| `array` / `list` | Lista de items | Bullets, tags |
| `boolean` | Checkbox | Featured, published |
| `number` | Input numeric | Timp citire (minute) |
| `slug` | Auto-generat din titlu | URL-friendly |

## Extragere Articole (Pentru Backend)

### Algoritm Parse HTML
```javascript
// Pseudocode pentru extragere articole din blog.html
function extractBlogPosts(html) {
  const articles = [];
  const articleCards = html.querySelectorAll('[data-article-id]');
  
  articleCards.forEach(card => {
    const id = card.getAttribute('data-article-id');
    const article = {
      id: id,
      title: card.querySelector(`[data-field="article-${id}-title"]`)?.textContent,
      slug: generateSlug(title),
      category: card.querySelector(`[data-field="article-${id}-category"]`)?.textContent,
      date: card.querySelector(`[data-field="article-${id}-date"]`)?.textContent,
      readTime: card.querySelector(`[data-field="article-${id}-read-time"]`)?.textContent,
      excerpt: card.querySelector(`[data-field="article-${id}-excerpt"]`)?.textContent,
      image: card.querySelector(`[data-field="article-${id}-image"]`)?.src,
      // Extrage bullets
      bullets: Array.from(card.querySelectorAll(`[data-field="article-${id}-bullets"] li`))
        .map(li => li.textContent),
      // Extrage tags
      tags: Array.from(card.querySelectorAll(`[data-field="article-${id}-tags"] .blog-tag`))
        .map(tag => tag.textContent),
      content: '', // Va fi completat din blog-post.html sau editor
      status: 'published',
      featured: false
    };
    articles.push(article);
  });
  
  return articles;
}
```

## Pagina Articol Individual: blog-post.html

### Schema Conținut Articol
```html
<article data-section="article-content">
  <h1 data-field="article-title">Titlu</h1>
  <div data-field="article-meta">...</div>
  
  <!-- Secțiuni multiple -->
  <section data-section="section-1">
    <h2 data-field="section-1-heading">Titlu Secțiune</h2>
    <p data-field="section-1-paragraph">Paragraf...</p>
    <ul data-field="section-1-bullets">...</ul>
    <ol data-field="section-1-numbers">...</ol>
    <img data-field="section-1-image">
    <div data-field="section-1-highlight">...</div>
  </section>
</article>
```

## Dashboard Client - Funcționalități Necesare

### 1. Lista Bloguri (Tab Blog)
- [ ] Grid view cu toate articolele
- [ ] Search & filter (după categorie, data, status)
- [ ] Sortare (newest/oldest, A-Z)
- [ ] Quick actions: Edit, Preview, Delete
- [ ] Status indicator (Published/Draft)

### 2. Editor Articol
- [ ] **Sidebar cu câmpuri:**
  - Title (text input)
  - Slug (auto + manual override)
  - Category (dropdown: Drept Civil, Comercial, Penal, etc.)
  - Date (date picker)
  - Read Time (number input)
  - Featured Image (upload + URL)
  - Excerpt (textarea)
  - Content (rich text editor - TinyMCE/CKEditor)
  - Tags (multi-select + add new)
  - Key Points (repeater field)
  - SEO Title & Description
  - Author (select from list)
  - Status toggle (Draft/Published)
  - Featured toggle (Yes/No)

- [ ] **Live Preview** - split screen sau modal
- [ ] **Autosave** - la fiecare 30 secunde
- [ ] **Publish/Unpublish** - cu confirmare

### 3. Câmpuri Dinamice (Custom Fields)
Sistem de adăugat câmpuri custom per articol:
```javascript
// Exemplu schema câmpuri custom
customFields: [
  { name: 'video_url', type: 'url', label: 'Video URL' },
  { name: 'pdf_download', type: 'file', label: 'PDF Download' },
  { name: 'related_cases', type: 'repeater', fields: ['case_name', 'case_url'] },
  { name: 'sidebar_content', type: 'rich-text', label: 'Sidebar HTML' }
]
```

### 4. Management Autori
- [ ] Lista autori cu poze și bio
- [ ] Add/Edit/Delete autor
- [ ] Social links (LinkedIn, Twitter, Email)

### 5. Categorii & Tag-uri
- [ ] Management categorii (Add/Edit/Delete)
- [ ] Management tag-uri
- [ ] Asociere articole-categorii

### 6. Import/Export
- [ ] Export articole (JSON/CSV)
- [ ] Import articole din template
- [ ] Backup & Restore

## API Endpoints Necesare

```
GET    /api/blogs                    - Lista toate blogurile
GET    /api/blogs/:id                - Detalii articol
POST   /api/blogs                    - Creare articol nou
PUT    /api/blogs/:id                - Update articol
DELETE /api/blogs/:id                - Ștergere articol

GET    /api/blogs/categories         - Lista categorii
POST   /api/blogs/categories         - Creare categorie

GET    /api/blogs/authors            - Lista autori
POST   /api/blogs/authors            - Creare autor

POST   /api/blogs/:id/publish        - Publicare
POST   /api/blogs/:id/unpublish      - Unpublish
POST   /api/blogs/:id/duplicate      - Duplicare articol
```

## Flow Upload Template → Extrage Bloguri

1. **Upload template** în Admin UI
2. **Parse HTML** blog.html
3. **Detectează articole** după `data-article-id`
4. **Extrage câmpuri** din `data-field`
5. **Salvează în DB** ca entități separate
6. **Generează endpoint-uri** API pentru bloguri
7. **Populează Dashboard Client** cu articolele extrase

## Exemplu Articol Complet (JSON)

```json
{
  "id": "1",
  "title": "Ghid Complet pentru Recuperarea Creanțelor în 2026",
  "slug": "ghid-recuperare-creante-2026",
  "category": "Drept Civil",
  "date": "2026-05-30",
  "readTime": 15,
  "image": "https://images.unsplash.com/...",
  "excerpt": "Descoperă pașii esențiali pentru recuperarea datoriilor...",
  "content": "<h2>1. Ce Este o Creanță...</h2><p>...",
  "bullets": [
    "Procedura somației - primul pas obligatoriu",
    "Ordonanța de plată vs acțiunea obișnuită",
    "Executarea silită - ce bunuri pot fi urmărite"
  ],
  "tags": ["Recuperare Creanțe", "Drept Civil", "Executare Silită"],
  "metaTitle": "Ghid Recuperare Creanțe 2026 | LAW GEM",
  "metaDescription": "Ghid complet pentru recuperarea datoriilor în România...",
  "author": {
    "name": "Dr. Andrei Popescu",
    "image": "https://...",
    "role": "Managing Partner"
  },
  "status": "published",
  "featured": true,
  "createdAt": "2026-05-30T10:00:00Z",
  "updatedAt": "2026-05-30T10:00:00Z"
}
```

## Notă pentru Dezvoltatori

Template-ul HTML este **gata de integrare**. Backend-ul trebuie să:
1. Parseze `blog.html` și `blog-post.html` la upload
2. Extragă toate articolele cu `data-article-id`
3. Salveze în tabelă `blogs` cu toate câmpurile
4. Expună API REST pentru CRUD
5. Actualizeze HTML-ul la publish (injectează date din DB în template)
6. Servească articolele dinamic din DB, nu static din HTML
