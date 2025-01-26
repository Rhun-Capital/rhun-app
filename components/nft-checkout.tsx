import { CrossmintHostedCheckout, CrossmintProvider } from "@crossmint/client-sdk-react-ui";

const NFTCheckoutWrapper = ({ collectionId }: { collectionId: string }) => (
 <CrossmintHostedCheckout
   lineItems={{
     collectionLocator: `crossmint:${collectionId}`,
     callData: { totalPrice: "1", quantity: 1 },
   }}
   payment={{ crypto: { enabled: true }, fiat: { enabled: true } }}
 />
);

const NFTCheckout = ({ collectionId }: { collectionId: string }) => (
 <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CLIENT_API_KEY || ''}>
   <NFTCheckoutWrapper collectionId={collectionId} />
 </CrossmintProvider>
);

export { NFTCheckout };