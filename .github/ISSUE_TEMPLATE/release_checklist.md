---
name: Release Checklist
about: Checklist for new releases
title: 'Release v0.1.0 Checklist'
labels: release
assignees: c0mpiler
---

## Release Preparation

- [ ] Version updated to v0.1.0 in `package.json`
- [ ] `CHANGELOG.md` includes all changes
- [ ] Documentation is up to date
- [ ] All tests pass
- [ ] No known critical issues

## Pre-Release Checks

- [ ] Verify production build works: `npm run build`
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Verify mobile responsiveness
- [ ] Check accessibility compliance
- [ ] Review security best practices

## Release Steps

- [ ] Create git tag: `git tag v0.1.0`
- [ ] Push tag: `git push origin v0.1.0`
- [ ] Create GitHub release
- [ ] Update documentation links
- [ ] Announce release

## Post-Release

- [ ] Monitor for user feedback
- [ ] Address any urgent issues
- [ ] Plan next release cycle

## Notes

- This is the first public beta release
- Focus on stability and user experience
- Gather community feedback for future improvements
