"use client";

import React, { useEffect } from "react";

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sheet */}
            <div
                className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-1" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="px-6 pb-4 pt-2 flex items-center justify-between border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto overscroll-contain flex-grow">
                    {children}
                </div>
            </div>
        </>
    );
}
