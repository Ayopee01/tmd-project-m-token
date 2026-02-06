"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FiMaximize2, FiX } from "react-icons/fi";

type Props = {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
};

function ZoomableImage({
    src,
    alt,
    width = 900,
    height = 1200,
    className = "h-auto w-full",
}: Props) {
    const [open, setOpen] = useState(false);

    // ปิดด้วย ESC + ล็อกสกอลตอนเปิด overlay
    useEffect(() => {
        if (!open) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    if (!src) return null;

    return (
        <>
            {/* img */}
            <div className="group relative shadow-xl">
                <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    className={className}
                />

                {/* Icon Zoom */}
                <button
                    type="button"
                    aria-label="Icon Zoom"
                    onClick={() => setOpen(true)}
                    className="cursor-pointer absolute right-3 top-3
                    inline-flex h-10 w-10 items-center justify-center
                    rounded-lg bg-black/40 text-white
                    opacity-0 transition
                    group-hover:opacity-100
                    hover:scale-110 hover:bg-black/60
                    focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                >
                    <FiMaximize2 className="h-5 w-5" />
                </button>
            </div>

            {/* Overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-[2px]"
                    onClick={() => setOpen(false)} // Click นอกรูปปิด
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="flex h-full items-center justify-center">
                        <div
                            className="relative inline-block max-h-[90vh] max-w-[95vw]"
                            onClick={(e) => e.stopPropagation()} // กันคลิกโดนรูปแล้วปิด
                        >
                            {/* Img zoom*/}
                            <Image
                                src={src}
                                alt={alt}
                                width={1600}
                                height={2000}
                                className="mx-auto max-h-[90vh] w-auto max-w-[95vw] object-contain shadow-2xl"
                                priority
                            />

                            {/* Close Button */}
                            <button
                                type="button"
                                aria-label="Close Button"
                                onClick={() => setOpen(false)}
                                className="cursor-pointer absolute right-3 top-3
                                inline-flex h-10 w-10 items-center justify-center
                                rounded-lg bg-black/50 text-white
                                hover:scale-110 hover:bg-black/70
                                transition
                                focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                            >
                                <FiX className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default ZoomableImage; 