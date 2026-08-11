export function tutorDisplayName(tutor: { legal_name?: string | null; preferred_name?: string | null } | null | undefined): string {
  if (!tutor) return ''
  return tutor.preferred_name?.trim() || tutor.legal_name || ''
}
