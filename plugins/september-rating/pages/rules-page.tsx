"use client"

import { RulesDisplay } from "../components/rules-display"

/**
 * Страница правил рейтинга September Rating
 * 
 * Отображает полную прозрачность правил выборки данных,
 * группировки преподавателей и расчета показателей
 */
export function RulesPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Правила сентябрьского рейтинга</h1>
        <p className="text-muted-foreground">
          Полная прозрачность правил выборки данных, исключений и расчетов показателей
        </p>
      </div>

      <RulesDisplay />
    </div>
  )
}
