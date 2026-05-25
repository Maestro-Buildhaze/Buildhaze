/**
 * Template Parser Service V2 - Auto-detect sections and fields from HTML
 * 
 * Detects sections by data-section attributes, semantic HTML, or class names.
 * Extracts all editable fields (text, images, buttons) automatically.
 */

import { JSDOM } from 'jsdom';

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'richtext' 
  | 'image' 
  | 'video' 
  | 'color' 
  | 'select' 
  | 'repeater'
  | 'boolean'
  | 'number'
  | 'link';

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  selector: string;
  attribute?: string;
  defaultValue?: any;
  options?: string[];
  maxItems?: number;
  children?: Field[];
  helpText?: string;
}

export interface Section {
  id: string;
  name: string;
  type: string;
  selector: string;
  fields: Field[];
  canAddRemove: boolean;
  maxInstances?: number;
  minInstances?: number;
}

export interface Page {
  id: string;
  name: string;
  file: string;
  slug: string;
  sections: Section[];
}

export interface TemplateStructure {
  pages: Page[];
  global: {
    colors: string[];
    typography: {
      fonts: string[];
    };
  };
}

export class TemplateParser {
  /**
   * Parse all HTML files and extract complete template structure
   */
  static parseTemplate(files: Record<string, string>): TemplateStructure {
    const pages: Page[] = [];
    const global = {
      colors: [] as string[],
      typography: { fonts: [] as string[] },
    };
    
    for (const [fileName, content] of Object.entries(files)) {
      const page = this.parsePage(fileName, content);
      if (page.sections.length > 0) {
        pages.push(page);
      }
    }
    
    return { pages, global };
  }

  /**
   * Parse a single HTML file
   */
  private static parsePage(fileName: string, html: string): Page {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const body = document.body;
    
    const sections: Section[] = [];
    let sectionIndex = 0;
    
    // PRIORITY 1: data-section attributes
    const dataSections = body.querySelectorAll('[data-section]');
    dataSections.forEach((section) => {
      const sectionType = section.getAttribute('data-section') || `section-${sectionIndex}`;
      const sectionId = section.getAttribute('data-section-id') || `${fileName.replace('.html', '')}-${sectionType}-${sectionIndex}`;
      const sectionName = this.formatLabel(sectionType);
      
      const sectionData = this.analyzeSection(section, sectionId, sectionName, sectionType);
      if (sectionData.fields.length > 0) {
        sections.push(sectionData);
        sectionIndex++;
      }
    });
    
    // PRIORITY 2: Semantic HTML sections
    if (sections.length === 0) {
      const semanticSections = body.querySelectorAll('section, article, main > div[id], header.hero, footer');
      semanticSections.forEach((section, index) => {
        const sectionType = this.detectSectionType(section);
        const sectionId = `${fileName.replace('.html', '')}-${sectionType}-${index}`;
        const sectionName = this.getSectionName(section, index);
        
        const sectionData = this.analyzeSection(section, sectionId, sectionName, sectionType);
        if (sectionData.fields.length > 0) {
          sections.push(sectionData);
        }
      });
    }
    
    // PRIORITY 3: Class-based sections
    if (sections.length === 0) {
      const classSections = body.querySelectorAll('[class*="section"], [class*="hero"], [class*="about"], [class*="services"]');
      classSections.forEach((section, index) => {
        const sectionType = this.detectSectionType(section);
        const sectionId = `${fileName.replace('.html', '')}-${sectionType}-${index}`;
        const sectionName = this.getSectionName(section, index);
        
        const sectionData = this.analyzeSection(section, sectionId, sectionName, sectionType);
        if (sectionData.fields.length > 0) {
          sections.push(sectionData);
        }
      });
    }
    
    const pageId = fileName.replace('.html', '') || 'index';
    const pageName = this.formatPageName(fileName);
    
    return {
      id: pageId,
      name: pageName,
      file: fileName,
      slug: pageId === 'index' ? '' : pageId,
      sections,
    };
  }

