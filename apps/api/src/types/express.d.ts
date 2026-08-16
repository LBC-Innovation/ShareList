// The export {} makes this a module, so declare module augments rather than replaces.
// Using express-serve-static-core (the interface Request actually extends) ensures
// ts-node resolves req.user at runtime, not just tsc.
export {}

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string
      email: string
      role: string
      amr: string[] | null
      permissions: string[]
    }
  }
}
