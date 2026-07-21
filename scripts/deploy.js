/**
 * deploy.js - Deploy both stellar_gigs and reputation_token Soroban contracts to Stellar Testnet,
 * initialize them, and link them on-chain.
 * Uses @stellar/stellar-sdk v13 + Horizon for TX polling.
 *
 * WSL Ubuntu Prerequisites:
 *   1. sudo apt-get install -y build-essential
 *   2. curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
 *   3. npm run deploy:contract
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const sdk = require("@stellar/stellar-sdk");
const {
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Operation,
  StrKey,
  Horizon,
  Address,
  Contract,
  nativeToScVal,
} = sdk;

const { Server: RpcServer, Api, assembleTransaction } = sdk.rpc;

const RPC_URL = "https://soroban-testnet.stellar.org";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

const rewardWasmPath = path.join(
  __dirname,
  "..",
  "target",
  "wasm32-unknown-unknown",
  "release",
  "reputation_token.wasm"
);

const crowdfundWasmPath = path.join(
  __dirname,
  "..",
  "target",
  "wasm32-unknown-unknown",
  "release",
  "stellar_gigs.wasm"
);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll Horizon until TX is found and confirmed */
async function waitForHorizonTx(hash, maxAttempts = 30) {
  const url = `${HORIZON_URL}/transactions/${hash}`;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(3000);
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        const data = await res.json();
        if (data.successful === true) return data;
        if (data.successful === false) {
          throw new Error(`TX failed on Horizon: ${JSON.stringify(data.extras?.result_codes)}`);
        }
      }
    } catch (e) {
      if (e.message.startsWith("TX failed")) throw e;
      // 404 = not yet in ledger, keep waiting
    }
    process.stdout.write(".");
  }
  throw new Error(`TX ${hash} timed out`);
}

