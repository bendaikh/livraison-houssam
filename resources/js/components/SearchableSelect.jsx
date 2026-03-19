import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

export default function SearchableSelect({
    options = [],
    value = '',
    onChange = () => {},
    placeholder = 'Search and select...',
    label = '',
    error = null,
    disabled = false,
    getOptionLabel = (option) => option.name || String(option),
    getOptionValue = (option) => option.id || option,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const filteredOptions = options.filter((option) => {
        const label = getOptionLabel(option);
        return label.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const selectedOption = options.find((opt) => String(getOptionValue(opt)) === String(value));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && filteredOptions.length > 0) {
            const activeElement = listRef.current?.children[highlightedIndex];
            if (activeElement) {
                activeElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, filteredOptions, isOpen]);

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
        setHighlightedIndex(0);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                break;
            default:
                break;
        }
    };

    const handleSelect = (option) => {
        onChange(String(getOptionValue(option)));
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(0);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleFocus = () => {
        setIsOpen(true);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {label && (
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={isOpen ? searchTerm : (selectedOption ? getOptionLabel(selectedOption) : '')}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full rounded-2xl border px-4 py-3 pr-10 transition-all focus:border-transparent focus:ring-2 ${
                        error
                            ? 'border-rose-300 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-emerald-500'
                    } ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                />
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 gap-2">
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                    )}
                    <ChevronDown
                        size={18}
                        className={`text-slate-400 pointer-events-none transition-transform ${
                            isOpen ? 'rotate-180' : ''
                        }`}
                    />
                </div>
            </div>

            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg">
                    <ul
                        ref={listRef}
                        className="max-h-64 overflow-y-auto"
                    >
                        {filteredOptions.map((option, index) => (
                            <li
                                key={String(getOptionValue(option))}
                                onClick={() => handleSelect(option)}
                                className={`cursor-pointer px-4 py-3 transition-colors ${
                                    index === highlightedIndex
                                        ? 'bg-emerald-50 text-emerald-900'
                                        : 'hover:bg-slate-50'
                                } ${
                                    String(getOptionValue(option)) === String(value)
                                        ? 'bg-emerald-100 font-semibold'
                                        : ''
                                }`}
                            >
                                {getOptionLabel(option)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isOpen && filteredOptions.length === 0 && searchTerm && (
                <div className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500 shadow-lg">
                    No results found for "{searchTerm}"
                </div>
            )}

            {isOpen && filteredOptions.length === 0 && !searchTerm && options.length === 0 && (
                <div className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500 shadow-lg">
                    No options available
                </div>
            )}

            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
    );
}
