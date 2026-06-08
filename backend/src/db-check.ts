import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [__dirname + '/auth/entities/*.entity{.ts,.js}'],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Connected to DB');

  const users = await dataSource.query('SELECT id, firstName, lastName, email, role, status, createdAt FROM users');
  console.log('Users in database:');
  console.log(JSON.stringify(users, null, 2));

  await dataSource.destroy();
}

check().catch(console.error);
