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

export interface CmsBlock {
  id: string;
  name: string;
  dataField: string;
  fields: CmsField[];
}

export interface CmsSection {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  fields: CmsField[];
  blocks?: CmsBlock[];
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
    const blocks = detectBlocks($, el, sectionId);
    const blockFieldSelectors = new Set(blocks.flatMap(b => b.fields.map(f => f.selector)));
    const allFields = extractFields($, el, sectionId);
    const fields = allFields.filter(f => !blockFieldSelectors.has(f.selector));
    if (fields.length > 0 || blocks.length > 0) {
      sections.push({
        id: sectionId, name, type, visible: true, fields,
        ...(blocks.length > 0 && { blocks }),
      });
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
    const dataField = $(fieldEl).attr('data-field');
    const id = $(fieldEl).attr('id');

    if (dataCms) return `[data-cms="${dataCms}"]`;
    if (dataField) return `[data-field="${dataField}"]`;
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

  // Find all data-field elements that are OUTER containers (have children with data-field)
  // These are block containers, their children should be extracted separately
  const allDataFieldElements = $(el).find('[data-field]').toArray();
  const blockContainerDataFields = new Set<string>();
  
  allDataFieldElements.forEach(container => {
    // If this element contains other data-field elements, it's a block container
    const hasChildDataFields = $(container).find('[data-field]').length > 0;
    if (hasChildDataFields) {
      const df = $(container).attr('data-field') || '';
      if (df) blockContainerDataFields.add(df);
    }
  });
  
  // Also create a set of all data-field values that are inside block containers
  const childDataFieldsInBlocks = new Set<string>();
  allDataFieldElements.forEach(el => {
    const parentBlock = $(el).parents('[data-field]').toArray().find(p => {
      const pdf = $(p).attr('data-field') || '';
      return blockContainerDataFields.has(pdf);
    });
    if (parentBlock) {
      const df = $(el).attr('data-field') || '';
      if (df) childDataFieldsInBlocks.add(df);
    }
  });

  // Track field positions within this element for proper labeling
  let headingCount = 0;
  let textCount = 0;
  let buttonCount = 0;
  let imageCount = 0;
  let listCount = 0;

  // PRIORITY 1: Elements with explicit data-field attributes (most reliable)
  // Only extract those NOT inside block containers
  $(el).find('[data-field]').each((_, fieldEl) => {
    const $el = $(fieldEl);
    const dataField = $el.attr('data-field') || '';
    const tag = fieldEl.tagName?.toLowerCase();
    const sel = `[data-field="${dataField}"]`;
    
    if (usedSelectors.has(sel)) return;
    
    // Skip if this data-field is a child of a block container
    if (childDataFieldsInBlocks.has(dataField)) return;
    
    // Also skip if this element itself is a block container with children
    const hasChildren = $(fieldEl).find('[data-field]').length > 0;
    if (hasChildren) return;
    
    usedSelectors.add(sel);

    // Image field
    if (tag === 'img') {
      const src = $el.attr('src') || '';
      const alt = $el.attr('alt') || '';
      if (src) {
        imageCount++;
        fields.push({
          id: `${sectionId}-${dataField}-img-${fieldIndex++}`,
          label: imageCount === 1 ? 'Image' : `Image ${imageCount}`,
          type: 'image',
          selector: sel,
          attribute: 'src',
          value: src,
        });
      }
      return;
    }

    // Text content fields - determine clean label based on context
    const text = $el.text().trim();
    if (text) {
      const isHeading = ['h1','h2','h3','h4','h5','h6'].includes(tag);
      const isLink = tag === 'a';
      const isButton = tag === 'button' || /btn|button|cta/i.test(dataField) ||
                       /btn|button|cta/i.test($el.attr('class') || '');
      
      let label: string;
      let type: CmsField['type'] = text.length > 100 ? 'textarea' : 'text';
      
      if (isHeading) {
        headingCount++;
        label = headingCount === 1 ? 'Title' : headingCount === 2 ? 'Subtitle' : `Heading ${headingCount}`;
      } else if (isButton || (isLink && /btn|button|cta/i.test($el.attr('class') || ''))) {
        buttonCount++;
        label = buttonCount === 1 ? 'Button Text' : `Button ${buttonCount} Text`;
        type = 'text';
      } else if (text.length < 60 && headingCount > 0 && textCount === 0) {
        // Short text after heading = subtitle
        label = 'Subtitle';
        textCount++;
      } else if (text.length > 100) {
        label = 'Description';
        textCount++;
      } else {
        textCount++;
        label = textCount === 1 ? 'Text' : `Text ${textCount}`;
      }

      fields.push({
        id: `${sectionId}-${dataField}-${fieldIndex++}`,
        label,
        type,
        selector: sel,
        attribute: 'textContent',
        value: text,
      });

      // Also capture href for links/buttons
      if (isLink || $el.attr('href')) {
        const href = $el.attr('href') || '#';
        const urlLabel = isButton || /btn|button|cta/i.test($el.attr('class') || '')
          ? (buttonCount === 1 ? 'Button URL' : `Button ${buttonCount} URL`)
          : 'Link URL';
        fields.push({
          id: `${sectionId}-${dataField}-url-${fieldIndex++}`,
          label: urlLabel,
          type: 'link',
          selector: sel,
          attribute: 'href',
          value: href,
        });
      }
    }
  });

  // PRIORITY 2: All headings (not already captured, not inside blocks)
  $(el).find('h1, h2, h3, h4, h5, h6').each((_, headingEl) => {
    const $h = $(headingEl);
    // Skip if this heading is inside a data-field element (already captured)
    if ($h.closest('[data-field]').length > 0) return;
    // Skip if inside a block container (check by data-field ancestry)
    const isInsideBlock = $(headingEl).parents('[data-field]').toArray().some(p => {
      const pdf = $(p).attr('data-field') || '';
      return blockContainerDataFields.has(pdf);
    });
    if (isInsideBlock) return;
    
    const text = $h.text().trim();
    if (!text || text.length < 2) return;
    
    const sel = getSelector(headingEl);
    if (usedSelectors.has(sel)) return;
    usedSelectors.add(sel);
    
    // Check position to determine label
    const allHeadings = $(el).find('h1,h2,h3,h4,h5,h6').toArray();
    const headingIndex = allHeadings.indexOf(headingEl);
    const label = headingIndex === 0 ? 'Title' : 'Subtitle';
    
    fields.push({
      id: `${sectionId}-heading-${fieldIndex++}`,
      label,
      type: 'text',
      selector: sel,
      attribute: 'textContent',
      value: text,
    });
  });

  // PRIORITY 3: Paragraphs and text blocks (not already captured, not inside blocks)
  $(el).find('p, div.body-text, div.body-lg, [class*="text"], [class*="desc"]').each((_, pEl) => {
    const $p = $(pEl);
    // Skip if already captured or inside a data-field
    if ($p.closest('[data-field]').length > 0) return;
    // Skip if inside a block container
    const isInsideBlock = $(pEl).parents('[data-field]').toArray().some(p => {
      const pdf = $(p).attr('data-field') || '';
      return blockContainerDataFields.has(pdf);
    });
    if (isInsideBlock) return;
    // Skip if has children that are headings or other block elements
    if ($p.find('h1, h2, h3, h4, h5, h6, div, section').length > 0) return;
    
    const text = $p.text().trim();
    if (!text || text.length < 3) return;
    
    const sel = getSelector(pEl);
    if (usedSelectors.has(sel)) return;
    usedSelectors.add(sel);
    
    const label = text.length > 100 ? 'Description' : 
                  text.length > 50 ? 'Subtitle' : 'Text';
    
    fields.push({
      id: `${sectionId}-text-${fieldIndex++}`,
      label,
      type: text.length > 80 ? 'textarea' : 'text',
      selector: sel,
      attribute: 'textContent',
      value: text,
    });
  });

  // PRIORITY 4: Lists (features, bullets, checkmarks) - not already captured, not inside blocks
  $(el).find('ul, ol').each((_, listEl) => {
    const $list = $(listEl);
    // Skip if inside a data-field
    if ($list.closest('[data-field]').length > 0) return;
    // Skip if inside a block container
    const isInsideBlock = $(listEl).parents('[data-field]').toArray().some(p => {
      const pdf = $(p).attr('data-field') || '';
      return blockContainerDataFields.has(pdf);
    });
    if (isInsideBlock) return;
    // Skip if has nested lists (complex structure)
    if ($list.find('ul, ol').length > 0) return;
    
    const items = $list.find('li').toArray();
    if (items.length === 0) return;
    
    const sel = getSelector(listEl);
    if (usedSelectors.has(sel)) return;
    usedSelectors.add(sel);
    
    listCount++;
    const label = listCount === 1 ? 'Features' : `List ${listCount}`;
    
    // Extract list items as a single text field with line breaks
    const listContent = items.map(li => $(li).text().trim()).filter(t => t).join('\n');
    if (listContent) {
      fields.push({
        id: `${sectionId}-list-${fieldIndex++}`,
        label,
        type: 'textarea',
        selector: sel,
        attribute: 'textContent',
        value: listContent,
      });
    }
  });

  // PRIORITY 5: Images (not already captured, not inside blocks)
  $(el).find('img').each((i, imgEl) => {
    const $img = $(imgEl);
    // Skip if inside a data-field
    if ($img.closest('[data-field]').length > 0) return;
    // Skip if inside a block container
    const isInsideBlock = $(imgEl).parents('[data-field]').toArray().some(p => {
      const pdf = $(p).attr('data-field') || '';
      return blockContainerDataFields.has(pdf);
    });
    if (isInsideBlock) return;
    
    const src = $img.attr('src') || '';
    const alt = $img.attr('alt') || '';
    if (!src) return;
    
    const sel = getSelector(imgEl);
    if (usedSelectors.has(sel)) return;
    usedSelectors.add(sel);
    
    fields.push({
      id: `${sectionId}-image-${fieldIndex++}`,
      label: 'Image',
      type: 'image',
      selector: sel,
      attribute: 'src',
      value: src,
    });
  });

  // PRIORITY 6: Links and buttons (not already captured, not inside blocks)
  $(el).find('a, button').each((_, aEl) => {
    const $a = $(aEl);
    // Skip if inside a data-field
    if ($a.closest('[data-field]').length > 0) return;
    // Skip if inside a block container
    const isInsideBlock = $(aEl).parents('[data-field]').toArray().some(p => {
      const pdf = $(p).attr('data-field') || '';
      return blockContainerDataFields.has(pdf);
    });
    if (isInsideBlock) return;
    
    const text = $a.text().trim();
    const href = $a.attr('href') || '#';
    if (!text || text.length < 1) return;
    
    const sel = getSelector(aEl);
    if (usedSelectors.has(`${sel}-text`) || usedSelectors.has(sel)) return;
    usedSelectors.add(`${sel}-text`);
    
    const isButton = aEl.tagName?.toLowerCase() === 'button' || 
                     /btn|button|cta/i.test($a.attr('class') || '');

    fields.push({
      id: `${sectionId}-${isButton ? 'button' : 'link'}-text-${fieldIndex++}`,
      label: isButton ? 'Button Text' : 'Link Text',
      type: 'text',
      selector: sel,
      attribute: 'textContent',
      value: text,
    });
    
    if ($a.attr('href')) {
      fields.push({
        id: `${sectionId}-${isButton ? 'button' : 'link'}-url-${fieldIndex++}`,
        label: isButton ? 'Button URL' : 'Link URL',
        type: 'link',
        selector: sel,
        attribute: 'href',
        value: href,
      });
    }
  });

  // Sort fields by visual order (DOM position) to maintain consistency
  const sortedFields = fields.sort((a, b) => {
    // Extract indices if present in ID
    const idxA = parseInt(a.id.match(/-(\d+)$/)?.[1] || '0', 10);
    const idxB = parseInt(b.id.match(/-(\d+)$/)?.[1] || '0', 10);
    return idxA - idxB;
  });

  return sortedFields;
}

function detectBlocks($: cheerio.CheerioAPI, el: Element, sectionId: string): CmsBlock[] {
  const blocks: CmsBlock[] = [];
  const seenDataFields = new Set<string>();
  const seenElements = new Set<Element>();
  let blockIdx = 0;

  // PRIORITY 1: data-field containers (most reliable)
  $(el).find('[data-field]').each((_, candidate) => {
    const dataField = $(candidate).attr('data-field') || '';
    if (!dataField || seenDataFields.has(dataField)) return;
    // A block container has at least one child [data-field] descendant
    if ($(candidate).find('[data-field]').length === 0) return;
    // Skip if already inside an outer block container we've already found
    const ancestorFields = new Set(
      $(candidate).parents('[data-field]').toArray().map(p => $(p).attr('data-field') || '')
    );
    if ([...seenDataFields].some(df => ancestorFields.has(df))) return;

    seenDataFields.add(dataField);
    seenElements.add(candidate);
    const blockId = `${sectionId}-block-${blockIdx++}`;
    const heading = $(candidate).find('h1,h2,h3,h4,h5').first().text().trim();
    const fields = extractFields($, candidate, blockId);
    if (fields.length > 0) {
      blocks.push({ id: blockId, name: heading || dataField, dataField, fields });
    }
  });

  // PRIORITY 2: Common card/item patterns (for sections without data-field containers)
  const cardSelectors = [
    '.card', '[class*="card"]',
    '.item', '[class*="item"]',
    '.feature', '[class*="feature"]',
    '.service-card', '[class*="service"]',
    '.stack-item', '[class*="stack"]',
    '.stat-item', '[class*="stat"]',
    '.benefit', '[class*="benefit"]',
    '.bullet', '[class*="bullet"]',
    '.list-item', '[class*="list-item"]',
    '.grid > div', '.cards > div', '.items > div',
    '[class*="grid"] > div',
    '[class*="col-"]', '.col',
    '.flex > div'
  ];

  cardSelectors.forEach(selector => {
    $(el).find(selector).each((_, cardEl) => {
      // Skip if already processed
      if (seenElements.has(cardEl)) return;
      // Skip if this is the section container itself
      if (cardEl === el) return;
      // Skip if inside an already detected block
      const isInsideBlock = $(cardEl).parents().toArray().some(p => seenElements.has(p));
      if (isInsideBlock) return;
      
      // Check if this looks like a content card (has heading or significant content)
      const hasHeading = $(cardEl).find('h1,h2,h3,h4,h5,h6').length > 0;
      const hasContent = $(cardEl).text().trim().length > 20;
      const hasButton = $(cardEl).find('a, button').length > 0;
      const hasImage = $(cardEl).find('img').length > 0;
      const hasList = $(cardEl).find('ul, ol, li').length > 0;
      
      if ((hasHeading || hasContent) && (hasButton || hasImage || hasList || hasContent)) {
        seenElements.add(cardEl);
        const blockId = `${sectionId}-block-${blockIdx++}`;
        const heading = $(cardEl).find('h1,h2,h3,h4,h5,h6').first().text().trim() || 
                       $(cardEl).find('[class*="title"]').first().text().trim() ||
                       `Item ${blockIdx}`;
        const fields = extractFields($, cardEl, blockId);
        if (fields.length > 0) {
          blocks.push({ id: blockId, name: heading.substring(0, 30), dataField: heading.substring(0, 20), fields });
        }
      }
    });
  });

  return blocks;
}

function detectSectionType($: cheerio.CheerioAPI, el: Element): string {
  const id = ($(el).attr('id') || '').toLowerCase();
  const className = ($(el).attr('class') || '').toLowerCase();
  const tag = el.tagName?.toLowerCase() || '';
  const combined = `${id} ${className} ${tag}`;
  const heading = $(el).find('h1, h2, h3').first().text().toLowerCase();

  // Header detection - check tag first, then classes/ids
  if (tag === 'header') return 'header';
  if (/header|nav|navbar|main-nav|site-header|top-bar|menu-bar/.test(combined)) return 'header';
  if (id === 'header' || id === 'nav') return 'header';
  
  // Hero
  if (/hero|banner|jumbotron|intro/.test(combined)) return 'hero';
  
  // Services
  if (/service|servicii|oferte/.test(combined)) return 'services';
  
  // About
  if (/about|despre|who-we-are/.test(combined)) return 'about';
  
  // Stack / Features / Benefits / Why choose us / How it works
  if (/stack|benefit|why-|how-it-|choose|feature|avantage|de ce să ne/.test(combined)) return 'features';
  if (/feature/.test(heading)) return 'features';
  if (/benefit/.test(heading)) return 'features';
  
  // Stats / Numbers / Counters
  if (/stats|numbers|counter|metrics|achievement|rezultate/.test(combined)) return 'stats';
  
  // Team
  if (/team|echipa|staff/.test(combined)) return 'team';
  
  // Testimonials
  if (/testimonial|review|pareri|recenzii/.test(combined)) return 'testimonials';
  
  // Contact
  if (/contact|contactează/.test(combined)) return 'contact';
  
  // Gallery
  if (/gallery|portfolio|galerie|lucrări/.test(combined)) return 'gallery';
  
  // Blog
  if (/blog|news|articole/.test(combined)) return 'blog';
  
  // CTA
  if (/cta|call.to.action|apel.acțiune/.test(combined)) return 'cta';
  
  // Pricing
  if (/pricing|prices|prețuri/.test(combined)) return 'pricing';
  
  // FAQ
  if (/faq|questions|întrebări/.test(combined)) return 'faq';
  
  // Process / Steps
  if (/process|steps|etape|pași|procedură/.test(combined)) return 'process';
  
  // Footer
  if (tag === 'footer') return 'footer';
  if (/footer|site-footer|bottom/.test(combined)) return 'footer';

  // Fallback to heading-based detection
  if (/service|servicii/.test(heading)) return 'services';
  if (/about|despre/.test(heading)) return 'about';
  if (/contact|contactează/.test(heading)) return 'contact';
  if (/team|echipa/.test(heading)) return 'team';
  if (/stack|benefit|feature|avantage/.test(heading)) return 'features';
  if (/stats|numbers|counter/.test(heading)) return 'stats';
  if (/process|steps|pași/.test(heading)) return 'process';

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
