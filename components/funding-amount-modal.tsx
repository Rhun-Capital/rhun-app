import React, { useState } from 'react';
import { FundingModalProps } from '../types/ui';

const FundingAmountModal: React.FC<FundingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultAmount = 0.1
}) => {
  const [amount, setAmount] = useState(defaultAmount);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white mb-4">Fund Agent</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Amount (SOL)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0.1}
              step={0.1}
              className="w-full px-3 py-2 bg-zinc-700 rounded-lg border border-zinc-600 text-white"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(amount)}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Fund
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundingAmountModal;