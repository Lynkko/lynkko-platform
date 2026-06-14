import { Resend } from 'resend'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  tags?: Array<{ name: string; value: string }>
}

export interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

// ─── Singleton del cliente ────────────────────────────────────────────────────

let _resend: Resend | null = null

function getResend(): Resend {
  if (_resend) return _resend

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      '[@lynkko/email] RESEND_API_KEY no está definida en las variables de entorno.',
    )
  }

  _resend = new Resend(apiKey)
  return _resend
}

// ─── Envío de emails ──────────────────────────────────────────────────────────

/**
 * Envía un email via Resend (best-effort — no lanza excepciones).
 * Los errores se loguean y se retorna { success: false }.
 *
 * @example
 * await sendEmail({
 *   to: 'juan@ejemplo.co',
 *   subject: 'Bienvenido a Lynkko',
 *   html: '<h1>Hola Juan</h1>',
 * })
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const from =
    options.from ??
    process.env.RESEND_FROM_EMAIL ??
    'Lynkko <no-reply@lynkko.co>'

  try {
    const { data, error } = await getResend().emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      ...(options.cc ? { cc: options.cc } : {}),
      ...(options.bcc ? { bcc: options.bcc } : {}),
      ...(options.tags ? { tags: options.tags } : {}),
    })

    if (error) {
      console.error('[@lynkko/email]', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[@lynkko/email]', message)
    return { success: false, error: message }
  }
}

/**
 * Versión estricta: lanza excepción si el envío falla.
 * Usar cuando el email es crítico (ej: confirmación de pago).
 */
export async function sendEmailOrThrow(options: SendEmailOptions): Promise<string> {
  const result = await sendEmail(options)
  if (!result.success) {
    throw new Error(`[@lynkko/email] Fallo al enviar email: ${result.error}`)
  }
  return result.id!
}

// ─── Templates base ───────────────────────────────────────────────────────────

/**
 * Envuelve contenido HTML en el layout base de Lynkko.
 * Cada app puede personalizar el color primario y el logo.
 *
 * @example
 * const html = lynkkoEmailTemplate({
 *   title: 'Bienvenido',
 *   content: '<p>Hola Juan, gracias por registrarte.</p>',
 *   primaryColor: '#166534',
 * })
 */
export function lynkkoEmailTemplate(options: {
  title: string
  content: string
  primaryColor?: string
  logoUrl?: string
  footerText?: string
  ctaText?: string
  ctaUrl?: string
}): string {
  const color = options.primaryColor ?? '#166534'
  const footer = options.footerText ?? 'Lynkko · Plataforma de gestión empresarial'

  const cta = options.ctaText && options.ctaUrl
    ? `<div style="text-align:center;margin:28px 0;">
        <a href="${options.ctaUrl}"
           style="background:${color};color:white;padding:12px 28px;border-radius:6px;
                  text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          ${options.ctaText}
        </a>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${options.title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:white;border-radius:10px;overflow:hidden;
                      box-shadow:0 1px 3px rgba(0,0,0,.1);">
          <!-- Header -->
          <tr>
            <td style="background:${color};padding:24px 32px;">
              ${options.logoUrl
                ? `<img src="${options.logoUrl}" height="32" alt="Logo"
                        style="display:block;">`
                : `<span style="color:white;font-size:18px;font-weight:800;letter-spacing:-.5px;">
                     Lynkko
                   </span>`
              }
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#111827;font-size:15px;line-height:1.6;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">
                ${options.title}
              </h1>
              ${options.content}
              ${cta}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;
                        font-size:12px;color:#6b7280;text-align:center;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
