import * as BunnySDK from "npm:@bunny.net/edgescript-sdk@0.12.1";
import { createClient } from "npm:@libsql/client@0.17.4/web";
import process from "node:process";

const url = process.env.BUNNY_DATABASE_URL;
const authToken = process.env.BUNNY_DATABASE_AUTH_TOKEN;

if (!url) {
  throw new Error(
    "BUNNY_DATABASE_URL is not set. Connect a database from Dashboard > Edge Platform > Database > [Your database] > Access.",
  );
}

const db = createClient({ url, authToken });

// Creates the schema on startup.
// Use migrations for anything beyond a demo.
// https://docs.bunny.net/database
await db.execute(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT ''
  )
`);

type NotePayload = { title?: string; body?: string };

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

const readPayload = (request: Request): Promise<NotePayload | null> =>
  request.json().catch(() => null);

/**
 * A CRUD API backed by Bunny Database.
 *
 * GET    /           a hello message pointing at the notes endpoint
 * GET    /notes      list every note
 * POST   /notes      create a note from a { title, body } payload
 * GET    /notes/:id  read a single note
 * PUT    /notes/:id  replace a note
 * DELETE /notes/:id  remove a note
 *
 * Reads are served from the replica closest to the request, writes go to the primary region.
 *
 * @param {Request} request - The Fetch API Request object.
 * @return {Response} The HTTP response or string.
 */
BunnySDK.net.http.serve(
  async (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    const [, resource, id] = pathname.split("/");

    if (!resource) {
      const notes = new URL("/notes", request.url).href;

      return jsonResponse({
        message: "Hello from Bunny Edge Scripting.",
        notes,
        example: `curl ${notes}`,
      });
    }

    if (resource !== "notes") {
      return jsonResponse({ error: "Not found" }, 404);
    }

    if (!id) {
      if (request.method === "GET") {
        const { rows } = await db.execute("SELECT * FROM notes ORDER BY id");
        return jsonResponse(rows);
      }

      if (request.method === "POST") {
        const payload = await readPayload(request);
        if (!payload?.title) {
          return jsonResponse({ error: "A title is required." }, 400);
        }

        const { rows } = await db.execute({
          sql: "INSERT INTO notes (title, body) VALUES (?, ?) RETURNING *",
          args: [payload.title, payload.body ?? ""],
        });

        return jsonResponse(rows[0], 201);
      }

      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (request.method === "GET") {
      const { rows } = await db.execute({
        sql: "SELECT * FROM notes WHERE id = ?",
        args: [id],
      });

      return rows.length
        ? jsonResponse(rows[0])
        : jsonResponse({ error: "Not found" }, 404);
    }

    if (request.method === "PUT") {
      const payload = await readPayload(request);
      if (!payload?.title) {
        return jsonResponse({ error: "A title is required." }, 400);
      }

      const { rows } = await db.execute({
        sql: "UPDATE notes SET title = ?, body = ? WHERE id = ? RETURNING *",
        args: [payload.title, payload.body ?? "", id],
      });

      return rows.length
        ? jsonResponse(rows[0])
        : jsonResponse({ error: "Not found" }, 404);
    }

    if (request.method === "DELETE") {
      const { rowsAffected } = await db.execute({
        sql: "DELETE FROM notes WHERE id = ?",
        args: [id],
      });

      return rowsAffected
        ? new Response(null, { status: 204 })
        : jsonResponse({ error: "Not found" }, 404);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  },
);
