import { SupabaseClient } from '@supabase/supabase-js'

export async function resolveRateCents({
  tutorId,
  studentId,
  mode,
  admin,
}: {
  tutorId: string
  studentId: string
  mode: 'online' | 'in-person'
  admin: SupabaseClient
}): Promise<number | null> {
  // 1. Student-specific flat rate (overrides everything, regardless of mode)
  const { data: override } = await admin
    .from('student_rate_overrides')
    .select('rate_cents')
    .eq('tutor_id', tutorId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (override) return override.rate_cents

  // 2. Tutor's mode-specific rate override
  const { data: tutor } = await admin
    .from('tutors')
    .select('online_rate_override_cents, inperson_rate_override_cents, rate_tier_id')
    .eq('id', tutorId)
    .single()

  if (!tutor) return null

  const modeOverride = mode === 'online'
    ? tutor.online_rate_override_cents
    : tutor.inperson_rate_override_cents

  if (modeOverride) return modeOverride

  // 3. Rate tier's mode-specific rate
  if (tutor.rate_tier_id) {
    const { data: tier } = await admin
      .from('rate_tiers')
      .select('online_rate_cents, inperson_rate_cents')
      .eq('id', tutor.rate_tier_id)
      .single()

    if (tier) {
      return mode === 'online' ? tier.online_rate_cents : tier.inperson_rate_cents
    }
  }

  return null
}
