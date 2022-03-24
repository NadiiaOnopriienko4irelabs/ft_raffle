const AMOUNT = '3';
const { connect, KeyPair, keyStores, utils } = require("near-api-js");
const path = require("path");
const { writeFile, readFile } = require("fs").promises;
const homedir = require("os").homedir();
const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);
const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

const config = {
    keyStore,
    networkId: "testnet",
    nodeUrl: "https://rpc.testnet.near.org",
    helperUrl: 'https://near-contract-helper.onrender.com'
};

// Generate account id
const generateAccountId = (name) => {
    const randomNumber = Math.floor(Math.random() * (99999999999999 - 10000000000000) + 10000000000000);
    const accountId = `${name || 'dev'}-${Date.now()}-${randomNumber}`;
    return accountId;
};

const createMasterAccount = async (near) => {
  const masterAccountId = generateAccountId();
  const accountFilePath = `${credentialsPath}/dev-account`;
  const accountFilePathEnv = `${credentialsPath}/dev-account.env`;
  const keyPair = await KeyPair.fromRandom('ed25519');

  await near.accountCreator.createAccount(masterAccountId, keyPair.publicKey);
  await keyStore.setKey(config.networkId, masterAccountId, keyPair);
  await writeFile(accountFilePath, masterAccountId);
  await writeFile(accountFilePathEnv, `CONTRACT_NAME=${masterAccountId}`);
  return masterAccountId;
};

const createSubAccount = async (masterAccount) => {
    const subAccountId = generateAccountId();
    const keyPair = KeyPair.fromRandom("ed25519");
    const publicKey = keyPair.publicKey.toString();
    await keyStore.setKey(config.networkId, subAccountId, keyPair);
    await masterAccount.functionCall({
        contractId: "testnet",
        methodName: "create_account",
        args: {
          new_account_id: subAccountId,
          new_public_key: keyPair.publicKey.toString(),
        },
        gas: "300000000000000",
        attachedDeposit: utils.format.parseNearAmount(AMOUNT),
    });
    return subAccountId;
};
  
const playingWithRafflePrizes = async () => {
    const near = await connect({ ...config, keyStore });
    const masterAccountId = await createMasterAccount(near);
    const masterAccount = await near.account(masterAccountId);
    const aliceId = await createSubAccount(masterAccount);
    const alice = await near.account(aliceId);
    // const alice = await near.account('dev-1645554248271-57592845254828');
    // const bob = await createSubAccount(masterAccount);
    console.log(alice)
    await alice.deployContract(await readFile('./smartContracts/fungibleToken.wasm'));

    const fungibleTokenArgs = {
        owner_id: alice.accountId,
        total_supply: "1000000000000000",
        metadata: { 
          spec: "ft-1.0.0", 
          name: "Example Token Name", 
          symbol: "EXLT", 
          decimals: 8 
        }
    }

    await alice.functionCall({
        contractId: alice.accountId,
        methodName: "new",
        gas: "30000000000000", 
        args: fungibleTokenArgs,
        attachedDeposit: '0'
    });

}

playingWithRafflePrizes();