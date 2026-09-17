import { AppSettings } from '@/store/useStore';

export class RenderContext {
  private currencySymbol: string;
  private currency: string;
  private locale: string;
  private dateFormat: string;

  constructor(settings: AppSettings, customCurrency?: string, customCurrencySymbol?: string) {
    this.currency = customCurrency || settings.currency || 'USD';
    this.currencySymbol = customCurrencySymbol || settings.currencySymbol || '$';
    this.locale = 'en-US';
    this.dateFormat = settings.localization?.dateFormat || 'long';
  }

  /**
   * Formats a given number into currency representation.
   */
  public formatCurrency(amount: number): string {
    const formatted = amount.toLocaleString(this.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${this.currencySymbol}${formatted}`;
  }

  /**
   * Formats an ISO or standard date string.
   */
  public formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      if (this.dateFormat === 'short') {
        return date.toLocaleDateString(this.locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      }

      return date.toLocaleDateString(this.locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Gets current active currency symbol.
   */
  public getCurrencySymbol(): string {
    return this.currencySymbol;
  }

  /**
   * Gets current active currency code.
   */
  public getCurrency(): string {
    return this.currency;
  }
}
