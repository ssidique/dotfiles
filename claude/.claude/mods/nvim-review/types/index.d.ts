export type Marker = { file: string; line: number; text: string; code: string }

declare module 'claude-code' {
  interface PluginState {
    'nvim-review': { markers: Marker[] }
  }
}
