import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { Project } from "@/types/project";

export async function projectsCollection(): Promise<Collection<Project>> {
  const db = await getDb();
  return db.collection<Project>("projects");
}
