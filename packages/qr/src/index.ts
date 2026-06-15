import QRCode from 'qrcode'

// ─── Types ───────────────────────────────────────────────────────────────────

export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrOptions {
  /** Tamaño en píxeles (para PNG). Default: 300 */
  size?:             number
  /** Margen en módulos alrededor del QR. Default: 2 */
  margin?:           number
  /** Color del QR. Default: '#000000' */
  color?:            string
  /** Color de fondo. Default: '#ffffff' */
  bgColor?:          string
  /** Nivel de corrección de errores. Default: 'M' */
  errorLevel?:       QrErrorLevel
}

// ─── SVG ─────────────────────────────────────────────────────────────────────

/**
 * Genera un QR como string SVG.
 * Ideal para incluir directamente en HTML o en PDFs via puppeteer.
 *
 * @example
 * const svg = await generateQrSvg('https://lynkko.co/pass/abc123')
 * // '<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>'
 *
 * // En Next.js Route Handler:
 * return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
 */
export async function generateQrSvg(data: string, options?: QrOptions): Promise<string> {
  return QRCode.toString(data, {
    type:             'svg',
    margin:           options?.margin    ?? 2,
    errorCorrectionLevel: options?.errorLevel ?? 'M',
    color: {
      dark:  options?.color   ?? '#000000',
      light: options?.bgColor ?? '#ffffff',
    },
  })
}

// ─── PNG Buffer ───────────────────────────────────────────────────────────────

/**
 * Genera un QR como Buffer PNG.
 * Útil para adjuntar a emails, guardar en storage o incluir en PDFs.
 *
 * @example
 * const buffer = await generateQrBuffer('https://lynkko.co/member/42')
 *
 * // En Next.js Route Handler:
 * return new Response(buffer, { headers: { 'Content-Type': 'image/png' } })
 *
 * // En Apple Wallet pass (strip image):
 * const walletData = { strip: await generateQrBuffer(memberUrl) }
 */
export async function generateQrBuffer(data: string, options?: QrOptions): Promise<Buffer> {
  const size = options?.size ?? 300
  return QRCode.toBuffer(data, {
    type:                 'png',
    width:                size,
    margin:               options?.margin    ?? 2,
    errorCorrectionLevel: options?.errorLevel ?? 'M',
    color: {
      dark:  options?.color   ?? '#000000',
      light: options?.bgColor ?? '#ffffff',
    },
  })
}

// ─── Data URL ─────────────────────────────────────────────────────────────────

/**
 * Genera un QR como data URL (base64 PNG).
 * Ideal para usar directamente en un `<img src={dataUrl} />`.
 *
 * @example
 * const url = await generateQrDataUrl('https://lynkko.co/checkin/99')
 * // 'data:image/png;base64,iVBOR...'
 *
 * // En React:
 * <img src={url} alt="QR de ingreso" width={200} height={200} />
 */
export async function generateQrDataUrl(data: string, options?: QrOptions): Promise<string> {
  const size = options?.size ?? 300
  return QRCode.toDataURL(data, {
    type:                 'image/png',
    width:                size,
    margin:               options?.margin    ?? 2,
    errorCorrectionLevel: options?.errorLevel ?? 'M',
    color: {
      dark:  options?.color   ?? '#000000',
      light: options?.bgColor ?? '#ffffff',
    },
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Construye la URL de verificación de un pase/miembro y genera el QR en un paso.
 *
 * @example
 * // ClubPass — QR de membresía
 * const qr = await generateMemberQr('https://clubpass.co', 'tenant-abc', 'member-42')
 * // QR apunta a: https://clubpass.co/v/tenant-abc/member-42
 */
export async function generateMemberQr(
  baseUrl:  string,
  tenantId: string,
  memberId: string,
  options?: QrOptions,
): Promise<string> {
  const url = `${baseUrl}/v/${tenantId}/${memberId}`
  return generateQrSvg(url, options)
}

/**
 * Construye la URL de check-in de un turno y genera el QR.
 *
 * @example
 * // Turnflow — QR de turno
 * const qr = await generateAppointmentQr('https://app.turnflow.co', 'appt-xyz')
 */
export async function generateAppointmentQr(
  baseUrl:       string,
  appointmentId: string,
  options?:      QrOptions,
): Promise<string> {
  const url = `${baseUrl}/checkin/${appointmentId}`
  return generateQrSvg(url, options)
}
