# Miles Admin API — Postman Documentation

> Generated from the `Miles-admin` Postman collection. Endpoint behavior, request fields, and response codes below are based on the saved collection examples; fields not shown there may exist but are not documented here.

## 1. Overview

- **Collection:** Miles-admin
- **Base URL variable:** `{{localUrl}}`
- **Authentication:** Bearer access token for all endpoints except login
- **Request/response format:** JSON
- **Collection schema:** Postman Collection v2.1

## 2. Configure Postman

Create or select a Postman environment and define these variables:

| Variable | Value | Purpose |
|---|---|---|
| `localUrl` | `http://localhost:3000` (example) | Base URL of the API; replace with the actual server URL |
| `accessToken` | Leave empty initially | Bearer token returned by the login endpoint |

The collection uses `{{localUrl}}` in every URL. Confirm the port and protocol for your environment before sending requests.

### Authentication flow

1. Send **POST `/auth/login`** with valid login credentials.
2. Copy `payload.accessToken` from the response into the `accessToken` environment variable.
3. Send the remaining requests. They use `Authorization: Bearer {{accessToken}}`.

Do not share or commit real passwords or access tokens. The credential in the collection is an example and should only be used if it is valid for your local test environment.

## 3. Standard response format

Successful responses in the collection generally use this envelope:

```json
{
  "statusCode": 200,
  "message": "Data fetched successfully",
  "timestamp": "2026-10-13T11:19:44.704Z",
  "path": "/example/path",
  "payload": {}
}
```

Error responses generally include `statusCode`, `message`, `error`, `timestamp`, and `path`. Validation errors may return `message` as an object whose keys are field names and whose values are arrays of validation messages.

## 4. Endpoint index

| Group | Method | Endpoint | Saved response codes |
|---|---:|---|---|
| Login | `POST` | `/auth/login` | 201, 422 |
| me | `GET` | `/auth/me` | 200, 401 |
| list | `GET` | `/users` | 200 |
| Get User | `GET` | `/users/:userId` | 200 |
| Create User | `POST` | `/users` | 201, 409, 422 |
| Update User | `PATCH` | `/users/:userId` | 200, 422 |
| Delete User | `DELETE` | `/users/:userId` | 200, 404 |
| Bookings | `GET` | `/bookings` | 200 |
| Bookings Details | `GET` | `/bookings/:bookingId` | 200 |
| Create Booking | `POST` | `/bookings` | 201, 422 |
| Update Booking | `PATCH` | `/bookings/:bookingId` | 200, 422 |
| Transections | `GET` | `/transactions` | 200 |
| Transections Details | `GET` | `/transactions/:transectionsId` | 200 |
| Transection Create | `POST` | `/transactions` | 201, 422 |
| Status update | `PATCH` | `/transactions/:transectionId/status` | 200 |
| stast | `GET` | `/dashboard/stats` | 200 |
| charts | `GET` | `/dashboard/charts` | 200 |
| alterts | `GET` | `/dashboard/alerts` | 200 |

---

## Authentication

### Login

**POST** `/auth/login`

Authenticate an administrator/user and obtain a bearer access token.

**Authentication:** Not required.

**Request body**

```json
{
  "email": "admin@example.com",
  "password": "replace-with-valid-password"
}
```

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `201` | Created | Login successful; `payload` contains `accessToken`, `tokenType`, and `user`. |
| `422` | Unprocessable Entity | Invalid or missing fields; `message` contains field-level validation errors. |

**Notes**

No bearer token is required.

---

### me

**GET** `/auth/me`

Return the currently authenticated user's profile.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | `payload` contains the authenticated user profile. |
| `401` | Unauthorized | Invalid or expired access token. |

**Notes**

Requires `Authorization: Bearer {{accessToken}}`.

---

## Users

### list

**GET** `/users`

Return a paginated list of users.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Path/query parameters**

| Name | Example | Description |
|---|---|---|
| `page` | `1` | Page number. |
| `limit` | `10` | Number of records per page. |
| `sortBy` | `joiningDate:DESC` | Sort field and direction as shown in the collection. |

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | `payload` contains `data`, `meta`, and `links` for pagination. |

**Notes**

Requires bearer authentication. The collection sample returns user fields such as `id`, `userId`, `email`, `name`, `role`, `status`, and `joiningDate`.

---

### Get User

**GET** `/users/:userId`

Fetch a single user by its UUID.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Path/query parameters**

| Name | Example | Description |
|---|---|---|
| `userId` | `8507cf13-e6cd-4881-91b1-b4f6bd143617` | User UUID path parameter. |

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | `payload` contains user details, including recent transactions, recent bookings, and activity in the saved example. |

