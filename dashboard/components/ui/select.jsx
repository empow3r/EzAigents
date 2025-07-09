import React, { useState } from 'react';

export const Select = ({ children, value, onValueChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      {React.Children.map(children, child => 
        React.cloneElement(child, { 
          value, 
          onValueChange, 
          isOpen, 
          setIsOpen 
        })
      )}
    </div>
  );
};

export const SelectTrigger = ({ children, value, isOpen, setIsOpen }) => (
  <button
    type="button"
    className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    onClick={() => setIsOpen(!isOpen)}
  >
    {children}
    <svg 
      className="h-4 w-4 opacity-50" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
);

export const SelectValue = ({ placeholder, value }) => (
  <span className={value ? 'text-gray-900' : 'text-gray-400'}>
    {value || placeholder}
  </span>
);

export const SelectContent = ({ children, isOpen, setIsOpen, onValueChange }) => {
  if (!isOpen) return null;
  
  return (
    <div className="absolute top-full z-50 w-full rounded-md border border-gray-200 bg-white shadow-lg mt-1">
      <div className="p-1">
        {React.Children.map(children, child => 
          React.cloneElement(child, { 
            onValueChange, 
            setIsOpen 
          })
        )}
      </div>
    </div>
  );
};

export const SelectItem = ({ children, value, onValueChange, setIsOpen }) => (
  <button
    type="button"
    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100 focus:bg-gray-100"
    onClick={() => {
      onValueChange(value);
      setIsOpen(false);
    }}
  >
    {children}
  </button>
);