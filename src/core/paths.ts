// Shared path parsing for the test-module layout.

export function moduleIdFromPath(path: string): string {
  const id = path.split('/')[2]
  if (!id) {
    throw new Error(`Cannot derive module id from path: ${path}`)
  }
  return id
}
