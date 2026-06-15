import { createHash } from 'crypto'

// ─── Types — documentos ───────────────────────────────────────────────────────

export type TipoDocumento =
  | 'FV'   // Factura de Venta
  | 'NC'   // Nota Crédito
  | 'ND'   // Nota Débito
  | 'DS'   // Documento Soporte

export type TipoAmbiente = '1' | '2'  // 1=Producción, 2=Habilitación

export type CodigoImpuesto = '01' | '02' | '03' | '04' | '05' | '06'
// 01=IVA, 02=IC (Impuesto al Consumo), 03=ICA, 04=INC, 05=ReteFuente, 06=ReteIVA

export type TipoPersona = '1' | '2'  // 1=Jurídica, 2=Natural

export type RegimeFiscal =
  | 'O-13'   // Gran contribuyente
  | 'O-15'   // Autorretenedor
  | 'O-23'   // Agente de retención IVA
  | 'O-47'   // Régimen Simple
  | 'R-99-PN' // No aplica (persona natural no comerciante)
  | 'ZY'     // No responsable de IVA (antiguo Simplificado)

// ─── Types — actores ──────────────────────────────────────────────────────────

export interface DianParticipante {
  /** NIT o cédula sin dígito de verificación. */
  identificacion: string
  /** Dígito de verificación (calculado con calcularDV). */
  digitoVerificacion?: string
  /** Razón social o nombre completo. */
  nombre: string
  tipoPersona: TipoPersona
  regimeFiscal: RegimeFiscal
  correo?: string
  telefono?: string
  direccion?: {
    linea1: string
    ciudad: string
    departamento: string
    pais?: string // default: 'CO'
    codigoPostal?: string
  }
}

// ─── Types — items de factura ─────────────────────────────────────────────────

export interface DianLineaFactura {
  /** Código del producto/servicio (UNSPSC preferiblemente). */
  codigo: string
  descripcion: string
  cantidad: number
  /** Precio unitario antes de impuestos. */
  precioUnitario: number
  descuento?: number // porcentaje 0-100
  impuestos?: Array<{
    codigo:    CodigoImpuesto
    porcentaje: number  // ej: 19 (para 19% IVA)
    baseGravable?: number  // si difiere del subtotal
  }>
}

// ─── Types — factura completa ─────────────────────────────────────────────────

export interface DianFactura {
  tipoDocumento: TipoDocumento
  ambiente:      TipoAmbiente
  /** Número de resolución DIAN. */
  numeroResolucion: string
  /** Número del documento. Ej: 'SETP990000001' */
  numero: string
  /** Fecha en formato YYYY-MM-DD */
  fecha: string
  /** Hora en formato HH:MM:SS */
  hora: string
  /** Huso horario. Default: '-05:00' */
  husoHorario?: string
  emisor:    DianParticipante
  receptor:  DianParticipante
  lineas:    DianLineaFactura[]
  /** Clave técnica del rango de numeración (del panel DIAN). */
  claveTecnica: string
  notas?: string
}

// ─── NIT — dígito de verificación ────────────────────────────────────────────

/**
 * Calcula el dígito de verificación de un NIT colombiano.
 * Algoritmo oficial DIAN.
 *
 * @example
 * calcularDV('900455751')  // '5'
 * calcularDV('800197268')  // '4'
 */
export function calcularDV(nit: string): string {
  const digits = nit.replace(/\D/g, '')
  const primos = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3]
  const reversed = digits.split('').reverse()

  let sum = 0
  for (let i = 0; i < reversed.length; i++) {
    sum += parseInt(reversed[i]) * primos[i]
  }

  const rem = sum % 11
  if (rem <= 1) return String(rem)
  return String(11 - rem)
}

// ─── CUFE — Código Único de Factura Electrónica ───────────────────────────────

