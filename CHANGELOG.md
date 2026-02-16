# Changelog

## Unreleased

### Changed

- Fixed published package entry points to match actual build outputs (`dist/index.js` for CJS and `dist/index.mjs` for ESM).
- Expanded webhook header typing to support Node framework header shapes (`string | string[] | undefined`).
- Added open-source package metadata, documentation, and CI/release workflows.

## [2.0.0](https://github.com/apinator-io/sdk-node/compare/v1.0.0...v2.0.0) (2026-02-16)


### ⚠ BREAKING CHANGES

* reset release line

### Features

* reset release line ([c2173b2](https://github.com/apinator-io/sdk-node/commit/c2173b2b041fe0aa8bb555fb91c0a7c8307396e0))

## 1.0.0 (2026-02-16)


### Features

* initial release ([88895d8](https://github.com/apinator-io/sdk-node/commit/88895d84fde0565a6106ab77b9aae05ee3c806a4))


### Bug Fixes

* update github action client name ([9737c50](https://github.com/apinator-io/sdk-node/commit/9737c504ccd15e0072bde33f2ad01e30e24ad5ad))

## [1.1.1](https://github.com/apinator-io/sdk-node/compare/v1.1.0...v1.1.1) (2026-02-16)


### Bug Fixes

* update readme ([740ec13](https://github.com/apinator-io/sdk-node/commit/740ec13dd42b2777fcb513cc6783606e9ea48db7))

## [1.1.0](https://github.com/apinator-io/sdk-node/compare/v1.0.0...v1.1.0) (2026-02-16)


### Features

* change config ([09ff9af](https://github.com/apinator-io/sdk-node/commit/09ff9af6f98ff81e9e92ab255b379bc9a66f5c15))

## 1.0.0 (2026-02-16)


### Bug Fixes

* tests ([eae9ecc](https://github.com/apinator-io/sdk-node/commit/eae9ecc13a89a2b180b2de2239e82724d19e9653))
* updated github workflow ([87d6acf](https://github.com/apinator-io/sdk-node/commit/87d6acfd964029c3e4a28d63be708822b25a226b))

## 1.0.0 (2026-02-15)

### Features

- Initial Node.js server SDK release:
  - Trigger events to channels
  - Channel authentication helpers
  - Webhook signature verification
  - HMAC signing utilities
