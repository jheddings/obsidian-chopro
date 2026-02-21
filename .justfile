# justfile for obsidian-chopro

# run setup and preflight checks
default: setup preflight

# setup the local development environment
setup:
	npm install

# auto-format and lint-fix
tidy:
	npx prettier --write .
	npx eslint . --fix

# run format and lint checks (no fix)
check:
	npx prettier --check .
	npx eslint .

# run tests
test:
	npx jest test/*.test.ts

# full preflight: build + check + test
preflight: build
	npx prettier --check .
	npx eslint .
	npx jest test/*.test.ts

# build the plugin
build:
	npm run build

# verify no uncommitted changes to tracked files
repo-guard:
	test -z "$(git status --porcelain -uno)" || (echo "ERROR: working tree is dirty"; exit 1)

# bump version, commit, tag, and push
release bump="patch": preflight repo-guard
	#!/usr/bin/env bash
	npm version {{bump}} --no-git-tag-version
	VERSION=$(jq -r '.version' package.json)
	MIN_APP=$(jq -r '.minAppVersion' manifest.json)
	jq --arg v "$VERSION" '.version = $v' manifest.json > tmp.$$.json && mv tmp.$$.json manifest.json
	jq --arg v "$VERSION" --arg m "$MIN_APP" '. + {($v): $m}' versions.json > tmp.$$.json && mv tmp.$$.json versions.json
	npx prettier --write package.json package-lock.json manifest.json versions.json
	git add package.json package-lock.json manifest.json versions.json
	git commit -m "obsidian-chopro-$VERSION"
	git tag -a "$VERSION" -m "$VERSION"
	git push && git push --tags

# remove build artifacts
clean:
	rm -f main.js

# remove everything including dependencies
clobber: clean
	rm -rf node_modules
