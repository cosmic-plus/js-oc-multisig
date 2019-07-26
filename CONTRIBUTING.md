# Contributing Guidelines

Welcome to new contributors! This project is open to input & edits.

## Bug Reports & Feature Requests

Please check the [dedicated form](https://github.com/cosmic-plus/js-oc-multisig/issues/new/choose).

## Pull Requests

1. Fork [js-oc-multisig](https://github.com/cosmic-plus/js-oc-multisig).
2. Commit your changes to the fork.
3. Create a pull request.

If you want to implement a new feature, please get in touch first:
[Keybase](https://keybase.io/team/cosmic_plus),
[Telegram](https://t.me/cosmic_plus), [Email](mailto:mister.ticot@cosmic.plus).

## Project Structure

- `es5/`: JS transpiled code (generated at build time, not commited).
- `src/`: JS source code.
- `test/`: Test suite.
- `web/`: JS bundled code (generated at build time, commited in a submodule).

## Workflow

**Clone:**

```
git clone https://git.cosmic.plus/js-oc-multisig
cd js-oc-multisig
npm run get
```

**Commit:**

```
npm run lint
git ci ...
```

Please sign your commits with your PGP key.

**Release:**

First of all update the package version into `package.json`.

```
export version={semver}
npm run make-release
npm run publish-release
```

Please sign your commits and tags with your PGP key.

## Scripts

Those helpers require a POSIX shell.

- `npm run get`: Fetch the `web` sub-repository.
- `npm run lint`: Lint code.
- `npm run build`: Build the transpiled code & the browser bundle.
- `npm run watch`: Automatically transpile & bundle code after each change.
- `npm run serve`: Run a live server that updates after each change.
- `version={semver} npm run make-release`: Build & locally commit release.
- `version={semver} npm run publish-release`: Check, tag, push & publish release.


