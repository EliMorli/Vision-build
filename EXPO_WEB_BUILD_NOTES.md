# Expo Web Build Configuration Notes

## Critical Post-Install Step Required

After running `npm install`, you **MUST** manually fix the `query-string` package:

```bash
sed -i 's/"main": null/"main": "index.js"/' node_modules/query-string/package.json
```

### Why This Is Needed

- Expo Router 4.0 expects `query-string` to be a CommonJS module
- `query-string` v6.14.1 ships with `index.js` (CommonJS) but has `"main": null` in package.json
- Without this fix, web pages that use query params will crash with `queryString.stringify is not a function`
- This affects: privacy-choices, settings, project pages, and any route with URL parameters

### Alternative: Use patch-package

If you want to automate this, install `patch-package` and create a patch:

```bash
npm install --save-dev patch-package
# Fix the package.json as shown above, then:
npx patch-package query-string
# Add to package.json scripts: "postinstall": "patch-package"
```

## SDK 52 Web Build Quirks

### Plugins Array
Only include packages that have actual config plugins:
- ✅ `expo-router`, `expo-camera`, `expo-image-picker`, `expo-secure-store`
- ❌ `expo-web-browser`, `expo-crypto` (no plugins in SDK 52)

### Dependencies
- Use exact versions for critical packages like `query-string`
- Run `npx expo install --check` after any package changes
- Web builds work with `npx expo start --web` in dev mode
- Production export (`npx expo export --platform web`) may fail due to expo-modules-core TypeScript sources

## Native Plugins for Native Builds
The native plugins (camera, image-picker, secure-store) ARE needed in app.json for iOS/Android builds.
They configure permissions and native modules. They just don't all have web config plugins.
