// ─── Theme ────────────────────────────────────────────────────────────────────
export { ThemeProvider, useTheme, DEFAULT_THEME } from './theme'
export type { AppTheme } from './theme'

// ─── Utils ───────────────────────────────────────────────────────────────────
export { cn } from './utils'

// ─── Primitivos ───────────────────────────────────────────────────────────────
export { Button, buttonVariants }        from './components/Button'
export type { ButtonProps }              from './components/Button'

export { Input }                         from './components/Input'
export type { InputProps }               from './components/Input'

export { Badge, badgeVariants }          from './components/Badge'
export type { BadgeProps }               from './components/Badge'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/Card'

export { Avatar, AvatarImage, AvatarFallback } from './components/Avatar'

export { Skeleton }                      from './components/Skeleton'

export { Modal }                         from './components/Modal'
export type { ModalProps }               from './components/Modal'

export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs'

// ─── Dominio ─────────────────────────────────────────────────────────────────
export { MetricCard }                    from './domain/MetricCard'
export type { MetricCardProps }          from './domain/MetricCard'

export { NotificationBell }              from './domain/NotificationBell'
export type { NotificationBellProps }    from './domain/NotificationBell'

export { PlanBadge }                     from './domain/PlanBadge'
export type { PlanBadgeProps, PlanTier } from './domain/PlanBadge'

export { UserAvatar }                    from './domain/UserAvatar'
export type { UserAvatarProps }          from './domain/UserAvatar'

export { TenantSelector }                from './domain/TenantSelector'
export type { TenantSelectorProps, TenantOption } from './domain/TenantSelector'
