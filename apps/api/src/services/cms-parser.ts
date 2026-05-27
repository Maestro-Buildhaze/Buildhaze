import * as cheerio from 'cheerio';
type Element = any;

export interface CmsField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'link' | 'richtext';
  selector: string;
  attribute: string;
  value: string;
}

export interface CmsSection {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  fields: CmsField[];
}

export interface CmsPage {
  id: string;
  name: string;
  slug: string;
  file: string;
  sections: CmsSection[];
}

export function parseTemplateFiles(
  files: Record<string, string>
): CmsPage[] {
  const pages: CmsPage[] = [];

  for (const [filename, html] of Object.entries(files)) {
    if (!filename.endsWith('.html')) continue;
    const page = parseHtmlFile(filename, html);
    if (page.sections.length > 0) {
      pages.push(page);
    }
  }

  pages.sort((a, b) => {
    if (a.id === 'index') return -1;
    if (b.id === 'index') return 1;
    return a.name.localeCompare(b.name);
  });

  return pages;
}

function parseHtmlFile(filename: string, html: string): CmsPage {
  const $ = cheerio.load(html);
  const pageId = filename.replace('.html', '') || 'index';
  const pageName = formatName(pageId);
  const slug = pageId === 'index' ? '' : pageId;

  const sections: CmsSection[] = [];
  const sectionElements: { el: Element; type: string; name: string }[] = [];

  // Priority 1: data-section attribute
  $('[data-section]').each((_, el) => {
    const type = $(el).attr('data-section') || 'content';
    sectionElements.push({ el, type, name: formatName(type) });
  });

  // Priority 2: semantic elements
  if (sectionElements.length === 0) {
    $('section, header, footer, nav, main').each((_, el) => {
      const parentIsSemantic = $(el).parents('section, header, footer, main').length > 0;
      if (parentIsSemantic) return;
      const type = detectSectionType($, el);
      sectionElements.push({ el, type, name: formatName(type) });
    });
  }

  // Priority 3: divs with meaningful IDs
  if (sectionElements.length === 0) {
    $('body > div[id], body > div > div[id]').each((_, el) => {
      const id = $(el).attr('id') || '';
      const type = detectSectionType($, el);
      sectionElements.push({ el, type, name: formatName(id || type) });
    });
  }

  // Priority 4: direct body children as last resort
  if (sectionElements.length === 0) {
    $('body').children().each((_, el) => {
      const tag = el.tagName?.toLowerCase() || '';
      if (['div', 'section', 'header', 'footer', 'main', 'article'].includes(tag)) {
        const type = detectSectionType($, el);
        sectionElements.push({ el, type, name: formatName(type) });
      }
    });
  }

  sectionElements.forEach(({ el, type, name }, idx) => {
    const sectionId = `${pageId}-${type}-${idx}`;
    const fields = extractFields($, el, sectionId);
    if (fields.length > 0) {
      sections.push({ id: sectionId, name, type, visible: true, fields });
    }
  });

  return { id: pageId, name: pageName, slug, file: filename, sections };
}

