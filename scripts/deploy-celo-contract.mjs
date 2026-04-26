import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";

const network = process.env.CELO_NETWORK === "sepolia" ? "sepolia" : "mainnet";
const chain = network === "sepolia" ? celoSepolia : celo;
const rpcUrl = process.env.CELO_RPC_URL ?? chain.rpcUrls.default.http[0];
const privateKey = process.env.CELO_DEPLOYER_PRIVATE_KEY;
const artifactPath = resolve("artifacts", "MiniPayCheckoutRegistry.json");

if (!privateKey) {
  throw new Error("Set CELO_DEPLOYER_PRIVATE_KEY before deploying.");
}

if (!existsSync(artifactPath)) {
  throw new Error(
    "Artifact missing. Run `npm run compile:celo-contract` before deploying.",
  );
}

const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const account = privateKeyToAccount(
  privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`,
);

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(rpcUrl),
});

const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

const hash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode.startsWith("0x")
    ? artifact.bytecode
    : `0x${artifact.bytecode}`,
});

console.log(`Deployment tx: ${hash}`);

const receipt = await publicClient.waitForTransactionReceipt({ hash });

if (!receipt.contractAddress) {
  throw new Error("Deployment receipt did not include a contract address.");
}

console.log(`Network: ${network}`);
console.log(`RPC: ${rpcUrl}`);
console.log(`Contract: ${receipt.contractAddress}`);
console.log(
  `Explorer: ${chain.blockExplorers.default.url}/address/${receipt.contractAddress}`,
);
