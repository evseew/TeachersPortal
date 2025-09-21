/** @type {import('jest').Config} */
const config = {
  // Использовать jsdom для тестирования React компонентов
  testEnvironment: 'jsdom',
  
  // Настройка для Next.js
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Паттерны для поиска тестов
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}'
  ],
  
  // Настройка для TypeScript
  preset: 'ts-jest',
  
  // Трансформация файлов
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Игнорировать node_modules кроме некоторых пакетов
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Модуль маппинг для алиасов и моки для CSS
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Покрытие кода
  collectCoverageFrom: [
    'app/api/**/*.{js,ts}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  
  // Директория для отчетов о покрытии
  coverageDirectory: 'coverage',
  
  // Формат отчетов
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Пороги покрытия
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Глобальные настройки для ts-jest
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
}

module.exports = config