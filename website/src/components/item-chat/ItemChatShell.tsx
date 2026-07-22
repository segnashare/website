'use client'

import {ItemChatBubble} from '@/components/item-chat/ItemChatBubble'
import {ItemChatProvider} from '@/components/item-chat/ItemChatProvider'

/** API chat sur le même origin (même Supabase que le catalogue). */
export function ItemChatShell({children}: {children: React.ReactNode}) {
  return (
    <ItemChatProvider source="web" apiBase="">
      {children}
      <ItemChatBubble />
    </ItemChatProvider>
  )
}
