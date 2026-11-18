require('dotenv').config({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;
const useSsl = process.env.DB_SSL === 'true'
  || (Boolean(databaseUrl) && !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1'));

const baseConfig = {
  dialect: 'postgres',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
};

if (databaseUrl) {
  module.exports = {
    ...baseConfig,
    use_env_variable: 'DATABASE_URL',
    ...(useSsl
      ? {
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        },
      }
      : {}),
  };
} else {
  module.exports = {
    ...baseConfig,
    host: process.env.HOST_LOCAL || 'localhost',
    port: Number(process.env.PORT_DB_LOCAL) || 5432,
    username: process.env.USERNAME_DB_LOCAL || 'postgres',
    password: process.env.PASSWORD_DB_LOCAL || '123456',
    database: process.env.DATABASE_LOCAL || 'sqldocker',
  };
}
