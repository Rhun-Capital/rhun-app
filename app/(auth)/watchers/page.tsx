import WalletWatchers  from '@/components/wallet-watchers';

export default async function WatchersPage() {
  return (
    <main className="flex-1">
      <div className="w-full">
        <WalletWatchers />
      </div>
    </main>
  );
}