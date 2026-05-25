/**
 * Template Parser Service
 * 
 * Automatically analyzes HTML templates and extracts editable elements.
 * Detects sections, text fields, images, colors, and creates a schema
 * that the CMS can use to generate dynamic editing UI.
 */

import { JSDOM } from 'jsdom';

// DOM types - use any to avoid TypeScript issues with JSDOM
type DOMElement = any;
type DOMHTMLElement = any;

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
      elements.forEach((el: any, index: number) => {
        const sectionId = `${pattern.type}-${index}`;
        const section = this.analyzeSection(el as any, sectionId, pattern.name, pattern.selector);
        if (section.fields.length > 0) {
          sections.push(section);
        }
      });
    });
    
    // If no sections detected, create a generic content section
    if (sections.length === 0) {
      const body = document.querySelector('body');
      if (body) {
        const section = this.analyzeSection(body as any, 'main-content', 'Main Content', 'body');
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
   * PRIORITY: Check for data-cms attributes first, then fall back to generic detection
   */
  private static analyzeSection(element: any, id: string, name: string, selector: string): Section {
    const fields: Field[] = [];
    const usedIds = new Set<string>(); // Track used IDs to avoid duplicates
    
    // PRIORITY 1: Find elements with data-cms attributes (template-defined editable fields)
    const cmsElements = element.querySelectorAll('[data-cms]');
    cmsElements.forEach((el: any) => {
      const cmsId = el.getAttribute('data-cms');
      if (!cmsId || usedIds.has(cmsId)) return;
      
      const tagName = el.tagName.toLowerCase();
      const text = el.textContent?.trim();
      
      // Determine field type based on element type and content
      let fieldType: FieldType = 'textarea';
      let attribute = 'textContent';
      let defaultValue = text || '';
      let label = this.formatLabel(cmsId);
      
      if (tagName === 'img') {
        fieldType = 'image';
        attribute = 'src';
        defaultValue = el.getAttribute('src') || '';
        label = this.formatLabel(cmsId) || 'Image';
      } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        fieldType = 'text';
        label = this.formatLabel(cmsId) || `Heading (${tagName})`;
      } else if (tagName === 'a' || el.classList?.contains('btn') || tagName === 'button') {
        fieldType = 'text';
        label = this.formatLabel(cmsId) || 'Button Text';
        // Also capture href for links
        if (tagName === 'a') {
          const hrefId = `${cmsId}-href`;
          if (!usedIds.has(hrefId)) {
            fields.push({
              id: hrefId,
              type: 'link',
              label: `${label} Link`,
              selector: this.generateSelector(el),
              attribute: 'href',
              defaultValue: el.getAttribute('href') || '#',
            });
            usedIds.add(hrefId);
          }
        }
      } else if (text && text.length > 100) {
        fieldType = 'textarea';
        label = this.formatLabel(cmsId) || 'Text Content';
      }
      
      fields.push({
        id: cmsId,
        type: fieldType,
        label: label,
        selector: this.generateSelector(el),
        attribute,
        defaultValue,
      });
      usedIds.add(cmsId);
    });
    
    // FALLBACK: Find all text elements without data-cms (for backward compatibility)
    const textElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span:not(:has(*)), a:not(:has(*))');
    textElements.forEach((el: any, index: number) => {
      // Skip if already has data-cms
      if (el.hasAttribute('data-cms')) return;
      
      const text = el.textContent?.trim();
      if (text && text.length > 2 && text.length < 500) {
        const tagName = el.tagName.toLowerCase();
        const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
        const fieldId = `${id}-text-${index}`;
        
        if (usedIds.has(fieldId)) return;
        
        fields.push({
          id: fieldId,
          type: isHeading ? 'text' : 'textarea',
          label: isHeading ? `Heading (${tagName})` : 'Text Content',
          selector: this.generateSelector(el),
          attribute: 'textContent',
          defaultValue: text,
        });
        usedIds.add(fieldId);
      }
    });
    
    // Find all images
    const images = element.querySelectorAll('img');
    images.forEach((img: any, index: number) => {
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
    buttons.forEach((btn: any, index: number) => {
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
            defaultValue: (btn as any).getAttribute('href') || '#',
          });
        }
      }
    });
    
    // Detect lists that might be repeatable sections
    const lists = element.querySelectorAll('ul:not(:has(ul)), ol:not(:has(ol))');
    lists.forEach((list: any, index: number) => {
      const items = list.querySelectorAll(':scope > li');
      if (items.length > 1) {
        // This looks like a repeatable section
        const firstItem = items[0];
        const itemFields: Field[] = [];
        
        // Analyze what fields each item has
        const itemImages = firstItem.querySelectorAll('img');
        itemImages.forEach((img: any, imgIndex: number) => {
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
        itemTexts.forEach((txt: any, txtIndex: number) => {
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
    allElements.forEach((el: any) => {
      const style = (el as any).style;
      if (style.color) colors.add(style.color);
      if (style.backgroundColor) colors.add(style.backgroundColor);
      if (style.borderColor) colors.add(style.borderColor);
    });
    
    // Extract from CSS in style tags
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach((tag: any) => {
      const css = tag.textContent || '';
      COLOR_PATTERNS.forEach(pattern => {
        const matches = css.match(pattern) || [];
        matches.forEach((color: string) => colors.add(color));
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
  private static generateSelector(element: any): string {
    // Try to use ID first
    const id = element.getAttribute('id');
    if (id) return `#${id}`;
    
    // Try class
    const className = element.getAttribute('class');
    if (className) {
      const classes = className.split(' ').filter((c: string) => c.length > 0);
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
   * Format data-cms ID to readable label
   * Converts snake_case or kebab-case to Title Case
   * Example: "hero-badge-text" -> "Hero Badge Text"
   */
  private static formatLabel(cmsId: string): string {
    if (!cmsId) return '';
    return cmsId
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
