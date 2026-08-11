import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import EnquiryNotes from './EnquiryNotes'
import EnquiryDetails from './EnquiryDetails'
import DeleteAccountButton from '@/components/DeleteAccountButton'

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: enquiry }, { data: notes }] = await Promise.all([
    supabase.from('enquiries').select('*').eq('id', id).single(),
    supabase
      .from('enquiry_notes')
      .select('id, body, author_email, created_at, updated_at')
      .eq('enquiry_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!enquiry) notFound()

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
        <Link
          href={`/admin/bookings/new?from=${enquiry.id}`}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 shrink-0"
        >
          Create enrolment →
        </Link>
      </div>

      <EnquiryDetails enquiry={enquiry} />

      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="font-medium mb-4">Notes</h2>
        <EnquiryNotes enquiryId={id} initialNotes={notes ?? []} />
      </div>

      <DeleteAccountButton
        deleteUrl={`/api/admin/enquiries/${id}`}
        redirectTo="/admin/enquiries"
        name={enquiry.parent_name}
      />
    </div>
  )
}
