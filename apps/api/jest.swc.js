/**
 * SWC transform options shared by the unit and integration Jest configs.
 *
 * SWC is used instead of ts-jest because it is far faster, and instead of
 * esbuild because esbuild cannot emit the decorator metadata that NestJS
 * dependency injection relies on.
 */

/** @type {import('@swc/core').Options} */
const swcOptions = {
  jsc: {
    parser: { syntax: 'typescript', decorators: true },
    transform: { legacyDecorator: true, decoratorMetadata: true },
    target: 'es2023',
    keepClassNames: true,
  },
  module: { type: 'commonjs' },
  sourceMaps: true,
};

module.exports = swcOptions;
