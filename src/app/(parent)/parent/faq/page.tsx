'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Faq = { q: string; a: React.ReactNode }
type Section = { id: string; label: string; faqs: Faq[] }

const sections: Section[] = [
  {
    id: 'payments',
    label: 'Payments & billing',
    faqs: [
      {
        q: 'Is my payment information safe?',
        a: <>Your card details are stored directly in Stripe, our trusted payment provider — we never store them ourselves. Stripe is globally trusted and PCI DSS-compliant, the same security standard used by banks and major retailers. To understand how Stripe handles your information, <a href="#" className="text-primary underline underline-offset-2">visit their privacy policy</a>.</>,
      },
      {
        q: 'What if I need to update my payment method or contact information?',
        a: 'You can update these any time through your Parent Portal. If you need assistance, email us at support@pocketnote.com.au or call 0485 883 221 and we\'ll be happy to help.',
      },
      {
        q: 'How and when am I charged for sessions?',
        a: 'Casual sessions are charged within 24 hours of the session taking place. If you\'re on a weekly or fortnightly plan, charges follow the same pattern, aligned to your scheduled sessions.',
      },
      {
        q: 'Is there a minimum commitment on a weekly or fortnightly plan?',
        a: 'Yes, the minimum commitment is 5 sessions. Meaningful progress usually begins to show between sessions 5–8, so it\'s in the best interest of the student–tutor relationship to give it a fair opportunity. After 5 sessions, you can cancel with 14 days\' written notice.',
      },
      {
        q: 'What if I cancel within the 5-session minimum commitment?',
        a: <>If you cancel during the minimum commitment period, you will forfeit the full cost of the 5-session minimum. You can review our <a href="#" className="text-primary underline underline-offset-2">Terms of Service</a> at any time.</>,
      },
      {
        q: 'What happens to my weekly plan during school holidays?',
        a: "We'll reach out to confirm what you'd like to do during the holidays — every family is different. If we can't contact you, your plan will automatically pause during the holiday period.",
      },
      {
        q: 'Can I pause my weekly plan outside of school holidays?',
        a: 'Yes. You can pause for up to 4 weeks per calendar year outside of school holidays, with 7 days\' notice. Your freeze allowance resets each calendar year.',
      },
      {
        q: 'What if a payment fails?',
        a: "We'll be in touch to sort it out. If we can't reach you, payment will automatically be reattempted after 48 hours.",
      },
      {
        q: 'Will my rates ever change without warning?',
        a: 'No. If pricing changes, we\'ll give you reasonable notice before it applies to your existing bookings.',
      },
    ],
  },
  {
    id: 'first-session',
    label: 'Your first session',
    faqs: [
      {
        q: 'How does the first session guarantee work?',
        a: "After your first session, we'll call you to check how it went and confirm you'd like to continue. If you're happy, we'll process payment. If it wasn't the right fit, there'll be no charge and we'll match you with a different tutor.",
      },
      {
        q: "What if I miss your follow-up call?",
        a: "We'll try to reach you for 48 hours after your first session, by both phone and email. If we can't get hold of you in that time, payment for the session will be processed automatically. So it's worth keeping an eye out for our call or email.",
      },
      {
        q: 'Does the guarantee apply to every session?',
        a: <>Just your first ever session. From session two onwards, our standard cancellation and payment terms apply. You can review our <a href="#" className="text-primary underline underline-offset-2">Terms of Service</a> at any time.</>,
      },
    ],
  },
  {
    id: 'cancelling',
    label: 'Cancelling or rescheduling',
    faqs: [
      {
        q: 'How much notice do I need to give to cancel without being charged?',
        a: 'Our cancellation policy requires 24 hours\' notice prior to the session\'s scheduled start time.',
      },
      {
        q: "What if I cancel with less notice, or my student doesn't show up?",
        a: "The full session fee applies, unless we decide otherwise following a review of the circumstances.",
      },
      {
        q: 'What if I need to cancel a session that\'s part of my weekly plan?',
        a: 'With 24 hours\' notice or more, the session fee still applies but you\'ll receive a Makeup Session Credit to use at an alternative time. With less notice, or a no-show, the fee applies and no makeup credit is issued.',
      },
      {
        q: 'What is a Makeup Session Credit and when does it expire?',
        a: "It's a credit for a substitute session. You can hold up to two Makeup Session Credits at a time, and each credit must be used within 10 weeks of the original cancelled session. To schedule your makeup session, contact us at support@pocketnote.com.au or 0485 883 221.",
      },
    ],
  },
  {
    id: 'cancel-plan',
    label: 'Cancelling a weekly plan',
    faqs: [
      {
        q: 'How do I cancel my weekly or fortnightly plan?',
        a: 'Once you\'ve completed the 5-session minimum, email support@pocketnote.com.au with your cancellation request and end date, giving at least 14 days\' notice in line with our Terms of Service.',
      },
      {
        q: 'Will I still be charged during my notice period?',
        a: 'Yes. Any sessions scheduled within the 14-day notice period are still scheduled and payable. Once your cancellation date takes effect, you will not receive any further charges.',
      },
      {
        q: 'What if I give less than 14 days\' notice?',
        a: 'You will still be charged for sessions scheduled to take place within the 14-day notice period, in line with our Terms of Service.',
      },
    ],
  },
  {
    id: 'tutor',
    label: 'Your assigned tutor',
    faqs: [
      {
        q: 'How was my tutor chosen?',
        a: "We match based on subject, year level, availability, and any other information you provided during your initial enquiry. We aim to match not only on experience and expertise, but also on teaching style and characteristics we believe your student will genuinely connect with — not just the first available person.",
      },
      {
        q: 'Can I request a new tutor?',
        a: "Of course. If at any point you aren't satisfied, or you simply feel it's time for a change, just contact us and we'll start the process of finding you a better match.",
      },
      {
        q: 'What if my tutor is no longer available?',
        a: "This happens from time to time. We ask tutors for as much notice as possible to minimise disruption. Often your tutor will speak with you directly first. Either way, we'll notify you as quickly as possible and begin matching you with a replacement.",
      },
      {
        q: 'Will I get updates on how sessions are going?',
        a: 'Yes. Your tutor provides a brief summary after each session, which you can view in your Parent Portal. Click the notes icon on any completed session to see progress notes.',
      },
    ],
  },
  {
    id: 'safety',
    label: 'Child safety',
    faqs: [
      {
        q: 'What checks do tutors go through before working with my student?',
        a: "Every tutor holds a valid Working With Children Check (or state equivalent), verified before they ever work with a student. They're also required to confirm their identity, hold an ABN, and agree to our Tutor Code of Conduct and Child Safety Policy.",
      },
      {
        q: 'What are the rules for in-home sessions?',
        a: "A responsible adult must be home for the duration of the session, and sessions cannot take place in a bedroom — they must be conducted in an open, shared, or viewable space. For students aged 16 and over, parents must give written consent for unsupervised sessions.",
      },
      {
        q: 'What about online sessions?',
        a: "Sessions should be conducted somewhere professional and visible — not from a private or inappropriate space. Your tutor may choose their preferred video platform, as we do not monitor or record session content.",
      },
      {
        q: "What if I have a concern about my child's safety or a tutor's conduct?",
        a: "If there is immediate danger, call 000 first. For any other safety or wellbeing concern, contact us as soon as possible at support@pocketnote.com.au or 0485 883 221 so we can investigate promptly. You can view our Tutor Code of Conduct and Child Safety Policy at any time.",
      },
    ],
  },
]

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-foreground leading-snug">{faq.q}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="text-sm text-muted-foreground leading-relaxed pb-4 pr-8">
          {faq.a}
        </p>
      )}
    </div>
  )
}

export default function ParentFaqPage() {
  const [active, setActive] = useState(sections[0].id)
  const section = sections.find(s => s.id === active)!

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">FAQs</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Common questions about sessions, billing, cancellations, and more.
      </p>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              active === s.id
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* FAQ accordion */}
      <div className="bg-white rounded-2xl shadow-card px-5">
        {section.faqs.map(faq => (
          <FaqItem key={faq.q} faq={faq} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Still have a question?{' '}
        <a href="mailto:support@pocketnote.com.au" className="text-primary underline underline-offset-2">
          Email us
        </a>{' '}
        or call{' '}
        <a href="tel:0485883221" className="text-primary underline underline-offset-2">
          0485 883 221
        </a>.
      </p>
    </div>
  )
}
