'use client'

import {useCallback, useSyncExternalStore} from 'react'
import {
  addWebsiteCartItem,
  clearWebsiteCart,
  getWebsiteCartServerSnapshot,
  readWebsiteCart,
  removeWebsiteCartItem,
  subscribeWebsiteCart,
  type WebsiteCartItem,
} from '@/lib/cart/website-cart'

export function useWebsiteCart() {
  const items = useSyncExternalStore(
    subscribeWebsiteCart,
    readWebsiteCart,
    getWebsiteCartServerSnapshot,
  )

  const addItem = useCallback((item: WebsiteCartItem) => addWebsiteCartItem(item), [])
  const removeItem = useCallback((itemId: string) => removeWebsiteCartItem(itemId), [])
  const clear = useCallback(() => clearWebsiteCart(), [])

  return {
    items,
    count: items.length,
    addItem,
    removeItem,
    clear,
  }
}
