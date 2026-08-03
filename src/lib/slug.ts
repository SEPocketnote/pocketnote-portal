export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function uniqueSlug(
  base: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const slug = toSlug(base)
  if (!(await checkExists(slug))) return slug
  let counter = 2
  while (true) {
    const candidate = `${slug}-${counter}`
    if (!(await checkExists(candidate))) return candidate
    counter++
  }
}
