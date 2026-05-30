import { assertEquals, assertThrows } from '@std/assert'
import { Utils } from '@app/utils.ts'
import type * as Types from '@app/types.ts'

Deno.test('Utils - baseName extracts filename from path', () => {
  assertEquals(Utils.baseName('/a/b/c.txt'), 'c.txt')
})

Deno.test('Utils - baseName handles deep nested path', () => {
  assertEquals(Utils.baseName('/a/b/c/d/e/f/g.ts'), 'g.ts')
})

Deno.test('Utils - baseName handles dotfiles', () => {
  assertEquals(Utils.baseName('/home/user/.gitignore'), '.gitignore')
})

Deno.test('Utils - baseName handles empty string', () => {
  assertEquals(Utils.baseName(''), '')
})

Deno.test('Utils - baseName handles root path', () => {
  assertEquals(Utils.baseName('/'), '')
})

Deno.test('Utils - baseName returns empty string for trailing slash', () => {
  assertEquals(Utils.baseName('/a/b/'), '')
})

Deno.test('Utils - baseName returns full string when no separator', () => {
  assertEquals(Utils.baseName('file.txt'), 'file.txt')
})

Deno.test('Utils - normalize collapses multiple slashes', () => {
  assertEquals(Utils.normalize('a///b//c'), 'a/b/c')
})

Deno.test('Utils - normalize converts backslashes to forward slashes', () => {
  assertEquals(Utils.normalize('a\\b\\c'), 'a/b/c')
})

Deno.test('Utils - normalize handles mixed separators', () => {
  assertEquals(Utils.normalize('a\\b/c\\d/e'), 'a/b/c/d/e')
})

Deno.test('Utils - normalize handles no slashes', () => {
  assertEquals(Utils.normalize('file.txt'), 'file.txt')
})

Deno.test('Utils - normalize handles single slash', () => {
  assertEquals(Utils.normalize('/'), '/')
})

Deno.test('Utils - normalize preserves forward slash network path', () => {
  assertEquals(Utils.normalize('//server/share'), '//server/share')
})

Deno.test('Utils - normalize preserves network path prefix', () => {
  assertEquals(Utils.normalize('\\\\server\\share'), '//server/share')
})

Deno.test('Utils - normalize returns empty for empty string', () => {
  assertEquals(Utils.normalize(''), '')
})

Deno.test('Utils - resolveEventKind returns create for create', () => {
  assertEquals(Utils.resolveEventKind('create'), 'create')
})

Deno.test('Utils - resolveEventKind returns modify for any', () => {
  assertEquals(Utils.resolveEventKind('any'), 'modify')
})

Deno.test('Utils - resolveEventKind returns modify for empty string', () => {
  assertEquals(Utils.resolveEventKind(''), 'modify')
})

Deno.test('Utils - resolveEventKind returns modify for garbage string', () => {
  assertEquals(Utils.resolveEventKind('xyzzy'), 'modify')
})

Deno.test('Utils - resolveEventKind returns modify for modify', () => {
  assertEquals(Utils.resolveEventKind('modify'), 'modify')
})

Deno.test('Utils - resolveEventKind returns modify for unknown kind', () => {
  assertEquals(Utils.resolveEventKind('rename'), 'modify')
})

Deno.test('Utils - resolveEventKind returns null for access', () => {
  assertEquals(Utils.resolveEventKind('access'), null)
})

Deno.test('Utils - resolveEventKind returns null for other', () => {
  assertEquals(Utils.resolveEventKind('other'), null)
})

Deno.test('Utils - resolveEventKind returns remove for remove', () => {
  assertEquals(Utils.resolveEventKind('remove'), 'remove')
})

Deno.test('Utils - validateOptions accepts boolean recursive', () => {
  Utils.validateOptions({ path: '/tmp', debounceMs: 50, onChange: () => {}, recursive: false })
  Utils.validateOptions({ path: '/tmp', debounceMs: 50, onChange: () => {}, recursive: true })
})

Deno.test('Utils - validateOptions accepts debounceMs zero', () => {
  Utils.validateOptions({ path: '/tmp', debounceMs: 0, onChange: () => {} })
})

Deno.test('Utils - validateOptions accepts empty ignore array', () => {
  Utils.validateOptions({
    path: '/tmp',
    debounceMs: 50,
    onChange: () => {},
    ignore: []
  })
})

Deno.test('Utils - validateOptions accepts empty path array', () => {
  Utils.validateOptions({ path: [], debounceMs: 50, onChange: () => {} })
})

