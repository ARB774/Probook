## Что есть в системе (сущности):

Note - заметки
User — владелец промтов, автор, голосующий
Txt — сам промт (может быть приватным или публичным)
Tag — метки (многие-ко-многим с Txt)
Vote — голос пользователя за публичный промт (уникально: один пользователь → один голос на промт)
(опционально) Collection / Folder — папки/коллекции для организации
(опционально) PromptVersion — версии промта (история изменений)

## Ключевые правила:

- Публичность — это свойство Txt (visibility)
- Голосовать можно только по публичным (проверяется на уровне приложения; можно усилить триггером/констрейнтом позже)
- Голос уникален: (userId, promptId) — уникальный индекс

## Схема базы данных
- Note: id, ownerId -> User, title, createdAt
- User: id (cuid), email unique, name optional, createdAt
- Txt: id, ownerId -> User, title, content, description optional, categoryId -> Category,
  visibility (PRIVATE|PUBLIC, default PRIVATE), createdAt, updatedAt, publishedAt nullable
- Vote: id, userId -> User, promptId -> Txt, value int default 1, createdAt
- Category: id, category
- Ограничение: один пользователь может проголосовать за промт только один раз:
  UNIQUE(userId, promptId)
- Индексы:
  Txt(ownerId, updatedAt)
  Txt(visibility, createdAt)
  Vote(promptId)
  Vote(userId)
- onDelete: Cascade для связей
