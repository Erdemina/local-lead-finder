'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { TR } from '@/lib/i18n/tr'

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 text-muted-foreground"
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      <LogOut className="h-4 w-4" />
      {TR.auth.logout}
    </Button>
  )
}