function extractFields(
  $: cheerio.CheerioAPI,
  el: Element,
  sectionId: string
): CmsField[] {
  const fields: CmsField[] = [];
  const usedSelectors = new Set<string>();
  let fieldIndex = 0;

  function getSelector(fieldEl: Element): string {
    const tag = fieldEl.tagName?.toLowerCase() || 'div';
    const dataCms = $(fieldEl).attr('data-cms');
    const id = $(fieldEl).attr('id');

    if (dataCms) return `[data-cms="${dataCms}"]`;
    if (id) return `#${id}`;

    const classes = ($(fieldEl).attr('class') || '').split(/\s+/).filter(Boolean);
    const stableClass = classes.find(c => !c.match(/^(active|open|visible|hidden|show|d-|is-|has-|js-)/));
    if (stableClass) {
      const siblings = $(el).find(`${tag}.${stableClass}`);
      const idx = siblings.toArray().indexOf(fieldEl);
      return idx > 0 ? `${tag}.${stableClass}:nth-of-type(${idx + 1})` : `${tag}.${stableClass}`;
    }

    const parent = $(fieldEl).parent();
    const siblings = parent.children(tag);
    const idx = siblings.toArray().indexOf(fieldEl);
    return idx > 0 ? `${tag}:nth-of-type(${idx + 1})` : tag;
  }

  // 1. Headings
  $(el).find('h1, h2, h3, h4, h5, h6').each((_, headingEl) => {
    const text = $(headingEl).text().trim();
    if (!text || text.length < 2 || text.length > 300) return;
    const sel = getSelector(headingEl);
    if (usedSelectors.has(sel)) return;
    usedSelectors.add(sel);
    fields.push({
      id: `${sectionId}-heading-${fieldIndex++}`,
      label: `${headingEl.tagName?.toUpperCase()} – ${text.substring(0, 40)}`,
      type: 'text',
      selector: sel,
      attribute: 'textContent',
      value: text,
    });
  });

  // 2. Paragraphs
  $(el).find('p').each((_, pEl) => {
    const text = $(pEl).text().trim();
    if (!text || text.length < 5 || text.length > 3000) return;
    const sel = getSelector(pEl);
    if (usedSelectors.has(sel)) return;
    usedSelectors.add(sel);
    fields.push({
      id: `${sectionId}-text-${fieldIndex++}`,
      label: `Paragraph – ${text.substring(0, 40)}`,
      type: text.length > 120 ? 'textarea' : 'text',
      selector: sel,
      attribute: 'textContent',
      value: text,
    });
  });

  // 3. Images
  $(el).find('img').each((i, imgEl) => {
    const src = $(imgEl).attr('src') || '';
    const alt = $(imgEl).attr('alt') || '';
    if (!src) return;
    const sel = getSelector(imgEl);
    if (usedSelectors.has(sel)) return;
    usedSelectors.add(sel);
    fields.push({
      id: `${sectionId}-image-${fieldIndex++}`,
      label: alt ? `Image – ${alt.substring(0, 40)}` : `Image ${i + 1}`,
      type: 'image',
      selector: sel,
      attribute: 'src',
      value: src,
    });
  });

  // 4. Links / buttons
  $(el).find('a').each((_, aEl) => {
    const text = $(aEl).text().trim();
    const href = $(aEl).attr('href') || '#';
    if (!text || text.length < 1 || text.length > 100) return;
    const sel = getSelector(aEl);
    if (usedSelectors.has(sel)) return;
    usedSelectors.add(sel);
    const className = $(aEl).attr('class') || '';
    const isButton = /btn|button|cta/i.test(className);
    fields.push({
      id: `${sectionId}-link-text-${fieldIndex++}`,
      label: isButton ? `Button – ${text.substring(0, 30)}` : `Link – ${text.substring(0, 30)}`,
      type: 'text',
      selector: sel,
      attribute: 'textContent',
      value: text,
    });
    fields.push({
      id: `${sectionId}-link-href-${fieldIndex++}`,
      label: isButton ? `Button URL` : `Link URL`,
      type: 'link',
      selector: sel,
      attribute: 'href',
      value: href,
    });
  });

  return fields;
}

function detectSectionType($: cheerio.CheerioAPI, el: Element): string {
  const id = ($(el).attr('id') || '').toLowerCase();
  const className = ($(el).attr('class') || '').toLowerCase();
  const tag = el.tagName?.toLowerCase() || '';
  const combined = `${id} ${className} ${tag}`;

  if (/hero|banner|jumbotron/.test(combined)) return 'hero';
  if (/about|despre/.test(combined)) return 'about';
  if (/service|servicii/.test(combined)) return 'services';
  if (/team|echipa/.test(combined)) return 'team';
  if (/testimonial|review|pareri/.test(combined)) return 'testimonials';
  if (/contact/.test(combined)) return 'contact';
  if (/feature/.test(combined)) return 'features';
  if (/gallery|portfolio|galerie/.test(combined)) return 'gallery';
  if (/blog|news/.test(combined)) return 'blog';
  if (/cta|call.to.action/.test(combined)) return 'cta';
  if (/pricing/.test(combined)) return 'pricing';
  if (/faq/.test(combined)) return 'faq';
  if (tag === 'header' || /header|navbar/.test(combined)) return 'header';
  if (tag === 'footer' || /footer/.test(combined)) return 'footer';
  if (tag === 'nav') return 'navigation';

  const heading = $(el).find('h1, h2, h3').first().text().toLowerCase();
  if (/service|servicii/.test(heading)) return 'services';
  if (/about|despre/.test(heading)) return 'about';
  if (/contact/.test(heading)) return 'contact';
  if (/team|echipa/.test(heading)) return 'team';

  return id || 'section';
}

function formatName(id: string): string {
  if (!id) return 'Section';
  return id
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
