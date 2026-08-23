import { BookOpen, HelpCircle, Shield, FileText, ExternalLink } from 'lucide-react'

const resources = [
  {
    icon: BookOpen,
    title: 'Getting started guide',
    description: 'Everything you need to know about your first session — what to expect, how to prepare, and how to get the most out of tutoring.',
    href: null,
  },
  {
    icon: HelpCircle,
    title: 'FAQs',
    description: 'Answers to common questions about scheduling, payments, session notes, and more.',
    href: null,
  },
  {
    icon: Shield,
    title: 'Safety & trust',
    description: 'How we vet our tutors, our working-with-children policy, and how we keep students safe.',
    href: null,
  },
  {
    icon: FileText,
    title: 'Terms & privacy',
    description: 'Our terms of service and privacy policy covering how we handle your information.',
    href: null,
  },
]

export default function ParentResourcesPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Resources</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Guides and information to help you and your family get the most out of Pocketnote.
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
