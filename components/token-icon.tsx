import React, { useState } from 'react';
import Image from 'next/image';

interface TokenIconProps {
  symbol: string;
  logoURI?: string;
  size?: number;
}

const TokenIcon: React.FC<TokenIconProps> = ({ symbol, logoURI, size = 32 }) => {
  const [imageError, setImageError] = useState(false);
  const firstLetter = symbol.charAt(0).toUpperCase();
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-indigo-500',
  ];
  
  // Use the first letter's char code to pick a consistent color
  const colorIndex = firstLetter.charCodeAt(0) % colors.length;

  // Special case for SOL
  if (symbol === 'SOL') {
    return (
      <div className={`relative w-${size} h-${size}`}>
        <Image
          src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
          alt="SOL"
          width={size}
          height={size}
          className="rounded-full"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // If image failed to load or no logoURI, show the letter circle
  if (imageError || !logoURI) {
    return (
      <div className={`w-${size} h-${size} rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-medium`}>
        {firstLetter}
      </div>
    );
  }

  // Try to load the image
  return (
    <div className={`relative w-${size} h-${size}`}>
      <Image
        src={logoURI}
        alt={symbol}
        width={size}
        height={size}
        className="rounded-full"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default TokenIcon; 