**Notes**

Requires bearer authentication.

---

### Create User

**POST** `/users`

Create a user account.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Request body**

```json
{
  "email": "new.user@example.com",
  "name": "New User",
  "password": "replace-with-a-test-password",
  "role": "editor"
}
```

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `201` | Created | User created; `payload` contains the created user. |
| `409` | Conflict | Email is already in use. |
| `422` | Unprocessable Entity | Request validation failed. |

**Notes**

Requires bearer authentication. Roles shown by the saved validation response: `admin`, `editor`, `viewer`. The saved example indicates a minimum password length of 8 characters.

---

### Update User

**PATCH** `/users/:userId`

Update fields on an existing user.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Path/query parameters**

| Name | Example | Description |
|---|---|---|
| `userId` | `c9674c5f-1c4c-40b0-a917-2954e9f8e5b4` | User UUID path parameter. |

**Request body**

```json
{
  "name": "Updated Name",
  "isTwoFactorEnabled": true
}
```

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | User updated; `payload` contains the updated user. |
| `422` | Unprocessable Entity | Request validation failed. |

**Notes**

Requires bearer authentication. The collection's request body currently contains empty strings; the example above uses the corresponding fields from its saved successful response.

---

### Delete User

**DELETE** `/users/:userId`

Delete a user by UUID.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Path/query parameters**

| Name | Example | Description |
|---|---|---|
| `userId` | `8507cf13-e6cd-4881-91b1-b4f6bd143617` | User UUID path parameter. |

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | Delete operation succeeded. |
| `404` | Not Found | User does not exist. |

**Notes**

Requires bearer authentication.

---

## Bookings

### Bookings

**GET** `/bookings`

Retrieve the bookings list.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | Booking list response is saved in the collection. |

**Notes**

Requires bearer authentication. No query parameters are configured in the saved request.

---

### Bookings Details

**GET** `/bookings/:bookingId`

Fetch one booking by its ID.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Path/query parameters**

| Name | Example | Description |
|---|---|---|
| `bookingId` | `replace-with-booking-id` | Booking identifier path parameter. |

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | Booking details response is saved in the collection. |

**Notes**

Requires bearer authentication.

---

### Create Booking

**POST** `/bookings`

Create a booking.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Request body**

```json
{
  "service": "Consultation",
  "startAt": "2026-10-15T10:00:00.000Z",
  "endAt": "2026-10-15T11:00:00.000Z",
  "status": "pending",
  "amount": "1500.00",
  "currency": "INR",
  "meetingType": "virtual",
  "meetingLocation": "Ahmedabad",
  "meetingUrl": "https://meet.example.com/booking",
  "notes": "Dummy booking for testing"
}
```

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `201` | Created | Booking created. |
| `422` | Unprocessable Entity | Request validation failed. |

**Notes**

Requires bearer authentication. Use ISO 8601 timestamps for `startAt` and `endAt`, following the saved request example.

---

### Update Booking

**PATCH** `/bookings/:bookingId`

Update an existing booking.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Path/query parameters**

| Name | Example | Description |
|---|---|---|
| `bookingId` | `replace-with-booking-id` | Booking identifier path parameter. |

**Request body**

```json
{
  "startAt": "2026-10-15T11:00:00.000Z"
}
```

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | Booking updated. |
| `422` | Unprocessable Entity | Request validation failed. |

**Notes**

Requires bearer authentication. The saved request body contains an invalid timestamp and a non-numeric-looking `duration` value. The body above demonstrates a valid ISO timestamp only; confirm the accepted update fields with the API DTO.

---

## Transactions

### Transections

**GET** `/transactions`

Retrieve the transactions list.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | Transaction list response is saved in the collection. |

**Notes**

The collection folder is named `Transections`, while the endpoint path is `/transactions`. Requires bearer authentication.

---

### Transections Details

**GET** `/transactions/:transectionsId`

Fetch one transaction by identifier.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Path/query parameters**

| Name | Example | Description |
|---|---|---|
| `transectionsId` | `replace-with-transaction-id` | Transaction identifier path parameter as named in the saved URL. |

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | Transaction details response is saved in the collection. |

**Notes**

Requires bearer authentication. The saved path parameter name is `transectionsId`; check that this matches the server route parameter.

---

### Transection Create

**POST** `/transactions`

Create a transaction record.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Request body**

