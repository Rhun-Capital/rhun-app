import React, { useState, useEffect } from 'react';
import { useModal } from '@/contexts/modal-context';
import Image from 'next/image';
import { createPortal } from 'react-dom';

// Modal portal component to ensure modal is rendered at the document root
const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
};

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  defaultAmount?: number;
}

const FundingModal: React.FC<FundingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultAmount = 0.1
}) => {
  const [amount, setAmount] = useState(defaultAmount);
  const { openModal, closeModal } = useModal();

  // Handle modal context state
  useEffect(() => {
    if (isOpen) {
      openModal();
    }
    
    return () => {
      closeModal();
    };
  }, [isOpen, openModal, closeModal]);

  if (!isOpen) return null;

  const handleClose = () => {
    closeModal();
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(amount);
    handleClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
        <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 relative shadow-xl">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            Add Funds
          </h2>

          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="text-sm text-zinc-400 flex items-center gap-2 mb-2">
                <Image
                  src="https://d1olseq3j3ep4p.cloudfront.net/images/chains/solana.svg"
                  alt="Solana logo"
                  width={16}
                  height={16}
                  priority
                />
                <span>Amount (SOL)</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                min="0.1"
                step="0.1"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {[0.1, 0.5, 1, 2].map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(value)}
                  className={`flex-1 px-3 py-1 rounded text-sm ${
                    amount === value
                      ? 'bg-indigo-500 text-white'
                      : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                  }`}
                >
                  {value} SOL
                </button>
              ))}
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              disabled={amount < 0.1}
              className="w-full bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default FundingModal;