import type {BlockAnnotationProps} from 'sanity'

/** Aperçu éditeur de l’encadré noir (aligné sur le rendu site). */
export function QuoteHighlightAnnotation(props: BlockAnnotationProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
        padding: '0.08em 0.32em 0.06em',
        margin: '0 0.04em',
        background: '#0a0a0a',
        color: '#fff',
        fontWeight: 700,
        verticalAlign: '0.06em',
      }}
    >
      {props.children}
    </span>
  )
}
