import WalletWatchers  from '@/components/tools/wallet-watchers';

export default async function WatchersPage() {
  return (
    <main className="flex-1">
      <div className="container mx-auto">
        <WalletWatchers />
      </div>
    </main>
  );
}