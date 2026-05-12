"use client";

import { useState } from "react";

function CaptureButtonToggle() {
    const [isEnabled, setIsEnabled] = useState(true);

    const handleToggle = () => {
        const nextValue = !isEnabled;

        window.czpSdk?.setCaptureButtonVisible?.(nextValue);
        setIsEnabled(nextValue);
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            className="rounded-md bg-blue-600 px-4 py-2 text-white"
        >
            {isEnabled ? "ปิด Capture Screen" : "เปิด Capture Screen"}
        </button>
    );
}

export default CaptureButtonToggle;