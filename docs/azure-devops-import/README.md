# Azure DevOps Wiki — Publish Instructions

**Status:** Living document
**Owner:** TBD
**Last Updated:** TBD

## Purpose

How to publish the AgroTrack wiki (stored at `/docs/wiki` in this repository) as an Azure DevOps Wiki using the "Publish code as Wiki" feature.

## Why publish from code

- Wiki content lives next to the code, version controlled.
- Pull requests can include wiki changes.
- We get a single source of truth across content and code.

## Prerequisites

- An Azure DevOps project for AgroTrack.
- The repository (`AgroTrack`) imported into Azure Repos, or visible to the same project.
- A branch with the latest `/docs/wiki` content (usually `main`).
- Permission to manage wikis in the Azure DevOps project (typically Project Administrator or equivalent).

## One-time publish steps

1. In Azure DevOps, open your project.
2. Go to **Overview → Wiki**.
3. Click **Publish code as wiki**.
4. Configure:
   - **Repository:** select the `AgroTrack` repository.
   - **Branch:** typically `main`.
   - **Folder:** `/docs/wiki`
   - **Wiki name:** `AgroTrack Wiki` (or similar).
5. Click **Publish**.
6. Azure DevOps will read the folder and render it as a wiki.

## How the structure maps

- Each folder under `/docs/wiki` becomes a section.
- Each `.md` file becomes a page.
- Each `.order` file controls the page order within its folder.
- The root `.order` at `/docs/wiki/.order` controls the top-level section order.
- The root `/docs/wiki/README.md` is the wiki's home page.

## Important conventions used in this repo

- **Spaces in folder names and filenames** are intentional (e.g. `00 Start Here`, `Welcome to AgroTrack.md`). Azure DevOps Wiki supports this and renders them as page titles.
- **`.order` files** list filenames without the `.md` extension, and folder names as-is. Each entry on its own line.
- **Numeric prefixes** on folders (e.g. `02 Business`) help readers see structure and also drive ordering as a fallback if `.order` is missing.
- **Links between pages** use relative paths with URL-encoded spaces (e.g. `./Welcome%20to%20AgroTrack.md`). These render correctly in Azure DevOps Wiki.

## Updating the wiki after publishing

- Edit Markdown files in this repo as normal.
- Commit and push to the configured branch.
- Azure DevOps automatically reflects the changes — no separate publish step needed.
- For best history, edit via pull requests when content is non-trivial.

## Adding new pages

1. Create the `.md` file in the appropriate folder under `/docs/wiki/`.
2. Add the filename (without `.md`) to that folder's `.order` file in the right position.
3. Commit and push.
4. The page appears in the wiki automatically.

## Adding new sections

1. Create a new folder under `/docs/wiki/`.
2. Add a `.order` file inside the new folder listing its pages.
3. Add the new folder name to the root `/docs/wiki/.order`.
4. Commit and push.

## Common pitfalls

- **Forgetting to update `.order`** — the page exists but doesn't appear, or appears in the wrong position.
- **Mismatched casing in `.order`** — Azure DevOps is case-sensitive; the entry must match the filename exactly minus `.md`.
- **Broken relative links** — when a page is moved, links to it must be updated. URL-encode spaces with `%20`.
- **Special characters** in filenames — stick to letters, numbers, spaces, hyphens.

## Unpublishing or re-publishing

- To stop publishing: in Azure DevOps Wiki settings, choose to unpublish the code wiki.
- To change the source folder or branch: unpublish and re-publish with new settings.

## Open Questions

- Do we also enable a separate "project wiki" (non-code) for ad-hoc notes?
- How do we handle wiki access permissions for external collaborators?

## Next Actions

- Publish the wiki for the first time in Sprint 0
- Add the published wiki URL to the README of this repo
