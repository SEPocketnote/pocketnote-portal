import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TutorsPage() {
  const supabase = await createClient()

  const { data: tutors } = await supabase
    .from('tutors')
    .select('id, legal_name, email, phone, subjects, location, active, verified')
    .order('legal_name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tutors</h1>
        <Link
          href="/admin/tutors/new"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
        >
          Add tutor
        </Link>
      </div>

      {!tutors?.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center">
          <p className="font-medium mb-1">No tutors yet</p>
          <p className="text-sm text-muted-foreground">Add your first tutor to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subjects</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tutors.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/tutors/${t.id}`} className="font-medium hover:text-primary">
                      {t.legal_name}
                    </Link>
                    <div className="text-muted-foreground text-xs">{t.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.subjects?.slice(0, 3).join(', ')}{(t.subjects?.length ?? 0) > 3 ? '…' : ''}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.location || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {t.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
