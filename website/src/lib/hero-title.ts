/** Une seule ligne pour SEO, alt image, etc. */
export function heroTitlePlainText(title: string): string {
  return title.replace(/\s*\n+\s*/g, ' ').trim()
}
