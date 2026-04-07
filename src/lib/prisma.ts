import { PrismaClient } from '../../generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

// Resolve the SQLite database file path from the project root
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });

// Singleton Prisma client shared across all services
const prisma = new PrismaClient({ adapter } as any);

export default prisma;
