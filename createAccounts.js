const {KeyPair, utils, keyStores, connect} = require("near-api-js");
const { writeFile} = require("fs").promises;
const CREDENTIALS_DIR = ".near-credentials";
const path = require("path");
const homedir = require("os").homedir();
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);
const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

 const config = {
     networkId: "testnet",
     keyStore,
     nodeUrl: "https://rpc.testnet.near.org",
     walletUrl: "https://wallet.testnet.near.org",
     helperUrl: "https://helper.testnet.near.org",
     explorerUrl: "https://explorer.testnet.near.org",
};


// Generate account id
const generateAccountId = (name) => {
    const randomNumber = Math.floor(Math.random() * (99999999999999 - 10000000000000) + 10000000000000);
    const accountId = `${name || 'dev'}-${Date.now()}-${randomNumber}`;
    return accountId;
};
const generateMasterAccountId = (name) => {
    const randomNumber = Math.floor(Math.random() * (99999999999999 - 10000000000000) + 10000000000000);
    const accountId = `${name || 'master_dev'}-${Date.now()}-${randomNumber}`;
    return accountId;
};
const generateRaffleAccountId = (name) => {
    const randomNumber = Math.floor(Math.random() * (99999999999999 - 10000000000000) + 10000000000000);
    const accountRaffleId = `${name || 'raffle_dev'}-${Date.now()}-${randomNumber}`;
    return accountRaffleId;
};
const createMasterAccount = async () =>  {
    const near = await connect(config);
    const masterAccountId = generateMasterAccountId();
    const accountFilePath = `${credentialsPath}/dev-account`;
    const accountFilePathEnv = `${credentialsPath}/dev-account.env`;
    const keyPair = await KeyPair.fromRandom('ed25519');

    await near.accountCreator.createAccount(masterAccountId, keyPair.publicKey);
    await keyStore.setKey(config.networkId, masterAccountId, keyPair);
    await writeFile(accountFilePath, masterAccountId);
    await writeFile(accountFilePathEnv, `CONTRACT_NAME=${masterAccountId}`);
    return masterAccountId;
};


const createSubAccount = async (name,  masterAccount ) =>  {
    const subAccountId = generateAccountId();
    const keyPair = KeyPair.fromRandom("ed25519");
    await keyStore.setKey(config.networkId, subAccountId, keyPair);
    await masterAccount.functionCall({
        contractId: "testnet",
        methodName: "create_account",
        args: {
            new_account_id: subAccountId,
            new_public_key: keyPair.publicKey.toString(),
        },
        gas: "300000000000000",
        attachedDeposit: utils.format.parseNearAmount('10'),
    });
    return subAccountId;
};

const createRuffleAccount = async (masterAccount) =>  {
    const subAccountId = generateRaffleAccountId();
    const keyPair = KeyPair.fromRandom("ed25519");
    await keyStore.setKey(config.networkId, subAccountId, keyPair);
    await masterAccount.functionCall({
        contractId: "testnet",
        methodName: "create_account",
        args: {
            new_account_id: subAccountId,
            new_public_key: keyPair.publicKey.toString(),
        },
        gas: "300000000000000",
        attachedDeposit: utils.format.parseNearAmount('50'),
    });
    return subAccountId;
};


 exports.createSubAccount = createSubAccount
exports.createMasterAccount = createMasterAccount
exports.createRuffleAccount = createRuffleAccount
