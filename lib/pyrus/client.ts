/**
 * Клиент для работы с Pyrus API (v4) - расширенная версия
 * 
 * Основные возможности:
 * - Авторизация и получение access_token
 * - Получение списка пользователей организации
 * - Фильтрация активных пользователей
 */

interface PyrusUser {
  id: number
  email: string
  first_name: string
  last_name: string
  role?: string
  banned: boolean
  department_id?: number
  department_name?: string
  phone?: string
  skype?: string
}

interface PyrusMembersResponse {
  members: PyrusUser[]
}

export class PyrusUsersClient {
  private baseUrl: string
  private login: string | null
  private securityKey: string | null
  private accessToken: string | null = null

  constructor() {
    this.baseUrl = process.env.PYRUS_API_URL || "https://api.pyrus.com/v4/"
    this.login = process.env.PYRUS_LOGIN || null
    this.securityKey = process.env.PYRUS_SECURITY_KEY || null
  }

  private joinUrl(base: string, path: string): string {
    const cleanBase = base.endsWith('/') ? base : base + '/'
    const cleanPath = path.startsWith('/') ? path.substring(1) : path
    return cleanBase + cleanPath
  }

  /**
   * Авторизация в Pyrus и получение access_token
   */
  private async authenticate(): Promise<string | null> {
    if (!this.login || !this.securityKey) {
      console.error('PyrusUsersClient: отсутствуют учетные данные')
      return null
    }

    try {
      const response = await fetch(this.joinUrl(this.baseUrl, 'auth'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: this.login,
          security_key: this.securityKey,
        }),
      })

      if (!response.ok) {
        console.error(`PyrusUsersClient: ошибка авторизации ${response.status}`)
        return null
      }

      const data = await response.json()
      this.accessToken = data.access_token
      return this.accessToken
    } catch (error) {
      console.error('PyrusUsersClient: ошибка при авторизации', error)
      return null
    }
  }

  /**
   * Получение действующего access_token
   */
  private async getToken(): Promise<string | null> {
    if (this.accessToken) {
      return this.accessToken
    }
    return await this.authenticate()
  }

  /**
   * Получение списка всех пользователей организации
   */
  async getMembers(): Promise<PyrusUser[]> {
    const token = await this.getToken()
    if (!token) {
      console.error('PyrusUsersClient: не удалось получить токен')
      return []
    }

    try {
      const response = await fetch(this.joinUrl(this.baseUrl, 'members'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error(`PyrusUsersClient: ошибка получения пользователей ${response.status}`)
        return []
      }

      const data: PyrusMembersResponse = await response.json()
      return data.members || []
    } catch (error) {
      console.error('PyrusUsersClient: ошибка при получении пользователей', error)
      return []
    }
  }

  /**
   * Получение только активных пользователей (не заблокированных)
   */
  async getActiveMembers(): Promise<PyrusUser[]> {
    const allMembers = await this.getMembers()
    return allMembers.filter(member => !member.banned)
  }

  /**
   * Получение пользователя по email
   */
  async getMemberByEmail(email: string): Promise<PyrusUser | null> {
    const members = await this.getMembers()
    return members.find(member => member.email.toLowerCase() === email.toLowerCase()) || null
  }
}

// Экспорт типов для использования в других модулях
export type { PyrusUser, PyrusMembersResponse }
