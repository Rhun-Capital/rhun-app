import { useEffect } from "react";
import { CrossmintHostedCheckout, CrossmintProvider, useCrossmintCheckout, CrossmintCheckoutProvider } from "@crossmint/client-sdk-react-ui";
import { usePrivy } from "@privy-io/react-auth";

const NFTCheckoutWrapper = ({ collectionId }: { collectionId: string }) => {
  const { user, getAccessToken } = usePrivy();
  const { order } = useCrossmintCheckout();


  useEffect(() => {
    if (order) {
      switch (order.phase) {
        case "quote":
            console.log(`Preparing order: ${order.lineItems.length} items`);
            break;
        case "payment":
            console.log(`Processing ${order.payment.method} payment`);
            break;
        case "delivery":
            console.log("Delivering NFTs to wallet...");
            break;
        case "completed":
            // write order database
            console.log(`Order completed: ${order}`);
            writeOrderIdToDatabase(order)
            break;
      }
    }
  }, [order]);


  if (!user) return null;
  const createRecipientObject = () => {
    if (user.wallet && user.wallet.address) {
      return { walletAddress: user.wallet.address };
    } else if (user.email) {
      return { email: user.email.address as unknown as string };
    } else {
      return undefined;
    }
  }

  const writeOrderIdToDatabase = async (order: object) => {
    const accessToken = await getAccessToken();
    await fetch("/api/nft/order", {
      method: "POST",
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`},
      body: JSON.stringify({ order, userId: user.id }),
    });
    window.location.href = "/";
  }


  return (
   <CrossmintHostedCheckout
      lineItems={{
        collectionLocator: `crossmint:${collectionId}`,
        callData: { totalPrice: "1", quantity: 1 },
      }}
      payment={{ crypto: { enabled: true }, fiat: { enabled: true } }}
      recipient={createRecipientObject()}
      
    />
  )
};

const NFTCheckout = ({ collectionId }: { collectionId: string }) => (
 <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY || ''}>
   <CrossmintCheckoutProvider>
    <NFTCheckoutWrapper collectionId={collectionId} />
   </CrossmintCheckoutProvider>
 </CrossmintProvider>
);

export { NFTCheckout };