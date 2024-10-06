# Governance UI

This codebase holds the Solana DAO Management UI 

## Local setup

1. Install the node version under `.nvmrc` or run `nvm use`
2. Install dependencies `yarn`
3. `cp .env.sample .env`
4. Start server locally `yarn dev`
5. Visit http://localhost:3000/


### Using custom Swap API endpoints

You can set custom URLs via the configuration for any self-hosted Jupiter APIs, like the [V6 Swap API](https://station.jup.ag/docs/apis/self-hosted) or [Paid Hosted APIs](https://station.jup.ag/docs/apis/self-hosted#paid-hosted-apis) Here is an example:

```
NEXT_PUBLIC_JUPTER_SWAP_API_ENDPOINT=https://quote-api.jup.ag/v6
```