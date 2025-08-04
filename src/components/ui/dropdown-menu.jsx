"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from './button';

export function DropdownMenu({ children }) {
  return <div className="relative inline-block">{children}</div>;
}

export function DropdownMenuTrigger({ children, asChild, ...props }) {
  return (
    <Button variant="ghost" {...props}>
      {children}
    </Button>
  );
}

export function DropdownMenuContent({ children, align = 'right' }) {
  const alignClass = align === 'right' ? 'right-0' : 'left-0';
  
  return (
    <div className={`absolute ${alignClass} mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50`}>
      <div className="py-1">
        {children}
      </div>
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 ${className}`}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="border-t border-gray-200 my-1" />;
}

// Complete dropdown with state management
export function Dropdown({ trigger, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1" onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}