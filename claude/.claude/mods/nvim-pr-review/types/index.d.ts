/** Per `<repo>@<branch>`: each changed path's fingerprint (hash of its diff vs base) at the last review. */
export type Fingerprints = Record<string, Record<string, string>>
/** Per `<repo>@<branch>`: the tree the user approved, so committing their edits doesn't re-trigger a review. */
export type Approved = Record<string, string>

declare module 'claude-code' {
  interface PluginState {
    'nvim-pr-review': { prGate: boolean; perEdit: boolean; reviewed: Fingerprints; approved: Approved }
  }
}
