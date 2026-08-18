import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { stateToTimezone, formatSessionFull } from '@/lib/timezone'

const POCKETNOTE = {
  name: 'Pocketnote',
  abn: '91 693 195 836',
  email: 'accounts@pocketnote.com.au',
  phone: '0485 883 221',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
  },
  // Invoice title block (top)
  titleBlock: {
    marginBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  invoiceMeta: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  statusPill: {
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  // Party cards — side by side
  partiesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  partyCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 14,
  },
  partyCardHighlight: {
    flex: 1,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#be5a5a',
  },
  partyLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  partyLabelHighlight: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#be5a5a',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  partyDetail: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 14,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: 120,
    color: '#6b7280',
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#be5a5a',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colDate: { width: '30%' },
  colStudent: { width: '20%' },
  colMode: { width: '12%' },
  colDuration: { width: '13%', textAlign: 'right' },
  colRate: { width: '12%', textAlign: 'right' },
  colAmount: { width: '13%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

type Session = {
  id: string
  scheduled_at: string
  duration_minutes: number | null
  student_name: string | null
  rate_cents: number | null
  mode?: string | null
}

type Invoice = {
  id: string
  period_start: string
  period_end: string
  submitted_at: string
  sessions_count: number
  total_minutes: number
  hourly_rate_cents: number
  total_cents: number
  amount: number
  status: string
  notes?: string | null
  paid_at?: string | null
}

type Tutor = {
  legal_name: string
  email: string
  phone?: string | null
  abn?: string | null
  gst_registered?: boolean | null
  state?: string | null
} | null

export function InvoicePDF({
  invoice,
  tutor,
  sessions,
}: {
  invoice: Invoice
  tutor: Tutor
  sessions: Session[]
}) {
  const tutorTz = stateToTimezone(tutor?.state)
  const hrs = Math.floor(invoice.total_minutes / 60)
  const mins = invoice.total_minutes % 60
  const totalHours = `${hrs}h${mins > 0 ? ` ${mins}m` : ''}`

  const shortId = invoice.id.slice(0, 8).toUpperCase()
  const gstRegistered = tutor?.gst_registered === true
  const invoiceTitle = gstRegistered ? 'Tax Invoice' : 'Invoice'

  const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
    approved: { bg: '#dbeafe', text: '#1d4ed8' },
    paid: { bg: '#d1fae5', text: '#065f46' },
    submitted: { bg: '#fef3c7', text: '#92400e' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
  }
  const statusColor = STATUS_COLOR[invoice.status] ?? { bg: '#f3f4f6', text: '#374151' }

  function sessionAmount(s: Session): number {
    const rate = s.rate_cents ?? invoice.hourly_rate_cents
    return Math.round(((s.duration_minutes ?? 60) / 60) * rate)
  }

  function formatMode(mode?: string | null): string {
    if (!mode) return '—'
    return mode === 'in-person' ? 'In-person' : 'Online'
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Invoice title + reference */}
        <View style={styles.titleBlock}>
          <View>
            <Text style={styles.invoiceTitle}>{invoiceTitle}</Text>
            <Text style={styles.invoiceMeta}>#{shortId}</Text>
            <Text style={styles.invoiceMeta}>
              Submitted {format(new Date(invoice.submitted_at), 'd MMM yyyy')}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: statusColor.bg }]}>
              <Text style={{ color: statusColor.text }}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceMeta}>
              Period: {format(new Date(invoice.period_start), 'd MMM')} – {format(new Date(invoice.period_end), 'd MMM yyyy')}
            </Text>
            {invoice.paid_at ? (
              <Text style={styles.invoiceMeta}>
                Paid: {format(new Date(invoice.paid_at), 'd MMM yyyy')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Parties — ISSUED BY (tutor) | ISSUED TO (Pocketnote) */}
        <View style={styles.partiesRow}>
          {/* Issued by — tutor */}
          <View style={styles.partyCardHighlight}>
            <Text style={styles.partyLabelHighlight}>Issued by</Text>
            <Text style={styles.partyName}>{tutor?.legal_name ?? '—'}</Text>
            {tutor?.email ? <Text style={styles.partyDetail}>{tutor.email}</Text> : null}
            {tutor?.phone ? <Text style={styles.partyDetail}>{tutor.phone}</Text> : null}
            {tutor?.abn ? <Text style={styles.partyDetail}>ABN: {tutor.abn}</Text> : null}
            {gstRegistered ? (
              <Text style={{ ...styles.partyDetail, color: '#059669', marginTop: 3 }}>GST Registered</Text>
            ) : null}
          </View>

          {/* Issued to — Pocketnote */}
          <View style={styles.partyCard}>
            <Text style={styles.partyLabel}>Issued to</Text>
            <Text style={styles.partyName}>{POCKETNOTE.name}</Text>
            <Text style={styles.partyDetail}>ABN: {POCKETNOTE.abn}</Text>
            <Text style={styles.partyDetail}>{POCKETNOTE.email}</Text>
            <Text style={styles.partyDetail}>{POCKETNOTE.phone}</Text>
          </View>
        </View>

        {/* Invoice summary */}
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Sessions</Text>
            <Text style={styles.value}>{invoice.sessions_count}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total hours</Text>
            <Text style={styles.value}>{totalHours}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {gstRegistered ? 'Total amount (GST inclusive)' : 'Total amount'}
            </Text>
            <Text style={styles.totalValue}>${(invoice.total_cents / 100).toFixed(2)}</Text>
          </View>
        </View>

        {/* Tutor notes */}
        {invoice.notes ? (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}>
              <Text style={{ fontSize: 9, color: '#374151' }}>{invoice.notes}</Text>
            </View>
          </>
        ) : null}

        {/* Sessions table */}
        <Text style={styles.sectionTitle}>Sessions ({sessions.length})</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colDate]}>Date &amp; time</Text>
          <Text style={[styles.tableHeaderCell, styles.colStudent]}>Student</Text>
          <Text style={[styles.tableHeaderCell, styles.colMode]}>Mode</Text>
          <Text style={[styles.tableHeaderCell, styles.colDuration]}>Duration</Text>
          <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
          <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
        </View>
        {sessions.map((s) => {
          const rateCents = s.rate_cents ?? invoice.hourly_rate_cents
          const amountCents = sessionAmount(s)
          return (
            <View key={s.id} style={styles.tableRow}>
              <Text style={[{ fontSize: 9 }, styles.colDate]}>
                {formatSessionFull(s.scheduled_at, tutorTz)}
              </Text>
              <Text style={[{ fontSize: 9 }, styles.colStudent]}>
                {s.student_name ?? '—'}
              </Text>
              <Text style={[{ fontSize: 9 }, styles.colMode]}>
                {formatMode(s.mode)}
              </Text>
              <Text style={[{ fontSize: 9 }, styles.colDuration]}>
                {s.duration_minutes ?? 60} min
              </Text>
              <Text style={[{ fontSize: 9 }, styles.colRate]}>
                ${(rateCents / 100).toFixed(2)}
              </Text>
              <Text style={[{ fontSize: 9, fontFamily: 'Helvetica-Bold' }, styles.colAmount]}>
                ${(amountCents / 100).toFixed(2)}
              </Text>
            </View>
          )
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{POCKETNOTE.name}</Text>
          <Text style={styles.footerText}>{invoiceTitle} #{shortId}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
