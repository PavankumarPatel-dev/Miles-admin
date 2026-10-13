# AdminHub API

## Requirements

- Node.js 20 or newer
- PostgreSQL 16 or newer
- Redis 7 or newer

## Setup

```powershell
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

## Environment variables

Create a `.env` file in the project root:

```env
DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=

JWT_SECRET=
JWT_EXPIRES_IN_SECONDS=

REDIS_URL=
REDIS_TOKEN=

BACKEND_PORT=
HOST=
NODE_ENV=

ADMIN_NAME=Admin
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=Admin@123
```

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are used by `npm run db:seed`. Environment
values override the seed defaults.

## Admin credentials

The default seeded administrator is:

- Email: `admin@gmail.com`
- Password: `Admin@123`

Change these credentials before using the application outside local
development.

## Database schema

```mermaid
erDiagram
  USERS {
    uuid id PK
    varchar userId UK
    varchar email UK
    varchar passwordHash
    varchar name
    varchar avatarUrl
    varchar phoneNumber UK
    date dateOfBirth
    text address
    enum role
    enum status
    boolean isConfirmed
    boolean isTwoFactorEnabled
    date joiningDate
    timestamptz lastActiveAt
    timestamptz createdAt
    timestamptz updatedAt
    timestamptz deletedAt
  }
  PAYMENT_METHODS {
    uuid id PK
    uuid userId FK
    varchar provider
    varchar providerMethodId
    varchar cardType
    varchar lastFourDigit
    timestamptz createdAt
    timestamptz updatedAt
    timestamptz deletedAt
  }
  BOOKINGS {
    uuid id PK
    varchar bookingId UK
    uuid userId FK
    varchar service
    timestamptz startAt
    timestamptz endAt
    enum status
    decimal amount
    varchar currency
    varchar meetingType
    text meetingLocation
    text meetingUrl
    text notes
    timestamptz cancelledAt
    timestamptz createdAt
    timestamptz updatedAt
    timestamptz deletedAt
  }
  TRANSACTIONS {
    uuid id PK
    varchar transactionId UK
    uuid bookingId FK
    uuid userId FK
    uuid paymentMethodId FK
    enum type
    enum status
    decimal amount
    varchar currency
    varchar reference
    varchar description
    decimal platformFee
    decimal subtotal
    timestamptz settledAt
    timestamptz createdAt
    timestamptz updatedAt
    timestamptz deletedAt
  }
  ACTIVITY_LOGS {
    uuid id PK
    uuid userId FK
    varchar entityType
    uuid entityId
    varchar type
    varchar title
    text notes
    boolean visible
    timestamptz createdAt
  }
  USERS ||--o{ PAYMENT_METHODS : owns
  USERS ||--o{ BOOKINGS : schedules
  USERS ||--o{ TRANSACTIONS : pays
  USERS o|--o{ ACTIVITY_LOGS : relates
  BOOKINGS o|--o{ TRANSACTIONS : relates
  PAYMENT_METHODS o|--o{ TRANSACTIONS : charges
```

### Indexes

```text
users:
  (createdAt, status) WHERE deletedAt IS NULL

bookings:
  (createdAt, status) WHERE deletedAt IS NULL
  (userId)

transactions:
  (createdAt, status, type, currency, amount) WHERE deletedAt IS NULL
  (createdAt, currency, amount) WHERE deletedAt IS NULL AND status = 'completed' AND type = 'payment'
  (userId)
  (bookingId)

activity_logs:
  (entityType, entityId)
  (userId, visible)
```

These indexes support dashboard calculations and the filters used by the application. No indexes are added solely for sorting.
