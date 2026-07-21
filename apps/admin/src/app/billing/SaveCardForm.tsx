'use client'

/**
 * Guardar tarjeta para cobro automático. La tokenización ocurre en el navegador
 * (fetch directo a Wompi con la llave pública) — el número de tarjeta NUNCA pasa
 * por el servidor de Lynkko. El token de un-solo-uso se envía a /api/billing/save-card,
 * que crea un payment_source reusable en Wompi.
 */
import { useState } from 'react'

type Card = { brand: string; last4: string } | null

export function SaveCardForm({
  publicKey,
  wompiBase,
  sessionToken,
  existingCard,
}: {
  publicKey: string
  wompiBase: string
  sessionToken: string
  existingCard: Card
}) {
  const [card, setCard] = useState<Card>(existingCard)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ number: '', exp: '', cvc: '', holder: '', email: '' })

  // Máscaras de entrada: número en grupos de 4, MM/AA con barra automática, CVC solo dígitos.
  const fmtNumber = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
  const fmtExp = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }
  const fmtCvc = (v: string) => v.replace(/\D/g, '').slice(0, 4)
  const brandOf = (v: string) => {
    const n = v.replace(/\D/g, '')
    if (/^4/.test(n)) return 'VISA'
    if (/^(5[1-5]|2[2-7])/.test(n)) return 'MC'
    if (/^3[47]/.test(n)) return 'AMEX'
    return ''
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const [mm, yy] = form.exp.split('/').map((s) => s.trim())
      if (!mm || !yy) throw new Error('Fecha de vencimiento inválida (MM/AA)')

      // 1) tokenizar la tarjeta directo con Wompi (navegador → Wompi)
      const tokRes = await fetch(`${wompiBase}/tokens/cards`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: form.number.replace(/\s+/g, ''),
          exp_month: mm.padStart(2, '0'),
          exp_year: yy.slice(-2),
          cvc: form.cvc,
          card_holder: form.holder,
        }),
      })
      const tokData = await tokRes.json()
      if (!tokRes.ok || !tokData.data?.id) {
        throw new Error(tokData?.error?.messages?.[0] ?? 'No pudimos validar la tarjeta')
      }

      // 2) crear el payment_source reusable en el servidor.
      //    Pasamos la marca/último-4/vencimiento que devuelve la tokenización
      //    (Wompi no siempre los expone en el payment_source).
      const d = tokData.data
      const saveRes = await fetch('/api/billing/save-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: sessionToken,
          cardToken: d.id,
          email: form.email,
          brand: d.brand ?? null,
          last4: d.last_four ?? null,
          expMonth: d.exp_month ?? null,
          expYear: d.exp_year ?? null,
        }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData?.error ?? 'No pudimos guardar la tarjeta')

      setCard({ brand: saveData.card.brand, last4: saveData.card.last4 })
      setOpen(false)
      setForm({ number: '', exp: '', cvc: '', holder: '', email: '' })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('¿Eliminar la tarjeta guardada? El cobro automático dejará de funcionar.')) return
    setBusy(true)
    try {
      await fetch('/api/billing/save-card', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sessionToken }),
      })
      setCard(null)
    } finally {
      setBusy(false)
    }
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d7dae6',
    fontSize: 14, outline: 'none', background: '#fff',
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6a7086', fontWeight: 700 }}>
        Cobro automático
      </h2>

      {card ? (
        <div style={{ marginTop: 8, background: '#fff', border: '1px solid #e3e6ef', borderRadius: 12, padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 22, borderRadius: 5, background: '#eef0f6', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: '#5145e6' }}>{card.brand?.slice(0, 4).toUpperCase()}</div>
            <div style={{ fontSize: 14 }}>Tarjeta terminada en <strong>{card.last4}</strong></div>
          </div>
          <button onClick={remove} disabled={busy} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
        </div>
      ) : !open ? (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 13, color: '#6a7086' }}>Guarda una tarjeta y tus facturas se pagarán solas cada mes.</p>
          <button onClick={() => setOpen(true)} style={{ marginTop: 10, background: '#fff', border: '1px solid #d7dae6', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Agregar tarjeta
          </button>
        </div>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 8, background: '#fff', border: '1px solid #e3e6ef', borderRadius: 12, padding: 16, display: 'grid', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <input style={{ ...input, paddingRight: 56, letterSpacing: '0.06em' }} placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number" required
              value={form.number} onChange={(e) => setForm({ ...form, number: fmtNumber(e.target.value) })} />
            {brandOf(form.number) && (
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 800, color: '#5145e6' }}>{brandOf(form.number)}</span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input style={input} placeholder="MM/AA" inputMode="numeric" autoComplete="cc-exp" required maxLength={5}
              value={form.exp} onChange={(e) => setForm({ ...form, exp: fmtExp(e.target.value) })} />
            <input style={input} placeholder="CVC" inputMode="numeric" autoComplete="cc-csc" required
              value={form.cvc} onChange={(e) => setForm({ ...form, cvc: fmtCvc(e.target.value) })} />
          </div>
          <input style={input} placeholder="Nombre del titular" autoComplete="cc-name" required
            value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} />
          <input style={input} placeholder="Correo de facturación" type="email" autoComplete="email" required
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

          {error && <div style={{ fontSize: 13, color: '#c0392b' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button type="submit" disabled={busy} style={{ background: '#5145e6', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Guardando…' : 'Guardar tarjeta'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setError(null) }} disabled={busy} style={{ background: 'none', border: 'none', color: '#6a7086', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          </div>
          <p style={{ fontSize: 11, color: '#9aa0b2', margin: 0 }}>Los datos viajan directo a Wompi — Lynkko no almacena el número de tarjeta.</p>
        </form>
      )}
    </section>
  )
}
