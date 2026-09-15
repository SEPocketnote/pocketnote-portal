import Link from 'next/link'

export default function InvoicingResourcePage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/tutor/resources" className="text-sm text-muted-foreground hover:text-primary">← Resources</Link>
      </div>

      <h1 className="text-2xl font-semibold mb-1">Invoicing &amp; Payments</h1>
      <p className="text-xs text-muted-foreground mb-8">September 2026</p>

      <div className="space-y-6">

        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-lg font-semibold mb-3">How to get paid</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Getting paid is straightforward once you know the rhythm. Here&apos;s everything you need to know.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold mb-2">When you&apos;ll get paid</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Payments are processed every Wednesday, covering all sessions completed in the previous pay week. Superannuation is also paid on this day.
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed mt-2">
              A pay week runs Monday to Sunday.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">Submitting your invoice</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Submit one invoice per pay period, covering all sessions you completed that week.
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed mt-2">
              Invoices must be submitted by <strong>6pm Tuesday (Sydney time)</strong> to be included in that Wednesday&apos;s pay run. You can submit on Monday or Tuesday, whichever works for you.
            </p>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>Heads up:</strong> Invoices submitted after the 6pm Tuesday deadline will be processed and paid the following Wednesday.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-3">How to submit your invoice</h2>
          <p className="text-sm text-foreground/80 leading-relaxed mb-4">
            Before submitting, make sure you&apos;ve marked all relevant sessions as completed. Your invoice will only include sessions that have been marked as completed.
          </p>
          <ol className="space-y-2.5">
            {[
              'Navigate to the Earnings tab in your portal',
              'Check that your uninvoiced sessions and rate calculations appear correctly',
              'Press Create Invoice',
              'Check that your invoice accurately reflects your sessions, rates and personal details',
              'If relevant, add any notes',
              'Press Submit invoice to finalise',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground/80 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-2">We&apos;ll review your invoice</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Once submitted, a member of the team will review and approve your invoice.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed mt-2">
            If your invoice is rejected, you&apos;ll receive a reason explaining what needs to be addressed. Simply action the feedback and resubmit. If you&apos;re unsure about anything, reach out to the support team and we&apos;ll help you sort it out.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-base font-semibold mb-2">Keep your details up-to-date</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            To make sure your payments and super land in the right place, keep your bank and superannuation details current in your portal account. You can update these anytime under your account settings.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed mt-2">
            If you have any questions about invoicing or payments, contact us directly.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold mb-2">How is payment made?</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              We&apos;ll pay directly to your bank account, using the details provided when you set up your Tutor Portal. Keep in mind that first time payments can take 2–3 business days for funds to reach your account. If you have any questions or concerns about your payment, reach out to us straight away.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">What if I forget to submit my invoice?</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Don&apos;t stress, you&apos;ll still get paid! If you forget to submit your invoice, you&apos;ll still need to log in and complete it as soon as you can. Once it is submitted, it will be paid on the next Wednesday.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
