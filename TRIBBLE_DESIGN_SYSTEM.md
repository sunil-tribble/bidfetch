# Tribble.ai Design System for BidFetch

## Overview
This design system captures the professional, enterprise aesthetic of tribble.ai to ensure BidFetch appears as a natural extension of the tribble.ai platform. The design emphasizes clean minimalism, professional credibility, and efficient user experience.

## Color Palette

### Primary Colors
```css
/* Primary Blues */
--primary-blue: #2563eb;          /* Main brand blue */
--primary-blue-50: #eff6ff;      /* Lightest blue background */
--primary-blue-100: #dbeafe;     /* Light blue backgrounds */
--primary-blue-500: #3b82f6;     /* Interactive blue */
--primary-blue-600: #2563eb;     /* Primary blue */
--primary-blue-700: #1d4ed8;     /* Hover state */
--primary-blue-900: #1e3a8a;     /* Dark blue text */

/* Accent Green (for success states and highlights) */
--accent-green: #10b981;         /* Success green */
--accent-green-50: #ecfdf5;      /* Light green background */
--accent-green-100: #d1fae5;     /* Lighter green */
--accent-green-500: #10b981;     /* Main green */
--accent-green-700: #047857;     /* Dark green */
```

### Neutral Colors
```css
/* Grays and Whites */
--white: #ffffff;                 /* Pure white */
--gray-50: #f9fafb;              /* Lightest gray background */
--gray-100: #f3f4f6;             /* Light gray background */
--gray-200: #e5e7eb;             /* Border gray */
--gray-300: #d1d5db;             /* Light border */
--gray-400: #9ca3af;             /* Placeholder text */
--gray-500: #6b7280;             /* Secondary text */
--gray-600: #4b5563;             /* Body text */
--gray-700: #374151;             /* Primary text */
--gray-800: #1f2937;             /* Heading text */
--gray-900: #111827;             /* Darkest text */
```

### Semantic Colors
```css
/* Status Colors */
--success: #10b981;              /* Success state */
--warning: #f59e0b;              /* Warning state */
--error: #ef4444;                /* Error state */
--info: #3b82f6;                 /* Info state */
```

## Typography

### Font Stack
```css
/* Primary Font */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Secondary Font (for emphasis) */
font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Weights
```css
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Typography Scale
```css
/* Display (Hero Headlines) */
--text-display: 3rem;            /* 48px */
--text-display-line-height: 1.1;
--text-display-weight: 700;

/* Headings */
--text-h1: 2.25rem;              /* 36px */
--text-h1-line-height: 1.2;
--text-h1-weight: 700;

--text-h2: 1.875rem;             /* 30px */
--text-h2-line-height: 1.25;
--text-h2-weight: 600;

--text-h3: 1.5rem;               /* 24px */
--text-h3-line-height: 1.3;
--text-h3-weight: 600;

--text-h4: 1.25rem;              /* 20px */
--text-h4-line-height: 1.4;
--text-h4-weight: 600;

/* Body Text */
--text-large: 1.125rem;          /* 18px */
--text-large-line-height: 1.6;

--text-base: 1rem;               /* 16px */
--text-base-line-height: 1.5;

--text-small: 0.875rem;          /* 14px */
--text-small-line-height: 1.4;

--text-tiny: 0.75rem;            /* 12px */
--text-tiny-line-height: 1.3;
```

## Spacing System

### Spacing Scale (Based on 4px grid)
```css
--space-1: 0.25rem;              /* 4px */
--space-2: 0.5rem;               /* 8px */
--space-3: 0.75rem;              /* 12px */
--space-4: 1rem;                 /* 16px */
--space-5: 1.25rem;              /* 20px */
--space-6: 1.5rem;               /* 24px */
--space-8: 2rem;                 /* 32px */
--space-10: 2.5rem;              /* 40px */
--space-12: 3rem;                /* 48px */
--space-16: 4rem;                /* 64px */
--space-20: 5rem;                /* 80px */
--space-24: 6rem;                /* 96px */
```

### Container Widths
```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

## Component Styles

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: var(--primary-blue-600);
  color: var(--white);
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
  font-size: var(--text-base);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-primary:hover {
  background: var(--primary-blue-700);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: var(--primary-blue-600);
  border: 1px solid var(--primary-blue-600);
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
  font-size: var(--text-base);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-secondary:hover {
  background: var(--primary-blue-50);
  transform: translateY(-1px);
}

/* Button Sizes */
.btn-small {
  padding: 0.5rem 1rem;
  font-size: var(--text-small);
}

.btn-large {
  padding: 1rem 2rem;
  font-size: var(--text-large);
}
```

