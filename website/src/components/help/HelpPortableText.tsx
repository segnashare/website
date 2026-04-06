import {PortableText, type PortableTextComponents} from '@portabletext/react'
import styles from './help.module.css'

const components: PortableTextComponents = {
  block: {
    normal: ({children}) => <p>{children}</p>,
    h2: ({children}) => <h2>{children}</h2>,
    h3: ({children}) => <h3>{children}</h3>,
  },
  list: {
    bullet: ({children}) => <ul>{children}</ul>,
    number: ({children}) => <ol>{children}</ol>,
  },
  marks: {
    strong: ({children}) => <strong>{children}</strong>,
    em: ({children}) => <em>{children}</em>,
    link: ({value, children}) => {
      const href = typeof value?.href === 'string' ? value.href : '#'
      const external = href.startsWith('http')
      return (
        <a href={href} {...(external ? {target: '_blank', rel: 'noreferrer noopener'} : {})}>
          {children}
        </a>
      )
    },
  },
}

type HelpPortableTextProps = {
  value: unknown[] | null | undefined
}

export function HelpPortableText({value}: HelpPortableTextProps) {
  if (!value || !Array.isArray(value) || value.length === 0) return null
  return (
    <div className={styles.body}>
      <PortableText value={value as never} components={components} />
    </div>
  )
}
