# Release Procedure

## 1. Prepare the Release

```bash
# Ensure on main and up to date
git checkout main && git pull

# Bump version
echo "0.2.0" > VERSION

# Update CHANGELOG.md (auto-generate from commits)
make changelog

# Commit
git add VERSION CHANGELOG.md
git commit -m "chore(release): prepare v0.2.0"
git push
```

## 2. Tag and Release

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push --tags
```

The CI release pipeline will:
- Run full test suite (unit, integration, E2E)
- Build probe binaries (ARM64, AMD64) and Docker images
- Push Docker images to registry
- Create GitHub Release with binaries and changelog
- Update probe firmware repository for OTA updates

## 3. Verify
- Deploy to staging environment: `make staging-deploy`
- Run smoke tests
- Verify health endpoints

## 4. Announce
- Update release notes in `docs/releases/release-notes/v0.2.0.md`
- Notify customers via email (for SaaS) or provide download links (for on-prem)

## Rollback
If a critical issue is found:
- Revert the merge or create a fix-forward patch.
- For on-prem customers: provide previous binary version.
- For SaaS: redeploy previous Docker image tag.

