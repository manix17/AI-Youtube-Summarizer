/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "jest-puppeteer",
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": "ts-jest",
    "^.+.jsx?$": "ts-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(marked)/)"
  ],
  moduleNameMapper: {
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@background/(.*)$": "<rootDir>/src/background/$1",
    "^@content/(.*)$": "<rootDir>/src/content/$1",
    "^@popup/(.*)$": "<rootDir>/src/popup/$1",
    "^@options/(.*)$": "<rootDir>/src/options/$1",
    "^@assets/(.*)$": "<rootDir>/src/assets/$1",
  },
  testMatch: [
    "<rootDir>/tests/**/*.test.ts"
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/assets/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/tests/helpers/setup.ts"],
};
