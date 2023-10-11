# bedrock-web-vc-exchanger ChangeLog

## 5.0.0 - 2023-10-xx

### Changed
- **BREAKING**: Drop support for Node.js < 18.

## 4.0.1 - 2022-08-14

### Fixed
- Use `@digitalbazaar/edv-client@15.0.1` to get chacha bug fix.

## 4.0.0 - 2022-08-14

### Changed
- **BREAKING**: Require node 16+.
- Update dependencies.

## 3.1.0 - 2022-05-28

### Changed
- Handle writing VCs to inbox when EDV doc does not exist.

## 3.0.0 - 2022-05-05

### Changed
- **BREAKING**: Use `@digitalbazaar/edv-client@14` with new blind attribute
  version. And EDV documents written by this version must be used with
  software that uses the same blind attribute version.

## 2.0.0 - 2022-04-10

### Changed
- **BREAKING**: Rename package to `@bedrock/web-vc-exchanger`.
- **BREAKING**: Convert to module (ESM).

## 1.0.0 - 2022-02-24

- See git history for changes.