export interface CufeInput {
  /** Número del documento. Ej: 'SETP990000001' */
  numFac: string
  /** Fecha. Ej: '2024-01-15' */
  fechaFac: string
  /** Hora con zona. Ej: '10:30:00-05:00' */
  horFac: string
  /** Valor base antes de impuestos, 2 decimales. Ej: '100000.00' */
  valFac: string
  /** Código impuesto 1 (IVA usualmente). Default: '01' */
  codImp1?: CodigoImpuesto
  /** Valor impuesto 1, 2 decimales. Ej: '19000.00' */
  valImp1: string
  /** Código impuesto 2. Default: '04' */
  codImp2?: CodigoImpuesto
  /** Valor impuesto 2, 2 decimales. Ej: '0.00' */
  valImp2: string
  /** Código impuesto 3. Default: '03' */
  codImp3?: CodigoImpuesto
  /** Valor impuesto 3, 2 decimales. Ej: '0.00' */
  valImp3: string
  /** Valor total (base + impuestos), 2 decimales. Ej: '119000.00' */
  valTot: string
  /** NIT del emisor sin DV. Ej: '900455751' */
  nitOFE: string
  /** Identificación del receptor (NIT o CC). */
  numAdq: string
  /** Clave técnica del rango de numeración DIAN. */
  claveRanTecFact: string
  /** Número de resolución DIAN. */
  numRes: string
}

/**
 * Calcula el CUFE (Código Único de Factura Electrónica).
 * Algoritmo: SHA-384 hex de la concatenación de campos en el orden exacto de DIAN.
 *
 * Resolución DIAN 000042 de 2020, Anexo Técnico 1.9.
 *
 * @example
 * const cufe = calculateCufe({
 *   numFac: 'SETP990000001',
 *   fechaFac: '2024-01-15',
 *   horFac: '10:30:00-05:00',
 *   valFac: '100000.00',
 *   valImp1: '19000.00',
 *   valImp2: '0.00',
 *   valImp3: '0.00',
 *   valTot: '119000.00',
 *   nitOFE: '900455751',
 *   numAdq: '123456789',
 *   claveRanTecFact: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c',
 *   numRes: '18760000001',
 * })
 */
export function calculateCufe(input: CufeInput): string {
  const codImp1 = input.codImp1 ?? '01'
  const codImp2 = input.codImp2 ?? '04'
  const codImp3 = input.codImp3 ?? '03'

  const raw =
    input.numFac +
    input.fechaFac +
    input.horFac +
    input.valFac +
    codImp1 +
    input.valImp1 +
    codImp2 +
    input.valImp2 +
    codImp3 +
    input.valImp3 +
    input.valTot +
    input.nitOFE +
    input.numAdq +
    input.claveRanTecFact +
    input.numRes

  return createHash('sha384').update(raw, 'utf8').digest('hex')
}

// ─── CUDE — Código Único de Documento Electrónico (Nota Crédito/Débito) ──────

export interface CudeInput {
  /** Número del documento. */
  numNDE: string
  /** Fecha. */
  fecNDE: string
  /** Hora con zona. */
  horNDE: string
  /** Valor base. */
  valFac: string
  codImp1?: CodigoImpuesto
  valImp1: string
  codImp2?: CodigoImpuesto
  valImp2: string
  codImp3?: CodigoImpuesto
  valImp3: string
  valTot: string
  nitOFE: string
  numAdq: string
  claveRanTecFact: string
  numRes: string
}

/**
 * Calcula el CUDE (Código Único de Documento Electrónico) para notas crédito/débito.
 * Mismo algoritmo que CUFE pero con los campos de la nota.
 */
export function calculateCude(input: CudeInput): string {
  return calculateCufe({
    numFac:          input.numNDE,
    fechaFac:        input.fecNDE,
    horFac:          input.horNDE,
    valFac:          input.valFac,
    codImp1:         input.codImp1,
    valImp1:         input.valImp1,
    codImp2:         input.codImp2,
    valImp2:         input.valImp2,
    codImp3:         input.codImp3,
    valImp3:         input.valImp3,
    valTot:          input.valTot,
    nitOFE:          input.nitOFE,
    numAdq:          input.numAdq,
    claveRanTecFact: input.claveRanTecFact,
    numRes:          input.numRes,
  })
}

// ─── QR URL ───────────────────────────────────────────────────────────────────

/**
 * Genera la URL del código QR para incluir en la representación gráfica.
 * El QR apunta al portal DIAN donde se puede verificar el documento.
 *
 * @example
 * const qrUrl = generateDianQrUrl(cufe, 'produccion')
 * // "https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=abc123..."
 */
export function generateDianQrUrl(
  cufe: string,
  ambiente: 'habilitacion' | 'produccion',
): string {
  const base = ambiente === 'produccion'
    ? 'https://catalogo-vpfe.dian.gov.co/document/searchqr'
    : 'https://catalogo-vpfe-hab.dian.gov.co/document/searchqr'
  return `${base}?documentkey=${cufe}`
}

// ─── Formato de número de documento ──────────────────────────────────────────

/**
 * Formatea el número de documento con prefijo.
 * DIAN requiere: prefijo alfanumérico + número rellenado con ceros.
 *
 * @example
 * formatInvoiceNumber('SETP', 42, 9)  // 'SETP000000042'
 * formatInvoiceNumber('FV', 1001, 8)  // 'FV00001001'
 */
export function formatInvoiceNumber(
  prefix: string,
  number: number,
  padLength = 9,
): string {
  return `${prefix}${String(number).padStart(padLength, '0')}`
}

// ─── Cálculos de valores ──────────────────────────────────────────────────────

/**
 * Formatea un número como string con exactamente 2 decimales.
 * Requerido por DIAN en campos de valores.
 *
 * @example
 * formatDianValue(150000)    // '150000.00'
 * formatDianValue(19000.5)   // '19000.50'
 */
export function formatDianValue(amount: number): string {
  return amount.toFixed(2)
}

export interface DianTotalesResult {
  subtotal:  number
  descuento: number
  baseImponible: number
  impuestos: Array<{ codigo: CodigoImpuesto; base: number; porcentaje: number; valor: number }>
  total:     number
}

/**
 * Calcula los totales de una factura a partir de sus líneas.
 * Agrupa impuestos por código.
 *
 * @example
 * const totales = calculateDianTotales(factura.lineas)
 * // { subtotal, baseImponible, impuestos: [{ codigo:'01', valor: 19000 }], total }
 */
export function calculateDianTotales(lineas: DianLineaFactura[]): DianTotalesResult {
  const impMap = new Map<CodigoImpuesto, { base: number; porcentaje: number; valor: number }>()

  let subtotal  = 0
  let descuento = 0

  for (const linea of lineas) {
    const lineTotal = linea.cantidad * linea.precioUnitario
    const lineDesc  = lineTotal * ((linea.descuento ?? 0) / 100)
    const lineBase  = lineTotal - lineDesc

    subtotal  += lineTotal
    descuento += lineDesc

    for (const imp of linea.impuestos ?? []) {
      const base  = imp.baseGravable ?? lineBase
      const valor = base * (imp.porcentaje / 100)
      const prev  = impMap.get(imp.codigo)

      if (prev) {
        impMap.set(imp.codigo, {
          base:       prev.base + base,
          porcentaje: imp.porcentaje,
          valor:      prev.valor + valor,
        })
      } else {
        impMap.set(imp.codigo, { base, porcentaje: imp.porcentaje, valor })
      }
    }
  }

  const baseImponible = subtotal - descuento
  const impuestos = Array.from(impMap.entries()).map(([codigo, v]) => ({ codigo, ...v }))
  const totalImpuestos = impuestos.reduce((s, i) => s + i.valor, 0)
  const total = baseImponible + totalImpuestos

  return { subtotal, descuento, baseImponible, impuestos, total }
}
