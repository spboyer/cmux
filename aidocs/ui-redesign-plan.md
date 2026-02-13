# UI Cosmetic Redesign Plan

## Overview

Redesign the Multi-Repo Workspace app with a **modern minimal** aesthetic while preserving the three-pane layout and all existing functionality. Replace emoji icons with VS Code icons, refine typography, and create a cleaner visual hierarchy.

## Design Direction

**Aesthetic**: Modern Minimal
- Cleaner than VS Code, more whitespace, refined typography
- Dark theme with cyan/teal accents
- Subtle depth through shadows and layering (not borders)
- Focus on typography and spacing over ornamentation

**Key Differentiator**: A terminal app that feels designed, not just functional. Calm, focused, professional.

## Design Specifications

### Typography
- **Display/Headers**: JetBrains Mono (monospace with character)
- **Body/UI**: IBM Plex Sans (clean, technical, distinctive)
- **Terminal**: JetBrains Mono or Cascadia Code
- Font sizes: 11px (small), 13px (body), 14px (headers)
- Generous letter-spacing in headers (0.05em)

### Color Palette
```css
/* Base */
--bg-deep: #0d1117;        /* Deepest background */
--bg-surface: #161b22;     /* Pane backgrounds */
--bg-elevated: #1c2128;    /* Headers, hover states */
--bg-hover: #21262d;       /* Interactive hover */

/* Borders & Lines */
--border-subtle: #30363d;
--border-muted: #21262d;

/* Text */
--text-primary: #e6edf3;
--text-secondary: #8b949e;
--text-muted: #6e7681;

/* Accent - Cyan/Teal */
--accent: #58a6ff;
--accent-glow: rgba(88, 166, 255, 0.15);
--accent-muted: #388bfd;

/* Semantic */
--success: #3fb950;
--warning: #d29922;
--error: #f85149;
```

### Icons - VS Code Icons (Codicons)
- Install `@vscode/codicons` package
- Use SVG sprite or React component wrapper
- Key icons needed:
  - `terminal` - Workspace items
  - `chevron-right` / `chevron-down` - Expand/collapse
  - `file` - Generic file
  - `file-code` - Code files (.ts, .js, .py)
  - `json` - JSON files
  - `markdown` - Markdown files
  - `folder` / `folder-opened` - Directories
  - `add` - Add button
  - `close` - Close button
  - `refresh` - Refresh tree

### Spacing System
- Base unit: 4px
- Pane padding: 12px (3 units)
- Item padding: 8px 12px
- Gap between items: 2px
- Header height: 40px

### Visual Effects
- No hard borders between panes (use background color difference)
- Subtle box-shadow on context menus
- Smooth transitions (150ms ease)
- Active item: subtle left border accent + background tint
- Hover: gentle background shift

---

## Workplan

### Phase 1: Foundation Setup
- [ ] Install dependencies (`@vscode/codicons`, web fonts)
- [ ] Create CSS variables file with design tokens
- [ ] Set up font imports (JetBrains Mono, IBM Plex Sans)
- [ ] Create Icon component wrapper for Codicons

### Phase 2: Global Styles Refactor
- [ ] Update `global.css` with new color variables
- [ ] Apply new typography throughout
- [ ] Update base layout spacing
- [ ] Remove hard borders, use background layering
- [ ] Add smooth transitions

### Phase 3: Left Pane Redesign
- [ ] Update pane header (cleaner, more minimal)
- [ ] Replace `+` text with Codicon `add` icon
- [ ] Update workspace items with `terminal` icon
- [ ] Update file items with appropriate file type icons
- [ ] Refine active/hover states with accent color
- [ ] Polish context menu styling

### Phase 4: Right Pane (File Tree) Redesign
- [ ] Update pane header styling
- [ ] Replace emoji icons with Codicons (`folder`, `file`, etc.)
- [ ] Create file type icon mapping (extension → icon)
- [ ] Update expand/collapse chevrons
- [ ] Refine indentation and spacing
- [ ] Polish hover/focus states

### Phase 5: Center Pane Polish
- [ ] Style empty state with refined typography
- [ ] Ensure workspace terminal container respects new spacing
- [ ] Verify Monaco editor theme compatibility
- [ ] Style file view header/breadcrumbs if present

### Phase 6: Details & Polish
- [ ] Update context menu styling (shadows, spacing)
- [ ] Add subtle animations (expand/collapse, hover)
- [ ] Verify all icon sizes are consistent
- [ ] Test responsive behavior at different window sizes
- [ ] Ensure accessibility (focus states, contrast)

### Phase 7: Testing & Cleanup
- [ ] Visual regression check across all states
- [ ] Verify no functionality broken
- [ ] Update screenshots in `/img/`
- [ ] Clean up any unused CSS

---

## File Changes Summary

| File | Changes |
|------|---------|
| `package.json` | Add `@vscode/codicons` dependency |
| `src/renderer/styles/global.css` | Complete overhaul with new design system |
| `src/renderer/styles/variables.css` | NEW - CSS custom properties |
| `src/renderer/components/Icon.tsx` | NEW - Codicon wrapper component |
| `src/renderer/components/LeftPane/LeftPane.tsx` | Replace emoji with Icon components |
| `src/renderer/components/RightPane/FileTreeNode.tsx` | Replace emoji with Icon components, new icon mapping |
| Minor updates to other components for spacing/styling consistency |

---

## Notes

- Keep all React component structure intact
- Only modify styling and icon rendering
- Test workspace terminal functionality after changes (xterm.js is sensitive to container sizing)
- Monaco Editor has its own theming - may need minor adjustments for consistency