  /**
   * Detect section type from element
   */
  private static detectSectionType(element: any): string {
    const className = (element.getAttribute('class') || '').toLowerCase();
    const id = (element.getAttribute('id') || '').toLowerCase();
    const dataSection = element.getAttribute('data-section')?.toLowerCase();
    
    if (dataSection) return dataSection;
    if (className.includes('hero') || id.includes('hero')) return 'hero';
    if (className.includes('service') || id.includes('service')) return 'services';
    if (className.includes('about') || id.includes('about')) return 'about';
    if (className.includes('team') || id.includes('team')) return 'team';
    if (className.includes('testimonial') || id.includes('testimonial') || className.includes('review')) return 'testimonials';
    if (className.includes('contact') || id.includes('contact')) return 'contact';
    if (className.includes('gallery') || id.includes('gallery') || className.includes('portfolio')) return 'gallery';
    if (className.includes('blog') || id.includes('blog')) return 'blog';
    if (className.includes('cta') || id.includes('cta')) return 'cta';
    if (className.includes('feature') || id.includes('feature')) return 'features';
    if (className.includes('footer') || id.includes('footer')) return 'footer';
    if (className.includes('nav') || id.includes('nav') || className.includes('header')) return 'header';
    
    // Check heading text
    const heading = element.querySelector('h1, h2, h3');
    if (heading) {
      const text = heading.textContent?.toLowerCase() || '';
      if (text.includes('service')) return 'services';
      if (text.includes('about')) return 'about';
      if (text.includes('team')) return 'team';
      if (text.includes('contact')) return 'contact';
    }
    
    return 'generic';
  }

  /**
   * Analyze section and extract all fields
   */
  private static analyzeSection(element: any, id: string, name: string, sectionType: string): Section {
    const fields: Field[] = [];
    const usedIds = new Set<string>();
    
    // PRIORITY: data-cms attributes
    const cmsElements = element.querySelectorAll('[data-cms]');
    cmsElements.forEach((el: any) => {
      const cmsId = el.getAttribute('data-cms');
      if (!cmsId || usedIds.has(cmsId)) return;
      
      const field = this.createFieldFromElement(el, cmsId);
      if (field) {
        fields.push(field);
        usedIds.add(cmsId);
        
        // Also capture href for links
        if (el.tagName.toLowerCase() === 'a') {
          const hrefId = `${cmsId}-href`;
          if (!usedIds.has(hrefId)) {
            fields.push({
              id: hrefId,
              type: 'link',
              label: `${field.label} Link`,
              selector: this.generateSelector(el),
              attribute: 'href',
              defaultValue: el.getAttribute('href') || '#',
            });
            usedIds.add(hrefId);
          }
        }
      }
    });
    
    // FALLBACK: Auto-detect
    if (fields.length === 0) {
      this.autoDetectFields(element, id, fields, usedIds);
    }
    
    // Detect repeater items
    const repeaterFields = this.detectRepeaterFields(element, id);
    fields.push(...repeaterFields);
    
    return {
      id,
      name,
      type: sectionType,
      selector: this.generateSelector(element),
      fields,
      canAddRemove: false,
    };
  }

  /**
   * Create field from HTML element
   */
  private static createFieldFromElement(el: any, id: string): Field | null {
    const tagName = el.tagName.toLowerCase();
    const text = el.textContent?.trim() || '';
    
    let fieldType: FieldType = 'textarea';
    let attribute = 'textContent';
    let defaultValue = text;
    let label = this.formatLabel(id);
    
    if (tagName === 'img') {
      fieldType = 'image';
      attribute = 'src';
      defaultValue = el.getAttribute('src') || '';
    } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      fieldType = 'text';
    } else if (tagName === 'a' || el.classList?.contains('btn') || tagName === 'button') {
      fieldType = 'text';
    } else if (text.length > 100) {
      fieldType = 'textarea';
    }
    
