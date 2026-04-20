# CPAT Supervisory Tracker — Future Feature Ideas

## 1. Staff Accomplishments Tracker
Add a section at the bottom of each staff member's task list to record overall progress and notable accomplishments — not a checklist, but a running log. Potential metrics to track:
- Completed settlements
- CIDs sent
- Revenue generated
- Other notable accomplishments

Should be a persistent, editable record per staff member (similar to how Status Notes works, but structured around key performance metrics rather than free-form notes).

## 3. Per-Person Matter Ordering on Shared Matters
Currently, moving a shared matter up/down changes its global `order` field on the matter document, so the reordering affects all staff members who share that matter. Instead, each staff member should have their own independent ordering for matters on their page.

Implementation approach: store a `matterOrder` map on each attorney document (e.g. `{ matterId: position }`), seed it from the current global order on first use, and have `moveMatter()` write to the attorney document instead of the matter document.

## 2. Visual Design Improvements
General polish pass on the UI — typography upgrade, better stat cards, avatar initials, smoother transitions, etc.
