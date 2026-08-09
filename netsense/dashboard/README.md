# NetSense Atlas Dashboard

The implemented NetSense frontend is an evidence-led network operations
workspace with Observe, Investigate, and Resolve workflows. It uses validated
synthetic fixtures behind repository boundaries; it is not connected to a
production probe or platform API yet.

## Run

```bash
npm ci
npm run dev
```

## Quality gates

```bash
npm run lint
npm run test:run
npm run test:coverage
npm run test:e2e
npm run test:a11y
npm run build
```

The local preview routes are `/observe`, `/investigate`, and `/resolve`.

The header provides two calibrated display environments: Operations Dark for
low-light monitoring and Daylight for bright offices, field use, and demos.
The choice persists in the browser and preserves identical topology semantics.

## Architecture

- `src/features/topology/domain` owns versioned topology semantics and graph
  invariants.
- `src/features/topology/layout` owns renderer-independent stored positions.
- `src/features/topology/rendering` translates semantic map grammar and the
  active operating-environment tokens into Cytoscape styles.
- `src/features/theme` owns explicit environment selection and safe local
  persistence.
- `src/features/incidents/domain` owns deterministic reasoning and workflow
  rules.
- `src/features/**/data/fixtures` contains explicitly synthetic scenarios.
- components render domain outputs; they do not manufacture incident claims.

See `../docs/product/full-product-rollout-v1.md` for the verified product
boundary and rollout plan.

<!-- Historical Vite template guidance retained below for toolchain context. -->

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
   parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
   },
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
