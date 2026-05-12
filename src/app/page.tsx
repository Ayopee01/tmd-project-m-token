"use client"

// Components
import Dashboard from "@/app/landing/dashboard/page";
import CaptureButtonToggle from "@/app/components/CaptureButtonToggle";

// ----------------------------------- UI -----------------------------------
function Page() {
  return (
    <>
      <CaptureButtonToggle />
      <Dashboard />
    </>
  )
}

export default Page