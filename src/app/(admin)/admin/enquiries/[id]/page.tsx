import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

const STATUSES = ['new', 'contacted', 'confirmed', 'waitlisted'] as const

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: enquiry } = await supabase
    .from('enquiries')
    .select('*')
    .eq('id', id)
    .single()

  if (!enquiry) notFound()

  async function updateEnquiry(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('enquiries')
      .update({
        status: formData.get('status'),
        notes: formData.get('notes'),
      })
      .eq('id', id)
    redirect(`/admin/enquiries/${id}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/enquiries" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to enquiries
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{enquiry.parent_name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Received {format(new Date(enquiry.created_at), 'dd MMM yyyy, h:mm a')}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-lg border border-border p-6 mb-6 space-y-4">
        <Section title="Parent">
          <Row label="Name" value={enquiry.parent_name} />
          <Row label="Email" value={<a href={`mailto:${enquiry.email}`} className="text-primary hover:underline">{enquiry.email}</a>} />
          <Row label="Phone" value={enquiry.phone || '—'} />
        </Section>

        <hr className="border-border" />

        <Section title="Student">
          <Row label="Name" value={enquiry.student_name} />
          <Row label="Year level" value={enquiry.year_level || '—'} />
          <Row label="Subjects" value={enquiry.subjects?.join(', ') || '—'} />
        </Section>

        <hr className="border-border" />

        <Section title="Session preferences">
          <Row label="Location" value={enquiry.location || '—'} />
          <Row label="Mode" value={enquiry.mode_preference || '—'} />
          <Row label="Preferred days" value={enquiry.preferred_days?.join(', ') || '—'} />
          <Row label="Preferred times" value={enquiry.preferred_times || '—'} />
        </Section>

        {enquiry.how_heard && (
          <>
            <hr className="border-border" />
            <Row label="How heard" value={enquiry.how_heard} />
          </>
        )}
      </div>

      {/* Status + notes form */}
      <form action={updateEnquiry} className="bg-white rounded-lg border border-border p-6 space-y-5">
        <h2 className="font-medium">Update enquiry</h2>

        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value={s}
                  defaultChecked={enquiry.status === s}
                  className="accent-primary"
                />
                <span className="text-sm capitalize">{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            id="notes"
            name="notes"
            defaultValue={enquiry.notes ?? ''}
            rows={4}
            className="input resize-none"
            placeholder="Add internal notes about this enquiry…"
          />
        </div>

        <button
          type="submit"
          className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:opacity-90"
        >
          Save changes
        </button>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
