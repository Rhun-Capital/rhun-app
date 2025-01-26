"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { CrossmintHostedCheckout, useCrossmintCheckout } from "@crossmint/client-sdk-react-ui";

export default function MintPage() {
    const [showSuccess, setShowSuccess] = useState(false);
    const [uniqueID, setUniqueID] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID as string;
    const { order } = useCrossmintCheckout();

    useEffect(() => {
        if (order && order.phase === "completed") {
            console.log("Purchase completed!");
            const uid = crypto.randomUUID();
            setUniqueID(uid);

            fetch("/api/fast-pass", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: uid, order }),
            })
                .then((response) => response.json())
                .then((data) => {
                    console.log("Successfully posted unique ID:", data);
                    setShowSuccess(true);
                })
                .catch((error) => {
                    console.error("Error posting unique ID:", error);
                });
        }
    }, [order]);    

    return (
        <main className="min-h-screen bg-gray-100 dark:bg-zinc-900 py-12 px-4">
            {showSuccess && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 max-w-md mx-4">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                            <div className="flex items-center">

                        <span className="text-green-500 mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                        Purchase Successful!
                        </div>
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Your Fast Pass NFT has been minted successfully. Check your wallet for the NFT.
                        </p>
                        <div className="mb-6">
                            <label className="block text-white dark:text-gray-300 mb-2" htmlFor="accessId">
                                Access ID
                            </label>
                            <div className="flex items-center">
                                <input
                                    id="accessId"
                                    type="text"
                                    value={uniqueID || ""}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 dark:text-gray-300 dark:bg-zinc-700"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(uniqueID || "")

                                        setCopySuccess(true);
                                        setTimeout(() => setCopySuccess(false), 2000);
                                        
                                    }}
                                    className="ml-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                                >
                                    {copySuccess ? "Copied!" : "Copy"}
                                </button>
                            </div>
                            
                        </div>
                        <button 
                            onClick={() => setShowSuccess(false)}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-zinc-800 p-8 rounded-xl shadow-lg outline outline-zinc-500">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-1 text-gray-900 dark:text-white">
                            Mint <em>Fast Pass NFT</em>
                        </h1>
                        <p className="mb-8 text-gray-500 dark:text-gray-400">
                            Get early access to the Rhun platform with a Fast Pass NFT
                        </p>                        
                        <Image
                            src="https://rhun.io/images/nft/rhun_fast_pass.png"
                            alt="NFT Preview"
                            width={350}
                            height={350}
                            className="shadow-lg  rounded-xl mx-auto mb-6"
                            priority
                        />
                        <div className="flex justify-center items-center gap-2">
                            <Image
                                src="https://rhun.io/images/chains/solana.svg"
                                alt="Solana logo"
                                width={18}
                                height={18}
                                className="mb-6"
                                priority
                            />
                            <div className="text-2xl font-bold text-white mb-6">
                                <span className="text-2xl font-bold text-purple-600 dark:text-indigo-400 ml-3">
                                1 SOL
                                </span>
                            </div>
                        </div>
                    <div className="flex justify-center">
                        
                            <CrossmintHostedCheckout
                                lineItems={{
                                    collectionLocator: `crossmint:${collectionId}`,
                                    callData: {
                                        totalPrice: "1",
                                        quantity: 1,
                                    },
                                }}
                                payment={{
                                    crypto: { enabled: true },
                                    fiat: { enabled: true },
                                }}
                            />
                        
                        </div>                        
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                        <p className="text-xs">
                            By proceeding with this purchase, you acknowledge and agree to the following:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-xs">
                            <li>All sales are final. No refunds will be issued under any circumstances.</li>
                            <li>NFT values can be volatile and may decrease significantly.</li>
                            <li>You are responsible for securing your wallet and NFT.</li>
                            <li>This does not guarantee unlimted access to the platform.</li>
                            <li>Network fees are non-refundable.</li>
                            <li>This purchase does not guarantee any future returns or benefits.</li>
                        </ul>
                        <p className="text-xs mt-4 text-gray-500 dark:text-gray-400">
                            This NFT is provided &ldquo;as is&ldquo; without any warranties, either express or implied. 
                            The creators are not liable for any losses or damages arising from this purchase.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}