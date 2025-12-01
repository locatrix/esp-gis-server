# ESP Web Viewer

This is an example web-viewer which can be used to test an ESP deployment. The viewer is built using React, Typescript & Vite.

## Mapbox Viewer Environment

In order to use the MapBox viewer, the `VITE_MAPBOX_ACCESS_TOKEN` environment variable is required. This token should be set in the `.env` file located within `./Client`.

For convenience, `./Client` contains a file called `.env.template` which can be duplicated, renamed to `.env` and populated with the required keys.

## Running the Viewer

As detailed in the top level `README.md`, the viewer will be built and run when deploying the ESP GIS Server in IIS.

The viewer can also be run locally see [Local Development](#local-development).

## Local Development

To run a local standalone ESP Web Viewer follow the below steps:

1. Change into the `Client/` directory.
2. Run `yarn install`
3. Configure your `mapbox` access token as outlined in [above](#mapbox-viewer-environment).
4. Run `yarn dev` to run a local dev build using vite.

### Things to note

- The `VITE_DEBUG_VIEWER` environment variable can be set to `1` to enable debug mode.
- The `VITE_SERVER_TARGET_OVERRIDE` environment can be set to target an existing ESP GIS Server deployment. This can be useful when doing exclusive client-side development, allowing the viewer client to be modified as needed without requiring a redeployment of the GIS server.

## General React + TypeScript + Vite Development Notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```