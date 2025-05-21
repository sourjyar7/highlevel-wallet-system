# Digital Wallet API

A NestJS-based digital wallet service that handles wallet management and transactions.

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Update the .env file with your configuration
```

3. Run the application:
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Endpoints

### Wallet Operations

#### Create Wallet
```http
POST /wallet/setup
```
```json
{
  "name": "Main Wallet",
  "balance": 1000,
  "currency": "USD"
}
```

#### Get Single Wallet
```http
GET /wallet/:id
```

#### Get All Wallets
```http
GET /wallet
```

#### Update Wallet Status
```http
PATCH /wallet/:id/status
```
```json
{
  "status": "ACTIVE" // ACTIVE, FROZEN, or CLOSED
}
```

#### Delete Wallet
```http
DELETE /wallet/:id
```

### Transaction Operations

#### Create Transaction
```http
POST /transact/:walletId
```
```json
{
  "amount": 100,
  "type": "CREDIT", // or DEBIT
  "description": "Payment for services"
}
```

#### Get Transactions
```http
GET /transactions?walletId=123&skip=0&limit=10&sort=createdAt&order=DESC
```

#### Export Transactions
```http
GET /transactions/export?walletId=123
```
Returns a CSV file of all transactions for the specified wallet.

#### Delete Transaction
```http
DELETE /transactions/:id
```

#### Delete All Wallet Transactions
```http
DELETE /transactions/wallet/:walletId
```

## TODOs for Improvement

### Critical
- [ ] Add authentication and authorization
- [ ] Implement input validation and sanitization
- [ ] Add transaction rollback mechanism
- [ ] Implement rate limiting
- [ ] Add request logging

### Important
- [ ] Add database indexing for better performance
- [ ] Implement caching for frequently accessed data
- [ ] Add comprehensive error handling
- [ ] Set up automated testing
- [ ] Add API documentation using Swagger

### Nice to Have
- [ ] Add support for multiple currencies
- [ ] Implement transaction notifications
- [ ] Add audit logging
- [ ] Create admin dashboard
- [ ] Add analytics and reporting features
