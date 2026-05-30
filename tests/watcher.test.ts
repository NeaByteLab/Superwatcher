import { assertEquals, assertThrows } from '@std/assert'
import { Superwatcher } from '@neabyte/superwatcher'
import type * as Types from '@app/types.ts'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const noLeaks = { sanitizeResources: false, sanitizeOps: false }

Deno.test(
  'Watcher - atomic write (remove + create) resolves as modify',
  noLeaks,
  async () => {
    const tmpDir = Deno.makeTempDirSync()
    Deno.writeTextFileSync(`${tmpDir}/atom.txt`, 'original')
    const events: Array<{ kind: string; path: string }> = []
    const watcher = new Superwatcher({
      path: tmpDir,
      debounceMs: 80,
      onChange: (evts) => {
        for (const e of evts) {
          events.push({ kind: e.kind, path: e.path })
        }
      }
    })
    watcher.start()
    await delay(50)
    Deno.removeSync(`${tmpDir}/atom.txt`)
    Deno.writeTextFileSync(`${tmpDir}/atom.txt`, 'replaced')
    await delay(250)
    watcher.dispose()
    const atomEvents = events.filter((e) => e.path.endsWith('/atom.txt'))
    assertEquals(
      atomEvents.some((e) => e.kind === 'remove'),
      false
    )
    Deno.removeSync(tmpDir, { recursive: true })
  }
)

Deno.test('Watcher - constructor accepts directory path', () => {
  const tmpDir = Deno.makeTempDirSync()
  const watcher = new Superwatcher({ path: tmpDir, debounceMs: 50, onChange: () => {} })
  watcher.dispose()
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - constructor accepts empty path array', () => {
  const watcher = new Superwatcher({ path: [], debounceMs: 50, onChange: () => {} })
  watcher.dispose()
})

Deno.test('Watcher - constructor accepts file path', () => {
  const tmpFile = Deno.makeTempFileSync()
  const watcher = new Superwatcher({ path: tmpFile, debounceMs: 50, onChange: () => {} })
  watcher.dispose()
  Deno.removeSync(tmpFile)
})

Deno.test('Watcher - constructor accepts multi-path array', () => {
  const tmpDir = Deno.makeTempDirSync()
  const tmpFile = Deno.makeTempFileSync()
  const watcher = new Superwatcher({
    path: [tmpDir, tmpFile],
    debounceMs: 50,
    onChange: () => {}
  })
  watcher.dispose()
  Deno.removeSync(tmpDir, { recursive: true })
  Deno.removeSync(tmpFile)
})

Deno.test('Watcher - constructor throws on invalid debounceMs', () => {
  assertThrows(
    () => new Superwatcher({ path: '/tmp', debounceMs: -1, onChange: () => {} }),
    TypeError,
    'debounceMs'
  )
})

