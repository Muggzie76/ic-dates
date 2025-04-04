# Tinder Clone on Internet Computer

A decentralized dating application built on the Internet Computer Protocol (ICP).

## Features

- Internet Identity authentication
- Profile management
- Matching system
- Real-time messaging
- Decentralized storage

## Prerequisites

- Node.js (v14 or higher)
- DFX (Internet Computer development environment)
- Internet Identity account

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tinder-clone-icp.git
cd tinder-clone-icp
```

2. Install dependencies:
```bash
npm install
```

3. Start the local Internet Computer network:
```bash
dfx start --background
```

4. Deploy the canisters:
```bash
dfx deploy
```

5. Start the development server:
```bash
npm start
```

## Project Structure

```
tinder-clone-icp/
├── src/
│   ├── backend/           # Motoko canisters
│   │   └── main.mo       # Main backend logic
│   └── frontend/         # React frontend
│       ├── components/   # React components
│       ├── contexts/     # React contexts
│       └── pages/        # Page components
├── dfx.json              # DFX configuration
├── package.json          # Node.js dependencies
└── tsconfig.json         # TypeScript configuration
```

## Development

- Backend development: Modify the Motoko files in `src/backend/`
- Frontend development: Modify the React files in `src/frontend/`
- To test changes: Run `dfx deploy` after modifying backend code

## Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy to mainnet:
```bash
dfx deploy --network ic
```

## License

MIT 