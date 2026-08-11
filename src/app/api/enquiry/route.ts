import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBrevoDeal, sendEnquiryNotification, upsertBrevoContact } from '@/lib/brevo'
import { z } from 'zod'

const EnquirySchema = z.object({
  parentName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  studentName: z.string().min(1),
  yearLevel: z.string().min(1),
  subjects: z.array(z.string()).min(1),
  location: z.string().min(1),
  modePreference: z.enum(['in-person', 'online', 'either']),
  preferredDays: z.array(z.string()).optional(),
  preferredTimes: z.string().optional(),
  howHeard: z.string().optional(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = EnquirySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const data = parsed.data
  const supabase = await createClient()

  const { error: dbError } = await supabase.from('enquiries').insert({
    parent_name: data.parentName,
    email: data.email,
    phone: data.phone,
    student_name: data.studentName,
    year_level: data.yearLevel,
    subjects: data.subjects,
    location: data.location,
    mode_preference: data.modePreference,
    preferred_days: data.preferredDays,
    preferred_times: data.preferredTimes,
    how_heard: data.howHeard,
    status: 'new',
  })

  if (dbError) {
    console.error('[enquiry] db error:', dbError)
    return NextResponse.json({ error: 'Failed to save enquiry' }, { status: 500 })
  }

  // Notify admin — awaited so it completes before the function returns
  try {
    await sendEnquiryNotification(data)
  } catch (err) {
    console.error('[enquiry] notification email failed:', err)
  }

  // CRM sync — fire-and-forget, non-critical
  ;(async () => {
    await upsertBrevoContact({
      email: data.email,
      firstName: data.parentName.split(' ')[0],
      lastName: data.parentName.split(' ').slice(1).join(' '),
      listIds: [Number(process.env.BREVO_ENQUIRY_LIST_ID)],
      attributes: {
        PHONE: data.phone,
        STUDENT_NAME: data.studentName,
        YEAR_LEVEL: data.yearLevel,
        SUBJECTS: data.subjects.join(', '),
        LOCATION: data.location,
        MODE_PREFERENCE: data.modePreference,
      },
    })
    await createBrevoDeal({ name: data.parentName, email: data.email })
  })().catch(err => console.error('[enquiry] crm sync failed:', err))

  return NextResponse.json({ ok: true })
}
