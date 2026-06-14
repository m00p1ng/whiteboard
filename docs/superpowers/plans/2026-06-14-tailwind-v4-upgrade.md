# Tailwind CSS v4 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the project from Tailwind CSS v3.4.19 to v4 using the CSS-first configuration model and the official Vite plugin.

**Architecture:** Replace the Tailwind PostCSS pipeline with the `@tailwindcss/vite` plugin. Move all theme tokens from `tailwind.config.js` into `src/index.css` using the v4 `@theme` block. Remove `tailwind.config.js` and `postcss.config.js`.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS v4, `@tailwindcss/vite`, `tailwind-merge`, `class-variance-authority`, `clsx`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Update Tailwind to v4, add Vite plugin, remove PostCSS/autoprefixer deps |
| `vite.config.ts` | Modify | Register `@tailwindcss/vite` plugin |
| `src/index.css` | Modify | Use v4 `@import "tailwindcss"` and `@theme` block |
| `tailwind.config.js` | Delete | No longer needed in CSS-first v4 |
| `postcss.config.js` | Delete | No longer needed |
| `components.json` | Modify | Update shadcn config to reflect removed `tailwind.config` |

---

### Task 1: Update dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update `package.json` dependency entries**

  Change the Tailwind entry and remove the PostCSS-related dev dependencies:

  ```json
  {
    "devDependencies": {
      "@eslint/js": "^10.0.1",
      "@tailwindcss/vite": "^4.0.0",
      "@testing-library/jest-dom": "^6.9.1",
      "@testing-library/react": "^16.3.2",
      "@types/node": "^24.13.2",
      "@types/react": "^19.2.17",
      "@types/react-dom": "^19.2.3",
      "@vitejs/plugin-react": "^6.0.1",
      "@vitest/ui": "^4.1.8",
      "canvas": "^3.2.3",
      "eslint": "^10.3.0",
      "eslint-plugin-react-hooks": "^7.1.1",
      "eslint-plugin-react-refresh": "^0.5.2",
      "globals": "^17.6.0",
      "jsdom": "^29.1.1",
      "tailwindcss": "^4.0.0",
      "typescript": "~6.0.2",
      "typescript-eslint": "^8.59.2",
      "vite": "^8.0.12",
      "vite-tsconfig-paths": "^6.1.1",
      "vitest": "^4.1.8"
    }
  }
  ```

  Removed: `autoprefixer`, `postcss`.
  Added: `@tailwindcss/vite`.
  Changed: `tailwindcss` from `^3.4.19` to `^4.0.0`.

- [ ] **Step 2: Commit the dependency change**

  ```bash
  git add package.json
  git commit -m "chore: upgrade tailwindcss to v4 and add @tailwindcss/vite"
  ```

---

### Task 2: Register the Tailwind Vite plugin

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add the Tailwind plugin import and registration**

  Replace the contents of `vite.config.ts` with:

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

- [ ] **Step 2: Commit the Vite config change**

  ```bash
  git add vite.config.ts
  git commit -m "build: register @tailwindcss/vite plugin"
  ```

---

### Task 3: Migrate `src/index.css` to Tailwind v4

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace the CSS entry file with the v4 structure**

  Replace the entire contents of `src/index.css` with:

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

- [ ] **Step 2: Commit the CSS migration**

  ```bash
  git add src/index.css
  git commit -m "style: migrate index.css to Tailwind v4 CSS-first config"
  ```

---

### Task 4: Remove obsolete config files

**Files:**
- Delete: `tailwind.config.js`
- Delete: `postcss.config.js`

- [ ] **Step 1: Delete the obsolete config files**

  ```bash
  rm tailwind.config.js postcss.config.js
  ```

- [ ] **Step 2: Commit the cleanup**

  ```bash
  git add tailwind.config.js postcss.config.js
  git commit -m "chore: remove tailwind.config.js and postcss.config.js"
  ```

---

### Task 5: Update `components.json`

**Files:**
- Modify: `components.json`

- [ ] **Step 1: Remove the `tailwind.config` field**

  Replace the contents of `components.json` with:

  ```json
  {
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "default",
    "rsc": false,
    "tsx": true,
    "tailwind": {
      "css": "src/index.css",
      "baseColor": "neutral",
      "cssVariables": true,
      "prefix": ""
    },
    "aliases": {
      "components": "@/components",
      "utils": "@/lib/utils"
    }
  }
  ```

- [ ] **Step 2: Commit the shadcn config update**

  ```bash
  git add components.json
  git commit -m "chore: update components.json for Tailwind v4"
  ```

---

### Task 6: Install dependencies and verify the build

**Files:**
- None (verification only)

- [ ] **Step 1: Install updated dependencies**

  ```bash
  npm install
  ```

  Expected: `node_modules` updates and `package-lock.json` changes.

- [ ] **Step 2: Run the linter**

  ```bash
  npm run lint
  ```

  Expected: PASS with no errors.

- [ ] **Step 3: Run the test suite**

  ```bash
  npm run test
  ```

  Expected: All tests pass.

- [ ] **Step 4: Run the production build**

  ```bash
  npm run build
  ```

  Expected: Build completes successfully with no Tailwind-related errors.

- [ ] **Step 5: Commit the lockfile update**

  ```bash
  git add package-lock.json
  git commit -m "chore: update lockfile for Tailwind v4"
  ```

---

## Self-Review

1. **Spec coverage:**
   - Dependency upgrade → Task 1
   - Vite plugin registration → Task 2
   - CSS entry migration with `@theme` → Task 3
   - Delete `tailwind.config.js` and `postcss.config.js` → Task 4
   - Update `components.json` → Task 5
   - Verification via lint/test/build → Task 6

2. **Placeholder scan:** No TBD, TODO, or vague steps. Every code block contains complete content.

3. **Type consistency:** No new types or functions introduced; all file paths and commands are exact.
