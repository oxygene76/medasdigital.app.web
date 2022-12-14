# Medas Digital Web App

Frontend React app for Medas Digital.

This project was started from Rebus.Web.App (they started from [osmosis](https://github.com/osmosis-labs/osmosis-frontend) and [insync](https://github.com/OmniFlix/insync-juno)).

## Install global dependencies

To run or build the app, first, need to install `Node.js` and `Yarn` globally;

First Install Node (recommend 14.x.x LTS version) from;

https://nodejs.org/

Then install Yarn;

```bash
npm install -g yarn
# OR
sudo npm install -g yarn
```

## Install project dependencies

First clone the repo;

```bash
git clone https://github.com/oxygene76/medasdigital.app.web
```

Then install project dependencies;

```bash
yarn
```

## Build

To build the static assets;

```bash
yarn build:css && yarn build
```

This should produce `prod` folder with static assets.

Currently, Medas Digital frontend app is SPA with entry point: `prod/index.html`

## Development

To spin up the local dev server;

```bash
yarn build:css && yarn dev
```

The app should be live at http://localhost:8080

## Wallet Connect Page

The wallet connect page is mainly used to interface with the discord bot which authenticates discord users to their wallets.
The URL of the bot can be configured by env vars and multiple can be specified.
When the user is redirected to that page, the URL query params contain a param called `app` which will specify which API url to use.

`REACT_APP_DROPMINT_DISCORD_BOT_URL`: URL to connect to the dropmint app

There are only two API calls made to the bot URL:

- POST /api/v1/nonce

```
{ address }
```

- POST /api/v1/authorize

```
{
    address,
    nonce,
    signature,
    userId,
    pubKey,
    serverId,
    chainPrefix.
}
```

### Adding New Apps

To add new apps, it is necessary to add it in two places.

- Define the url in the .env file
- Add it to the `baseUrls` variable in the WalletConnect page component

## License

This code was forked from RebusChain

This work is dual-licensed under Apache 2.0 and MIT.
You can choose between one of them if you use this work.

`SPDX-License-Identifier: Apache-2.0 OR MIT`
