import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Market Terminal | RHUN App',
  description: 'Professional market data dashboard for crypto and DeFi',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className="bg-black">
      {children}
    </section>
  )
} 