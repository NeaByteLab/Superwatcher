export interface PendingEntry {
  kind: EventKind
  path: string
}

export interface WatchEvent {
  readonly kind: EventKind
  readonly path: string
}

export interface WatcherOptions {
  readonly debounceMs: number
  readonly ignore?: readonly IgnoreMatcher[]
  readonly onChange: (events: WatchEvent[]) => void
  readonly path: string | readonly string[]
  readonly recursive?: boolean
  readonly writeStable?: WriteStable
}

export interface WriteStable {
  readonly interval: number
  readonly threshold: number
}

export type EventKind = 'access' | 'create' | 'modify' | 'remove'

export type IgnoreMatcher = string | RegExp | ((path: string) => boolean)

export type IgnoreMatcherFn = (filePath: string) => boolean

export type TimerId = ReturnType<typeof setTimeout>
