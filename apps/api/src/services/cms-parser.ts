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

  // Priority 2: semantic elements (header, nav, footer always included)
  const semanticSeen = new Set(sectionElements.map(s => s.el));
  $('section, header, footer, nav, main').each((_, el) => {
    if (semanticSeen.has(el)) return;
    const parentIsSemantic = $(el).parents('section, header, footer, main').length > 0;
    if (parentIsSemantic) return;
    const type = detectSectionType($, el);
    sectionElements.push({ el, type, name: formatName(type) });
  });

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
  sectionId: string,
  isBlock: boolean = false
): CmsField[] {
  const fields: CmsField[] = [];
  const usedSelectors = new Set<string>();
  let fieldIndex = 0;

  // Get container identifier for generating relative selectors
  const containerId = $(el).attr('id') || $(el).attr('data-field') || '';

  function getSelector(fieldEl: Element): string {
    const tag = fieldEl.tagName?.toLowerCase() || 'div';
    const dataCms = $(fieldEl).attr('data-cms');
    const dataField = $(fieldEl).attr('data-field');
    const id = $(fieldEl).attr('id');

    // For blocks, prefer data-field selectors
    if (dataField) return `[data-field="${dataField}"]`;
    if (dataCms) return `[data-cms="${dataCms}"]`;
    if (id) return `#${id}`;

    // Generate relative selector from container
    const classes = ($(fieldEl).attr('class') || '').split(/\s+/).filter(Boolean);
    const stableClass = classes.find(c => !c.match(/^(active|open|visible|hidden|show|d-|is-|has-|js-|hover|focus)/));
    
    if (stableClass) {
      // Count siblings with same class
      const siblings = $(el).find(`${tag}.${stableClass}`);
      const idx = siblings.toArray().indexOf(fieldEl);
      if (idx > 0) {
        return `${tag}.${stableClass}:nth-of-type(${idx + 1})`;
      }
      return `${tag}.${stableClass}`;
    }

    // Fallback: nth-of-type within parent
    const parent = $(fieldEl).parent();
    const siblings = parent.children(tag);
    const idx = siblings.toArray().indexOf(fieldEl);
    return idx > 0 ? `${tag}:nth-of-type(${idx + 1})` : tag;
  }

  // Find all data-field elements
  const allDataFieldElements = $(el).find('[data-field]').toArray();
  const blockContainerDataFields = new Set<string>();
  
  // Only calculate block containers for section-level extraction (not for blocks)
  if (!isBlock) {
    allDataFieldElements.forEach(container => {
      const hasChildDataFields = $(container).find('[data-field]').length > 0;
      if (hasChildDataFields) {
        const df = $(container).attr('data-field') || '';
        if (df) blockContainerDataFields.add(df);
      }
    });
  }
  
  // Create set of data-fields inside block containers
  const childDataFieldsInBlocks = new Set<string>();
  if (!isBlock) {
    allDataFieldElements.forEach(field => {
      const parentBlock = $(field).parents('[data-field]').toArray().find(p => {
        const pdf = $(p).attr('data-field') || '';
        return blockContainerDataFields.has(pdf);
      });
      if (parentBlock) {
        const df = $(field).attr('data-field') || '';
        if (df) childDataFieldsInBlocks.add(df);
      }
    });
  }

  // Track field positions
  let headingCount = 0;
  let textCount = 0;
  let buttonCount = 0;
  let imageCount = 0;
  let listCount = 0;

  // PRIORITY 1: Elements with explicit data-field attributes
  $(el).find('[data-field]').each((_, fieldEl) => {
    const $field = $(fieldEl);
    const dataField = $field.attr('data-field') || '';
    const tag = fieldEl.tagName?.toLowerCase();
    const sel = `[data-field="${dataField}"]`;
    
    if (usedSelectors.has(sel)) return;
    
    // For section-level extraction: skip data-fields inside block containers
    if (!isBlock && childDataFieldsInBlocks.has(dataField)) return;
    
    // For section-level: skip if this is a container with children
    if (!isBlock) {
      const hasChildren = $field.find('[data-field]').length > 0;
      if (hasChildren) return;
    }
    
    usedSelectors.add(sel);

    // Image field
    if (tag === 'img') {
      const src = $field.attr('src') || '';
      const alt = $field.attr('alt') || '';
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
    const text = $field.text().trim();
    if (text) {
      const isHeading = ['h1','h2','h3','h4','h5','h6'].includes(tag);
      const isLink = tag === 'a';
      const isButton = tag === 'button' || /btn|button|cta/i.test(dataField) ||
                       /btn|button|cta/i.test($field.attr('class') || '');
      
      let label: string;
      let type: CmsField['type'] = text.length > 100 ? 'textarea' : 'text';
      
      if (isHeading) {
        headingCount++;
        label = headingCount === 1 ? 'Title' : headingCount === 2 ? 'Subtitle' : `Heading ${headingCount}`;
      } else if (isButton || (isLink && /btn|button|cta/i.test($field.attr('class') || ''))) {
        buttonCount++;
        label = buttonCount === 1 ? 'Button Text' : `Button ${buttonCount} Text`;
        type = 'text';
      } else if (text.length < 60 && headingCount > 0 && textCount === 0) {
        // Short text after heading = subtitle
        label = 'Subtitle';
        textCount++;
      } else if (text.length > 80) {
        label = 'Description';
        textCount++;
      } else if (headingCount > 0) {
        textCount++;
        label = textCount === 1 ? 'Subtitle' : `Text ${textCount}`;
      } else {
        // Skip short text fragments that don't have a heading before them (for sections)
        if (!isBlock && text.length < 20) return;
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
      if (isLink || $field.attr('href')) {
        const href = $field.attr('href') || '#';
        const urlLabel = isButton || /btn|button|cta/i.test($field.attr('class') || '')
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
    // For section-level: skip if inside a block container
    if (!isBlock) {
      const isInsideBlockContainer = $(headingEl).parents('[data-field]').toArray().some(p => {
        const pdf = $(p).attr('data-field') || '';
        return blockContainerDataFields.has(pdf);
      });
      if (isInsideBlockContainer) return;
    }
    
    const text = $h.text().trim();
    if (!text || text.length < 2) return;
    
    const sel = getSelector(headingEl);
    if (usedSelectors.has(sel)) return;
    usedSelectors.add(sel);
    
    // Check position to determine label
    headingCount++;
    const label = headingCount === 1 ? 'Title' : headingCount === 2 ? 'Subtitle' : `Heading ${headingCount}`;
    
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
    // For section-level: skip if inside a block container
    if (!isBlock) {
      const isInsideBlockContainer = $(pEl).parents('[data-field]').toArray().some(p => {
        const pdf = $(p).attr('data-field') || '';
        return blockContainerDataFields.has(pdf);
      });
      if (isInsideBlockContainer) return;
    }
    // Skip if has children that are headings or other block elements
    if ($p.find('h1, h2, h3, h4, h5, h6, div, section').length > 0) return;
    
    const text = $p.text().trim();
    if (!text || text.length < 3) return;
    
    const sel = getSelector(pEl);
    if (usedSelectors.has(sel)) return;
    usedSelectors.add(sel);
    
    textCount++;
    // For sections, limit to first few meaningful paragraphs
    if (!isBlock && textCount > 3) return;
    
    const label = text.length > 100 ? 'Description' : 
                  text.length > 50 ? (headingCount > 0 ? 'Subtitle' : 'Description') : 
                  textCount === 1 ? 'Text' : `Text ${textCount}`;
    
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
    // For section-level: skip if inside a block container
    if (!isBlock) {
      const isInsideBlockContainer = $(listEl).parents('[data-field]').toArray().some(p => {
        const pdf = $(p).attr('data-field') || '';
        return blockContainerDataFields.has(pdf);
      });
      if (isInsideBlockContainer) return;
    }
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
    // For section-level: skip if inside a block container
    if (!isBlock) {
      const isInsideBlockContainer = $(imgEl).parents('[data-field]').toArray().some(p => {
        const pdf = $(p).attr('data-field') || '';
        return blockContainerDataFields.has(pdf);
      });
      if (isInsideBlockContainer) return;
    }
    
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
    // Skip if inside a data-field (already captured in priority 1)
    if ($a.closest('[data-field]').length > 0) return;
    // For section-level: skip if inside a block container
    if (!isBlock) {
      const isInsideBlockContainer = $(aEl).parents('[data-field]').toArray().some(p => {
        const pdf = $(p).attr('data-field') || '';
        return blockContainerDataFields.has(pdf);
      });
      if (isInsideBlockContainer) return;
    }
    
    const text = $a.text().trim();
    const href = $a.attr('href') || '#';
    if (!text || text.length < 1) return;
    
    const sel = getSelector(aEl);
    if (usedSelectors.has(`${sel}-text`) || usedSelectors.has(sel)) return;
    usedSelectors.add(`${sel}-text`);
    
    const isButton = aEl.tagName?.toLowerCase() === 'button' || 
                     /btn|button|cta/i.test($a.attr('class') || '');

    buttonCount++;
    const label = isButton 
      ? (buttonCount === 1 ? 'Button Text' : `Button ${buttonCount} Text`)
      : (buttonCount === 1 ? 'Link Text' : `Link ${buttonCount} Text`);

    fields.push({
      id: `${sectionId}-${isButton ? 'button' : 'link'}-text-${fieldIndex++}`,
      label,
      type: 'text',
      selector: sel,
      attribute: 'textContent',
      value: text,
    });
    
    if ($a.attr('href')) {
      const urlLabel = isButton 
        ? (buttonCount === 1 ? 'Button URL' : `Button ${buttonCount} URL`)
        : (buttonCount === 1 ? 'Link URL' : `Link ${buttonCount} URL`);
      fields.push({
        id: `${sectionId}-${isButton ? 'button' : 'link'}-url-${fieldIndex++}`,
        label: urlLabel,
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

  // Helper: Check if element is a direct child of a grid/flex container (likely a card)
  function isDirectGridChild(elem: Element): boolean {
    const parent = $(elem).parent()[0];
    if (!parent) return false;
    const parentClass = $(parent).attr('class') || '';
    const isGridContainer = /\b(grid|cards|items|row|flex|services|features|stack|process|stats)\b/.test(parentClass);
    return isGridContainer;
  }

  // Helper: Get direct children of grid containers
  function getGridContainerChildren(): Element[] {
    const children: Element[] = [];
    const gridContainers = $(el).find('[class*="grid"], [class*="cards"], [class*="items"], [class*="row"], [class*="services"], [class*="features"], [class*="stack"], [class*="process"], [class*="stats"], .flex, .grid').toArray();
    
    gridContainers.forEach(container => {
      // Only get direct children that look like cards/items
      $(container).children('div, article, section, li').each((_, child) => {
        // Skip if already seen or if it's the section container
        if (seenElements.has(child) || child === el) return;
        // Skip if it's a wrapper/container itself (has too many children)
        const childCount = $(child).children().length;
        if (childCount > 10) return; // Too many children = probably a container
        
        children.push(child);
      });
    });
    return children;
  }

  // PRIORITY 1: data-field containers (most reliable for explicit blocks)
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
    const heading = $(candidate).find('h1,h2,h3,h4,h5,h6').first().text().trim() ||
                   $(candidate).find('[class*="title"], [class*="heading"]').first().text().trim() ||
                   dataField;
    const fields = extractFields($, candidate, blockId, true); // isBlock=true
    if (fields.length > 0) {
      blocks.push({ id: blockId, name: heading.substring(0, 40), dataField, fields });
    }
  });

  // PRIORITY 2: Direct children of grid/card containers
  const gridChildren = getGridContainerChildren();
  gridChildren.forEach(cardEl => {
    if (seenElements.has(cardEl)) return;
    if (cardEl === el) return;
    const isInsideBlock = $(cardEl).parents().toArray().some(p => seenElements.has(p));
    if (isInsideBlock) return;
    
    // Check if this looks like a content card
    const hasHeading = $(cardEl).find('h1,h2,h3,h4,h5,h6').length > 0;
    const textContent = $(cardEl).text().trim();
    const hasContent = textContent.length > 10;
    const hasButton = $(cardEl).find('a, button').length > 0;
    const hasImage = $(cardEl).find('img').length > 0;
    const hasIcon = $(cardEl).find('[class*="icon"], svg, i').length > 0;
    
    // Must have heading OR (content + at least one of: button, image, icon)
    if (hasHeading || (hasContent && (hasButton || hasImage || hasIcon))) {
      seenElements.add(cardEl);
      const blockId = `${sectionId}-block-${blockIdx++}`;
      const heading = $(cardEl).find('h1,h2,h3,h4,h5,h6').first().text().trim() || 
                     $(cardEl).find('[class*="title"], [class*="heading"]').first().text().trim() ||
                     $(cardEl).find('strong, b').first().text().trim() ||
                     `Card ${blockIdx}`;
      const fields = extractFields($, cardEl, blockId, true); // isBlock=true
      if (fields.length > 0) {
        blocks.push({ id: blockId, name: heading.substring(0, 40), dataField: heading.substring(0, 20) || `card-${blockIdx}`, fields });
      }
    }
  });

  // PRIORITY 3: Explicit card classes (if still no blocks found)
  if (blocks.length === 0) {
    const cardSelectors = [
      '.card', '.service-card', '.feature-card', '.testimonial-card',
      '.item', '.feature', '.benefit', '.step', '.stat'
    ];

    cardSelectors.forEach(selector => {
      $(el).find(selector).each((_, cardEl) => {
        if (seenElements.has(cardEl)) return;
        if (cardEl === el) return;
        const isInsideBlock = $(cardEl).parents().toArray().some(p => seenElements.has(p));
        if (isInsideBlock) return;
        
        const hasHeading = $(cardEl).find('h1,h2,h3,h4,h5,h6').length > 0;
        const textContent = $(cardEl).text().trim();
        const hasContent = textContent.length > 10;
        
        if (hasHeading || hasContent) {
          seenElements.add(cardEl);
          const blockId = `${sectionId}-block-${blockIdx++}`;
          const heading = $(cardEl).find('h1,h2,h3,h4,h5,h6').first().text().trim() ||
                         $(cardEl).find('[class*="title"]').first().text().trim() ||
                         `Card ${blockIdx}`;
          const fields = extractFields($, cardEl, blockId, true); // isBlock=true
          if (fields.length > 0) {
            blocks.push({ id: blockId, name: heading.substring(0, 40), dataField: heading.substring(0, 20) || `card-${blockIdx}`, fields });
          }
        }
      });
    });
  }

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
