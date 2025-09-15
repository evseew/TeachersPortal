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
  
  // Модуль маппинг для алиасов
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Трансформация файлов
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  
  // Игнорировать node_modules кроме некоторых пакетов
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
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
  
  // Настройка для TypeScript
  preset: 'ts-jest',
  
  // Глобальные настройки
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Моки для CSS и файлов
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  }
}

module.exports = config
