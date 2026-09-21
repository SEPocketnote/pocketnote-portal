import Link from 'next/link'
import { Calendar, CreditCard, FileText } from 'lucide-react'

export default function WeeklyPlanGuidePage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/parent/resources" className="text-sm text-muted-foreground hover:text-primary">← Resources</Link>
      </div>

      <h1 className="text-2xl font-semibold mb-1">Quick Start Guide: Weekly Plans</h1>
      <p className="text-sm text-muted-foreground mb-2">Welcome to Pocketnote! Here&apos;s everything you need to know.</p>
      <p className="text-sm text-foreground/80 mb-8">Your Weekly Plan is all set up. Here&apos;s how to get the most out of it from day one.</p>

      <div className="space-y-6">

        {/* Section 1: Your first session */}
        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-1">Your first session</h2>
          <p className="text-xs text-muted-foreground mb-3">Before anything else, here&apos;s what happens after your very first session.</p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            After your first session, one of our team will be in touch to check in and make sure it went well. If you&apos;re happy to continue, your first session will be charged within 24 hours and your Weekly Plan kicks in from there.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed mt-3">
            If something didn&apos;t feel right, just let us know. We&apos;ll work with you to find a solution. And if you decide it isn&apos;t the right fit right now, that&apos;s okay too — no charge, no obligation.
          </p>
        </section>

        {/* Section 2: Your Weekly Plan */}
        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-1">Your Weekly Plan</h2>
          <p className="text-xs text-muted-foreground mb-4">Here&apos;s what your Weekly Plan includes and how it works week to week.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-secondary/50 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-3">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">Your session</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Same tutor, same time, every week. Your session is locked in and recurring — no need to rebook each week.</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-3">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">Billing</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Your session fee is processed automatically each week. Your card details are stored securely via Stripe.</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-3">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">Progress notes</p>
              <p className="text-xs text-muted-foreground leading-relaxed">After every session, your tutor submits notes on what was covered and recommended focus areas. You&apos;ll find these in your portal after each session.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Minimum commitment */}
        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-1">Your minimum commitment</h2>
          <p className="text-xs text-muted-foreground mb-3">To give your tutor time to build a real relationship with your child, we have a minimum commitment of five sessions before any plan changes can be made.</p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Think of it this way: real progress in tutoring takes consistency. The first few sessions are about building rapport and understanding where your child is at. By session five, you&apos;ll have a much clearer picture of what&apos;s working.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed mt-3">
            After your five sessions are complete, you can cancel your plan at any time with <strong>14 days written notice</strong>, or if you need a break, you can pause with <strong>7 days written notice</strong>.
          </p>
        </section>

        {/* Section 4: Flexibility */}
        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-1">Flexibility: what you need to know</h2>
          <p className="text-xs text-muted-foreground mb-4">Life happens. Here&apos;s how we handle it.</p>
          <div className="space-y-0 divide-y divide-border">
            {[
              {
                term: 'Cancellations',
                detail: 'You have two cancellations per school term at no charge, with at least 24 hours notice. After that, the session fee applies and a makeup credit is issued.',
              },
              {
                term: 'Rescheduling',
                detail: 'Same allowance — two reschedules per term, drawn from the same pool as cancellations. We\'ll do our best to find an alternative time within two weeks.',
              },
              {
                term: 'No-shows',
                detail: 'If your child misses a session without notice, the full session fee applies. No credit is issued. If something unexpected comes up, please let us know as soon as you can.',
              },
              {
                term: 'Makeup credits',
                detail: 'Issued when a session can\'t go ahead and the fee is payable. Valid for 10 weeks, and you can hold up to two at a time.',
              },
              {
                term: 'School holidays',
                detail: 'We\'ll get in touch leading up to school holidays to confirm whether you want to continue or pause sessions. If we can\'t reach you, sessions will be paused automatically.',
              },
              {
                term: 'Plan pause',
                detail: 'Need a longer break outside of school holidays? You can pause your plan for up to four weeks per calendar year with 7 days written notice.',
              },
            ].map(({ term, detail }) => (
              <div key={term} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium mb-1 sm:mb-0">{term}</dt>
                <dd className="text-sm text-foreground/80 leading-relaxed sm:col-span-2">{detail}</dd>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: During minimum period */}
        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-1">During your minimum period</h2>
          <p className="text-xs text-muted-foreground mb-3">A few things are a little different during your first five sessions.</p>
          <p className="text-sm text-foreground/80 leading-relaxed mb-3">
            During your minimum commitment period, we ask for a bit more consistency while your tutor gets to know your child. Here&apos;s what that looks like:
          </p>
          <ul className="space-y-2">
            {[
              'One reschedule is available across your entire five sessions, within the same calendar week, subject to availability.',
              'Cancellations during this period are charged and a makeup credit is issued.',
              'After five sessions, the standard flexibility policy above applies.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Section 6: Staying in touch */}
        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-1">Staying in touch</h2>
          <p className="text-xs text-muted-foreground mb-3">All scheduling changes need to come through us, not directly to your tutor.</p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Your tutor is focused on delivering great sessions. For anything else — rescheduling, cancellations, questions, or feedback — we&apos;re your point of contact. The easiest way to reach us is through the portal, via email at{' '}
            <a href="mailto:support@pocketnote.com.au" className="text-primary hover:underline">support@pocketnote.com.au</a>
            {' '}or text/call <a href="tel:0485883221" className="text-primary hover:underline">0485 883 221</a>.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed mt-3">We aim to get back to you within 1 business day.</p>
          <p className="text-sm text-muted-foreground italic mt-3">Not sure about something? Just ask. There are no silly questions when it comes to your child&apos;s learning.</p>
        </section>

        {/* Section 7: Quick contacts */}
        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-3">Quick contacts</h2>
          <dl className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <dt className="text-muted-foreground w-40 shrink-0">General enquiries</dt>
              <dd><a href="mailto:support@pocketnote.com.au" className="text-primary hover:underline">support@pocketnote.com.au</a></dd>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <dt className="text-muted-foreground w-40 shrink-0">Urgent same-day</dt>
              <dd><a href="tel:0485883221" className="text-primary hover:underline">0485 883 221</a></dd>
            </div>
          </dl>
        </section>

      </div>
    </div>
  )
}
