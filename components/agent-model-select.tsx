import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Option, ImageSelectProps } from '@/types/ui';

const ImageSelect: React.FC<ImageSelectProps> = ({ options, value, onChange, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const selectedOption = options.find(opt => opt.value === value) || options[0];
  
    return (
      <div className={`relative w-full ${className || ''}`}>
        {/* Select Button */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-zinc-800"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center">
            {selectedOption.image && (
              <img
                src={selectedOption.image}
                alt={selectedOption.label}
                className="w-6 h-6 object-cover rounded-full mr-3"
              />
            )}
            <span className="text-white text-sm">{selectedOption.label}</span>
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </button>
  
        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-2 bg-zinc-700 rounded-lg shadow-xl border border-zinc-600">
            <ul className="py-1 max-h-60 overflow-auto">
              {options.map((option, index) => (
                <li 
                  key={option.value}
                  className={`${index !== 0 ? 'border-t border-zinc-600' : ''}`}
                >
                  <button
                    type="button"
                    className={`w-full flex items-center px-4 py-3 text-left hover:bg-zinc-600 transition-colors duration-150 ${
                      option.value === value ? 'bg-zinc-600' : ''
                    }`}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    {option.image && (
                      <img
                        src={option.image}
                        alt={option.label}
                        className="w-6 h-6 object-cover rounded-full mr-3"
                      />
                    )}
                    <span className="text-white text-sm">{option.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  

export default ImageSelect;