```json
{
  "userId": "replace-with-user-uuid",
  "bookingId": "replace-with-booking-uuid",
  "paymentMethodId": "replace-with-payment-method-uuid",
  "type": "payment",
  "status": "completed",
  "amount": "1500.00",
  "currency": "INR",
  "reference": "TXN-2026-001",
  "description": "Payment for booking",
  "platformFee": "50.00",
  "subtotal": "1450.00"
}
```

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `201` | Created | Transaction created. |
| `422` | Unprocessable Entity | Request validation failed. |

**Notes**

Requires bearer authentication. Replace all example IDs with valid records from your environment.

---

### Status update

**PATCH** `/transactions/:transectionId/status`

Update a transaction's status.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Path/query parameters**

| Name | Example | Description |
|---|---|---|
| `transectionId` | `replace-with-transaction-id` | Transaction identifier path parameter. |

**Request body**

No request body is defined in the saved Postman request. Confirm the endpoint contract before use.

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | The collection contains two saved 200 response examples. |

**Notes**

Requires bearer authentication. The saved request does not define a body or query parameter, so the exact status input mechanism is not documented by this collection. Check the API DTO/controller before calling.

---

## Dashboard

### stast

**GET** `/dashboard/stats`

Retrieve dashboard summary statistics.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Path/query parameters**

| Name | Example | Description |
|---|---|---|
| `section` | `bookings` | Section selector; saved examples include `bookings`, `users`, and `transactions`. |

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | The collection has saved 200 response examples for dashboard, users, transactions, and bookings statistics. |

**Notes**

Requires bearer authentication. The saved request uses `section=bookings`. Other accepted values are inferred from the names of saved response examples and should be confirmed.

---

### charts

**GET** `/dashboard/charts`

Retrieve dashboard chart data for a time range.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Path/query parameters**

| Name | Example | Description |
|---|---|---|
| `range` | `7d` | Time range; saved examples include `7d`, `1m`, `3m`, `6m`, and `1y`. |

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | The collection contains saved chart responses for 7 days, 1 month, 3 months, 6 months, and 1 year. |

**Notes**

Requires bearer authentication. The saved request uses `range=7d`.

---

### alterts

**GET** `/dashboard/alerts`

Retrieve dashboard alerts.

**Authentication:** Bearer token required (`Authorization: Bearer {{accessToken}}`).

**Saved response scenarios**

| HTTP status | Status | Meaning / saved example |
|---:|---|---|
| `200` | OK | Alerts response is saved in the collection. |

**Notes**

Requires bearer authentication. The Postman request is named `alterts` (spelling as saved in the collection).

---

## 5. Error handling

The collection demonstrates these error patterns:

| HTTP status | Meaning in the saved collection |
|---:|---|
| `401` | Missing, invalid, or expired access token for an authenticated endpoint |
| `404` | Requested user was not found (saved example for deleting a user) |
| `409` | Duplicate email when creating a user |
| `422` | Request validation failed; inspect the `message` field for field-specific details |

Example validation error shape:

```json
{
  "statusCode": 422,
  "message": {
    "email": [
      "Email must be a valid email address"
    ],
    "password": [
      "Password must be at least 6 characters"
    ]
  },
  "error": "UNPROCESSABLE_ENTITY",
  "timestamp": "2026-10-13T11:16:58.844Z",
  "path": "/auth/login"
}
```

The exact validation messages depend on the endpoint and submitted values.

## 6. Important collection notes

- `localUrl` must point to the running API server.
- All protected endpoints use the `accessToken` environment variable as a Bearer token.
- Replace example IDs with IDs that exist in your current database.
- The saved **Update User** body contains empty strings; use values that satisfy validation.
- The saved **Update Booking** body contains an invalid timestamp (`2026-T11:00:00.000Z`) and an arbitrary `duration` value. Confirm the DTO and update the request before testing.
- The saved **Status update** request does not specify where the new status is supplied (body, query, or other mechanism); confirm the backend contract.
- Some example responses contain generated user data and timestamps. They are examples, not guaranteed live values.

## 7. Suggested request execution order

1. `Authentication → Login`
2. `Authentication → me` to verify the token
3. `users → list` and `users → Get User`
4. `Booking → Bookings` and `Booking → Bookings Details`
5. `Transections → Transections` and `Transections → Transections Details`
6. `Dashboard → stast`, `charts`, and `alterts`
7. Use create/update/delete endpoints only with test data and valid related IDs.

## 8. Source collection

This document was generated from the supplied `Miles-admin.postman_collection.json` collection. Where the collection did not define a request contract clearly, the documentation explicitly notes the gap rather than claiming an undocumented behavior.
