/**
 * ResizablePanel - A sophisticated side panel component with resize functionality
 * 
 * This component provides a professional, IDE-like side panel experience with:
 * - Smooth animations and transitions
 * - Resizable width with constraints
 * - Persistent size preferences
 * - Keyboard accessibility
 * - ARIA attributes for screen readers
 * - Overlay/backdrop when open
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResizablePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: 'left' | 'right';
  title?: string;
  className?: string;
}

const STORAGE_KEY = 'route_radar_debug_panel_width';

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  isOpen,
  onClose,
  children,
  defaultWidth = 400,
  minWidth = 300,
  maxWidth = 800,
  position = 'right',
  title = 'Debug Panel',
  className = ''
}) => {
  // Load saved width from localStorage
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Save width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, width.toString());
  }, [width]);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Start resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = position === 'right' 
        ? startXRef.current - e.clientX 
        : e.clientX - startXRef.current;
      
      const newWidth = startWidthRef.current + delta;
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      
      setWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, position]);

  // Prevent dragging when cursor is over the panel content
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const panelVariants = {
    closed: { 
      x: position === 'right' ? '100%' : '-100%', 
      opacity: 0,
      transition: { 
        type: 'tween',
        duration: 0.3,
        ease: 'easeInOut'
      }
    },
    open: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'tween',
        duration: 0.3,
        ease: 'easeInOut'
      }
    }
  };

  const overlayVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            variants={panelVariants}
            initial="closed"
            animate="open"
            exit="closed"
            style={{ width }}
            className={`fixed top-0 bottom-0 ${position}-0 z-50 bg-white shadow-2xl flex flex-col ${className}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onDragStart={handleDragStart}
          >
            {/* Resize handle */}
            <div
              className={`absolute top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary-100 transition-colors ${
                position === 'right' ? 'left-0 -translate-x-1' : 'right-0 translate-x-1'
              }`}
              onMouseDown={handleMouseDown}
            >
              {/* Visual indicator */}
              <div className={`h-full w-px bg-secondary-200 ${
                position === 'right' ? 'ml-auto' : 'mr-auto'
              }`} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-secondary-200 bg-secondary-50">
              <h2 className="text-lg font-semibold text-secondary-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-secondary-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                aria-label="Close panel"
              >
                <svg className="h-5 w-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ResizablePanel;
