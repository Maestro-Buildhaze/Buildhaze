/**
 * Template Parser Service
 * 
 * Automatically analyzes HTML templates and extracts editable elements.
 * Detects sections, text fields, images, colors, and creates a schema
 * that the CMS can use to generate dynamic editing UI.
 */

import { JSDOM } from 'jsdom';

// Import DOM types
type Element = import('jsdom').JSDOM['window']['Element'];
type HTMLElement = import('jsdom').JSDOM['window']['HTMLElement'];

// Field types supported in the CMS
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
  | 'link'
  | 'seo-meta';

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  selector: string; // CSS selector to find the element in HTML
  attribute?: string; // Which attribute to edit (textContent, src, href, style, etc.)
  defaultValue?: any;
  options?: string[]; // For select type
  maxItems?: number; // For repeater type
  children?: Field[]; // Nested fields for repeater
  helpText?: string;
}

export interface Section {
  id: string;
  name: string;
  selector: string;
  fields: Field[];
  maxInstances?: number; // How many times can be repeated
  minInstances?: number;
  canAddRemove: boolean;
  icon?: string;
  description?: string;
}

export interface TemplateStructure {
  pages: {
    id: string;
    name: string;
    file: string;
    sections: Section[];
  }[];
  global: {
    colors: Field[];
    typography: Field[];
    seo: Field[];
    settings: Field[];
  };
}

// Common patterns to detect in templates
const SECTION_PATTERNS = [
  { selector: 'header, .header, .hero, [class*="hero"]', type: 'header', name: 'Header/Hero' },
  { selector: 'section[class*="about"], .about, #about', type: 'about', name: 'About' },
  { selector: 'section[class*="services"], .services, #services, [class*="servicii"]', type: 'services', name: 'Services' },
  { selector: 'section[class*="team"], .team, #team, [class*="echipa"]', type: 'team', name: 'Team' },
  { selector: 'section[class*="testimonials"], .testimonials, [class*="reviews"], [class*="pareri"]', type: 'testimonials', name: 'Testimonials' },
  { selector: 'section[class*="contact"], .contact, #contact', type: 'contact', name: 'Contact' },
  { selector: 'section[class*="blog"], .blog, #blog', type: 'blog', name: 'Blog' },
  { selector: 'footer, .footer', type: 'footer', name: 'Footer' },
];

const COLOR_PATTERNS = [
  /#[a-fA-F0-9]{3,8}/g,
  /rgb\([^)]+\)/g,
  /rgba\([^)]+\)/g,
  /hsl\([^)]+\)/g,
];

export class TemplateParser {
  
  /**
   * Parse an HTML string and extract all editable elements
   */
  static parseHTML(html: string, fileName: string = 'index.html'): TemplateStructure['pages'][0] {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const sections: Section[] = [];
    
    // Detect sections based on common patterns
    SECTION_PATTERNS.forEach(pattern => {
      const elements = document.querySelectorAll(pattern.selector);
      elements.forEach((el, index) => {
        const sectionId = `${pattern.type}-${index}`;
        const section = this.analyzeSection(el as Element, sectionId, pattern.name, pattern.selector);
        if (section.fields.length > 0) {
          sections.push(section);
        }
      });
    });
    
    // If no sections detected, create a generic content section
    if (sections.length === 0) {
      const body = document.querySelector('body');
      if (body) {
        const section = this.analyzeSection(body, 'main-content', 'Main Content', 'body');
        if (section.fields.length > 0) {
          sections.push(section);
        }
      }
    }
    
    return {
      id: fileName.replace('.html', ''),
      name: this.formatPageName(fileName),
      file: fileName,
      sections,
    };
  }
  
