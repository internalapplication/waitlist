import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  _waitlistMongoClient?: Promise<MongoClient>;
  _waitlistMongoIndexes?: Promise<void>;
};

function getClientPromise(): Promise<MongoClient> {
  const cached = globalForMongo._waitlistMongoClient;
  if (cached) return cached;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });

  const connecting: Promise<MongoClient> = client.connect().catch((error: unknown) => {
    // Do not cache a failed connection attempt.
    globalForMongo._waitlistMongoClient = undefined;
    throw error;
  });
  globalForMongo._waitlistMongoClient = connecting;
  return connecting;
}

async function ensureIndexes(db: Db): Promise<void> {
  // MongoDB only stores saved pages: one current project per user.
  await db.collection("projects").createIndex({ userId: 1 }, { unique: true });
}

/** Returns the database handle. Indexes are created once per process. */
export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db(process.env.MONGODB_DB_NAME || undefined);

  if (!globalForMongo._waitlistMongoIndexes) {
    globalForMongo._waitlistMongoIndexes = ensureIndexes(db).catch((error) => {
      globalForMongo._waitlistMongoIndexes = undefined;
      throw error;
    });
  }
  await globalForMongo._waitlistMongoIndexes;
  return db;
}
