import type * as Types from '@app/types.ts'

/**
 * Internal utility methods.
 * @description Provides validation, normalization, and event resolution.
 */
export class Utils {
  /** Allowed file system event kinds */
  private static readonly validEventKinds = new Set<Types.EventKind>([
    'access',
    'create',
    'modify',
    'remove'
  ])

  /**
   * Extract file name from path.
   * @description Returns substring after the last slash separator.
   * @param filePath - Full file path
   * @returns File name portion of the path
   */
  static baseName(filePath: string): string {
    return filePath.slice(filePath.lastIndexOf('/') + 1)
  }

  /**
   * Normalize path separators to forward slashes.
   * @description Replaces backslashes and collapses duplicate slashes.
   * @param filePath - Raw file path to normalize
   * @returns Normalized path with forward slashes
   */
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

  /**
   * Map raw event kind to EventKind.
   * @description Filters access/other and maps unknown to modify.
   * @param raw - Raw event kind string from Deno
   * @returns Resolved EventKind or null if filtered
   */
  static resolveEventKind(raw: string): Types.EventKind | null {
    if (raw === 'access' || raw === 'other') {
      return null
    }
    if (Utils.validEventKinds.has(raw as Types.EventKind)) {
      return raw as Types.EventKind
    }
    return 'modify'
  }

  /**
   * Validate all watcher options.
   * @description Checks types and constraints for every option field.
   * @param options - Watcher options to validate
   * @throws TypeError if any option is invalid
   */
  static validateOptions(options: Types.WatcherOptions): void {
    if (typeof options !== 'object' || options === null) {
      throw new TypeError(`Expected options to be an object but received ${typeof options}`)
    }
    Utils.validatePath(options.path)
    Utils.validateDebounceMs(options.debounceMs)
    if (typeof options.onChange !== 'function') {
      throw new TypeError(
        `Expected onChange to be a function but received ${typeof options.onChange}`
      )
    }
    if (options.recursive !== undefined && typeof options.recursive !== 'boolean') {
      throw new TypeError(
        `Expected recursive to be a boolean but received ${typeof options.recursive}`
      )
    }
    if (options.ignore !== undefined) {
      Utils.validateIgnore(options.ignore)
    }
    if (options.writeStable !== undefined) {
      Utils.validateWriteStable(options.writeStable)
    }
  }

  /**
   * Validate debounceMs value.
   * @description Ensures debounceMs is a finite non-negative number.
   * @param debounceMs - Value to validate
   * @throws TypeError if debounceMs is invalid
   */
  private static validateDebounceMs(debounceMs: unknown): void {
    if (typeof debounceMs !== 'number' || !Number.isFinite(debounceMs) || debounceMs < 0) {
      throw new TypeError(
        `Expected debounceMs to be a finite number >= 0 but received ${debounceMs}`
      )
    }
  }

  /**
   * Validate ignore array entries.
   * @description Checks each entry is string, RegExp, or function.
   * @param ignore - Ignore matchers array to validate
   * @throws TypeError if ignore or entries are invalid
   */
  private static validateIgnore(ignore: unknown): void {
    if (!Array.isArray(ignore)) {
      throw new TypeError(`Expected ignore to be an array but received ${typeof ignore}`)
    }
    for (let i = 0; i < ignore.length; i++) {
      const matcher = ignore[i]
      const isValid = typeof matcher === 'string' ||
        matcher instanceof RegExp ||
        typeof matcher === 'function'
      if (!isValid) {
        throw new TypeError(
          `Expected ignore[${i}] to be a string, RegExp, or function but received ${typeof matcher}`
        )
      }
    }
  }

  /**
   * Validate path option value.
   * @description Ensures path is a non-empty string or string array.
   * @param path - Path value to validate
   * @throws TypeError if path is invalid
   */
  private static validatePath(path: unknown): void {
    if (Array.isArray(path)) {
      for (let i = 0; i < path.length; i++) {
        if (typeof path[i] !== 'string' || (path[i] as string).trim() === '') {
          throw new TypeError(
            `Expected path[${i}] to be a non-empty string but received ${typeof path[i]}`
          )
        }
      }
      return
    }
    if (typeof path !== 'string' || path.trim() === '') {
      throw new TypeError(
        `Expected path to be a non-empty string or string[] but received ${typeof path}`
      )
    }
  }

  /**
   * Validate writeStable option value.
   * @description Checks threshold and interval are positive finite numbers.
   * @param writeStable - WriteStable config to validate
   * @throws TypeError if writeStable fields are invalid
   */
  private static validateWriteStable(writeStable: unknown): void {
    if (typeof writeStable !== 'object' || writeStable === null) {
      throw new TypeError(`Expected writeStable to be an object but received ${typeof writeStable}`)
    }
    const { threshold, interval } = writeStable as Types.WriteStable
    if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold <= 0) {
      throw new TypeError(
        `Expected writeStable.threshold to be a finite number > 0 but received ${threshold}`
      )
    }
    if (typeof interval !== 'number' || !Number.isFinite(interval) || interval <= 0) {
      throw new TypeError(
        `Expected writeStable.interval to be a finite number > 0 but received ${interval}`
      )
    }
  }
}