/** Upload WASM file to Stellar Testnet and return its SHA-256 hash */
async function uploadWasm(rpc, deployerKeypair, wasmPath) {
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM file not found at: ${wasmPath}`);
  }
  const wasmBytes = fs.readFileSync(wasmPath);
  console.log(`📤 Uploading WASM: ${path.basename(wasmPath)} (${wasmBytes.length} bytes)...`);

  const wasmHash = crypto.createHash("sha256").update(wasmBytes).digest();
  const account = await rpc.getAccount(deployerKeypair.publicKey());

  const uploadTx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm: wasmBytes }))
    .setTimeout(300)
    .build();

  const simUpload = await rpc.simulateTransaction(uploadTx);
  if (Api.isSimulationError(simUpload)) {
    throw new Error("Upload simulation error: " + simUpload.error);
  }

  const preparedUpload = assembleTransaction(uploadTx, simUpload).build();
  preparedUpload.sign(deployerKeypair);

  const uploadSend = await rpc.sendTransaction(preparedUpload);
  console.log(`   TX hash: ${uploadSend.hash}`);

  if (uploadSend.status === "ERROR") {
    throw new Error("Upload send failed: " + JSON.stringify(uploadSend.errorResult));
  }

  await waitForHorizonTx(uploadSend.hash);
  console.log(`✅ WASM ${path.basename(wasmPath)} uploaded and confirmed!`);
  return wasmHash;
}

/** Create contract instance and return its Contract ID */
async function createContractInstance(rpc, deployerKeypair, wasmHash, salt) {
  console.log(`🚀 Creating contract instance...`);
  const account = await rpc.getAccount(deployerKeypair.publicKey());

  const deployTx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createCustomContract({
        address: new Address(deployerKeypair.publicKey()),
        wasmHash: wasmHash,
        salt: salt,
      })
    )
    .setTimeout(300)
    .build();

  const simDeploy = await rpc.simulateTransaction(deployTx);
  if (Api.isSimulationError(simDeploy)) {
    throw new Error("Deploy simulation error: " + simDeploy.error);
  }

  let contractIdStrkey;
  try {
    const simResult = simDeploy;
    if (simResult.result && simResult.result.retval) {
      const retval = simResult.result.retval;
      if (retval.switch().name === "scvAddress") {
        const contractIdBytes = retval.address().contractId();
        contractIdStrkey = StrKey.encodeContract(contractIdBytes);
        console.log("   Contract ID (from simulation):", contractIdStrkey);
      }
    }
  } catch (e) {
    // Keep derivation deterministic as fallback
  }

  const preparedDeploy = assembleTransaction(deployTx, simDeploy).build();
  preparedDeploy.sign(deployerKeypair);

  const deploySend = await rpc.sendTransaction(preparedDeploy);
  console.log(`   TX hash: ${deploySend.hash}`);

  if (deploySend.status === "ERROR") {
    throw new Error("Deploy send failed: " + JSON.stringify(deploySend.errorResult));
  }

  await waitForHorizonTx(deploySend.hash);

  if (!contractIdStrkey) {
    const networkId = crypto
      .createHash("sha256")
      .update(NETWORK_PASSPHRASE)
      .digest();
    const deployerScAddress = new Address(deployerKeypair.publicKey()).toScAddress();

    const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
      new xdr.HashIdPreimageContractId({
        networkId: networkId,
        contractIdPreimage:
          xdr.ContractIdPreimage.contractIdPreimageFromAddress(
            new xdr.ContractIdPreimageFromAddress({
              address: deployerScAddress,
              salt: salt,
            })
          ),
      })
    );

    const contractIdBytes = crypto
      .createHash("sha256")
      .update(preimage.toXDR())
      .digest();

    contractIdStrkey = StrKey.encodeContract(contractIdBytes);
  }

  console.log(`✅ Instance created: ${contractIdStrkey}`);
  return contractIdStrkey;
}

/** Invoke a contract function */
async function invokeContract(rpc, deployerKeypair, contractId, functionName, args) {
  console.log(`✍️  Invoking ${functionName} on contract ${contractId}...`);
  const account = await rpc.getAccount(deployerKeypair.publicKey());
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(300)
    .build();

  const sim = await rpc.simulateTransaction(tx);
  if (Api.isSimulationError(sim)) {
    throw new Error(`Simulation error calling ${functionName} on ${contractId}: ` + sim.error);
  }

  const prepared = assembleTransaction(tx, sim).build();
  prepared.sign(deployerKeypair);

  const send = await rpc.sendTransaction(prepared);
  console.log(`   TX hash: ${send.hash}`);

  if (send.status === "ERROR") {
    throw new Error(`Invocation failed: ` + JSON.stringify(send.errorResult));
  }

  await waitForHorizonTx(send.hash);
  console.log(`✅ ${functionName} completed successfully!`);
}

async function main() {
  console.log("🔨 Compiling StellarGigs workspace smart contracts to WASM...");
  execSync("cargo build --target wasm32-unknown-unknown --release", { stdio: "inherit" });
  console.log("✅ StellarGigs smart contracts compiled.\n");

  // Generate deployer keypair
  const deployerKeypair = Keypair.random();
  console.log(`🔑 Deployer Public Key: ${deployerKeypair.publicKey()}`);

  // Fund via Friendbot
  console.log(`💰 Funding deployer via Friendbot...`);
  const fundRes = await fetch(
    `https://friendbot.stellar.org?addr=${deployerKeypair.publicKey()}`
  );
  if (!fundRes.ok) {
    const errText = await fundRes.text();
    throw new Error("Friendbot failed: " + errText);
  }
  const fundData = await fundRes.json();
  console.log(`✅ Funded! TX: ${fundData.id || fundData.hash || "(ok)"}`);
  await sleep(4000);

  const rpc = new RpcServer(RPC_URL);

  // 1. Upload reputation_token WASM & deploy instance
  console.log("\n--- Deploying GIG Reputation Token Contract ---");
  const rewardWasmHash = await uploadWasm(rpc, deployerKeypair, rewardWasmPath);
  const rewardTokenSalt = Buffer.alloc(32, 1); // salt = 1 for reputation token
  const rewardTokenId = await createContractInstance(rpc, deployerKeypair, rewardWasmHash, rewardTokenSalt);

  // 2. Upload stellar_gigs WASM & deploy instance
  console.log("\n--- Deploying StellarGigs Escrow Contract ---");
  const crowdfundWasmHash = await uploadWasm(rpc, deployerKeypair, crowdfundWasmPath);
  const crowdfundSalt = Buffer.alloc(32, 0); // salt = 0 for stellar_gigs
  const crowdfundId = await createContractInstance(rpc, deployerKeypair, crowdfundWasmHash, crowdfundSalt);

  // 3. Initialize StellarGigs Contract (sets deployer as admin)
  console.log("\n--- Initializing StellarGigs Escrow Contract ---");
  await invokeContract(
    rpc,
    deployerKeypair,
    crowdfundId,
    "initialize",
    [new Address(deployerKeypair.publicKey()).toScVal()]
  );

  // 4. Initialize GIG Reputation Token Contract (sets StellarGigs contract ID as admin)
  console.log("\n--- Initializing GIG Reputation Token Contract ---");
  await invokeContract(
    rpc,
    deployerKeypair,
    rewardTokenId,
    "initialize",
    [
      new Address(crowdfundId).toScVal(),
      nativeToScVal("StellarGigs Reputation"),
      nativeToScVal("GIG"),
    ]
  );

  // 5. Connect GIG Reputation Token to StellarGigs Escrow Contract
  console.log("\n--- Connecting GIG Reputation Token to StellarGigs ---");
  await invokeContract(
    rpc,
    deployerKeypair,
    crowdfundId,
    "set_reward_token",
    [
      new Address(deployerKeypair.publicKey()).toScVal(),
      new Address(rewardTokenId).toScVal(),
    ]
  );

  // ── Update .env.local ────────────────────────────────────────────────────────
  console.log("\n📝 Updating configuration files...");
  const envPath = path.join(__dirname, "..", ".env.local");
  let envContent = fs.readFileSync(envPath, "utf8");

  if (envContent.includes("NEXT_PUBLIC_CROWDFUND_CONTRACT_ID=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_CROWDFUND_CONTRACT_ID=.*/,
      `NEXT_PUBLIC_CROWDFUND_CONTRACT_ID=${crowdfundId}`
    );
  } else {
    envContent = envContent.trimEnd() + `\nNEXT_PUBLIC_CROWDFUND_CONTRACT_ID=${crowdfundId}\n`;
  }

  if (envContent.includes("NEXT_PUBLIC_REWARD_TOKEN_CONTRACT_ID=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_REWARD_TOKEN_CONTRACT_ID=.*/,
      `NEXT_PUBLIC_REWARD_TOKEN_CONTRACT_ID=${rewardTokenId}`
    );
  } else {
    envContent = envContent.trimEnd() + `\nNEXT_PUBLIC_REWARD_TOKEN_CONTRACT_ID=${rewardTokenId}\n`;
  }

  if (envContent.includes("NEXT_PUBLIC_DEPLOYER_ADDRESS=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_DEPLOYER_ADDRESS=.*/,
      `NEXT_PUBLIC_DEPLOYER_ADDRESS=${deployerKeypair.publicKey()}`
    );
  } else {
    envContent = envContent.trimEnd() + `\nNEXT_PUBLIC_DEPLOYER_ADDRESS=${deployerKeypair.publicKey()}\n`;
  }

  if (!envContent.includes("NEXT_PUBLIC_NATIVE_TOKEN_ADDRESS")) {
    envContent = envContent.trimEnd() + "\nNEXT_PUBLIC_NATIVE_TOKEN_ADDRESS=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC\n";
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Updated .env.local`);

  // ── Update README.md ─────────────────────────────────────────────────────────
  const readmePath = path.join(__dirname, "..", "README.md");
  let readmeContent = fs.readFileSync(readmePath, "utf8");

  readmeContent = readmeContent.replace(
    /\| \*\*Contract ID\*\* \| .*\|/,
    `| **StellarGigs Contract ID** | \`${crowdfundId}\` |\n| **GIG Reputation Token Contract ID** | \`${rewardTokenId}\` |`
  );

  readmeContent = readmeContent.replace(
    /\[View Contract on Stellar Expert\]\([^)]+\)/,
    `[View Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/${crowdfundId})`
  );

  readmeContent = readmeContent.replace(
    /\| \*\*Deployer Wallet Address\*\* \| .*\|/,
    `| **Deployer Wallet Address** | \`${deployerKeypair.publicKey()}\` |`
  );

  fs.writeFileSync(readmePath, readmeContent);
  console.log(`✅ Updated README.md`);

  console.log(`\n${"═".repeat(60)}`);
  console.log(`STELLARGIGS CONTRACT ID        : ${crowdfundId}`);
  console.log(`GIG REPUTATION TOKEN ID        : ${rewardTokenId}`);
  console.log(`DEPLOYER ADDRESS               : ${deployerKeypair.publicKey()}`);
  console.log(`EXPLORER LINK                  : https://stellar.expert/explorer/testnet/contract/${crowdfundId}`);
  console.log(`${"═".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("\n❌ Fatal error during StellarGigs deployment:", err.message || err);
  process.exit(1);
});
