import { DocumentTemplate } from '../types/template';
import { minimalWhite } from '../templates/invoice/minimalWhite';
import { modernGradient } from '../templates/invoice/modernGradient';
import { corporateBlue } from '../templates/invoice/corporateBlue';
import { boldDark } from '../templates/invoice/boldDark';
import { cleanBusiness } from '../templates/invoice/cleanBusiness';
import { corporateTeal } from '../templates/invoice/corporateTeal';
import { minimalistBw } from '../templates/invoice/minimalistBw';
import { creativeColorful } from '../templates/invoice/creativeColorful';
import { darkLuxury } from '../templates/invoice/darkLuxury';

class TemplateRegistry {
  private templates: Map<string, DocumentTemplate> = new Map();

  constructor() {
    // Register the 9 core built-in templates
    this.registerTemplate(minimalWhite);
    this.registerTemplate(modernGradient);
    this.registerTemplate(corporateBlue);
    this.registerTemplate(boldDark);
    this.registerTemplate(cleanBusiness);
    this.registerTemplate(corporateTeal);
    this.registerTemplate(minimalistBw);
    this.registerTemplate(creativeColorful);
    this.registerTemplate(darkLuxury);
  }

  /**
   * Registers a new template in the registry.
   */
  public registerTemplate(template: DocumentTemplate): void {
    if (!template || !template.id) {
      throw new Error('Invalid template configuration');
    }
    this.templates.set(template.id, template);
  }

  /**
   * Retrieves a template by its ID. Falls back to minimalWhite if not found.
   */
  public getTemplate(id: string): DocumentTemplate {
    if (!id) {
      return this.defaultTemplate();
    }

    // Direct match
    if (this.templates.has(id)) {
      return this.templates.get(id)!;
    }
    
    // Normalized key (lower-case alphanumeric)
    const normalized = id.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Map template names, legacy IDs, and aliases
    const legacyMapping: Record<string, string> = {
      // 1. Minimal White
      'minimal': 'minimalWhite',
      'minimalwhite': 'minimalWhite',
      'minimal-white': 'minimalWhite',

      // 2. Modern Gradient
      'modern': 'modernGradient',
      'moderngradient': 'modernGradient',
      'modern-gradient': 'modernGradient',

      // 3. Corporate Blue
      'corporate': 'corporateBlue',
      'corporateblue': 'corporateBlue',
      'corporate-blue': 'corporateBlue',
      'modernblue': 'corporateBlue',
      'modern-blue': 'corporateBlue',
      'elegantcorporate': 'corporateBlue',
      'elegant-corporate': 'corporateBlue',

      // 4. Bold Dark
      'dark': 'boldDark',
      'bolddark': 'boldDark',
      'bold-dark': 'boldDark',
      'executivedark': 'boldDark',
      'executive-dark': 'boldDark',

      // 5. Clean Business
      'clean': 'cleanBusiness',
      'cleanbusiness': 'cleanBusiness',
      'clean-business': 'cleanBusiness',

      // 6. Corporate Teal
      'teal': 'corporateTeal',
      'corporateteal': 'corporateTeal',
      'corporate-teal': 'corporateTeal',

      // 7. Minimalist B&W
      'bw': 'minimalistBw',
      'minimalist': 'minimalistBw',
      'minimalistbw': 'minimalistBw',
      'minimalist-bw': 'minimalistBw',

      // 8. Creative Colorful
      'creative': 'creativeColorful',
      'creativecolorful': 'creativeColorful',
      'creative-colorful': 'creativeColorful',
      'creativegradient': 'creativeColorful',
      'creative-gradient': 'creativeColorful',

      // 9. Dark Luxury
      'luxury': 'darkLuxury',
      'darkluxury': 'darkLuxury',
      'dark-luxury': 'darkLuxury',
      'luxuryblackgold': 'darkLuxury',
      'luxury-black-gold': 'darkLuxury',
    };

    const mappedId = legacyMapping[id] || legacyMapping[normalized];
    if (mappedId && this.templates.has(mappedId)) {
      return this.templates.get(mappedId)!;
    }

    // Default fallback
    return this.defaultTemplate();
  }

  /**
   * Returns all registered templates.
   */
  public getTemplates(): DocumentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Returns the default template.
   */
  public defaultTemplate(): DocumentTemplate {
    return minimalWhite;
  }
}

export const templateRegistry = new TemplateRegistry();
export default templateRegistry;

