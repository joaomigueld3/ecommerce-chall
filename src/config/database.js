export default {
  host: process.env.HOST_LOCAL,
  username: process.env.USERNAME_DB_LOCAL,
  password: process.env.PASSWORD_LOCAL,
  database: process.env.DATABASE_LOCAL,
  dialect: 'postgres',
  port: process.env.DB_PORT || 5432,
};
