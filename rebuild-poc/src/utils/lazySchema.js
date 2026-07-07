// Stub module: lazy zod-schema wrapper for the rebuild-poc POC.
// Mirrors the real `lazySchema(() => zodSchema)` indirection used by Droid's
// tool layer: returns a function that, when called, resolves the schema.
export function lazySchema(factory) {
  let _schema = null;
  const get = () => {
    if (_schema === null) _schema = factory();
    return _schema;
  };
  const fn = () => get();
  fn.parse = (input) => get().parse(input);
  fn.safeParse = (input) => get().safeParse(input);
  fn._def = { __lazy: true };
  return fn;
}
