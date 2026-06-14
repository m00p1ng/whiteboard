# Tailwind CSS v4 Upgrade Design

## Goal
Upgrade the project from Tailwind CSS v3.4.19 to v4 using the CSS-first configuration model and the official Vite plugin.

## Context
- React + TypeScript + Vite project.
- Currently on Tailwind v3.4.19 with `tailwind.config.js` and `postcss.config.js`.
- Uses shadcn-style CSS variables and a small set of custom theme colors (`primary`, `secondary`, `destructive`, `muted`, `accent`, `border`, `input`, `ring`).
- Uses `class-variance-authority`, `clsx`, and `tailwind-merge` for component styling.
- No custom Tailwind plugins and no dark mode usage in the codebase.

## Decision
Adopt a full CSS-first migration with the `@tailwindcss/vite` plugin. Remove `tailwind.config.js` and `postcss.config.js`.

## Design

### 1. Dependencies
- Upgrade `tailwindcss` to `^4.0.0`.
- Add `@tailwindcss/vite` as a dev dependency.
- Remove `autoprefixer` and `postcss` from `devDependencies`.
- Remove `postcss.config.js`.

### 2. Vite configuration
Add the Tailwind Vite plugin to `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### 3. CSS entry file migration (`src/index.css`)
Replace the v3 directives with the v4 import and `@theme` block:

```css
@import "tailwindcss";

@theme {
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));

  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}

#root {
  width: 100%;
  height: 100svh;
}
```

### 4. Cleanup
- Delete `tailwind.config.js`.
- Update `components.json`:
  - Remove the `tailwind.config` field or leave it empty if required by the schema.
  - Keep `tailwind.css` pointing to `src/index.css`.

### 5. Verification
- Run `npm install` to update dependencies.
- Run `npm run lint`.
- Run `npm run test`.
- Run `npm run build`.
- Fix any class-name issues that surface during verification.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| `@apply` behavior changes in v4 | Keep existing `@apply` usage in `index.css` and fix any reported issues during build. |
| Custom theme colors not resolved | Map every color from `tailwind.config.js` into the `@theme` block. |
| `tailwind-merge` compatibility | `tailwind-merge` v3.x supports Tailwind v4; no upgrade needed. |
| Build errors from Vite plugin | Verify plugin order and that `postcss.config.js` is removed. |
