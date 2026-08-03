# Triage Labels

Canonical triage roles mapped to label strings in this repo's issue tracker.

| Role | Label string | Meaning |
|------|--------------|---------|
| needs-triage | `needs-triage` | Maintainer needs to evaluate this issue |
| needs-info | `needs-info` | Waiting on reporter for more information |
| ready-for-agent | `ready-for-agent` | Fully specified, ready for an AFK agent |
| ready-for-human | `ready-for-human` | Requires human implementation |
| wontfix | `wontfix` | Will not be actioned |

Optional labels this backend may also use:

| Label | Meaning |
|-------|---------|
| `api` | Touches HTTP surface / public contract |
| `persistence` | Database / storage work |
| `media` | Image upload/storage pipeline |
| `auth` | Authentication / authorization |
| `bug` | Defect |
| `enhancement` | Feature or improvement |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from the first table.

Edit the right-hand column if the remote tracker uses different names.
