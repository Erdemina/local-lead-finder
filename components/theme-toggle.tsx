'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TR } from '@/lib/i18n/tr'

/**
 * Açık/koyu tema anahtarı. `variant="sidebar"` kenar çubuğundaki LogoutButton
 * ile aynı görünümdedir; `variant="icon"` yalnızca ikon gösterir (login vb.).
 * Tema yalnızca istemcide bilindiği için mount öncesi nötr bir ikon çizilir —
 * aksi halde SSR ile istemci çıktısı uyuşmaz.
 */
export function ThemeToggle({
  variant = 'icon',
  className,
}: {
  variant?: 'icon' | 'sidebar'
  className?: string
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'
  const label = isDark ? TR.common.themeLight : TR.common.themeDark
  const Icon = isDark ? Sun : Moon
  const toggle = () => setTheme(isDark ? 'light' : 'dark')

  if (variant === 'sidebar') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn('w-full justify-start gap-2 text-muted-foreground', className)}
        onClick={toggle}
        aria-label={TR.common.toggleTheme}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggle}
      aria-label={TR.common.toggleTheme}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
