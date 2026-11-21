/**
 * Embeddings stub.
 * TODO: Vector embeddings & hybrid vector search will be implemented in a future release.
 * Currently Projust uses LLM File Router + Postgres Full-Text Search (tsvector).
 */

export async function getEmbedding(text?: string): Promise<number[]> {
  void text;
  throw new Error('Embeddings not yet enabled in this version. Use Postgres FTS + File Router.');
}