Deno.test('Utils - validateOptions accepts full valid options', () => {
  Utils.validateOptions({
    path: ['/tmp', '/var'],
    debounceMs: 100,
    onChange: () => {},
    recursive: false,
    ignore: ['.tmp', /\.lock$/],
    writeStable: { threshold: 200, interval: 50 }
  })
})

Deno.test('Utils - validateOptions accepts minimal valid options', () => {
  Utils.validateOptions({ path: '/tmp', debounceMs: 0, onChange: () => {} })
})

Deno.test('Utils - validateOptions accepts undefined recursive', () => {
  Utils.validateOptions({ path: '/tmp', debounceMs: 50, onChange: () => {} })
})

Deno.test('Utils - validateOptions accepts valid ignore array', () => {
  Utils.validateOptions({
    path: '/tmp',
    debounceMs: 50,
    onChange: () => {},
    ignore: ['.tmp', /\.lock$/, (p: string) => p.includes('skip')]
  })
})

Deno.test('Utils - validateOptions accepts valid writeStable', () => {
  Utils.validateOptions({
    path: '/tmp',
    debounceMs: 50,
    onChange: () => {},
    writeStable: { threshold: 200, interval: 50 }
  })
})

Deno.test('Utils - validateOptions throws on Infinity debounceMs', () => {
  assertThrows(
    () => Utils.validateOptions({ path: '/tmp', debounceMs: Infinity, onChange: () => {} }),
    TypeError,
    'debounceMs'
  )
})

Deno.test('Utils - validateOptions throws on NaN debounceMs', () => {
  assertThrows(
    () => Utils.validateOptions({ path: '/tmp', debounceMs: NaN, onChange: () => {} }),
    TypeError,
    'debounceMs'
  )
})

Deno.test('Utils - validateOptions throws on NaN threshold', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: { threshold: NaN, interval: 50 }
      }),
    TypeError,
    'threshold'
  )
})

Deno.test('Utils - validateOptions throws on empty path string', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: '', debounceMs: 50, onChange: () => {} } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'non-empty string'
  )
})

Deno.test('Utils - validateOptions throws on empty writeStable object', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: {}
      } as unknown as Types.WatcherOptions),
    TypeError,
    'threshold'
  )
})

Deno.test('Utils - validateOptions throws on ignore array with boolean', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        ignore: [true]
      } as unknown as Types.WatcherOptions),
    TypeError,
    'ignore[0]'
  )
})

Deno.test('Utils - validateOptions throws on ignore array with null', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        ignore: [null]
      } as unknown as Types.WatcherOptions),
    TypeError,
    'ignore[0]'
  )
})

Deno.test('Utils - validateOptions throws on ignore array with number', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        ignore: [123]
      } as unknown as Types.WatcherOptions),
    TypeError,
    'ignore[0]'
  )
})

Deno.test('Utils - validateOptions throws on ignore array with object', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        ignore: [{ pattern: '.tmp' }]
      } as unknown as Types.WatcherOptions),
    TypeError,
    'ignore[0]'
  )
})

Deno.test('Utils - validateOptions throws on negative debounceMs', () => {
  assertThrows(
    () => Utils.validateOptions({ path: '/tmp', debounceMs: -1, onChange: () => {} }),
    TypeError,
    'debounceMs'
  )
})

Deno.test('Utils - validateOptions throws on negative interval', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: { threshold: 200, interval: -10 }
      }),
    TypeError,
    'interval'
  )
})

Deno.test('Utils - validateOptions throws on negative threshold', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: { threshold: -1, interval: 50 }
      }),
    TypeError,
    'threshold'
  )
})

Deno.test('Utils - validateOptions throws on nested array path', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: [['/tmp']], debounceMs: 50, onChange: () => {} } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'path[0]'
  )
})

Deno.test('Utils - validateOptions throws on null interval', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: { threshold: 200, interval: null }
      } as unknown as Types.WatcherOptions),
    TypeError,
    'interval'
  )
})

Deno.test('Utils - validateOptions throws on null onChange', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: '/tmp', debounceMs: 50, onChange: null } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'onChange'
  )
})

Deno.test('Utils - validateOptions throws on null options', () => {
  assertThrows(
    () => Utils.validateOptions(null as unknown as Types.WatcherOptions),
    TypeError,
    'Expected options to be an object'
  )
})

Deno.test('Utils - validateOptions throws on null path', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: null, debounceMs: 50, onChange: () => {} } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'non-empty string'
  )
})

