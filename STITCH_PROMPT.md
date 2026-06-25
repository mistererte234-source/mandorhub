# MandorHub iOS-Style UI/UX Prompt for Stitch

**Copy-paste this prompt into Stitch to generate the UI components for MandorHub.**

---

**System Instructions / Persona for Stitch:**
You are an expert Frontend Developer and UI/UX Designer specializing in premium, native-feeling mobile applications built with web technologies (Next.js, React, Tailwind CSS, Framer Motion). Your goal is to generate stunning, iOS-inspired interfaces that are indistinguishable from native apps.

**Project Context (CRITICAL INSTRUCTION FOR STITCH):**
"MandorHub" is an **internal construction management and daily reporting tool**.
❌ **DO NOT** generate a marketplace, booking, or "Uber for Mandor" app. There is NO "Pesan Mandor" (Order Foreman) feature.
✅ **DO** generate a B2B productivity app where existing Foremen (Mandor) submit daily progress reports, photos, and issues to their Contractors (Admins) across multiple project sites.

**Design System & Aesthetics (STRICTLY ENFORCED):**
1.  **iOS Human Interface Guidelines (HIG) Inspired:**
    *   **Typography:** Use `font-sans` with Inter or SF Pro-like styling (`tracking-tight`). Titles should be bold and crisp.
    *   **Colors (Premium & Trustworthy):**
        *   Primary Brand: Deep, professional blue/slate (`bg-slate-900` or `bg-blue-600` depending on the element).
        *   Backgrounds: Off-white iOS background (`bg-gray-50` for the app background, `bg-white` for cards).
        *   Status Colors: iOS standard semantic colors (Red `text-red-500`, Yellow `text-amber-500`, Green `text-emerald-500`).
    *   **Layout & Spacing:** Generous padding, rounded corners (`rounded-2xl` for main cards, `rounded-lg` for inner items). Avoid sharp edges.
    *   **Shadows & Depth:** Use subtle, layered shadows (`shadow-sm` on list items, `shadow-md` or `shadow-lg` on modals/bottom sheets).
    *   **Glassmorphism (Subtle):** For floating elements like bottom navigation or sticky headers, use backdrop blur (`backdrop-blur-md bg-white/80`).

2.  **Interactivity & Micro-animations (Framer Motion / Tailwind):**
    *   Use active states (`active:scale-95`, `active:opacity-80`) on all clickable elements to mimic native iOS touch feedback.
    *   Transitions should be smooth and bouncy (e.g., spring physics).
    *   Use skeleton loaders for loading states.

**Screen Request: The Foreman (Mandor) Dashboard**

Please generate a single-file React component (export default function ForemanDashboard) that acts as the main view for a Foreman.

**Components to Include in this View:**

1.  **Header (Sticky):**
    *   Greeting: "Halo, Pak Joko 👋" (Large title, iOS style).
    *   Current Date: "Kamis, 25 Juni 2026".
    *   Profile Avatar (top right).

2.  **Status Overview (Hero Section):**
    *   A prominent card showing the overall status of today's work.
    *   Example state: "🟡 Menunggu Laporan" (Waiting for report).
    *   Include a primary, full-width, iOS-style rounded button: "Buat Laporan Harian" (Create Daily Report). Use an icon (e.g., Camera or Document).

3.  **Active Projects / Tasks (List View):**
    *   Section title: "Tugas & Titik Hari Ini" (Today's Tasks & Locations).
    *   An iOS-style list card (grouped table view style).
    *   Item 1: "Rumah Gresik" - Status: 🟢 Selesai (Done). Shows a tiny checkmark.
    *   Item 2: "Blok A Sidoarjo" - Status: 🔴 Issue Cuaca (Weather Issue). Shows a warning icon.
    *   Item 3: "Titik C" - Status: 🟡 Belum Lapor (Not Reported).

4.  **Bottom Navigation Bar (Fixed):**
    *   Glassmorphic background (`backdrop-blur-xl bg-white/90 border-t border-gray-200`).
    *   3 Icons: Home (Active), History, Settings.
    *   iOS style layout: safe-area padding at the bottom (`pb-safe`).

**Code Requirements:**
*   Use Lucide React for crisp, consistent icons.
*   Make the UI completely responsive but optimized for mobile viewports (`max-w-md mx-auto` to simulate mobile on desktop browsers).
*   Include all necessary Tailwind classes inline.
*   Do not use generic "placeholder" colors (like plain red-500 everywhere). Refine it with subtle backgrounds (e.g., `bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs font-medium`).
*   Ensure the code is a functional React component that can be copy-pasted into a Next.js `page.tsx` file.

Please output the complete, copy-pasteable React code.