    return {
      id,
      type: fieldType,
      label,
      selector: this.generateSelector(el),
      attribute,
      defaultValue,
    };
  }

  /**
   * Auto-detect fields from element
   */
  private static autoDetectFields(element: any, sectionId: string, fields: Field[], usedIds: Set<string>) {
    // Headings
    const headings = element.querySelectorAll('h1, h2, h3');
    headings.forEach((el: any, index: number) => {
      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 200) {
        const id = `${sectionId}-heading-${index}`;
        if (!usedIds.has(id)) {
          fields.push({
            id,
            type: 'text',
            label: `Heading ${index + 1}`,
            selector: this.generateSelector(el),
            attribute: 'textContent',
            defaultValue: text,
          });
          usedIds.add(id);
        }
      }
    });
    
    // Paragraphs
    const texts = element.querySelectorAll('p, .text, .description');
    texts.forEach((el: any, index: number) => {
      const text = el.textContent?.trim();
      if (text && text.length > 10 && text.length < 1000) {
        const id = `${sectionId}-text-${index}`;
        if (!usedIds.has(id)) {
          fields.push({
            id,
            type: 'textarea',
            label: `Text ${index + 1}`,
            selector: this.generateSelector(el),
            attribute: 'textContent',
            defaultValue: text,
          });
          usedIds.add(id);
        }
      }
    });
    
    // Images
    const images = element.querySelectorAll('img');
    images.forEach((img: any, index: number) => {
      const id = `${sectionId}-image-${index}`;
      if (!usedIds.has(id)) {
        fields.push({
          id,
          type: 'image',
          label: `Image ${index + 1}`,
          selector: this.generateSelector(img),
          attribute: 'src',
          defaultValue: img.getAttribute('src') || '',
        });
        usedIds.add(id);
      }
    });
    
    // Buttons
    const buttons = element.querySelectorAll('a.btn, button, .button');
    buttons.forEach((btn: any, index: number) => {
      const text = btn.textContent?.trim();
      if (text && text.length > 0 && text.length < 100) {
        const id = `${sectionId}-button-${index}`;
        if (!usedIds.has(id)) {
          fields.push({
            id,
            type: 'text',
            label: `Button ${index + 1}`,
            selector: this.generateSelector(btn),
            attribute: 'textContent',
            defaultValue: text,
          });
          usedIds.add(id);
          
          if (btn.tagName.toLowerCase() === 'a') {
            const hrefId = `${id}-href`;
            fields.push({
              id: hrefId,
              type: 'link',
              label: `Button ${index + 1} Link`,
              selector: this.generateSelector(btn),
              attribute: 'href',
              defaultValue: btn.getAttribute('href') || '#',
            });
          }
        }
      }
    });
  }

  /**
   * Detect repeater fields
   */
  private static detectRepeaterFields(element: any, sectionId: string): Field[] {
    const repeaterFields: Field[] = [];
    
    const lists = element.querySelectorAll('ul, .grid, .list, .cards');
    lists.forEach((list: any, listIndex: number) => {
      const items = list.querySelectorAll(':scope > li, :scope > .card, :scope > .item, :scope > [class*="col"]');
      if (items.length >= 2 && items.length <= 20) {
        const firstItem = items[0];
        const itemFields: any[] = [];
        
        if (firstItem.querySelector('h3, h4, .title')) {
          itemFields.push({ id: 'title', label: 'Title', type: 'text' });
        }
        if (firstItem.querySelector('p, .description')) {
          itemFields.push({ id: 'description', label: 'Description', type: 'textarea' });
        }
        if (firstItem.querySelector('img')) {
          itemFields.push({ id: 'image', label: 'Image', type: 'image' });
        }
        if (firstItem.querySelector('i, .icon, svg')) {
          itemFields.push({ id: 'icon', label: 'Icon', type: 'text' });
        }
        
        if (itemFields.length > 0) {
          repeaterFields.push({
            id: `${sectionId}-items-${listIndex}`,
            type: 'repeater',
            label: `Items ${listIndex + 1}`,
            selector: this.generateSelector(list),
            maxItems: items.length,
            children: itemFields,
          });
        }
      }
    });
    
    return repeaterFields;
  }

  /**
   * Generate unique CSS selector for element
   */
  private static generateSelector(element: any): string {
    const tagName = element.tagName.toLowerCase();
    const id = element.getAttribute('id');
    const dataCms = element.getAttribute('data-cms');
    const dataSection = element.getAttribute('data-section');
    
    if (dataCms) return `[data-cms="${dataCms}"]`;
    if (dataSection && element.getAttribute('data-section-id')) {
      return `[data-section-id="${element.getAttribute('data-section-id')}"]`;
    }
    if (id) return `#${id}`;
    
    // Generate path
    let path = tagName;
    let parent = element.parentElement;
    let index = 1;
    
    for (const sibling of element.parentElement?.children || []) {
      if (sibling === element) break;
      if (sibling.tagName === element.tagName) index++;
    }
    
    if (index > 1) path += `:nth-of-type(${index})`;
    
    return path;
  }

  /**
   * Format label from ID
   */
  private static formatLabel(id: string): string {
    if (!id) return '';
    return id
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format page name from file name
   */
  private static formatPageName(fileName: string): string {
    const name = fileName.replace('.html', '').replace(/-/g, ' ');
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get section name from element
   */
  private static getSectionName(element: any, index: number): string {
    const heading = element.querySelector('h1, h2, h3');
    if (heading) {
      const text = heading.textContent?.trim();
      if (text && text.length < 50) return text;
    }
    
    const id = element.getAttribute('id');
    if (id) return this.formatLabel(id);
    
    const className = element.getAttribute('class')?.split(' ')[0];
    if (className) return this.formatLabel(className);
    
    return `Section ${index + 1}`;
  }
}
