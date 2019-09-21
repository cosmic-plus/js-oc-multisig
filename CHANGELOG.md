**oc-multisig /**
[Readme](https://cosmic.plus/#view:js-oc-multisig)
• [Contributing](https://cosmic.plus/#view:js-oc-multisig/CONTRIBUTING)
• [Changelog](https://cosmic.plus/#view:js-oc-multisig/CHANGELOG)

# Changelog

All notable changes to this project will be documented in this file.

This project adheres to **[Semantic
Versioning](https://semver.org/spec/v2.0.0.html)**. Version syntax is
`{major}.{minor}.{patch}`, where a field bump means:

- **Patch**: The release contains bug fixes.
- **Minor**: The release contains backward-compatible changes.
- **Major**: The release contains compatibility-breaking changes.

**Remember:** Both micro and minor releases are guaranteed to respect
backward-compatibility and can be updated to without risk of breakage. For major
releases, please check this changelog before upgrading.

## 0.6.0 - 2019-09-21

### Changed

- API: Methods can optionally return unsigned tx. For any function that
  required a keypair, it is possible to pass a public key instead. In that case,
  the transaction that accomplishes the requested function is returned instead
  of signed & sent. The point of this is to handle cases where a transaction
  needs multiple signatures before being broadcasted. _Note: This was the
  behavior of the first oc-multisig releases, but was disabled at some point to
  simplify the API. However, this is still required in some cases._

### Fixed

- Logic: Fix a bug in pushTransaction(). There was a mistake in the code that
  caused signers other than the master key to share transactions with the wrong
  account.
- Meta: Update stellar-sdk to 3.x in bower package.

## 0.5.2 - 2019-08-31

### Changed

- Documentation: Update navigation header.

## 0.5.1 - 2019-08-17

### Fixed

- Doc: Generate CONTRIBUTING.html, remove duplicate title.

## 0.5.0 - 2019-08-10

### Added

- Add documentation header navigation.

### Fixed

- Make bundlers pick the transpiled code.

## 0.4.4 - 2019-07-26

### Changed

- Automate release procedure.
- Add contributing guidelines.
- Update depends (bugfixes, [stellar-sdk] 2.1.1).

## 0.4.3 - 2019-07-20

### Changed

- Switch to new cosmic.plus paths (cdn.cosmic.plus, new repository name).
- Improve discoverability (add badges, keywords, set homepage...).
- Rename bundle into "oc-multisig.js" for consistency. The old filename is still
  made available through a symbolic link.

## 0.4.2 - 2019-06-22

### Changed

- Update [@cosmic-plus/base] to 2.0.3. (Security fix)

## 0.4.1 - 2019-06-08

### Changed

- Make oc-multisig compatible with [stellar-sdk] 1.0.2 & protocol 11.

## 0.4.0 - 2019-04-26

### Added

- Bundle transpiled ES5 code within the package.

### Changed

- Update tests.

## 0.3.6 - 2019-02-09

### Security

- Get rid of minor vulnerability from lodash-4.17.0.

## 0.3.5 - 2019-02-01

### Changed

- Update [stellar-sdk] to 0.12.0.

## Older Releases

There is no changelog for older releases. Please look take a look at [commit
history](https://github.com/cosmic-plus/js-oc-multisig/commits/master).

[stellar-sdk]: https://github.com/stellar/js-stellar-sdk/blob/master/CHANGELOG.md
[@cosmic-plus/base]: https://github.com/cosmic-plus/js-base/blob/master/CHANGELOG.md
