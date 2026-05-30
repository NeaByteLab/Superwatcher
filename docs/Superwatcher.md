# Superwatcher

File watcher with debounced batch events, ignore filters, and write stability polling.

## Table of Contents

- [Quick Start](#quick-start)
- [Creating a Watcher](#creating-a-watcher)
- [API Reference](#api-reference)
- [Types](#types)

## Quick Start

```typescript
import { Superwatcher } from '@neabyte/superwatcher'

const watcher = new Superwatcher({
  path: './src',
  debounceMs: 150,
  onChange: events => {
    for (const e of events) {
      console.log(`[${e.kind}] ${e.path}`)
    }
  }
})

watcher.start()
```

## Creating a Watcher

### `new Superwatcher(options: WatcherOptions)`

Creates a new watcher instance. All options are validated at construction and throw a descriptive `TypeError` on invalid input. Throws `Deno.errors.NotFound` if any path does not exist.

```typescript
// Watch a directory
const dirWatcher = new Superwatcher({
  path: './data',
  debounceMs: 100,
  onChange: events => console.log(events)
})

// Watch a specific file
const fileWatcher = new Superwatcher({
  path: './config.json',
  debounceMs: 50,
  onChange: events => console.log(events)
})

// Watch multiple paths
const multiWatcher = new Superwatcher({
  path: ['./src', './tests', './config.json'],
  debounceMs: 150,
  onChange: events => console.log(events)
})
```

### `WatcherOptions`

| Option        | Type                             | Default | Description                                                        |
| ------------- | -------------------------------- | ------- | ------------------------------------------------------------------ |
| `path`        | `string \| string[]`             | —       | File or directory path(s) to watch. Must exist at construction.    |
| `debounceMs`  | `number`                         | —       | Milliseconds to wait before flushing batched events. Must be >= 0. |
| `onChange`    | `(events: WatchEvent[]) => void` | —       | Callback invoked with batched events after debounce.               |
| `recursive`   | `boolean`                        | `true`  | Watch subdirectories. Ignored when watching specific files.        |
| `ignore`      | `IgnoreMatcher[]`                | —       | Array of matchers to filter out unwanted paths.                    |
| `writeStable` | `WriteStable`                    | —       | Poll file size to wait for writes to finish before emitting.       |

### With Ignore Filters

Ignore matchers support three forms: string suffix, RegExp, or custom function.

```typescript
const watcher = new Superwatcher({
  path: './project',
  debounceMs: 100,
  ignore: ['.tmp', /\.lock$/, path => path.includes('node_modules')],
  onChange: events => console.log(events)
})
```

> [!NOTE]
> String matchers check both `endsWith` and exact filename match. For example, `'.tmp'` ignores both `/data/cache.tmp` and a file literally named `.tmp`.

### With Write Stability

For large file uploads or slow writes, `writeStable` delays the event until the file size stops changing.

```typescript
const watcher = new Superwatcher({
  path: './uploads',
  debounceMs: 100,
  writeStable: {
    threshold: 500,
    interval: 50
  },
  onChange: events => {
    // Events fire only after file size is stable for 500ms
    for (const e of events) {
      console.log('Upload complete:', e.path)
    }
  }
})
```

### `WriteStable`

| Option      | Type     | Description                                                       |
| ----------- | -------- | ----------------------------------------------------------------- |
| `threshold` | `number` | Milliseconds the file size must remain unchanged. Must be > 0.    |
| `interval`  | `number` | Polling interval in milliseconds to check file size. Must be > 0. |

> [!NOTE]
> Write stability only applies to `create` and `modify` events. Remove events are emitted immediately without polling.

### Non-Recursive Watching

Disable subdirectory watching to only observe top-level changes.

```typescript
const watcher = new Superwatcher({
  path: './config',
  recursive: false,
  debounceMs: 50,
  onChange: events => console.log(events)
})
```

## API Reference

### `start(): void`

Begin watching the configured path(s). Safe to call multiple times — each call disposes the previous watcher before starting a new one.

```typescript
const watcher = new Superwatcher({
  path: './src',
  debounceMs: 100,
  onChange: events => console.log(events)
})

watcher.start()
```

> [!NOTE]
> If the watcher was constructed with an empty path array, `start()` is a no-op.

### `dispose(): void`

Stop watching and clean up all internal timers and resources. Safe to call multiple times or without calling `start()` first.

```typescript
const watcher = new Superwatcher({
  path: './src',
  debounceMs: 100,
  onChange: events => console.log(events)
})

watcher.start()

// Later: clean up
watcher.dispose()
```

A common pattern for graceful shutdown:

```typescript
Deno.addSignalListener('SIGINT', () => {
  watcher.dispose()
  Deno.exit(0)
})
```

## Types

### `WatchEvent`

Represents a single file system change event.

```typescript
interface WatchEvent {
  readonly kind: EventKind
  readonly path: string
}
```

### `EventKind`

The type of file system change.

```typescript
type EventKind = 'access' | 'create' | 'modify' | 'remove'
```

| Kind     | Description                         |
| -------- | ----------------------------------- |
| `create` | A new file or directory was created |
| `modify` | An existing file was modified       |
| `remove` | A file or directory was deleted     |

> [!NOTE]
> The `access` kind is defined in the type but never emitted by the watcher. Deno `access` and `other` events are filtered out internally.

### `IgnoreMatcher`

A filter to exclude paths from events. Three forms are supported:

```typescript
type IgnoreMatcher = string | RegExp | ((path: string) => boolean)
```

| Form       | Behavior                                                           |
| ---------- | ------------------------------------------------------------------ |
| `string`   | Matches if the path ends with the string or the filename equals it |
| `RegExp`   | Matches if `regex.test(path)` returns true                         |
| `function` | Matches if the function returns true for the path                  |

### Atomic Write Detection

When a file is deleted and recreated within the same debounce window (common in atomic save operations), the watcher resolves the event as `modify` instead of emitting a `remove` followed by a `create`.

```typescript
// Editor saves file atomically:
// 1. Delete original
// 2. Write new file

// Watcher emits:
// [{ kind: 'modify', path: '/project/file.ts' }]
// Not:
// [{ kind: 'remove', ... }, { kind: 'create', ... }]
```

### Error Isolation

Errors thrown inside `onChange` are silently caught. The watcher continues operating normally.

```typescript
const watcher = new Superwatcher({
  path: './src',
  debounceMs: 50,
  onChange: () => {
    throw new Error('handler crashed')
  }
})

watcher.start()
// Watcher keeps running despite the error
```
