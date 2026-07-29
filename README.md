# Template: es-database-script

This template demonstrates a CRUD API backed by
[Bunny Database](https://docs.bunny.net/database), built for Bunny using a local
`Deno`.

> You do not want to use Deno? Feel free to use something else, [here](https://bunny.net) is a full
> fledged example with `node` instead!

Queries go through the
[libSQL client](https://docs.bunny.net/database/connect/typescript). Reads hit the
replica closest to the request, writes go to the primary region.

## Endpoints

```
GET    /           a hello message pointing at the notes endpoint
GET    /notes      list every note
POST   /notes      create a note from a { title, body } payload
GET    /notes/:id  read a single note
PUT    /notes/:id  replace a note
DELETE /notes/:id  remove a note
```

```
curl https://your-script.b-cdn.net/notes

curl -X POST https://your-script.b-cdn.net/notes \
  -H 'content-type: application/json' \
  -d '{"title": "Hello", "body": "From the edge."}'

curl -X PUT https://your-script.b-cdn.net/notes/1 \
  -H 'content-type: application/json' \
  -d '{"title": "Hello again", "body": "Updated."}'

curl -X DELETE https://your-script.b-cdn.net/notes/1
```

## Database

The script reads `BUNNY_DATABASE_URL` and `BUNNY_DATABASE_AUTH_TOKEN`.

To set them, go to **Dashboard > Edge Platform > Database > [Select Database] >
Access**, click **Generate Tokens**, then **Add Secrets to Edge Script** and pick
this script. Bunny adds both variables to the script for you. See
[Connect Edge Scripting to Bunny Database](https://docs.bunny.net/database/connect/scripting).

The `notes` table is created on startup with `CREATE TABLE IF NOT EXISTS`. Use
migrations for anything beyond a demo.

## Setup

To run this example you'll need to have a valid
[Deno](https://docs.deno.com/runtime/manual/getting_started/installation/) installation.

When you have the `deno` binary available, you should be able to run the `check`
task which is the task ensuring everything is compiling fine.

```
# A tiny lint just to be sure!
deno task lint

# We ensure everything is type compliant!
deno task check
```

To run the script locally, set both database variables in your environment
first:

```
BUNNY_DATABASE_URL=... BUNNY_DATABASE_AUTH_TOKEN=... deno task dev
```

We also use `pnpm` to use `changeset`.

## Changeset

This template uses [changeset](https://github.com/changesets/changesets) for 
version management. Changeset helps track and document changes in your project, 
making it easier to manage releases and generate changelogs.

When you make changes to the project, you should create a changeset to describe
those changes:

1. Run the following command:
   ```
   pnpm changeset
   ```
2. Follow the prompts to select the type of change (major, minor, or patch) and provide a brief description.
3. Commit the generated changeset file along with your code changes.

This process ensures that all modifications are properly documented and 
versioned, facilitating smoother releases and better communication about 
project updates.

When you merge a pull request that includes a changeset, it will automatically 
create an associated pull request to release your changes. 

This new pull request will trigger the release process of the script to your
PullZone in Bunny.


> This behavior is disabled by default, every pushes on main are now pushed to
> Bunny directly.
> You can enable this pattern again by updating this
> [action](./.github/workflows/on-merge.yml)
