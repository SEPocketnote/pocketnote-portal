import { FileText, Shield, BookOpen, ClipboardList, ExternalLink } from 'lucide-react'

const resources = [
  {
    icon: Shield,
    title: 'Code of Conduct',
    description: 'Our expectations around professionalism, communication, and student safety.',
    href: null,
  },
  {
    icon: FileText,
    title: 'Tutor Agreement',
    description: 'Your agreement with Pocketnote covering rates, scheduling, and responsibilities.',
    href: null,
  },
  {
    icon: BookOpen,
    title: 'Lesson Framework',
    description: 'Our recommended structure for a productive tutoring session.',
    href: null,
  },
  {
    icon: ClipboardList,
    title: 'Session Report Template',
    description: 'A template for writing session notes and progress updates for parents.',
    href: null,
  },
]

export default function ResourcesPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Resources</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Documents and guides to help you do your best work as a Pocketnote tutor.
      </p>

      <div className="space-y-3">
        {resources.map(({ icon: Icon, title, description, href }) => (
          <div key={title} className="bg-white rounded-2xl shadow-card p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium mb-0.5">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-0.5"
              >
                View <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full mt-1">
                Coming soon
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
