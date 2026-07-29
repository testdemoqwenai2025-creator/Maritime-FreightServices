#!/usr/bin/env python3
"""
Dark mode migration script for Dashboard.tsx
Replaces hardcoded light-mode Tailwind colors with CSS variable-based dark-mode friendly classes.
"""

import re

INPUT = '/home/z/my-project/src/components/maritime/Dashboard.tsx'
OUTPUT = '/home/z/my-project/src/components/maritime/Dashboard.tsx'

with open(INPUT, 'r') as f:
    content = f.read()

# === Phase 1: Replace in the MaritimeDashboard main component ===

# Replace the darkMode state initialization to default true
content = content.replace(
    "const [darkMode, setDarkMode] = useState(false)",
    "const [darkMode, setDarkMode] = useState(true)"
)

# Replace the main wrapper - use CSS variables
content = content.replace(
    "className={`flex min-h-screen flex-col ${darkMode ? 'bg-neutral-950' : 'bg-neutral-50'}`}",
    "className='flex min-h-screen flex-col bg-background'"
)

# Header
content = content.replace(
    "className={`sticky top-0 z-50 border-b backdrop-blur-sm ${darkMode ? 'border-neutral-800 bg-neutral-950/95' : 'border-neutral-200 bg-white/95'}`}",
    "className='sticky top-0 z-50 border-b backdrop-blur-sm bg-background/95 border-border'"
)

# Logo icon
content = content.replace(
    "className={`flex h-8 w-8 items-center justify-center rounded-lg ${darkMode ? 'bg-blue-600' : 'bg-neutral-900'}`}",
    "className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary'"
)

# Title
content = content.replace(
    "className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}",
    "className='text-lg font-bold text-foreground'"
)

# Subtitle - both dark and light had text-neutral-500, so just use muted-foreground
content = content.replace(
    "className={`hidden text-xs sm:block ${darkMode ? 'text-neutral-500' : 'text-neutral-500'}`}",
    "className='hidden text-xs sm:block text-muted-foreground'"
)

# Active vessel count badge
content = content.replace(
    "className={`border-neutral-200 ${darkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}",
    "className='border-border bg-secondary text-secondary-foreground'"
)

# Dark mode toggle button
content = content.replace(
    "className={`h-8 w-8 ${darkMode ? 'text-neutral-400 hover:text-yellow-400' : 'text-neutral-500 hover:text-neutral-900'}`}",
    "className='h-8 w-8 text-muted-foreground hover:text-foreground'"
)

# TabsList
content = content.replace(
    "className={`mb-6 flex w-full flex-wrap gap-1 ${darkMode ? 'bg-neutral-900' : 'bg-neutral-100'}`}",
    "className='mb-6 flex w-full flex-wrap gap-1 bg-muted'"
)

# Footer
content = content.replace(
    'className="mt-auto border-t border-neutral-200 bg-white"',
    'className="mt-auto border-t border-border bg-card"'
)

# === Phase 2: Replace hardcoded colors throughout ALL panels ===

# Card borders: border-neutral-200 -> border-border
content = content.replace('border-neutral-200', 'border-border')

# Background colors: bg-white -> bg-card, bg-neutral-50 -> bg-card  
content = content.replace('bg-white', 'bg-card')

# bg-neutral-100 -> bg-muted (for loading spinners, etc)
content = content.replace('bg-neutral-100', 'bg-muted')

# Hover states
content = content.replace('hover:bg-neutral-50', 'hover:bg-muted/50')

# Text colors - primary text
content = content.replace('text-neutral-900', 'text-foreground')

# Text colors - secondary text
content = content.replace('text-neutral-800', 'text-foreground/80')

# Text colors - tertiary text  
content = content.replace('text-neutral-700', 'text-foreground/70')

# Text colors - muted text
content = content.replace('text-neutral-600', 'text-muted-foreground')
content = content.replace('text-neutral-500', 'text-muted-foreground')
content = content.replace('text-neutral-400', 'text-muted-foreground/70')

