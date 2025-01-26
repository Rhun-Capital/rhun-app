'use client';

import React from 'react';
import FastPassComponent from '@/components/fast-pass-component';
import { CrossmintProvider, CrossmintCheckoutProvider } from '@crossmint/client-sdk-react-ui';

const FastPassPage: React.FC = () => {
    const clientApiKey = process.env.NEXT_PUBLIC_CLIENT_API_KEY || '';

    if (!clientApiKey) {
        console.warn('NEXT_PUBLIC_CLIENT_API_KEY is not defined');
        return null;
    }

    return (
        <CrossmintProvider apiKey={clientApiKey}>
            <CrossmintCheckoutProvider>
                <FastPassComponent />
            </CrossmintCheckoutProvider>
        </CrossmintProvider>
    );
};

export default FastPassPage;