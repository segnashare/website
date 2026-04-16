import Image from 'next/image'
import Link from 'next/link'
import {PortableText, type PortableTextComponents} from '@portabletext/react'
import type {PortableTextBlock} from '@portabletext/types'
import {urlFor} from '@/lib/sanity'

type PortableRichTextProps = {
  value: PortableTextBlock[]
  className?: string
}

const components: PortableTextComponents = {
  block: {
    normal: ({children}) => <p style={{margin: '0 0 0.75rem'}}>{children}</p>,
    h1: ({children}) => <h2 style={{margin: '1.5rem 0 0.5rem'}}>{children}</h2>,
    h2: ({children}) => <h3 style={{margin: '1.25rem 0 0.5rem'}}>{children}</h3>,
    h3: ({children}) => <h4 style={{margin: '1rem 0 0.35rem'}}>{children}</h4>,
    blockquote: ({children}) => (
      <blockquote
        style={{
          margin: '1rem 0',
          paddingLeft: '1rem',
          borderLeft: '3px solid #ccc',
          fontStyle: 'italic',
        }}
      >
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({children}) => <ul style={{margin: '0 0 0.75rem', paddingLeft: '1.25rem'}}>{children}</ul>,
    number: ({children}) => <ol style={{margin: '0 0 0.75rem', paddingLeft: '1.25rem'}}>{children}</ol>,
  },
  listItem: {
    bullet: ({children}) => <li>{children}</li>,
    number: ({children}) => <li>{children}</li>,
  },
  marks: {
    strong: ({children}) => <strong>{children}</strong>,
    em: ({children}) => <em>{children}</em>,
    code: ({children}) => <code>{children}</code>,
    underline: ({children}) => <span style={{textDecoration: 'underline'}}>{children}</span>,
    'strike-through': ({children}) => <s>{children}</s>,
    link: ({value, children}) => {
      const href = typeof value?.href === 'string' ? value.href : ''
      if (!href) return <span>{children}</span>
      const isExternal = /^https?:\/\//i.test(href)
      if (isExternal) {
        return (
          <a href={href} rel="noopener noreferrer" target="_blank">
            {children}
          </a>
        )
      }
      return <Link href={href}>{children}</Link>
    },
  },
  types: {
    image: ({value}) => {
      if (!value?.asset) return null
      const src = urlFor(value).width(1400).url()
      const alt = typeof value.alt === 'string' ? value.alt : ''
      return (
        <figure style={{margin: '1rem 0'}}>
          <Image src={src} alt={alt} width={1400} height={900} sizes="(max-width: 900px) 100vw, 900px" style={{width: '100%', height: 'auto'}} />
        </figure>
      )
    },
  },
}

export function PortableRichText({value, className}: PortableRichTextProps) {
  if (!value?.length) return null
  return (
    <div className={className}>
      <PortableText value={value} components={components} />
    </div>
  )
}
