
# Cloudflare Worker Update Droptop Download Count

This Cloudflare Worker updates every day the number of times Droptop Four was downloaded.

It gets the number of downloads from the number of downloads of the assets of every release of Droptop Four from the [Droptop-Four/Droptop-Four](https://github.com/Droptop-Four/Droptop-Four) repo.

It also gets the number of downloads of the Supporter version using the Gumroad API.

Then it uploads the number of downloads in a mongodb atlas database using the REALM API.


# Development

To start the dev server run `npm run dev`, to simulate a cron trigger, use `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"`.
