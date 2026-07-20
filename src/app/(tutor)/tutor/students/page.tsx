import { createClient } from '@/lib/supabase/server'

export default async function TutorStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tutor } = await supabase
    .from('tutors')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const { data: bookings } = tutor
    ? await supabase
        .from('bookings')
        .select(`
          id, mode, location, sessions_completed,
          packages ( type, sessions_total ),
          students ( name, year_level, subjects, notes ),
          parents ( name, phone, email )
        `)
        .eq('tutor_id', tutor.id)
        .eq('status', 'confirmed')
    : { data: [] }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Students</h1>

      {!bookings?.length ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center">
          <p className="font-medium mb-1">No students yet</p>
          <p className="text-sm text-muted-foreground">Your students will appear here once sessions are booked.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const student = b.students as any
            const parent = b.parents as any
            const pkg = b.packages as any
            return (
              <div key={b.id} className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-lg">{student?.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {student?.year_level} · {student?.subjects?.join(', ')}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {b.sessions_completed}/{pkg?.sessions_total} sessions
                  </span>
                </div>

                {student?.notes && (
                  <p className="text-sm bg-muted/50 rounded p-3 mb-4">{student.notes}</p>
                )}

                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>Parent: <span className="text-foreground">{parent?.name}</span></p>
                  <p>Contact: <a href={`tel:${parent?.phone}`} className="text-primary">{parent?.phone}</a></p>
                  <p>Mode: <span className="text-foreground capitalize">{b.mode}{b.location ? ` · ${b.location}` : ''}</span></p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