Deno.test('Watcher - constructor throws on invalid onChange', () => {
  assertThrows(
    () =>
      new Superwatcher(
        { path: '/tmp', debounceMs: 50, onChange: 'nope' } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'onChange'
  )
})

Deno.test('Watcher - constructor throws on invalid path type', () => {
  assertThrows(
    () =>
      new Superwatcher(
        { path: 123, debounceMs: 50, onChange: () => {} } as unknown as Types.WatcherOptions
      ),
    TypeError,
    'non-empty string'
  )
})

Deno.test('Watcher - constructor throws on no arguments', () => {
  assertThrows(
    () => new (Superwatcher as unknown as new () => Superwatcher)(),
    TypeError,
    'options must be an object'
  )
})

Deno.test('Watcher - constructor throws on nonexistent path', () => {
  assertThrows(
    () => new Superwatcher({ path: '/nonexistent/path', debounceMs: 50, onChange: () => {} })
  )
})

Deno.test('Watcher - constructor throws on null options', () => {
  assertThrows(
    () => new Superwatcher(null as unknown as Types.WatcherOptions),
    TypeError,
    'options must be an object'
  )
})

Deno.test(
  'Watcher - debounce batches rapid events into fewer callbacks',
  noLeaks,
  async () => {
    const tmpDir = Deno.makeTempDirSync()
    let callbackCount = 0
    const watcher = new Superwatcher({
      path: tmpDir,
      debounceMs: 100,
      onChange: () => {
        callbackCount++
      }
    })
    watcher.start()
    await delay(50)
    for (let i = 0; i < 20; i++) {
      Deno.writeTextFileSync(`${tmpDir}/rapid_${i}.txt`, `data_${i}`)
    }
    await delay(300)
    watcher.dispose()
    assertEquals(callbackCount >= 1, true)
    assertEquals(callbackCount < 20, true)
    Deno.removeSync(tmpDir, { recursive: true })
  }
)

Deno.test(
  'Watcher - detects events in deeply nested directory',
  noLeaks,
  async () => {
    const tmpDir = Deno.makeTempDirSync()
    let deepPath = tmpDir
    for (let i = 0; i < 5; i++) {
      deepPath += `/level_${i}`
      Deno.mkdirSync(deepPath)
    }
    const events: string[] = []
    const watcher = new Superwatcher({
      path: tmpDir,
      debounceMs: 30,
      onChange: (evts) => {
        for (const e of evts) {
          events.push(e.path)
        }
      }
    })
    watcher.start()
    await delay(50)
    Deno.writeTextFileSync(`${deepPath}/deep.txt`, 'deep')
    await delay(200)
    watcher.dispose()
    assertEquals(
      events.some((e) => e.endsWith('/deep.txt')),
      true
    )
    Deno.removeSync(tmpDir, { recursive: true })
  }
)

Deno.test('Watcher - detects file creation', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  const events: Array<{ kind: string; path: string }> = []
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 30,
    onChange: (evts) => {
      for (const e of evts) {
        events.push({ kind: e.kind, path: e.path })
      }
    }
  })
  watcher.start()
  await delay(50)
  Deno.writeTextFileSync(`${tmpDir}/new.txt`, 'hello')
  await delay(150)
  watcher.dispose()
  assertEquals(events.length > 0, true)
  assertEquals(
    events.some((e) => e.path.endsWith('/new.txt')),
    true
  )
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - detects file modification', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  Deno.writeTextFileSync(`${tmpDir}/exist.txt`, 'original')
  const events: Array<{ kind: string; path: string }> = []
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 30,
    onChange: (evts) => {
      for (const e of evts) {
        events.push({ kind: e.kind, path: e.path })
      }
    }
  })
  watcher.start()
  await delay(50)
  Deno.writeTextFileSync(`${tmpDir}/exist.txt`, 'updated')
  await delay(150)
  watcher.dispose()
  assertEquals(events.length > 0, true)
  assertEquals(
    events.some((e) => e.path.endsWith('/exist.txt')),
    true
  )
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - detects file removal', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  Deno.writeTextFileSync(`${tmpDir}/del.txt`, 'bye')
  const events: Array<{ kind: string; path: string }> = []
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 50,
    onChange: (evts) => {
      for (const e of evts) {
        events.push({ kind: e.kind, path: e.path })
      }
    }
  })
  watcher.start()
  await delay(300)
  Deno.removeSync(`${tmpDir}/del.txt`)
  await delay(800)
  watcher.dispose()
  assertEquals(
    events.some((e) => e.kind === 'remove' && e.path.endsWith('/del.txt')),
    true
  )
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - dispose called multiple times is safe', noLeaks, () => {
  const tmpDir = Deno.makeTempDirSync()
  const watcher = new Superwatcher({ path: tmpDir, debounceMs: 50, onChange: () => {} })
  watcher.start()
  watcher.dispose()
  watcher.dispose()
  watcher.dispose()
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - dispose without start is safe', () => {
  const tmpDir = Deno.makeTempDirSync()
  const watcher = new Superwatcher({ path: tmpDir, debounceMs: 50, onChange: () => {} })
  watcher.dispose()
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test(
  'Watcher - file path only receives events for that file',
  noLeaks,
  async () => {
    const tmpDir = Deno.makeTempDirSync()
    const targetFile = `${tmpDir}/target.json`
    Deno.writeTextFileSync(targetFile, '{}')
    Deno.writeTextFileSync(`${tmpDir}/other.txt`, 'x')
    const events: string[] = []
    const watcher = new Superwatcher({
      path: targetFile,
      debounceMs: 30,
      onChange: (evts) => {
        for (const e of evts) {
          events.push(e.path)
        }
      }
    })
    watcher.start()
    await delay(50)
    Deno.writeTextFileSync(targetFile, '{"u":1}')
    Deno.writeTextFileSync(`${tmpDir}/other.txt`, 'noise')
    await delay(150)
    watcher.dispose()
    assertEquals(
      events.some((e) => e.endsWith('target.json')),
      true
    )
    assertEquals(
      events.some((e) => e.endsWith('other.txt')),
      false
    )
    Deno.removeSync(tmpDir, { recursive: true })
  }
)