# Border colors in expanded rows
content = content.replace('border-neutral-100', 'border-border')

# Loading spinner border
content = content.replace(
    'border-2 border-neutral-300 border-t-neutral-900',
    'border-2 border-border border-t-foreground'
)

# Event timeline dot
content = content.replace(
    'border-2 border-neutral-900 bg-white',
    'border-2 border-foreground bg-card'
)

# Event timeline line
content = content.replace(
    'bg-neutral-200',  # the vertical line in timeline
    'bg-border'
)

# Document stat boxes - make dark-mode friendly
content = content.replace(
    'rounded-lg bg-green-50 p-3 text-center',
    'rounded-lg bg-green-500/10 p-3 text-center'
)
content = content.replace(
    'text-lg font-bold text-green-700',
    'text-lg font-bold text-green-400'
)
content = content.replace(
    'text-xs text-green-600',
    'text-xs text-green-400/70'
)

content = content.replace(
    'rounded-lg bg-amber-50 p-3 text-center',
    'rounded-lg bg-amber-500/10 p-3 text-center'
)
content = content.replace(
    'text-lg font-bold text-amber-700',
    'text-lg font-bold text-amber-400'
)
content = content.replace(
    'text-xs text-amber-600',
    'text-xs text-amber-400/70'
)

content = content.replace(
    'rounded-lg bg-red-50 p-3 text-center',
    'rounded-lg bg-red-500/10 p-3 text-center'
)
content = content.replace(
    'text-lg font-bold text-red-700',
    'text-lg font-bold text-red-400'
)
content = content.replace(
    'text-xs text-red-600',
    'text-xs text-red-400/70'
)

# Facility badges in Ports panel
content = content.replace(
    'bg-neutral-50 text-neutral-600 border-neutral-200',
    'bg-secondary text-secondary-foreground border-border'
)

# Priority badge colors (dark-friendly)
content = content.replace(
    "'bg-red-50 text-red-700 border-red-200'",
    "'bg-red-500/10 text-red-400 border-red-500/30'"
)
content = content.replace(
    "'bg-amber-50 text-amber-700 border-amber-200'",
    "'bg-amber-500/10 text-amber-400 border-amber-500/30'"
)
content = content.replace(
    "'bg-neutral-50 text-neutral-700 border-neutral-200'",
    "'bg-secondary text-secondary-foreground border-border'"
)

# Status badge colors - make semi-transparent for dark mode
# ShipmentStatusColor
content = content.replace("'bg-amber-100 text-amber-800 border-amber-200'", "'bg-amber-500/10 text-amber-400 border-amber-500/30'")
content = content.replace("'bg-green-100 text-green-800 border-green-200'", "'bg-green-500/10 text-green-400 border-green-500/30'")
content = content.replace("'bg-emerald-100 text-emerald-800 border-emerald-200'", "'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'")
content = content.replace("'bg-red-100 text-red-800 border-red-200'", "'bg-red-500/10 text-red-400 border-red-500/30'")
content = content.replace("'bg-blue-100 text-blue-800 border-blue-200'", "'bg-blue-500/10 text-blue-400 border-blue-500/30'")

# Default status badge
content = content.replace("'bg-neutral-100 text-neutral-700 border-neutral-200'", "'bg-secondary text-secondary-foreground border-border'")

# VesselMap loading placeholder
content = content.replace(
    'bg-neutral-100',
    'bg-muted'
)

# Progress bar in loading spinner - already handled above

# Live badge
content = content.replace(
    'className="hidden gap-1 bg-green-50 text-green-700 border-green-200 sm:flex"',
    'className="hidden gap-1 bg-green-500/10 text-green-400 border-green-500/30 sm:flex"'
)

# Green/amber text highlights
content = content.replace('text-green-600', 'text-green-400')
content = content.replace('text-amber-600', 'text-amber-400')

# Write output
with open(OUTPUT, 'w') as f:
    f.write(content)

print(f"Dark mode migration complete: {INPUT}")
print(f"Total lines: {len(content.splitlines())}")
