import Link from 'next/link'
import { FileText, Shield, BookOpen, ClipboardList, DollarSign, ChevronRight } from 'lucide-react'

const resources = [
  {
    icon: DollarSign,
    title: 'Invoicing & Payments',
    description: 'How to submit your invoice, when you get paid, and what to do if something goes wrong.',
    href: '/tutor/resources/invoicing',
    internal: true,
  },
  {
    icon: Shield,
    title: 'Code of Conduct',
    description: 'Our expectations around professionalism, communication, and student safety.',
    href: null,
    internal: false,
  },
  {
    icon: FileText,
    title: 'Tutor Agreement',
    description: 'Your agreement with Pocketnote covering rates, scheduling, and responsibilities.',
    href: null,
    internal: false,
  },
  {
    icon: BookOpen,
    title: 'Lesson Framework',
    description: 'Our recommended structure for a productive tutoring session.',
    href: null,
    internal: false,
  },
  {
    icon: ClipboardList,
    title: 'Session Report Template',
    description: 'A template for writing session notes and progress updates for parents.',
    href: null,
    internal: false,
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
        {resources.map(({ icon: Icon, title, description, href, internal }) => {
          const content = (
            <>
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-0.5">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              {href ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full mt-1">
                  Coming soon
                </span>
              )}
            </>
          )

          if (href && internal) {
            return (
              <Link
                key={title}
                href={href}
                className="bg-white rounded-2xl shadow-card p-5 flex items-start gap-4 hover:bg-muted/20 transition-colors"
              >
                {content}
              </Link>
            )
          }

          return (
            <div key={title} className="bg-white rounded-2xl shadow-card p-5 flex items-start gap-4">
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