Deno.test('Watcher - ignore function pattern filters events', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  const events: string[] = []
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 30,
    ignore: [(p: string) => p.includes('skipme')],
    onChange: (evts) => {
      for (const e of evts) {
        events.push(e.path)
      }
    }
  })
  watcher.start()
  await delay(50)
  Deno.writeTextFileSync(`${tmpDir}/ok.txt`, 'ok')
  Deno.writeTextFileSync(`${tmpDir}/skipme.txt`, 'no')
  await delay(150)
  watcher.dispose()
  assertEquals(
    events.some((e) => e.endsWith('/ok.txt')),
    true
  )
  assertEquals(
    events.some((e) => e.includes('skipme')),
    false
  )
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - ignore mixed matchers all applied', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  const events: string[] = []
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 30,
    ignore: ['.tmp', /\.lock$/, (p: string) => p.includes('skipme')],
    onChange: (evts) => {
      for (const e of evts) {
        events.push(e.path)
      }
    }
  })
  watcher.start()
  await delay(50)
  Deno.writeTextFileSync(`${tmpDir}/ok.txt`, 'ok')
  Deno.writeTextFileSync(`${tmpDir}/bad.tmp`, 'no')
  Deno.writeTextFileSync(`${tmpDir}/bad.lock`, 'no')
  Deno.writeTextFileSync(`${tmpDir}/skipme.txt`, 'no')
  await delay(150)
  watcher.dispose()
  assertEquals(
    events.some((e) => e.endsWith('/ok.txt')),
    true
  )
  const hasIgnored = events.some(
    (e) => e.endsWith('.tmp') || e.endsWith('.lock') || e.includes('skipme')
  )
  assertEquals(hasIgnored, false)
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - ignore regex pattern filters events', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  const events: string[] = []
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 30,
    ignore: [/\.lock$/],
    onChange: (evts) => {
      for (const e of evts) {
        events.push(e.path)
      }
    }
  })
  watcher.start()
  await delay(50)
  Deno.writeTextFileSync(`${tmpDir}/ok.txt`, 'ok')
  Deno.writeTextFileSync(`${tmpDir}/bad.lock`, 'no')
  await delay(150)
  watcher.dispose()
  assertEquals(
    events.some((e) => e.endsWith('/ok.txt')),
    true
  )
  assertEquals(
    events.some((e) => e.endsWith('.lock')),
    false
  )
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - ignore string pattern filters events', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  const events: string[] = []
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 30,
    ignore: ['.tmp'],
    onChange: (evts) => {
      for (const e of evts) {
        events.push(e.path)
      }
    }
  })
  watcher.start()
  await delay(50)
  Deno.writeTextFileSync(`${tmpDir}/ok.txt`, 'ok')
  Deno.writeTextFileSync(`${tmpDir}/bad.tmp`, 'no')
  await delay(150)
  watcher.dispose()
  assertEquals(
    events.some((e) => e.endsWith('/ok.txt')),
    true
  )
  assertEquals(
    events.some((e) => e.endsWith('.tmp')),
    false
  )
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - onChange throw does not crash the watcher', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  let callCount = 0
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 30,
    onChange: () => {
      callCount++
      throw new Error('boom')
    }
  })
  watcher.start()
  await delay(50)
  Deno.writeTextFileSync(`${tmpDir}/a.txt`, 'x')
  await delay(150)
  Deno.writeTextFileSync(`${tmpDir}/b.txt`, 'y')
  await delay(150)
  watcher.dispose()
  assertEquals(callCount >= 1, true)
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - rapid start calls do not crash', noLeaks, () => {
  const tmpDir = Deno.makeTempDirSync()
  const watcher = new Superwatcher({ path: tmpDir, debounceMs: 50, onChange: () => {} })
  for (let i = 0; i < 50; i++) {
    watcher.start()
  }
  watcher.dispose()
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - recursive false skips subdirectory events', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  Deno.mkdirSync(`${tmpDir}/sub`)
  const events: string[] = []
  const watcher = new Superwatcher({
    path: tmpDir,
    recursive: false,
    debounceMs: 30,
    onChange: (evts) => {
      for (const e of evts) {
        events.push(e.path)
      }
    }
  })
  watcher.start()
  await delay(50)
  Deno.writeTextFileSync(`${tmpDir}/top.txt`, 'ok')
  Deno.writeTextFileSync(`${tmpDir}/sub/nested.txt`, 'no')
  await delay(150)
  watcher.dispose()
  assertEquals(
    events.some((e) => e.endsWith('top.txt')),
    true
  )
  assertEquals(
    events.some((e) => e.endsWith('nested.txt')),
    false
  )
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - start then dispose then start again is safe', noLeaks, () => {
  const tmpDir = Deno.makeTempDirSync()
  const watcher = new Superwatcher({ path: tmpDir, debounceMs: 50, onChange: () => {} })
  watcher.start()
  watcher.dispose()
  watcher.start()
  watcher.dispose()
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - start with empty path array is a no-op', () => {
  const watcher = new Superwatcher({ path: [], debounceMs: 50, onChange: () => {} })
  watcher.start()
  watcher.dispose()
})