  /**
   * Analyze a single section and extract all editable fields
   */
  private static analyzeSection(element: Element, id: string, name: string, selector: string): Section {
    const fields: Field[] = [];
    
    // Find all text elements (headings, paragraphs, spans without children)
    const textElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span:not(:has(*)), a:not(:has(*))');
    textElements.forEach((el, index) => {
      const text = el.textContent?.trim();
      if (text && text.length > 2 && text.length < 500) {
        // Check if it's a heading
        const tagName = el.tagName.toLowerCase();
        const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
        
        fields.push({
          id: `${id}-text-${index}`,
          type: isHeading ? 'text' : 'textarea',
          label: isHeading ? `Heading (${tagName})` : 'Text Content',
          selector: this.generateSelector(el),
          attribute: 'textContent',
          defaultValue: text,
        });
      }
    });
    
    // Find all images
    const images = element.querySelectorAll('img');
    images.forEach((img, index) => {
      fields.push({
        id: `${id}-image-${index}`,
        type: 'image',
        label: `Image ${index + 1}`,
        selector: this.generateSelector(img),
        attribute: 'src',
        defaultValue: img.getAttribute('src') || '',
        helpText: 'Recommended size: 1200x800px',
      });
    });
    
    // Find buttons/links
    const buttons = element.querySelectorAll('a.btn, button, .button, [class*="button"]');
    buttons.forEach((btn, index) => {
      const text = btn.textContent?.trim();
      if (text) {
        fields.push({
          id: `${id}-btn-text-${index}`,
          type: 'text',
          label: `Button Text ${index + 1}`,
          selector: this.generateSelector(btn),
          attribute: 'textContent',
          defaultValue: text,
        });
        
        // Also capture the href
        if (btn.tagName.toLowerCase() === 'a') {
          fields.push({
            id: `${id}-btn-link-${index}`,
            type: 'link',
            label: `Button Link ${index + 1}`,
            selector: this.generateSelector(btn),
            attribute: 'href',
            defaultValue: (btn as Element).getAttribute('href') || '#',
          });
        }
      }
    });
    
    // Detect lists that might be repeatable sections
    const lists = element.querySelectorAll('ul:not(:has(ul)), ol:not(:has(ol))');
    lists.forEach((list, index) => {
      const items = list.querySelectorAll(':scope > li');
      if (items.length > 1) {
        // This looks like a repeatable section
        const firstItem = items[0];
        const itemFields: Field[] = [];
        
        // Analyze what fields each item has
        const itemImages = firstItem.querySelectorAll('img');
        itemImages.forEach((img, imgIndex) => {
          itemFields.push({
            id: `item-image-${imgIndex}`,
            type: 'image',
            label: 'Item Image',
            selector: this.generateSelector(img),
            attribute: 'src',
            defaultValue: img.getAttribute('src') || '',
          });
        });
        
        const itemTexts = firstItem.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
        itemTexts.forEach((txt, txtIndex) => {
          const text = txt.textContent?.trim();
          if (text) {
            itemFields.push({
              id: `item-text-${txtIndex}`,
              type: 'textarea',
              label: 'Item Text',
              selector: this.generateSelector(txt),
              attribute: 'textContent',
              defaultValue: text,
            });
          }
        });
        
        if (itemFields.length > 0) {
          fields.push({
            id: `${id}-list-${index}`,
            type: 'repeater',
            label: `List/Section ${index + 1} (Repeater)`,
            selector: this.generateSelector(list),
            maxItems: 20,
            children: itemFields,
            helpText: `Can add/remove items (current: ${items.length})`,
          });
        }
      }
    });
    
    return {
      id,
      name,
      selector,
      fields,
      canAddRemove: fields.some(f => f.type === 'repeater'),
    };
  }
  
