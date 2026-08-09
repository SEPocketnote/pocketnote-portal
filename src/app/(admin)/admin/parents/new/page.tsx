import Link from 'next/link'
import CreateParentForm from './CreateParentForm'

export default function NewParentPage() {
  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/admin/parents" className="text-sm text-muted-foreground hover:text-primary">← Parents</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-2">New parent</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Creates a parent record without sending an invite. Use this for existing customers who won&apos;t be using the portal.
      </p>
      <CreateParentForm />
    </div>
  )
}
