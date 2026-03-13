"use client";

import { useEffect, useState } from "react";
import { FiChevronUp } from "react-icons/fi";

function ScrollTopButton() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            setShow(window.scrollY > 300);
        };

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });

        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const handleScrollTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    if (!show) return null;

    return (
        <button
            type="button"
            onClick={handleScrollTop}
            aria-label="กลับขึ้นด้านบน"
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 active:scale-95 cursor-pointer"
        >
            <FiChevronUp className="h-6 w-6" />
        </button>
    );
}

export default ScrollTopButton;