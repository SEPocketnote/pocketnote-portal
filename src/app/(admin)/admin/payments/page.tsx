export default function PaymentsPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-2">Payments</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Payments are managed manually in Stripe for now.
      </p>
      <div className="bg-white rounded-lg border border-border p-6 space-y-3">
        <p className="text-sm font-medium">Manage payments in Stripe</p>
        <p className="text-sm text-muted-foreground">
          Log in to the Stripe dashboard to issue payment links, view transactions, and process refunds.
        </p>
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-1 text-sm text-primary hover:underline"
        >
          Open Stripe dashboard →
        </a>
      </div>
    </div>
  )
}
