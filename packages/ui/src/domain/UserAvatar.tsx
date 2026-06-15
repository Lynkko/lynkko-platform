import { Avatar, AvatarImage, AvatarFallback } from '../components/Avatar'
import { getInitials } from '@lynkko/i18n'
import { cn } from '../utils'

export interface UserAvatarProps {
  name:       string
  imageUrl?:  string | null
  /** Default: 'md' */
  size?:      'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASS = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

/**
 * Avatar de usuario con fallback de iniciales.
 *
 * @example
 * <UserAvatar name="Juan García" imageUrl={user.avatarUrl} size="sm" />
 * <UserAvatar name="Ana Rodríguez" />  {/* muestra 'AR' *\/}
 */
export function UserAvatar({ name, imageUrl, size = 'md', className }: UserAvatarProps) {
  return (
    <Avatar className={cn(SIZE_CLASS[size], className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  )
}
