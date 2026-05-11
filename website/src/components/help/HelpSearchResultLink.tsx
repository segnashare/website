'use client'

import Link from 'next/link'
import posthog from 'posthog-js'

type Props = {
  href: string
  title: string
  query: string
}

export function HelpSearchResultLink({href, title, query}: Props) {
  return (
    <Link
      href={href}
      onClick={() => posthog.capture('help_search_result_clicked', {query, article_title: title, article_href: href})}
    >
      {title}
    </Link>
  )
}
