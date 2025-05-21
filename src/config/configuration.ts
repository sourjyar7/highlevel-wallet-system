export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  transaction: {
    dailyLimit: parseInt(process.env.DAILY_TRANSACTION_LIMIT, 10) || 1000000,
    maxPerHour: parseInt(process.env.MAX_TRANSACTIONS_PER_HOUR, 10) || 100,
  }
}); 