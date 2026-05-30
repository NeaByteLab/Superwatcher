<div align='center'>

# Superwatcher

Zero-dependency Deno file watcher with debounced batch event callbacks

[![Deno](https://img.shields.io/badge/deno-%3E%3D2.5.4-ffcb00?logo=deno&logoColor=000000)](https://deno.com) [![Module type: Deno/ESM](https://img.shields.io/badge/module%20type-deno%2Fesm-brightgreen)](https://github.com/NeaByteLab/Superwatcher) [![JSR](https://jsr.io/badges/@neabyte/superwatcher)](https://jsr.io/@neabyte/superwatcher) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

## Features

- **Zero dependencies** - No external packages, built entirely on Deno native file system APIs.
- **Debounced batch events** - Groups rapid file changes into one batched callback per flush cycle.
- **Ignore filters** - Skips unwanted paths using string suffix, RegExp, or custom function matchers.
- **Write stability** - Delays event emission until file size stops changing after large writes.
- **Atomic write detection** - Collapses delete-then-recreate within debounce window into single modify event.
- **Multi-path support** - Watches any combination of directories and individual files in one instance.
- **Recursive control** - Disables subdirectory watching when `recursive: false` is set on directories.
- **Error isolation** - Catches thrown errors inside `onChange` callback without stopping the watcher.

## Installation

> [!NOTE]
> **Prerequisites:** Deno >= 2.5.4 (install from [deno.com](https://deno.com/)).

**Deno (JSR):**

```bash
deno add jsr:@neabyte/superwatcher
```

Read [docs/README.md](docs/README.md) for full documentation.

## Testing

**Type check** - format, lint, and type-check:

```bash
deno task check
```

**Unit tests** - format/lint tests and run all tests:

```bash
deno task test
```

- Tests live under `tests/` (utils and watcher tests).
- The test task uses `--allow-read`, `--allow-write`, and `--allow-env`.

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for details.
