'use client';

import React from 'react';
import FastPassComponent from '@/components/fast-pass-component';
import { CrossmintProvider, CrossmintCheckoutProvider } from '@crossmint/client-sdk-react-ui';
export const dynamic = 'force-dynamic'

const FastPassPage: React.FC = () => {
    const clientApiKey = process.env.NEXT_PUBLIC_CLIENT_API_KEY as string;
    return (
        <CrossmintProvider apiKey={clientApiKey}>
            <CrossmintCheckoutProvider>
                <FastPassComponent />
            </CrossmintCheckoutProvider>
        </CrossmintProvider>
    );
};

export default FastPassPage;