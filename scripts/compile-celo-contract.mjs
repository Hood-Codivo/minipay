import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import solc from "solc";

const contractPath = resolve("contracts", "MiniPayCheckoutRegistry.sol");
const artifactPath = resolve("artifacts", "MiniPayCheckoutRegistry.json");
const source = readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "MiniPayCheckoutRegistry.sol": {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const diagnostics = output.errors ?? [];
const fatalErrors = diagnostics.filter((entry) => entry.severity === "error");

if (fatalErrors.length > 0) {
  fatalErrors.forEach((entry) => {
    console.error(entry.formattedMessage);
  });
  process.exit(1);
}

diagnostics
  .filter((entry) => entry.severity !== "error")
  .forEach((entry) => console.warn(entry.formattedMessage));

const contract =
  output.contracts["MiniPayCheckoutRegistry.sol"]?.MiniPayCheckoutRegistry;

if (!contract) {
  throw new Error("The MiniPayCheckoutRegistry artifact was not produced.");
}

mkdirSync(dirname(artifactPath), { recursive: true });
writeFileSync(
  artifactPath,
  JSON.stringify(
    {
      contractName: "MiniPayCheckoutRegistry",
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      deployedBytecode: contract.evm.deployedBytecode.object,
    },
    null,
    2,
  ),
);

console.log(`Wrote ${artifactPath}`);
