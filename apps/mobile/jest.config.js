/** Tests unitaires de la logique métier (src/domain), sans dépendance à React Native. */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/domain/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node10',
          target: 'es2020',
          strict: true,
          esModuleInterop: true,
        },
      },
    ],
  },
};
