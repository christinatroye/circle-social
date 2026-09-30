# circle-social

Circle's guest layer: the personal page each invitee opens before a Circle, and the host's guest list.

This is **separate from [circle-app](https://github.com/christinatroye/circle-app)**, which holds the meeting rooms at room.entercircle.co. The two meet at one point only: on the night, "Enter the room" opens that Circle's guest link in circle-app.

| | |
| --- | --- |
| Address | in.entercircle.co |
| Guest links | `in.entercircle.co/{first-name}-{code}`, one per guest |
| Host view | `in.entercircle.co/host` |
| Database | Its own Neon project, `circle-social` |
| Guest list source | Luma, imported as CSV with `npm run import` |

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. `npm run db:setup` creates the tables.
4. `npm run dev`

Checks before every commit: `npm run lint && npm run build`.
