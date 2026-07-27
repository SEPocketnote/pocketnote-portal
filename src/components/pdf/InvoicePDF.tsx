import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  brand: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#be5a5a',
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  statusPill: {
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    alignSelf: 'flex-start',
    marginTop: 4,
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
  colDate: { width: '45%' },
  colStudent: { width: '35%' },
  colDuration: { width: '20%', textAlign: 'right' },
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
  const hrs = Math.floor(invoice.total_minutes / 60)
  const mins = invoice.total_minutes % 60
  const totalHours = hrs + (mins > 0 ? ` h ${mins} m` : ' h')

  const shortId = invoice.id.slice(0, 8).toUpperCase()

  const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
    approved: { bg: '#dbeafe', text: '#1d4ed8' },
    paid: { bg: '#d1fae5', text: '#065f46' },
    submitted: { bg: '#fef3c7', text: '#92400e' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
  }
  const statusColor = STATUS_COLOR[invoice.status] ?? { bg: '#f3f4f6', text: '#374151' }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>Pocketnote</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceTitle}>Invoice #{shortId}</Text>
            <Text style={{ fontSize: 9, color: '#6b7280' }}>
              Submitted {format(new Date(invoice.submitted_at), 'd MMM yyyy')}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: statusColor.bg }]}>
              <Text style={{ color: statusColor.text }}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tutor */}
        <Text style={styles.sectionTitle}>Tutor</Text>
        <View style={styles.card}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 3 }}>
            {tutor?.legal_name ?? '—'}
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 9 }}>{tutor?.email ?? ''}</Text>
        </View>

        {/* Invoice details */}
        <Text style={styles.sectionTitle}>Invoice details</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Period</Text>
            <Text style={styles.value}>
              {format(new Date(invoice.period_start), 'd MMM yyyy')} – {format(new Date(invoice.period_end), 'd MMM yyyy')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sessions</Text>
            <Text style={styles.value}>{invoice.sessions_count}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total hours</Text>
            <Text style={styles.value}>{totalHours}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hourly rate</Text>
            <Text style={styles.value}>${(invoice.hourly_rate_cents / 100).toFixed(2)} / hr</Text>
          </View>
          {invoice.paid_at && (
            <View style={styles.row}>
              <Text style={styles.label}>Paid on</Text>
              <Text style={styles.value}>{format(new Date(invoice.paid_at), 'd MMM yyyy')}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total amount</Text>
            <Text style={styles.totalValue}>${(invoice.total_cents / 100).toFixed(2)}</Text>
          </View>
        </View>

        {/* Tutor notes */}
        {invoice.notes && (
          <>
            <Text style={styles.sectionTitle}>Tutor notes</Text>
            <View style={styles.card}>
              <Text style={{ fontSize: 9, color: '#374151' }}>{invoice.notes}</Text>
            </View>
          </>
        )}

        {/* Sessions */}
        <Text style={styles.sectionTitle}>Sessions ({sessions.length})</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colDate]}>Date &amp; time</Text>
          <Text style={[styles.tableHeaderCell, styles.colStudent]}>Student</Text>
          <Text style={[styles.tableHeaderCell, styles.colDuration]}>Duration</Text>
        </View>
        {sessions.map((s) => (
          <View key={s.id} style={styles.tableRow}>
            <Text style={[{ fontSize: 9 }, styles.colDate]}>
              {format(new Date(s.scheduled_at), 'EEE d MMM yyyy · h:mm a')}
            </Text>
            <Text style={[{ fontSize: 9 }, styles.colStudent]}>
              {s.student_name ?? '—'}
            </Text>
            <Text style={[{ fontSize: 9 }, styles.colDuration]}>
              {s.duration_minutes ?? 60} min
            </Text>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Pocketnote</Text>
          <Text style={styles.footerText}>Invoice #{shortId}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