### Cards
```css
.card {
  background: var(--white);
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--gray-200);
  padding: var(--space-6);
  transition: all 0.2s ease-in-out;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  margin-bottom: var(--space-4);
}

.card-title {
  font-size: var(--text-h4);
  font-weight: var(--font-semibold);
  color: var(--gray-800);
  margin-bottom: var(--space-2);
}

.card-subtitle {
  font-size: var(--text-small);
  color: var(--gray-500);
}
```

### Navigation
```css
.navbar {
  background: var(--white);
  border-bottom: 1px solid var(--gray-200);
  padding: var(--space-4) 0;
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(10px);
}

.navbar-brand {
  font-size: var(--text-h3);
  font-weight: var(--font-bold);
  color: var(--gray-800);
  text-decoration: none;
}

.navbar-nav {
  display: flex;
  gap: var(--space-8);
  align-items: center;
}

.nav-link {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--gray-600);
  text-decoration: none;
  transition: color 0.2s ease-in-out;
}

.nav-link:hover,
.nav-link.active {
  color: var(--primary-blue-600);
}
```

### Forms
```css
.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  font-size: var(--text-small);
  font-weight: var(--font-medium);
  color: var(--gray-700);
  margin-bottom: var(--space-2);
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--gray-300);
  border-radius: 0.5rem;
  font-size: var(--text-base);
  transition: all 0.2s ease-in-out;
  background: var(--white);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-blue-600);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input::placeholder {
  color: var(--gray-400);
}
```

## Layout Patterns

### Grid System
```css
.container {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: 0 var(--space-4);
}

.grid {
  display: grid;
  gap: var(--space-6);
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .grid-cols-2,
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: 1fr;
  }
}
```

### Section Layouts
```css
.section {
  padding: var(--space-16) 0;
}

.section-hero {
  padding: var(--space-24) 0;
  background: linear-gradient(135deg, var(--gray-50) 0%, var(--white) 100%);
}

.section-content {
  padding: var(--space-20) 0;
}
```

## Shadows and Effects

### Shadow System
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
```

### Border Radius
```css
--radius-sm: 0.25rem;            /* 4px */
--radius: 0.5rem;                /* 8px */
--radius-md: 0.75rem;            /* 12px */
--radius-lg: 1rem;               /* 16px */
--radius-full: 9999px;           /* Full circle */
```

## Animation & Transitions

### Timing Functions
```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Durations
```css
--duration-150: 150ms;
--duration-200: 200ms;
--duration-300: 300ms;
--duration-500: 500ms;
```

### Common Animations
```css
.fade-in {
  animation: fadeIn var(--duration-300) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.slide-in-right {
  animation: slideInRight var(--duration-300) var(--ease-out);
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
```

## Responsive Breakpoints

```css
/* Mobile First Approach */
@media (min-width: 640px) {  /* sm */ }
@media (min-width: 768px) {  /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

## Implementation Guidelines

### CSS Custom Properties Setup
Add these to your root CSS file:
```css
:root {
  /* Color Palette */
  --primary-blue: #2563eb;
  --primary-blue-50: #eff6ff;
  --primary-blue-100: #dbeafe;
  /* ... all other variables ... */
}
```

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      }
    }
  }
}
```

## Usage Examples

### Hero Section
```jsx
<section className="section-hero">
  <div className="container">
    <div className="text-center">
      <h1 className="text-display font-bold text-gray-800 mb-6">
        Smart Bidding Intelligence for Government Contracts
      </h1>
      <p className="text-large text-gray-600 mb-8 max-w-3xl mx-auto">
        Leverage AI-powered insights to identify, track, and win more government opportunities with BidFetch.
      </p>
      <div className="flex gap-4 justify-center">
        <button className="btn-primary btn-large">Get Started</button>
        <button className="btn-secondary btn-large">Learn More</button>
      </div>
    </div>
  </div>
</section>
```

### Dashboard Card
```jsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Active Opportunities</h3>
    <p className="card-subtitle">Currently tracked opportunities</p>
  </div>
  <div className="text-2xl font-bold text-primary-600">127</div>
  <div className="text-sm text-green-600 mt-2">
    +12% from last month
  </div>
</div>
```

## Design Principles

1. **Clarity First**: Every element should have a clear purpose and hierarchy
2. **Consistent Spacing**: Use the 4px grid system consistently
3. **Subtle Interactions**: Hover states should be noticeable but not jarring
4. **Professional Aesthetic**: Maintain enterprise credibility at all times
5. **Mobile Responsive**: Design mobile-first, enhance for desktop
6. **Accessible Design**: Ensure WCAG 2.1 AA compliance
7. **Performance Conscious**: Optimize for fast loading and smooth interactions

This design system ensures BidFetch will seamlessly integrate with the tribble.ai aesthetic while maintaining its own identity as a powerful government contract intelligence platform.