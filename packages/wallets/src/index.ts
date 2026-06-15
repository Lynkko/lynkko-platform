import { PKPass } from 'passkit-generator'
import jwt from 'jsonwebtoken'

// ─── Types — Apple Wallet ────────────────────────────────────────────────────

export interface AppleWalletConfig {
  /** Team ID de Apple Developer (10 chars). */
  teamId: string
  /** Pass Type Identifier. Ej: 'pass.co.lynkko.membership' */
  passTypeId: string
  /** Apple WWDR certificate (PEM). */
  wwdr: Buffer | string
  /** Signing certificate (PEM). */
  signerCert: Buffer | string
  /** Signing private key (PEM). */
  signerKey: Buffer | string
  /** Passphrase del signing key (si aplica). */
  signerKeyPassphrase?: string
}

export interface ApplePassColors {
  /** Formato 'rgb(r, g, b)'. Default: 'rgb(22, 101, 52)' (verde Lynkko) */
  backgroundColor?: string
  /** Color del texto primario. Default: 'rgb(255, 255, 255)' */
  foregroundColor?: string
  /** Color de las etiquetas. Default: 'rgb(200, 240, 218)' */
  labelColor?: string
}

export interface AppleLoyaltyPassData {
  serialNumber: string
  /** Nombre de la organización en el pass. */
  organizationName: string
  /** Descripción corta del pass (accesibilidad). */
  description: string
  /** Texto junto al logo. */
  logoText?: string
  colors?: ApplePassColors

  /** Campo principal — normalmente el nombre del miembro. */
  primaryLabel: string
  primaryValue: string

  /** Campo secundario izquierdo — ej: "Membresía" / "Gold" */
  secondaryLabel?: string
  secondaryValue?: string

  /** Campo auxiliar — ej: "Puntos" / "1.250" */
  auxiliaryLabel?: string
  auxiliaryValue?: string

  /** Campo en el reverso del pass. Pares label/value. */
  backFields?: Array<{ label: string; value: string; key: string }>

  /** Imágenes (PNG). icon es requerido por Apple. */
  icon:         Buffer
  icon2x?:      Buffer
  logo?:        Buffer
  logo2x?:      Buffer
  /** Imagen de franja en storeCard/eventTicket. */
  strip?:       Buffer

  /** Para actualizaciones push (Apple Pass Kit Web Service). */
  webServiceURL?:       string
  authenticationToken?: string  // mínimo 16 caracteres

  /** Ubicaciones donde aparece la notificación del pass. */
  locations?: Array<{
    latitude:      number
    longitude:     number
    relevantText?: string
  }>

  /** Fecha relevante en ISO 8601. Ej: '2026-12-31T23:59:59-05:00' */
  relevantDate?: string
}

// ─── Apple Wallet — crear pass de membresía/lealtad ──────────────────────────

/**
 * Genera un archivo .pkpass listo para enviar al usuario.
 * El browser/iOS detecta el MIME type y abre el instalador automáticamente.
 *
 * @example
 * // app/api/wallet/apple/route.ts
 * import { createAppleLoyaltyPass } from '@lynkko/wallets'
 *
 * export async function GET(req: Request) {
 *   const buffer = await createAppleLoyaltyPass(walletConfig, {
 *     serialNumber: member.id,
 *     organizationName: 'Hotel Decameron',
 *     description: 'Tarjeta de membresía',
 *     primaryLabel: 'Miembro', primaryValue: member.name,
 *     secondaryLabel: 'Categoría', secondaryValue: member.tier,
 *     auxiliaryLabel: 'Puntos', auxiliaryValue: String(member.points),
 *     icon: fs.readFileSync('public/wallet/icon.png'),
 *   })
 *
 *   return new Response(buffer, {
 *     headers: {
 *       'Content-Type': 'application/vnd.apple.pkpass',
 *       'Content-Disposition': `attachment; filename="${member.id}.pkpass"`,
 *     },
 *   })
 * }
 */
