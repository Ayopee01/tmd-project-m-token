"use client";

import { useEffect, useState } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";
import { MdTextFields } from "react-icons/md";

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 19;
const DEFAULT_FONT_SIZE = 16;
const STEP = 1;
const STORAGE_KEY = "font-size";

export default function FontSizeControls() {
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  function decreaseFontSize() {
    setFontSize((prev) => Math.max(prev - STEP, MIN_FONT_SIZE));
  }

  function increaseFontSize() {
    setFontSize((prev) => Math.min(prev + STEP, MAX_FONT_SIZE));
  }

  function resetFontSize() {
    setFontSize(DEFAULT_FONT_SIZE);
  }

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const parsed = Number(saved);
    if (!Number.isNaN(parsed)) {
      setFontSize(parsed);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    window.localStorage.setItem(STORAGE_KEY, String(fontSize));
  }, [fontSize]);

  return (
    <div className="flex items-center overflow-hidden">
      <button
        type="button"
        aria-label="Decrease font size"
        className="cursor-pointer flex h-10 w-10 items-center justify-center text-gray-100 transition hover:text-emerald-600"
        onClick={decreaseFontSize}
      >
        <FiMinus className="h-4 w-4" />
      </button>

      <button
        type="button"
        aria-label="Reset font size"
        title="Reset font size"
        className="cursor-pointer flex h-10 min-w-12 items-center justify-center px-3 text-gray-100 transition hover:text-emerald-600"
        onClick={resetFontSize}
      >
        <MdTextFields className="h-5 w-5" />
      </button>

      <button
        type="button"
        aria-label="Increase font size"
        className="cursor-pointer flex h-10 w-10 items-center justify-center text-gray-100 transition hover:text-emerald-600"
        onClick={increaseFontSize}
      >
        <FiPlus className="h-4 w-4" />
      </button>
    </div>
  );
}