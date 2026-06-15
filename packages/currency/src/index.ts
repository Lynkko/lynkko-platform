// ─── Types ───────────────────────────────────────────────────────────────────

export type CurrencyCode = 'COP' | 'USD' | 'MXN' | 'EUR' | 'PEN' | 'CLP' | 'ARS' | 'BRL'

export interface CurrencyConfig {
  code:     CurrencyCode
  symbol:   string
  locale:   string
  decimals: number
}

export interface FormatCurrencyOptions {
  /** Mostrar símbolo de moneda. Default: true */
  symbol?:    boolean
  /** Mostrar código ISO (COP, USD…). Default: false */
  showCode?:  boolean
  /** Número de decimales. Default: según la moneda */
  decimals?:  number
  /** Separador de miles. Default: según locale */
  compact?:   boolean
}

// ─── Config por moneda ────────────────────────────────────────────────────────

export const CURRENCY_CONFIG: Record<CurrencyCode, CurrencyConfig> = {
  COP: { code: 'COP', symbol: '$',  locale: 'es-CO', decimals: 0 },
  USD: { code: 'USD', symbol: '$',  locale: 'en-US', decimals: 2 },
  MXN: { code: 'MXN', symbol: '$',  locale: 'es-MX', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€',  locale: 'es-ES', decimals: 2 },
  PEN: { code: 'PEN', symbol: 'S/', locale: 'es-PE', decimals: 2 },
  CLP: { code: 'CLP', symbol: '$',  locale: 'es-CL', decimals: 0 },
  ARS: { code: 'ARS', symbol: '$',  locale: 'es-AR', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', locale: 'pt-BR', decimals: 2 },
}

// ─── Formateo ─────────────────────────────────────────────────────────────────

/**
 * Formatea un monto como moneda legible.
 *
 * @example
 * formatCurrency(150000, 'COP')               // '$ 150.000'
 * formatCurrency(1500.5, 'USD')               // '$ 1,500.50'
 * formatCurrency(150000, 'COP', { compact: true })  // '$ 150K'
 * formatCurrency(150000, 'COP', { showCode: true })  // 'COP 150.000'
 */
export function formatCurrency(
  amount:   number,
  currency: CurrencyCode,
  options?: FormatCurrencyOptions,
): string {
  const config   = CURRENCY_CONFIG[currency]
  const decimals = options?.decimals ?? config.decimals

  const notation = options?.compact ? 'compact' : 'standard'

  const formatted = new Intl.NumberFormat(config.locale, {
    style:                 'currency',
    currency:              currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation,
  }).format(amount)

  if (options?.showCode) {
    return new Intl.NumberFormat(config.locale, {
      style:                 'currency',
      currency:              currency,
      currencyDisplay:       'code',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation,
    }).format(amount)
  }

  if (options?.symbol === false) {
    return new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation,
    }).format(amount)
  }

  return formatted
}

/**
 * Formatea solo el número sin símbolo de moneda.
 *
 * @example
 * formatAmount(150000, 'COP')  // '150.000'
 * formatAmount(1500.5, 'USD')  // '1,500.50'
 */
export function formatAmount(amount: number, currency: CurrencyCode): string {
  return formatCurrency(amount, currency, { symbol: false })
}

/**
 * Retorna el símbolo de la moneda.
 *
 * @example
 * getCurrencySymbol('COP')  // '$'
 * getCurrencySymbol('EUR')  // '€'
 * getCurrencySymbol('BRL')  // 'R$'
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCY_CONFIG[currency].symbol
}

// ─── Conversión centavos ──────────────────────────────────────────────────────

/**
 * Convierte un monto decimal a centavos (entero).
 * Útil para Wompi y otras pasarelas que trabajan en centavos.
 *
 * @example
 * toCents(150000, 'COP')  // 15000000  (COP no tiene decimales, ×100)
 * toCents(19.99, 'USD')   // 1999
 */
export function toCents(amount: number, currency: CurrencyCode = 'COP'): number {
  const config = CURRENCY_CONFIG[currency]
  const factor = 10 ** (config.decimals === 0 ? 2 : config.decimals)
  return Math.round(amount * factor)
}

/**
 * Convierte centavos a monto decimal.
 *
 * @example
 * fromCents(15000000, 'COP')  // 150000
 * fromCents(1999, 'USD')      // 19.99
 */
export function fromCents(cents: number, currency: CurrencyCode = 'COP'): number {
  const config = CURRENCY_CONFIG[currency]
  const factor = 10 ** (config.decimals === 0 ? 2 : config.decimals)
  return cents / factor
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parsea un string de moneda a número.
 * Elimina símbolo, separadores de miles y normaliza decimales.
 *
 * @example
 * parseCurrency('$150.000')   // 150000
 * parseCurrency('1,500.50')   // 1500.50
 * parseCurrency('COP 150000') // 150000
 */
export function parseCurrency(value: string): number {
  const cleaned = value
    .replace(/[^0-9,.-]/g, '')  // quitar símbolos no numéricos
    .trim()

  // Detectar si usa coma como decimal (formato es-CO: 1.500,50)
  const lastComma  = cleaned.lastIndexOf(',')
  const lastDot    = cleaned.lastIndexOf('.')

  let normalized: string

  if (lastComma > lastDot) {
    // Formato europeo/LATAM: 1.500,50 → 1500.50
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    // Formato anglosajón: 1,500.50 → 1500.50
    normalized = cleaned.replace(/,/g, '')
  }

  const result = parseFloat(normalized)
  return isNaN(result) ? 0 : result
}

// ─── Comparación ─────────────────────────────────────────────────────────────

/**
 * Suma un array de montos con redondeo correcto para la moneda.
 *
 * @example
 * sumAmounts([100.1, 200.2, 300.7], 'USD')  // 601.00 (no 601.0000000001)
 */
export function sumAmounts(amounts: number[], currency: CurrencyCode = 'COP'): number {
  const config  = CURRENCY_CONFIG[currency]
  const factor  = 10 ** config.decimals
  const sumCents = amounts.reduce((acc, a) => acc + Math.round(a * factor), 0)
  return sumCents / factor
}
