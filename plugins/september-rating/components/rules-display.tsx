"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Calculator, Trophy, Users, Filter, X } from "lucide-react"
import selectionRules from "../rules/selection-rules.json"

/**
 * Компонент отображения правил рейтинга
 * 
 * Показывает пользователям полную прозрачность:
 * - Правила выборки данных из форм Pyrus
 * - Исключения преподавателей
 * - Формулы расчетов
 * - Группировка и призы
 */
export function RulesDisplay() {
  const rules = selectionRules

  return (
    <div className="space-y-6">
      {/* Общая информация */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span>Общая информация</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Название</p>
              <p className="font-medium">{rules.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Автор</p>
              <p className="font-medium">{rules.author}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Обновлено</p>
              <p className="font-medium">{rules.updated}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Описание</p>
            <p className="font-medium">{rules.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Формы и фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-green-600" />
            <span>Источники данных и фильтры</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(rules.forms).map(([formKey, form]) => (
            <div key={formKey} className="space-y-3">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="font-mono">
                  {formKey}
                </Badge>
                <h4 className="font-semibold">{form.name}</h4>
              </div>
              
              <div className="space-y-2">
                {form.filters.map((filter, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      {filter.condition === 'включить' ? (
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant={filter.condition === 'включить' ? 'default' : 'destructive'}>
                          {filter.condition}
                        </Badge>
                        <span className="font-medium">{filter.field}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{filter.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {filter.values.map((value) => (
                          <Badge key={value} variant="secondary">
                            {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Исключения преподавателей */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-orange-600" />
            <span>Исключения преподавателей</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(rules.teacher_exclusions).map(([category, exclusion]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="capitalize">
                  {category === 'oldies' ? 'Старички' : 'Trial'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {exclusion.teachers.length} преподавателей
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{exclusion.reason}</p>
              <div className="flex flex-wrap gap-1">
                {exclusion.teachers.map((teacher) => (
                  <Badge key={teacher} variant="secondary">
                    {teacher}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Формулы расчетов */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            <span>Формулы расчетов</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(rules.calculations).map(([key, formula]) => (
            <div key={key} className="p-3 bg-muted/50 rounded-lg">
              <p className="font-mono text-sm">{formula}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Группы преподавателей и призы */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span>Группы преподавателей и призы</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(rules.teacher_groups).map(([groupKey, group]) => (
            <div key={groupKey} className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline" className="capitalize">
                    {groupKey === 'oldies' ? 'Старички' : 'Trial'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{group.description}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Сортировка:</strong> {group.sorting}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(group.groups).map(([range, details]) => (
                  <div key={range} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{details.emoji}</span>
                      <div>
                        <p className="font-semibold">{range} студентов</p>
                        <p className="text-sm text-muted-foreground">
                          {details.winners_count} победителей
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      {('prizes' in details) ? (
                        <div className="space-y-1">
                          {details.prizes.map((prize: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {index + 1} место: {prize}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="secondary">
                          {('prize' in details) ? details.prize : 'Приз не указан'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Призы филиалов */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            <span>Призы для филиалов</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{rules.branch_prizes.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {Object.entries(rules.branch_prizes.top_5).map(([place, prize]) => (
                <div key={place} className="p-3 border rounded-lg text-center">
                  <div className="text-2xl mb-1">
                    {place === '1' ? '🥇' : place === '2' ? '🥈' : place === '3' ? '🥉' : '🏅'}
                  </div>
                  <p className="font-semibold">{place} место</p>
                  <p className="text-sm text-muted-foreground">{prize}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