Deno.test('Utils - validateOptions throws on null recursive', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        recursive: null
      } as unknown as Types.WatcherOptions),
    TypeError,
    'recursive'
  )
})

Deno.test('Utils - validateOptions throws on null writeStable', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: null
      } as unknown as Types.WatcherOptions),
    TypeError,
    'Expected writeStable to be an object'
  )
})

Deno.test('Utils - validateOptions throws on number ignore', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        ignore: 42
      } as unknown as Types.WatcherOptions),
    TypeError,
    'Expected ignore to be an array'
  )
})

Deno.test('Utils - validateOptions throws on number onChange', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: '/tmp', debounceMs: 50, onChange: 42 } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'onChange'
  )
})

Deno.test('Utils - validateOptions throws on number options', () => {
  assertThrows(
    () => Utils.validateOptions(42 as unknown as Types.WatcherOptions),
    TypeError,
    'Expected options to be an object'
  )
})

Deno.test('Utils - validateOptions throws on number recursive', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        recursive: 1
      } as unknown as Types.WatcherOptions),
    TypeError,
    'recursive'
  )
})

Deno.test('Utils - validateOptions throws on number writeStable', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: 500
      } as unknown as Types.WatcherOptions),
    TypeError,
    'Expected writeStable to be an object'
  )
})

Deno.test('Utils - validateOptions throws on numeric path', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: 123, debounceMs: 50, onChange: () => {} } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'non-empty string'
  )
})

Deno.test('Utils - validateOptions throws on object onChange', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: '/tmp', debounceMs: 50, onChange: {} } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'onChange'
  )
})

Deno.test('Utils - validateOptions throws on path array with empty string', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        {
          path: ['/tmp', ''],
          debounceMs: 50,
          onChange: () => {}
        } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'path[1]'
  )
})

Deno.test('Utils - validateOptions throws on path array with null', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: [null], debounceMs: 50, onChange: () => {} } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'path[0]'
  )
})

Deno.test('Utils - validateOptions throws on path array with number', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: [123], debounceMs: 50, onChange: () => {} } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'path[0]'
  )
})

Deno.test('Utils - validateOptions throws on string debounceMs', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: '/tmp', debounceMs: '50', onChange: () => {} } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'debounceMs'
  )
})

Deno.test('Utils - validateOptions throws on string ignore', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        ignore: '.tmp'
      } as unknown as Types.WatcherOptions),
    TypeError,
    'Expected ignore to be an array'
  )
})

Deno.test('Utils - validateOptions throws on string onChange', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: '/tmp', debounceMs: 50, onChange: 'callback' } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'onChange'
  )
})

Deno.test('Utils - validateOptions throws on string options', () => {
  assertThrows(
    () => Utils.validateOptions('watch' as unknown as Types.WatcherOptions),
    TypeError,
    'Expected options to be an object'
  )
})

Deno.test('Utils - validateOptions throws on string recursive', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        recursive: 'true'
      } as unknown as Types.WatcherOptions),
    TypeError,
    'recursive'
  )
})

Deno.test('Utils - validateOptions throws on string threshold', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: { threshold: '200', interval: 50 }
      } as unknown as Types.WatcherOptions),
    TypeError,
    'threshold'
  )
})

Deno.test('Utils - validateOptions throws on string writeStable', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: 'fast'
      } as unknown as Types.WatcherOptions),
    TypeError,
    'Expected writeStable to be an object'
  )
})

Deno.test('Utils - validateOptions throws on undefined debounceMs', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        {
          path: '/tmp',
          debounceMs: undefined,
          onChange: () => {}
        } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'debounceMs'
  )
})

Deno.test('Utils - validateOptions throws on undefined options', () => {
  assertThrows(
    () => Utils.validateOptions(undefined as unknown as Types.WatcherOptions),
    TypeError,
    'Expected options to be an object'
  )
})

Deno.test('Utils - validateOptions throws on whitespace-only path', () => {
  assertThrows(
    () =>
      Utils.validateOptions(
        { path: '   ', debounceMs: 50, onChange: () => {} } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'non-empty string'
  )
})

Deno.test('Utils - validateOptions throws on zero interval', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: { threshold: 200, interval: 0 }
      }),
    TypeError,
    'interval'
  )
})

Deno.test('Utils - validateOptions throws on zero threshold', () => {
  assertThrows(
    () =>
      Utils.validateOptions({
        path: '/tmp',
        debounceMs: 50,
        onChange: () => {},
        writeStable: { threshold: 0, interval: 50 }
      }),
    TypeError,
    'threshold'
  )
})
