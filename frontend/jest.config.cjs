module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        diagnostics: {
          ignoreCodes: [1343]
        },
        astTransformers: {
          before: [
            'ts-jest-mock-import-meta'
          ]
        }
      }
    ],
  },
};
