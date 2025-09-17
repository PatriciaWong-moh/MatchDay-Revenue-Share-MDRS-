import { describe, it, expect, beforeEach } from "vitest";
import { uintCV, principalCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_AMOUNT = 101;
const ERR_BLACKLISTED = 108;
const ERR_WHITELIST_REQUIRED = 110;
const ERR_ALREADY_PAUSED = 106;
const ERR_NOT_PAUSED = 107;
const ERR_BATCH_EXCEEDED = 114;
const ERR_ZERO_ADDRESS = 115;
const ERR_INSUFFICIENT_BALANCE = 116;
const ERR_MINT_CAP_EXCEEDED = 121;

interface TokenTransfer {
  to: string;
  amount: bigint;
}

interface MockState {
  totalSupply: bigint;
  mintCap: bigint;
  paused: boolean;
  minterRole: string;
  pauserRole: string;
  blacklistAdmin: string;
  balances: Map<string, bigint>;
  allowances: Map<string, Map<string, bigint>>;
  blacklists: Map<string, boolean>;
  whitelists: Map<string, boolean>;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class MDRSRevenueTokenMock {
  state: MockState;
  caller: string;
  contractAddress: string;

  constructor() {
    this.contractAddress = "ST1TEST::mdrs-token";
    this.caller = "ST1TEST";
    this.state = {
      totalSupply: BigInt(0),
      mintCap: BigInt(1000000000000),
      paused: false,
      minterRole: "ST1TEST",
      pauserRole: "ST1TEST",
      blacklistAdmin: "ST1TEST",
      balances: new Map(),
      allowances: new Map(),
      blacklists: new Map(),
      whitelists: new Map(),
    };
  }

  reset() {
    this.state = {
      totalSupply: BigInt(0),
      mintCap: BigInt(1000000000000),
      paused: false,
      minterRole: "ST1TEST",
      pauserRole: "ST1TEST",
      blacklistAdmin: "ST1TEST",
      balances: new Map(),
      allowances: new Map(),
      blacklists: new Map(),
      whitelists: new Map(),
    };
  }

  private requireNotPaused(): Result<boolean> {
    return this.state.paused ? { ok: false, value: false } : { ok: true, value: true };
  }

  private requireNotBlacklisted(account: string): Result<boolean> {
    return this.state.blacklists.get(account) ? { ok: false, value: false } : { ok: true, value: true };
  }

  private requireWhitelisted(account: string): Result<boolean> {
    const wl = this.state.whitelists.get(account) || false;
    return this.state.paused && !wl ? { ok: false, value: false } : { ok: true, value: true };
  }

  private requireMinterRole(): Result<boolean> {
    return this.caller === this.state.minterRole ? { ok: true, value: true } : { ok: false, value: false };
  }

  private requirePauserRole(): Result<boolean> {
    return this.caller === this.state.pauserRole ? { ok: true, value: true } : { ok: false, value: false };
  }

  private requireBlacklistRole(): Result<boolean> {
    return this.caller === this.state.blacklistAdmin ? { ok: true, value: true } : { ok: false, value: false };
  }

  private safeTransfer(amount: bigint, from: string, to: string): Result<boolean> {
    if (from === to) return { ok: false, value: false };
    if (amount <= BigInt(0)) return { ok: false, value: false };
    const balance = this.state.balances.get(from) || BigInt(0);
    if (balance < amount) return { ok: false, value: false };
    this.state.balances.set(from, balance - amount);
    const toBalance = this.state.balances.get(to) || BigInt(0);
    this.state.balances.set(to, toBalance + amount);
    return { ok: true, value: true };
  }

  getName(): Result<string> {
    return { ok: true, value: "MatchDay Revenue Share Token" };
  }

  getSymbol(): Result<string> {
    return { ok: true, value: "MDRS" };
  }

  getDecimals(): Result<number> {
    return { ok: true, value: 6 };
  }

  getBalance(account: string): Result<bigint> {
    return { ok: true, value: this.state.balances.get(account) || BigInt(0) };
  }

  getTotalSupply(): Result<bigint> {
    return { ok: true, value: this.state.totalSupply };
  }

  getAllowance(owner: string, spender: string): Result<bigint> {
    const allowanceMap = this.state.allowances.get(owner) || new Map();
    return { ok: true, value: allowanceMap.get(spender) || BigInt(0) };
  }

  isPaused(): Result<boolean> {
    return { ok: true, value: this.state.paused };
  }

  isBlacklisted(account: string): Result<boolean> {
    return { ok: true, value: this.state.blacklists.get(account) || false };
  }

  isWhitelisted(account: string): Result<boolean> {
    return { ok: true, value: this.state.whitelists.get(account) || false };
  }

  hasMinterRole(who: string): Result<boolean> {
    return { ok: true, value: who === this.state.minterRole };
  }

  hasPauserRole(who: string): Result<boolean> {
    return { ok: true, value: who === this.state.pauserRole };
  }

  hasBlacklistRole(who: string): Result<boolean> {
    return { ok: true, value: who === this.state.blacklistAdmin };
  }

  transfer(amount: bigint, sender: string, recipient: string): Result<boolean> {
    if (this.caller !== sender) return { ok: false, value: false };
    const pausedCheck = this.requireNotPaused();
    if (!pausedCheck.ok) return pausedCheck;
    const senderCheck = this.requireNotBlacklisted(sender);
    if (!senderCheck.ok) return senderCheck;
    const recipientCheck = this.requireNotBlacklisted(recipient);
    if (!recipientCheck.ok) return recipientCheck;
    const wlSender = this.requireWhitelisted(sender);
    if (!wlSender.ok) return wlSender;
    const wlRecipient = this.requireWhitelisted(recipient);
    if (!wlRecipient.ok) return wlRecipient;
    return this.safeTransfer(amount, sender, recipient);
  }

  transferFrom(amount: bigint, owner: string, spender: string, recipient: string): Result<boolean> {
    if (this.caller !== spender) return { ok: false, value: false };
    const pausedCheck = this.requireNotPaused();
    if (!pausedCheck.ok) return pausedCheck;
    const ownerCheck = this.requireNotBlacklisted(owner);
    if (!ownerCheck.ok) return ownerCheck;
    const spenderCheck = this.requireNotBlacklisted(spender);
    if (!spenderCheck.ok) return spenderCheck;
    const recipientCheck = this.requireNotBlacklisted(recipient);
    if (!recipientCheck.ok) return recipientCheck;
    const wlOwner = this.requireWhitelisted(owner);
    if (!wlOwner.ok) return wlOwner;
    const wlSpender = this.requireWhitelisted(spender);
    if (!wlSpender.ok) return wlSpender;
    const wlRecipient = this.requireWhitelisted(recipient);
    if (!wlRecipient.ok) return wlRecipient;
    const currentAllowance = this.getAllowance(owner, spender).value;
    if (currentAllowance < amount) return { ok: false, value: false };
    const allowanceMap = this.state.allowances.get(owner) || new Map();
    allowanceMap.set(spender, currentAllowance - amount);
    this.state.allowances.set(owner, allowanceMap);
    return this.safeTransfer(amount, owner, recipient);
  }

  approve(spender: string, amount: bigint): Result<boolean> {
    const pausedCheck = this.requireNotPaused();
    if (!pausedCheck.ok) return pausedCheck;
    const callerCheck = this.requireNotBlacklisted(this.caller);
    if (!callerCheck.ok) return callerCheck;
    const wlCaller = this.requireWhitelisted(this.caller);
    if (!wlCaller.ok) return wlCaller;
    const allowanceMap = this.state.allowances.get(this.caller) || new Map();
    allowanceMap.set(spender, amount);
    this.state.allowances.set(this.caller, allowanceMap);
    return { ok: true, value: true };
  }

  increaseAllowance(spender: string, addedValue: bigint): Result<boolean> {
    const pausedCheck = this.requireNotPaused();
    if (!pausedCheck.ok) return pausedCheck;
    const callerCheck = this.requireNotBlacklisted(this.caller);
    if (!callerCheck.ok) return callerCheck;
    const wlCaller = this.requireWhitelisted(this.caller);
    if (!wlCaller.ok) return wlCaller;
    const current = this.getAllowance(this.caller, spender).value;
    const newAllowance = current + addedValue;
    const allowanceMap = this.state.allowances.get(this.caller) || new Map();
    allowanceMap.set(spender, newAllowance);
    this.state.allowances.set(this.caller, allowanceMap);
    return { ok: true, value: true };
  }

  decreaseAllowance(spender: string, subtractedValue: bigint): Result<boolean> {
    const pausedCheck = this.requireNotPaused();
    if (!pausedCheck.ok) return pausedCheck;
    const callerCheck = this.requireNotBlacklisted(this.caller);
    if (!callerCheck.ok) return callerCheck;
    const wlCaller = this.requireWhitelisted(this.caller);
    if (!wlCaller.ok) return wlCaller;
    const current = this.getAllowance(this.caller, spender).value;
    if (current < subtractedValue) return { ok: false, value: false };
    const newAllowance = current - subtractedValue;
    const allowanceMap = this.state.allowances.get(this.caller) || new Map();
    allowanceMap.set(spender, newAllowance);
    this.state.allowances.set(this.caller, allowanceMap);
    return { ok: true, value: true };
  }

  mint(to: string, amount: bigint): Result<boolean> {
    const minterCheck = this.requireMinterRole();
    if (!minterCheck.ok) return minterCheck;
    const pausedCheck = this.requireNotPaused();
    if (!pausedCheck.ok) return pausedCheck;
    if (to === this.contractAddress) return { ok: false, value: false };
    if (amount <= BigInt(0)) return { ok: false, value: false };
    const newTotal = this.state.totalSupply + amount;
    if (newTotal > this.state.mintCap) return { ok: false, value: false };
    this.state.balances.set(to, (this.state.balances.get(to) || BigInt(0)) + amount);
    this.state.totalSupply = newTotal;
    return { ok: true, value: true };
  }

  burn(from: string, amount: bigint): Result<boolean> {
    if (this.caller !== from) return { ok: false, value: false };
    const pausedCheck = this.requireNotPaused();
    if (!pausedCheck.ok) return pausedCheck;
    const fromCheck = this.requireNotBlacklisted(from);
    if (!fromCheck.ok) return fromCheck;
    const wlFrom = this.requireWhitelisted(from);
    if (!wlFrom.ok) return wlFrom;
    if (amount <= BigInt(0)) return { ok: false, value: false };
    const balance = this.state.balances.get(from) || BigInt(0);
    if (balance < amount) return { ok: false, value: false };
    this.state.balances.set(from, balance - amount);
    this.state.totalSupply -= amount;
    return { ok: true, value: true };
  }

  batchTransfer(transfers: TokenTransfer[]): Result<bigint> {
    const pausedCheck = this.requireNotPaused();
    if (!pausedCheck.ok) return { ok: false, value: BigInt(ERR_NOT_PAUSED) };
    const callerCheck = this.requireNotBlacklisted(this.caller);
    if (!callerCheck.ok) return { ok: false, value: BigInt(ERR_BLACKLISTED) };
    const wlCaller = this.requireWhitelisted(this.caller);
    if (!wlCaller.ok) return { ok: false, value: BigInt(ERR_WHITELIST_REQUIRED) };
    if (transfers.length > 200) return { ok: false, value: BigInt(ERR_BATCH_EXCEEDED) };
    let totalTransferred = BigInt(0);
    for (const transfer of transfers) {
      if (transfer.to === this.contractAddress) return { ok: false, value: BigInt(ERR_ZERO_ADDRESS) };
      const toCheck = this.requireNotBlacklisted(transfer.to);
      if (!toCheck.ok) return { ok: false, value: BigInt(ERR_BLACKLISTED) };
      const wlTo = this.requireWhitelisted(transfer.to);
      if (!wlTo.ok) return { ok: false, value: BigInt(ERR_WHITELIST_REQUIRED) };
      const transferResult = this.safeTransfer(transfer.amount, this.caller, transfer.to);
      if (!transferResult.ok) return { ok: false, value: BigInt(ERR_INVALID_AMOUNT) };
      totalTransferred += transfer.amount;
    }
    return { ok: true, value: totalTransferred };
  }

  pause(): Result<boolean> {
    const pauserCheck = this.requirePauserRole();
    if (!pauserCheck.ok) return pauserCheck;
    if (this.state.paused) return { ok: false, value: false };
    this.state.paused = true;
    return { ok: true, value: true };
  }

  unpause(): Result<boolean> {
    const pauserCheck = this.requirePauserRole();
    if (!pauserCheck.ok) return pauserCheck;
    if (!this.state.paused) return { ok: false, value: false };
    this.state.paused = false;
    return { ok: true, value: true };
  }

  blacklistAccount(account: string): Result<boolean> {
    const roleCheck = this.requireBlacklistRole();
    if (!roleCheck.ok) return roleCheck;
    if (account === this.contractAddress) return { ok: false, value: false };
    this.state.blacklists.set(account, true);
    return { ok: true, value: true };
  }

  unblacklistAccount(account: string): Result<boolean> {
    const roleCheck = this.requireBlacklistRole();
    if (!roleCheck.ok) return roleCheck;
    if (account === this.contractAddress) return { ok: false, value: false };
    this.state.blacklists.set(account, false);
    return { ok: true, value: true };
  }

  whitelistAccount(account: string): Result<boolean> {
    const roleCheck = this.requireBlacklistRole();
    if (!roleCheck.ok) return roleCheck;
    if (account === this.contractAddress) return { ok: false, value: false };
    this.state.whitelists.set(account, true);
    return { ok: true, value: true };
  }

  unwhitelistAccount(account: string): Result<boolean> {
    const roleCheck = this.requireBlacklistRole();
    if (!roleCheck.ok) return roleCheck;
    if (account === this.contractAddress) return { ok: false, value: false };
    this.state.whitelists.set(account, false);
    return { ok: true, value: true };
  }

  setMinterRole(newMinter: string): Result<boolean> {
    const pauserCheck = this.requirePauserRole();
    if (!pauserCheck.ok) return pauserCheck;
    if (newMinter === this.contractAddress) return { ok: false, value: false };
    this.state.minterRole = newMinter;
    return { ok: true, value: true };
  }

  setPauserRole(newPauser: string): Result<boolean> {
    const pauserCheck = this.requirePauserRole();
    if (!pauserCheck.ok) return pauserCheck;
    if (newPauser === this.contractAddress) return { ok: false, value: false };
    this.state.pauserRole = newPauser;
    return { ok: true, value: true };
  }

  setBlacklistAdmin(newAdmin: string): Result<boolean> {
    const pauserCheck = this.requirePauserRole();
    if (!pauserCheck.ok) return pauserCheck;
    if (newAdmin === this.contractAddress) return { ok: false, value: false };
    this.state.blacklistAdmin = newAdmin;
    return { ok: true, value: true };
  }

  setMintCap(newCap: bigint): Result<boolean> {
    const pauserCheck = this.requirePauserRole();
    if (!pauserCheck.ok) return pauserCheck;
    if (newCap <= BigInt(0)) return { ok: false, value: false };
    this.state.mintCap = newCap;
    return { ok: true, value: true };
  }
}

describe("MDRSRevenueToken", () => {
  let contract: MDRSRevenueTokenMock;

  beforeEach(() => {
    contract = new MDRSRevenueTokenMock();
    contract.reset();
  });

  it("gets token metadata correctly", () => {
    expect(contract.getName().value).toBe("MatchDay Revenue Share Token");
    expect(contract.getSymbol().value).toBe("MDRS");
    expect(contract.getDecimals().value).toBe(6);
  });

  it("transfers tokens successfully", () => {
    contract.mint("ST1TEST", BigInt(1000));
    contract.caller = "ST1TEST";
    const result = contract.transfer(BigInt(500), "ST1TEST", "ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getBalance("ST1TEST").value).toBe(BigInt(500));
    expect(contract.getBalance("ST2TEST").value).toBe(BigInt(500));
  });

  it("rejects transfer when paused", () => {
    contract.pause();
    contract.mint("ST1TEST", BigInt(1000));
    contract.caller = "ST1TEST";
    const result = contract.transfer(BigInt(500), "ST1TEST", "ST2TEST");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects transfer from blacklisted account", () => {
    contract.blacklistAccount("ST1TEST");
    contract.mint("ST1TEST", BigInt(1000));
    contract.caller = "ST1TEST";
    const result = contract.transfer(BigInt(500), "ST1TEST", "ST2TEST");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("transfers from approved spender", () => {
    contract.mint("ST1TEST", BigInt(1000));
    contract.caller = "ST1TEST";
    contract.approve("ST3TEST", BigInt(500));
    contract.caller = "ST3TEST";
    const result = contract.transferFrom(BigInt(500), "ST1TEST", "ST3TEST", "ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getBalance("ST1TEST").value).toBe(BigInt(500));
    expect(contract.getBalance("ST2TEST").value).toBe(BigInt(500));
    expect(contract.getAllowance("ST1TEST", "ST3TEST").value).toBe(BigInt(0));
  });

  it("mints tokens successfully", () => {
    contract.caller = "ST1TEST";
    const result = contract.mint("ST2TEST", BigInt(1000));
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getBalance("ST2TEST").value).toBe(BigInt(1000));
    expect(contract.getTotalSupply().value).toBe(BigInt(1000));
  });

  it("rejects mint exceeding cap", () => {
    contract.caller = "ST1TEST";
    contract.setMintCap(BigInt(500));
    const result = contract.mint("ST2TEST", BigInt(1000));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("burns tokens successfully", () => {
    contract.mint("ST1TEST", BigInt(1000));
    contract.caller = "ST1TEST";
    const result = contract.burn("ST1TEST", BigInt(500));
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getBalance("ST1TEST").value).toBe(BigInt(500));
    expect(contract.getTotalSupply().value).toBe(BigInt(500));
  });

  it("performs batch transfer successfully", () => {
    contract.mint("ST1TEST", BigInt(2000));
    contract.caller = "ST1TEST";
    const transfers: TokenTransfer[] = [
      { to: "ST2TEST", amount: BigInt(500) },
      { to: "ST3TEST", amount: BigInt(500) },
    ];
    const result = contract.batchTransfer(transfers);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(BigInt(1000));
    expect(contract.getBalance("ST2TEST").value).toBe(BigInt(500));
    expect(contract.getBalance("ST3TEST").value).toBe(BigInt(500));
  });

  it("rejects batch transfer exceeding limit", () => {
    contract.mint("ST1TEST", BigInt(10000));
    contract.caller = "ST1TEST";
    const transfers: TokenTransfer[] = new Array(201).fill({ to: "ST2TEST", amount: BigInt(1) });
    const result = contract.batchTransfer(transfers);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(BigInt(ERR_BATCH_EXCEEDED));
  });

  it("pauses and unpauses successfully", () => {
    contract.caller = "ST1TEST";
    const pauseResult = contract.pause();
    expect(pauseResult.ok).toBe(true);
    expect(pauseResult.value).toBe(true);
    expect(contract.isPaused().value).toBe(true);
    const unpauseResult = contract.unpause();
    expect(unpauseResult.ok).toBe(true);
    expect(unpauseResult.value).toBe(true);
    expect(contract.isPaused().value).toBe(false);
  });

  it("rejects pause when already paused", () => {
    contract.caller = "ST1TEST";
    contract.pause();
    const result = contract.pause();
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("blacklists and unblacklists account", () => {
    contract.caller = "ST1TEST";
    const blacklistResult = contract.blacklistAccount("ST2TEST");
    expect(blacklistResult.ok).toBe(true);
    expect(blacklistResult.value).toBe(true);
    expect(contract.isBlacklisted("ST2TEST").value).toBe(true);
    const unblacklistResult = contract.unblacklistAccount("ST2TEST");
    expect(unblacklistResult.ok).toBe(true);
    expect(unblacklistResult.value).toBe(true);
    expect(contract.isBlacklisted("ST2TEST").value).toBe(false);
  });

  it("sets roles successfully", () => {
    contract.caller = "ST1TEST";
    const result = contract.setMinterRole("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.hasMinterRole("ST2TEST").value).toBe(true);
  });

  it("rejects role set to zero address", () => {
    contract.caller = "ST1TEST";
    const result = contract.setMinterRole(contract.contractAddress);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets mint cap successfully", () => {
    contract.caller = "ST1TEST";
    const result = contract.setMintCap(BigInt(5000));
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.mintCap).toBe(BigInt(5000));
  });

  it("increases allowance successfully", () => {
    contract.caller = "ST1TEST";
    contract.increaseAllowance("ST2TEST", BigInt(1000));
    expect(contract.getAllowance("ST1TEST", "ST2TEST").value).toBe(BigInt(1000));
  });

  it("decreases allowance successfully", () => {
    contract.caller = "ST1TEST";
    contract.increaseAllowance("ST2TEST", BigInt(1000));
    contract.decreaseAllowance("ST2TEST", BigInt(500));
    expect(contract.getAllowance("ST1TEST", "ST2TEST").value).toBe(BigInt(500));
  });

  it("rejects decrease below zero", () => {
    contract.caller = "ST1TEST";
    contract.decreaseAllowance("ST2TEST", BigInt(500));
    expect(contract.getAllowance("ST1TEST", "ST2TEST").value).toBe(BigInt(0));
    const result = contract.decreaseAllowance("ST2TEST", BigInt(100));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects mint to zero address", () => {
    contract.caller = "ST1TEST";
    const result = contract.mint(contract.contractAddress, BigInt(1000));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});