Deno.test('Watcher - stress test with 100 files', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  const events: Array<{ kind: string; path: string }> = []
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 100,
    onChange: (evts) => {
      for (const e of evts) {
        events.push({ kind: e.kind, path: e.path })
      }
    }
  })
  watcher.start()
  await delay(500)
  for (let i = 0; i < 100; i++) {
    Deno.writeTextFileSync(`${tmpDir}/s_${String(i).padStart(4, '0')}.txt`, `d_${i}`)
  }
  await delay(3000)
  watcher.dispose()
  assertEquals(events.length > 0, true)
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - stress test with 100 start-dispose cycles', noLeaks, () => {
  const tmpDir = Deno.makeTempDirSync()
  for (let i = 0; i < 100; i++) {
    const watcher = new Superwatcher({ path: tmpDir, debounceMs: 10, onChange: () => {} })
    watcher.start()
    watcher.dispose()
  }
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - stress test with 3 concurrent watchers', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 }
  const watchers = [0, 1, 2].map((i) =>
    new Superwatcher({
      path: tmpDir,
      debounceMs: 100,
      onChange: (evts) => {
        counts[i] = (counts[i] ?? 0) + evts.length
      }
    })
  )
  for (const watcher of watchers) {
    watcher.start()
  }
  await delay(500)
  for (let i = 0; i < 10; i++) {
    Deno.writeTextFileSync(`${tmpDir}/conc_${i}.txt`, `d_${i}`)
  }
  await delay(2000)
  for (const watcher of watchers) {
    watcher.dispose()
  }
  assertEquals(
    [0, 1, 2].every((i) => (counts[i] ?? 0) > 0),
    true
  )
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - writeStable does not delay remove events', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  Deno.writeTextFileSync(`${tmpDir}/del.txt`, 'bye')
  const events: Array<{ kind: string; path: string }> = []
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 50,
    writeStable: { threshold: 500, interval: 50 },
    onChange: (evts) => {
      for (const e of evts) {
        events.push({ kind: e.kind, path: e.path })
      }
    }
  })
  watcher.start()
  await delay(300)
  Deno.removeSync(`${tmpDir}/del.txt`)
  await delay(800)
  watcher.dispose()
  assertEquals(
    events.some((e) => e.kind === 'remove' && e.path.endsWith('/del.txt')),
    true
  )
  Deno.removeSync(tmpDir, { recursive: true })
})

Deno.test('Watcher - writeStable waits for file size stability', noLeaks, async () => {
  const tmpDir = Deno.makeTempDirSync()
  const stableFile = `${tmpDir}/growing.bin`
  const events: string[] = []
  const watcher = new Superwatcher({
    path: tmpDir,
    debounceMs: 50,
    writeStable: { threshold: 200, interval: 50 },
    onChange: (evts) => {
      for (const e of evts) {
        events.push(e.path)
      }
    }
  })
  watcher.start()
  await delay(50)
  Deno.writeTextFileSync(stableFile, 'a'.repeat(100))
  await delay(30)
  Deno.writeTextFileSync(stableFile, 'a'.repeat(500))
  await delay(30)
  Deno.writeTextFileSync(stableFile, 'a'.repeat(1000))
  await delay(500)
  watcher.dispose()
  assertEquals(
    events.filter((e) => e.endsWith('growing.bin')).length >= 1,
    true
  )
  Deno.removeSync(tmpDir, { recursive: true })
})
