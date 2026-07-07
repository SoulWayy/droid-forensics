// Local indirection that re-exports the `ink` terminal UI library for the POC.
// In the real Droid this wraps Ink with custom renderers; here we pass the
// package through so JSX-based tool UIs can import { ... } from 'src/ink.js'.
export * from "ink";
