import {PageSectionsRenderer} from '@/components/page-sections/PageSectionsRenderer'
import type {PageSectionsRendererProps} from '@/components/page-sections/PageSectionsRenderer'

export type PageSectionsProps = PageSectionsRendererProps

/** Sections modulaires (accueil, newsroom, etc.) — délégué aux composants par type. */
export function PageSections(props: PageSectionsProps) {
  return <PageSectionsRenderer {...props} />
}
