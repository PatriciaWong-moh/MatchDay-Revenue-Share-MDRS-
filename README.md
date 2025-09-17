# MatchDay Revenue Share (MDRS)

## Overview

**MatchDay Revenue Share (MDRS)** is a decentralized Web3 platform built on the Stacks blockchain using Clarity smart contracts. It tokenizes matchday revenue streams from sports events (e.g., ticket sales, concessions, merchandise) and distributes them proportionally to investors as tokenized shares. This creates a fan-owned economy where everyday supporters can invest in their favorite teams or events, earning real-time revenue shares without traditional barriers like high entry costs or opaque financials.

### Key Features
- **Tokenization of Revenue**: Convert off-chain revenue (verified via oracles) into on-chain tokens (STX-20 compliant).
- **Automated Distribution**: Smart contracts handle proportional payouts to token holders after each matchday.
- **Liquidity & Trading**: Tokens are transferable and listable on Stacks DEXes for secondary market trading.
- **Transparency**: All transactions and distributions are immutable on the blockchain.
- **Governance**: Token holders vote on revenue allocation (e.g., reinvestment vs. payouts).

### Real-World Problems Solved
1. **Financial Exclusion**: Sports investments are dominated by venture capital and high-net-worth individuals. MDRS lowers the barrier to entry, allowing fans to invest as little as $10 in revenue shares.
2. **Lack of Transparency**: Teams often obscure revenue details. Blockchain oracles and audits ensure verifiable, tamper-proof reporting.
3. **Fan Disengagement**: By tying financial incentives to match outcomes, MDRS boosts fan loyalty and attendance, potentially increasing overall revenue by 15-20% (based on similar tokenized fan engagement models like Socios).
4. **Revenue Volatility**: Sports teams face seasonal cash flows. Tokenization provides steady, distributed liquidity for teams while giving investors diversified exposure.
5. **Regulatory Compliance**: Built with KYC-optional hooks for jurisdictions, reducing fraud risks in peer-to-peer investments.

This project leverages Stacks' Bitcoin-anchored security for trustless execution, making it ideal for high-value revenue streams.

## Architecture

MDRS consists of 6 core Clarity smart contracts, forming a modular system for revenue ingestion, tokenization, investment, distribution, governance, and event management. Contracts interact via traits for composability.

### Smart Contracts Overview

| Contract Name | Purpose | Key Functions | Dependencies |
|---------------|---------|---------------|--------------|
| **MDRSRevenueToken** | STX-20 fungible token representing revenue shares. Minted based on revenue inflows. | `mint`, `transfer`, `get-balance`, `total-supply` | None (base token) |
| **InvestmentVault** | Handles user investments in exchange for tokens. Locks STX contributions until revenue thresholds are met. | `invest`, `redeem-tokens`, `withdraw-admin` | MDRSRevenueToken |
| **RevenueOracle** | Interface for off-chain revenue data (e.g., from team APIs or Chainlink-like oracles on Stacks). Verifies and feeds matchday revenue on-chain. | `submit-revenue`, `verify-oracle`, `get-latest-revenue` | None |
| **DistributionEngine** | Proportional distribution of verified revenue to token holders. Burns a fee for sustainability. | `distribute`, `claim-payout`, `get-pending-claim` | MDRSRevenueToken, RevenueOracle |
| **EventManager** | Registers upcoming matchdays, sets revenue expectations, and triggers distribution cycles. | `register-event`, `close-event`, `get-event-status` | RevenueOracle, DistributionEngine |
| **GovernanceModule** | DAO-like voting for token holders on decisions (e.g., fee adjustments, reinvestment ratios). | `propose`, `vote`, `execute-proposal` | MDRSRevenueToken |

- **Total Contracts**: 6
- **Interconnections**: Revenue flows: EventManager → RevenueOracle → DistributionEngine → Token holders via InvestmentVault.
- **Security**: All contracts include reentrancy guards, access controls (e.g., admin-only minting), and overflow checks. Audited via tools like Clarinet.

### Tech Stack
- **Blockchain**: Stacks (Clarity language)
- **Frontend**: React + Stacks.js (for wallet integration, e.g., Leather/Hiro)
- **Oracle**: Custom Stacks oracle or integration with Gaia for off-chain storage
- **Testing**: Clarinet for unit/integration tests
- **Deployment**: Hiro's Clarinet CLI

## Getting Started

### Prerequisites
- Node.js (v18+)
- Clarinet CLI: `cargo install clarinet`
- Stacks wallet (e.g., Hiro Wallet) with testnet STX

### Installation
1. Clone the repo:
   ```
   git clone `git clone <repo-url>`
   cd mdrs-stacks
   ```
2. Install dependencies (for frontend):
   ```
   npm install
   ```
3. Run tests:
   ```
   clarinet test
   ```

### Local Development
1. Start a local Stacks node:
   ```
   clarinet integrate
   ```
2. Deploy contracts:
   ```
   clarinet deploy
   ```
3. Interact via Clarinet console or frontend at `http://localhost:8000`.

### Deployment to Mainnet
1. Update `Clarity.toml` with mainnet deployer address.
2. Run `clarinet deploy --network mainnet`.
3. Verify on [Stacks Explorer](https://explorer.stacks.co/).

## Usage

### For Investors/Fans
1. Connect wallet to the dApp.
2. Browse upcoming events via EventManager.
3. Invest STX in an event → Receive MDRS tokens.
4. After matchday, revenue is oracled → Auto-distributed or claim via DistributionEngine.
5. Trade tokens or vote in governance.

### For Teams/Admins
1. Register events with expected revenue caps.
2. Submit verified revenue post-matchday.
3. Monitor distributions and proposals.

### Example Flow
- Fan invests 10 STX in a soccer match via InvestmentVault → Gets 100 MDRS tokens.
- Post-match, oracle submits $50K revenue → DistributionEngine pays out $0.50 per token (pro-rata).
- Fan claims 50 STX equivalent.

## Contracts Code Structure
Each contract is in `/contracts/` with `.clar` files. Key traits in `/interfaces/`.

- **MDRSRevenueToken.clar**: Implements `SIP-010-trait` for fungibility.
- **InvestmentVault.clar**: Uses maps for user balances.
- **RevenueOracle.clar**: Timestamped revenue submissions with admin verification.
- **DistributionEngine.clar**: Calculates shares with `(ok? (/ revenue-supply total-supply))`.
- **EventManager.clar**: List-based event tracking.
- **GovernanceModule.clar**: Quadratic voting via token snapshots.

Full code includes error handling (e.g., `(err u1001)` for insufficient funds).

## Contributing
1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/awesome-feature`).
3. Commit changes (`git commit -m 'Add awesome feature'`).
4. Push and open a PR.

## License
MIT License. See [LICENSE](LICENSE) for details.