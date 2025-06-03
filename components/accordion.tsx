// components/Accordion.tsx
import { useState } from 'react';
import { AccordionProps } from '@/types/components';

export default function Accordion({ title, children, defaultOpen = false, className }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-zinc-700 rounded-lg ${className || ''}`}>
      <button
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen)
        }}
        className="w-full px-4 py-3 flex justify-between items-center text-left bg-zinc-700 bg-opacity-40 border border-zinc-700  hover:bg-zinc-800 rounded-lg transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium">{title}</span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}