export async function createAppleLoyaltyPass(
  walletConfig: AppleWalletConfig,
  data: AppleLoyaltyPassData,
): Promise<Buffer> {
  const colors = data.colors ?? {}
  const bg     = colors.backgroundColor ?? 'rgb(22, 101, 52)'
  const fg     = colors.foregroundColor ?? 'rgb(255, 255, 255)'
  const label  = colors.labelColor     ?? 'rgb(200, 240, 218)'

  const passJson: Record<string, unknown> = {
    passTypeIdentifier: walletConfig.passTypeId,
    teamIdentifier:     walletConfig.teamId,
    organizationName:   data.organizationName,
    description:        data.description,
    formatVersion:      1,
    serialNumber:       data.serialNumber,
    backgroundColor:    bg,
    foregroundColor:    fg,
    labelColor:         label,
    ...(data.logoText         && { logoText: data.logoText }),
    ...(data.webServiceURL    && { webServiceURL: data.webServiceURL }),
    ...(data.authenticationToken && { authenticationToken: data.authenticationToken }),
    ...(data.relevantDate     && { relevantDate: data.relevantDate }),
    ...(data.locations        && { locations: data.locations }),
    storeCard: {
      primaryFields: [
        { key: 'primary', label: data.primaryLabel, value: data.primaryValue },
      ],
      secondaryFields: data.secondaryLabel
        ? [{ key: 'secondary', label: data.secondaryLabel, value: data.secondaryValue ?? '' }]
        : [],
      auxiliaryFields: data.auxiliaryLabel
        ? [{ key: 'auxiliary', label: data.auxiliaryLabel, value: data.auxiliaryValue ?? '' }]
        : [],
      backFields: data.backFields ?? [],
    },
  }

  const model: Record<string, Buffer> = {
    'pass.json': Buffer.from(JSON.stringify(passJson)),
    'icon.png':  data.icon,
    ...(data.icon2x  && { 'icon@2x.png':  data.icon2x }),
    ...(data.logo    && { 'logo.png':      data.logo }),
    ...(data.logo2x  && { 'logo@2x.png':  data.logo2x }),
    ...(data.strip   && { 'strip.png':     data.strip }),
  }

  const pass = new PKPass(
    model,
    {
      wwdr:                Buffer.isBuffer(walletConfig.wwdr)       ? walletConfig.wwdr       : Buffer.from(walletConfig.wwdr),
      signerCert:          Buffer.isBuffer(walletConfig.signerCert) ? walletConfig.signerCert : Buffer.from(walletConfig.signerCert),
      signerKey:           Buffer.isBuffer(walletConfig.signerKey)  ? walletConfig.signerKey  : Buffer.from(walletConfig.signerKey),
      signerKeyPassphrase: walletConfig.signerKeyPassphrase,
    },
  )

  return pass.getAsBuffer()
}

// ─── Types — Google Wallet ────────────────────────────────────────────────────

export interface GoogleWalletConfig {
  /** Email de la service account de Google Cloud. */
  serviceAccountEmail: string
  /** Clave privada de la service account (PEM). */
  serviceAccountKey: string
  /** Google Pay API for Passes issuer ID (obtenido en Google Pay Business Console). */
  issuerId: string
}

export interface GoogleLoyaltyPassData {
  /** ID único del "object" (combinado con issuerId: '{issuerId}.{objectId}'). */
  objectId: string
  /** ID de la clase (template) ya creada en Google Wallet API. */
  classId: string
  /** Estado del pass. Default: 'ACTIVE' */
  state?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'EXPIRED'
  /** Nombre del miembro. */
  accountName: string
  /** ID de membresía visible en el pass. */
  accountId?: string
  /** Puntos/balance. */
  loyaltyPoints?: {
    label: string
    balance: { string: string }
  }
  /** Imagen de logo de la org (URL HTTPS). */
  heroImage?: string
  barcode?: {
    type: 'QR_CODE' | 'PDF_417' | 'AZTEC' | 'CODE_128'
    value: string
    alternateText?: string
  }
}

// ─── Google Wallet — generar JWT para "Add to Google Wallet" ─────────────────

/**
 * Genera el JWT necesario para el botón "Agregar a Google Wallet".
 * El JWT contiene el pass object completo — Google lo valida y lo añade.
 *
 * @example
 * // app/api/wallet/google/route.ts
 * import { createGoogleWalletJwt } from '@lynkko/wallets'
 *
 * export async function GET() {
 *   const token = createGoogleWalletJwt(googleConfig, passData)
 *   const url = `https://pay.google.com/gp/v/save/${token}`
 *   return ok({ url })
 * }
 *
 * // Frontend — botón de Google Wallet
 * <a href={url} target="_blank">
 *   <img src="/google-wallet-badge.svg" alt="Agregar a Google Wallet" />
 * </a>
 */
export function createGoogleWalletJwt(
  config: GoogleWalletConfig,
  data: GoogleLoyaltyPassData,
): string {
  const objectId = `${config.issuerId}.${data.objectId}`
  const classId  = `${config.issuerId}.${data.classId}`

  const loyaltyObject: Record<string, unknown> = {
    id:          objectId,
    classId,
    state:       data.state ?? 'ACTIVE',
    accountName: data.accountName,
    ...(data.accountId      && { accountId: data.accountId }),
    ...(data.loyaltyPoints  && { loyaltyPoints: data.loyaltyPoints }),
    ...(data.barcode        && { barcode: data.barcode }),
  }

  const payload = {
    iss: config.serviceAccountEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [],
    payload: {
      loyaltyObjects: [loyaltyObject],
    },
  }

  return jwt.sign(payload, config.serviceAccountKey, { algorithm: 'RS256' })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** MIME type correcto para servir un .pkpass desde un Route Handler. */
export const APPLE_PASS_MIME_TYPE = 'application/vnd.apple.pkpass' as const

/** URL base para el botón "Agregar a Google Wallet". */
export const GOOGLE_WALLET_SAVE_URL = 'https://pay.google.com/gp/v/save' as const

/**
 * Construye la URL completa del botón de Google Wallet.
 * @example
 * const url = googleWalletSaveUrl(jwt)
 * // "https://pay.google.com/gp/v/save/eyJhb..."
 */
export function googleWalletSaveUrl(token: string): string {
  return `${GOOGLE_WALLET_SAVE_URL}/${token}`
}
