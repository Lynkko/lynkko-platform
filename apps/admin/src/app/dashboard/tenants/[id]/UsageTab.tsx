import type { UsageRecord } from '@lynkko/platform'
import { Card, CardContent, CardHeader, CardTitle } from '@lynkko/ui'

export function UsageTab({ records }: { records: UsageRecord[] }) {
  if (records.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Uso</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sin registros de uso. Las apps reportan uso automáticamente.
          </p>
        </CardContent>
      </Card>
    )
  }

  const grouped = records.reduce<Record<string, Record<string, UsageRecord[]>>>((acc, r) => {
    if (!acc[r.appId]) acc[r.appId] = {}
    if (!acc[r.appId][r.metric]) acc[r.appId][r.metric] = []
    acc[r.appId][r.metric].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([appId, metrics]) => (
        <Card key={appId}>
          <CardHeader>
            <CardTitle className="text-base font-mono">{appId}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {Object.entries(metrics).map(([metric, entries]) => {
                const latest = entries[0]
                const total  = entries.reduce((s, r) => s + r.value, 0)
                return (
                  <div key={metric} className="flex items-center justify-between px-6 py-3 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{metric}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        último: {latest?.period}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground font-medium">{latest?.value.toLocaleString('es-CO')}</p>
                      <p className="text-xs text-muted-foreground">total 90d: {total.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
