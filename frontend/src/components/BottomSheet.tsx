"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:max-w-md md:mx-auto"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] md:max-w-md md:mx-auto max-h-[90vh] flex flex-col border-t border-surface-variant"
          >
            {/* Handle bar for drag affordance */}
            <div className="flex justify-center pt-3 pb-2" onClick={onClose}>
              <div className="w-12 h-1.5 bg-outline-variant rounded-full" />
            </div>
            
            <div className="px-6 pb-4 flex justify-between items-center border-b border-surface-variant">
              <h2 className="text-xl font-bold tracking-tight text-on-surface">
                {title || "Menu"}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 -mr-2 rounded-full bg-surface-container-low text-on-surface-variant active:scale-95 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto pb-[calc(24px+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