  /**
   * Extract global colors from CSS
   */
  static extractColors(html: string): Field[] {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const colors = new Set<string>();
    
    // Extract from inline styles
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const style = (el as HTMLElement).style;
      if (style.color) colors.add(style.color);
      if (style.backgroundColor) colors.add(style.backgroundColor);
      if (style.borderColor) colors.add(style.borderColor);
    });
    
    // Extract from CSS in style tags
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(tag => {
      const css = tag.textContent || '';
      COLOR_PATTERNS.forEach(pattern => {
        const matches = css.match(pattern) || [];
        matches.forEach(color => colors.add(color));
      });
    });
    
    // Convert to fields
    const colorArray = Array.from(colors).slice(0, 20); // Limit to 20 colors
    return colorArray.map((color, index) => ({
      id: `color-${index}`,
      type: 'color' as FieldType,
      label: `Brand Color ${index + 1}`,
      selector: ':root', // Global
      attribute: '--brand-color-' + index,
      defaultValue: color,
    }));
  }
  
  /**
   * Generate a unique CSS selector for an element
   */
  private static generateSelector(element: Element): string {
    // Try to use ID first
    const id = element.getAttribute('id');
    if (id) return `#${id}`;
    
    // Try class
    const className = element.getAttribute('class');
    if (className) {
      const classes = className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        // Use first unique-ish class
        return `.${classes[0]}`;
      }
    }
    
    // Fall back to tag name with nth-child
    const parent = element.parentElement;
    if (parent) {
      const children = Array.from(parent.children);
      const index = children.indexOf(element) + 1;
      return `${element.tagName.toLowerCase()}:nth-child(${index})`;
    }
    
    return element.tagName.toLowerCase();
  }
  
  /**
   * Format file name to readable page name
   */
  private static formatPageName(fileName: string): string {
    const name = fileName.replace('.html', '');
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Parse multiple HTML files and create complete template structure
   */
  static parseTemplate(files: Record<string, string>): TemplateStructure {
    const pages: TemplateStructure['pages'] = [];
    let allColors: Field[] = [];
    
    Object.entries(files).forEach(([fileName, content]) => {
      if (fileName.endsWith('.html')) {
        const page = this.parseHTML(content, fileName);
        pages.push(page);
        
        // Extract colors from this page
        const pageColors = this.extractColors(content);
        allColors = [...allColors, ...pageColors];
      }
    });
    
    // Deduplicate colors
    const uniqueColors = allColors.filter((color, index, self) => 
      index === self.findIndex(c => c.defaultValue === color.defaultValue)
    ).slice(0, 10); // Limit to 10 unique colors
    
    return {
      pages,
      global: {
        colors: uniqueColors,
        typography: [
          {
            id: 'font-family',
            type: 'select',
            label: 'Font Family',
            selector: 'body',
            attribute: 'style.fontFamily',
            options: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Playfair Display', 'Montserrat'],
            defaultValue: 'Inter',
          },
          {
            id: 'heading-font',
            type: 'select',
            label: 'Heading Font',
            selector: 'h1, h2, h3',
            attribute: 'style.fontFamily',
            options: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Playfair Display', 'Montserrat'],
            defaultValue: 'Playfair Display',
          },
        ],
        seo: [
          {
            id: 'site-title',
            type: 'text',
            label: 'Site Title',
            selector: 'title',
            attribute: 'textContent',
            defaultValue: 'My Website',
          },
          {
            id: 'meta-description',
            type: 'textarea',
            label: 'Meta Description',
            selector: 'meta[name="description"]',
            attribute: 'content',
            defaultValue: '',
          },
          {
            id: 'og-image',
            type: 'image',
            label: 'Social Share Image',
            selector: 'meta[property="og:image"]',
            attribute: 'content',
            defaultValue: '',
          },
        ],
        settings: [
          {
            id: 'favicon',
            type: 'image',
            label: 'Favicon',
            selector: 'link[rel="icon"]',
            attribute: 'href',
            defaultValue: '/favicon.ico',
          },
          {
            id: 'analytics-id',
            type: 'text',
            label: 'Google Analytics ID',
            selector: 'head',
            attribute: 'data-ga-id',
            defaultValue: '',
          },
        ],
      },
    };
  }
}
