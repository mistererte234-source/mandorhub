---
name: MandorHub Design System
colors:
  surface: '#f6f9ff'
  surface-dim: '#d4dbe3'
  surface-bright: '#f6f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4fd'
  surface-container: '#e8eef7'
  surface-container-high: '#e2e9f1'
  surface-container-highest: '#dce3ec'
  on-surface: '#151c22'
  on-surface-variant: '#414844'
  inverse-surface: '#2a3138'
  inverse-on-surface: '#ebf1fa'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#4c6452'
  on-secondary: '#ffffff'
  secondary-container: '#cce6d0'
  on-secondary-container: '#506856'
  tertiary: '#342300'
  on-tertiary: '#ffffff'
  tertiary-container: '#503700'
  on-tertiary-container: '#d89b00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#cee9d3'
  secondary-fixed-dim: '#b3cdb7'
  on-secondary-fixed: '#092012'
  on-secondary-fixed-variant: '#354c3b'
  tertiary-fixed: '#ffdea9'
  tertiary-fixed-dim: '#ffba27'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5e4100'
  background: '#f6f9ff'
  on-background: '#151c22'
  surface-variant: '#dce3ec'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 48px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style

The design system is built specifically for Indonesian construction foremen (*Mandor*) and contractors, a demographic that values pragmatism, clarity, and reliability. The brand personality is grounded, warm, and respectful, moving away from cold "tech" aesthetics toward a digital environment that feels like a trusted physical ledger or a well-organized site office.

The design style is **Modern-Tactile**. It utilizes large, approachable surfaces, generous hit targets, and high-contrast typography to ensure usability for users aged 40–65 who may have varying levels of digital literacy or visual acuity. By avoiding dense information architecture and futuristic metaphors, this design system fosters confidence and reduces the cognitive load associated with project monitoring.

## Colors

The palette is inspired by nature and the stability of the construction site. 

- **Primary (Deep Forest Green):** Used for headers, primary actions, and brand identification. It signifies growth and professional authority.
- **Background (Off-White/Warm Gray):** Provides a soft, non-glare canvas that is easier on the eyes during outdoor use than pure white.
- **Accent (Light Lime):** Used for success states, subtle highlights, and secondary containers to keep the UI feeling fresh.
- **Warning (Amber Yellow):** Reserved for pending approvals or items requiring attention.
- **Urgent (Soft Red):** Used sparingly for critical delays or safety issues.

All color combinations must maintain a minimum contrast ratio of 4.5:1 to ensure legibility for older users.

## Typography

This design system prioritizes legibility over density. We use **Inter** for its tall x-height and clear letterforms, which remain readable even on lower-resolution mobile devices common in the field.

The scale is intentionally shifted upward. The standard "Body" text is 18px (Body-LG) to accommodate older eyes. Avoid using any text smaller than 14px. Bold weights should be used frequently to establish hierarchy, as subtle color shifts may be difficult to see in direct sunlight on a construction site. All terminology must be in plain, everyday Indonesian (e.g., use "Laporan" instead of "Logs", "Pekerjaan" instead of "Tasks").

## Layout & Spacing

The layout follows a **Fluid Grid** model with generous margins to prevent the UI from feeling cramped. 

- **Mobile First:** Since foremen are primarily on-site, the mobile experience is the priority. Use a single-column layout for most content.
- **Rhythm:** A 8px baseline grid is used. Elements are separated by "Large" (32px) or "Extra Large" (48px) gaps to clearly distinguish different sections of a report or project.
- **Touch Targets:** All interactive elements (buttons, toggles, inputs) must have a minimum height of 56px to ensure they are easily tappable for users who may have calloused hands or be wearing gloves.

## Elevation & Depth

To create a sense of order without complexity, the design system uses **Tonal Layers** and **Ambient Shadows**.

- **Surface Levels:** The background is the lowest level (`#f8f9fa`). Cards containing content sit on top in pure white (`#ffffff`).
- **Shadows:** Use soft, highly diffused shadows (e.g., `box-shadow: 0 4px 20px rgba(27, 67, 50, 0.08)`). The shadow color is slightly tinted with the Primary Green to maintain a warm, organic feel rather than a cold gray.
- **Depth Metaphor:** Elements that are "tappable" (like a project card or a photo upload button) should have a slightly more pronounced shadow than static information cards, signaling interactivity.

## Shapes

The shape language is friendly and non-threatening. All cards use `rounded-2xl` (1rem / 16px) to soften the interface. 

Buttons use even higher roundedness (up to pill-shaped) to make them look distinct from informational boxes. Form inputs use the standard `rounded-lg` (8px) to maintain a sense of structure and input clarity. Avoid sharp corners entirely, as they can feel "technical" or "legalistic" to the target user group.

## Components

### Buttons
Primary buttons are large (min-height 56px), utilizing the Deep Forest Green background with white bold text. Secondary buttons use the Light Lime background with Green text. Labels should be action-oriented: "Kirim Laporan" (Send Report) instead of "Submit".

### Cards
Cards are the primary container for information. Every card must have a white background, 16px corner radius, and a soft shadow. Use "Card Headers" with 20px padding and a bottom border to separate titles from content.

### Inputs
Text fields must have labels that are always visible (not floating) to ensure the user doesn't lose context. The touch area for a field extends to the label. Use clear icons (e.g., a camera icon for "Unggah Foto") to provide visual cues.

### Lists
Lists should avoid tight rows. Each list item should be a "mini-card" with a minimum height of 72px, providing ample space for large text and a "chevron" icon to indicate that the item can be opened.

### Chips/Status Indicators
Use high-contrast colored chips for status. 
- *Selesai* (Finished): Light Lime background.
- *Proses* (In Progress): Primary Green background (low opacity).
- *Tertunda* (Delayed): Amber background.

### Photo Previews
Since photo evidence is crucial for monitoring, photo thumbnails must be large (min 100x100px) with rounded corners and a clear "X" button to remove.