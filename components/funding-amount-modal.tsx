import React, { useState } from 'react';
import { FundingModalProps } from '../types/ui';

const FundingAmountModal: React.FC<FundingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultAmount = 0.1
}) => {
  const [amount, setAmount] = useState(defaultAmount);

  const presetAmounts = [1, 5, 10];

  const handlePresetClick = (presetAmount: number) => {
    setAmount(presetAmount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white mb-4">Fund Wallet</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Amount (SOL)
            </label>
            
            {/* Preset Amount Buttons */}
            <div className="flex gap-2 mb-3">
              {presetAmounts.map((presetAmount) => (
                <button
                  key={presetAmount}
                  onClick={() => handlePresetClick(presetAmount)}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                    amount === presetAmount
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'border-zinc-600 text-white hover:border-indigo-400 hover:bg-indigo-400/10'
                  }`}
                >
                  {presetAmount} SOL
                </button>
              ))}
            </div>
            
            {/* Custom Amount Input */}
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0.1}
              step={0.1}
              placeholder="Custom amount"
              className="w-full px-3 py-2 bg-zinc-700 rounded-lg border border-zinc-600 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              disabled={!amount || amount <= 0}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fund {amount} SOL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundingAmountModal;