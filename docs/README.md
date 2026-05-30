# Documentation

Complete API documentation for `@neabyte/superwatcher`.

## Modules

**[Superwatcher](Superwatcher.md)** - File watcher with debounced batch events, ignore filters, and write stability.

## Quick Reference

| Export           | Purpose                        | Usage                                     |
| ---------------- | ------------------------------ | ----------------------------------------- |
| `Superwatcher`   | File/directory watcher class   | `new Superwatcher(options)`               |
| `EventKind`      | Event type union               | `'create' \| 'modify' \| 'remove'`        |
| `WatchEvent`     | Single file change event       | `{ kind: EventKind, path: string }`       |
| `WatcherOptions` | Constructor options            | `{ path, debounceMs, onChange, ... }`     |
| `WriteStable`    | Write stability polling config | `{ threshold: number, interval: number }` |
| `IgnoreMatcher`  | Ignore filter type             | `string \| RegExp \| (path) => boolean`   |
