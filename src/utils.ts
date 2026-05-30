import type * as Types from '@app/types.ts'

export class Utils {
  private static readonly validEventKinds = new Set<Types.EventKind>([
    'access',
    'create',
    'modify',
    'remove'
  ])
  static baseName(filePath: string): string {
    return filePath.slice(filePath.lastIndexOf('/') + 1)
  }

  static normalize(filePath: string): string {
    if (filePath === '') {
      return ''
    }
    const isNetworkPath = filePath.startsWith('\\\\') || filePath.startsWith('//')
    let normalized = filePath.replaceAll('\\', '/')
    normalized = normalized.replace(/\/+/g, '/')
    if (isNetworkPath && !normalized.startsWith('//')) {
      normalized = `/${normalized}`
    }
    return normalized
  }

  static resolveEventKind(raw: string): Types.EventKind | null {
    if (raw === 'access' || raw === 'other') {
      return null
    }
    if (Utils.validEventKinds.has(raw as Types.EventKind)) {
      return raw as Types.EventKind
    }
    return 'modify'
  }

  static validateOptions(options: Types.WatcherOptions): void {
    if (typeof options !== 'object' || options === null) {
      throw new TypeError('options must be an object')
    }
    Utils.validatePath(options.path)
    Utils.validateDebounceMs(options.debounceMs)
    if (typeof options.onChange !== 'function') {
      throw new TypeError('onChange must be a function')
    }
    if (options.recursive !== undefined && typeof options.recursive !== 'boolean') {
      throw new TypeError('recursive must be a boolean')
    }
    if (options.ignore !== undefined) {
      Utils.validateIgnore(options.ignore)
    }
    if (options.writeStable !== undefined) {
      Utils.validateWriteStable(options.writeStable)
    }
  }

  private static validateDebounceMs(debounceMs: unknown): void {
    if (typeof debounceMs !== 'number' || !Number.isFinite(debounceMs) || debounceMs < 0) {
      throw new TypeError('debounceMs must be a finite number >= 0')
    }
  }

  private static validateIgnore(ignore: unknown): void {
    if (!Array.isArray(ignore)) {
      throw new TypeError('ignore must be an array')
    }
    for (let i = 0; i < ignore.length; i++) {
      const matcher = ignore[i]
      const isValid = typeof matcher === 'string' ||
        matcher instanceof RegExp ||
        typeof matcher === 'function'
      if (!isValid) {
        throw new TypeError(`ignore[${i}] must be a string, RegExp, or function`)
      }
    }
  }

  private static validatePath(path: unknown): void {
    if (Array.isArray(path)) {
      for (let i = 0; i < path.length; i++) {
        if (typeof path[i] !== 'string' || (path[i] as string).trim() === '') {
          throw new TypeError(`path[${i}] must be a non-empty string`)
        }
      }
      return
    }
    if (typeof path !== 'string' || path.trim() === '') {
      throw new TypeError('path must be a non-empty string or string[]')
    }
  }

  private static validateWriteStable(writeStable: unknown): void {
    if (typeof writeStable !== 'object' || writeStable === null) {
      throw new TypeError('writeStable must be an object')
    }
    const { threshold, interval } = writeStable as Types.WriteStable
    if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold <= 0) {
      throw new TypeError('writeStable.threshold must be a finite number > 0')
    }
    if (typeof interval !== 'number' || !Number.isFinite(interval) || interval <= 0) {
      throw new TypeError('writeStable.interval must be a finite number > 0')
    }
  }
}
