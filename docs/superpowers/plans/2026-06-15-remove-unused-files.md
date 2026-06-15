# Remove Unused Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete all unreferenced source files and unused asset files from the repository while keeping the build and test suites green.

**Architecture:** Run `knip --files` to identify dead source files, manually grep for asset references to find unused images/SVGs, remove the confirmed-unused files, then verify with `npm run build` and `npm run test`.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, Tailwind CSS 4, knip (via npx)

---

### Task 1: Remove unused source files

**Files:**
- Delete: `src/components/LeftToolbar.tsx`
- Delete: `src/components/ZoomControls.tsx`
- Delete: `src/hooks/useHotkeys.ts`

These three files were reported by `knip --files` as having no importers in the codebase.

- [ ] **Step 1: Confirm the files are unreferenced**

Run: `npx knip --files --no-progress`
Expected output: lists exactly the three files above.

- [ ] **Step 2: Delete the unused source files**

Run:
```bash
rm src/components/LeftToolbar.tsx \
   src/components/ZoomControls.tsx \
   src/hooks/useHotkeys.ts
```

- [ ] **Step 3: Verify no remaining source-file issues**

Run: `npx knip --files --no-progress`
Expected output: no unused source files reported.

---

### Task 2: Remove unused asset files

**Files:**
- Delete: `src/assets/hero.png`
- Delete: `src/assets/react.svg`
- Delete: `src/assets/vite.svg`
- Delete: `public/icons.svg`

A grep for the asset basenames found only `public/favicon.svg` referenced in `index.html`; the four files above have no references.

- [ ] **Step 1: Confirm the assets are unreferenced**

Run:
```bash
grep -R -E 'hero\.png|react\.svg|vite\.svg|icons\.svg' --include='*.html' --include='*.tsx' --include='*.ts' --include='*.css' .
```
Expected output: only matches in `public/icons.svg` itself and in plan/spec docs; no runtime imports.

- [ ] **Step 2: Delete the unused asset files**

Run:
```bash
rm src/assets/hero.png \
   src/assets/react.svg \
   src/assets/vite.svg \
   public/icons.svg
```

- [ ] **Step 3: Verify the remaining favicon is still used**

Run: `grep 'favicon.svg' index.html`
Expected output: `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`

---

### Task 3: Verify build and tests

- [ ] **Step 1: Run the production build**

Run: `npm run build`
Expected output: completes with exit code 0 and no TypeScript or Vite errors.

- [ ] **Step 2: Run the test suite**

Run: `npm run test`
Expected output: all tests pass.

- [ ] **Step 3: Commit the cleanup**

Run:
```bash
git add src/components/LeftToolbar.tsx \
        src/components/ZoomControls.tsx \
        src/hooks/useHotkeys.ts \
        src/assets/hero.png \
        src/assets/react.svg \
        src/assets/vite.svg \
        public/icons.svg
git commit -m "chore: remove unused source and asset files"
```
