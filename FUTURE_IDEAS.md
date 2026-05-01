# CPAT Supervisory Tracker — Future Feature Ideas

## 1. Visual Design Improvements
General polish pass on the UI — typography upgrade, better stat cards, avatar initials, smoother transitions, etc.

## 2. Overdue indicator: only highlight the assigned person (may2026branch)
Currently, when a task on a shared matter is overdue, **all** staff members assigned to that matter have their name turn red in the top nav — even if the task is assigned to only one of them. Fix the overdue-highlight logic so a staff member's name turns red only if they have an overdue task that is assigned specifically to them or to "everyone", not if it's assigned exclusively to other people.

## 3. "DUE TODAY" / "DUE SOON" label wrapping (may2026branch)
After the font-size increases, the "DUE TODAY" and "DUE SOON" badges are breaking onto a second line (after "DUE") on some task entries. Adjust the badge width / white-space so these labels always render on a single line without a line break.
