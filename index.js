
const AMOUNT = '0';
const {createMasterAccount, createSubAccount, createRuffleAccount} = require('./createAccounts')
const { connect, keyStores, utils, Account} = require("near-api-js");
const path = require("path");
const { readFile } = require("fs").promises;
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

// // Generate account id
// const generateAccountId = (name) => {
//     const randomNumber = Math.floor(Math.random() * (99999999999999 - 10000000000000) + 10000000000000);
//     const accountId = `${name || 'dev'}-${Date.now()}-${randomNumber}`;
//     return accountId;
// };
//
// const createMasterAccount = async (near) => {
//   const masterAccountId = generateAccountId();
//   const accountFilePath = `${credentialsPath}/dev-account`;
//   const accountFilePathEnv = `${credentialsPath}/dev-account.env`;
//   const keyPair = await KeyPair.fromRandom('ed25519');
//
//   await near.accountCreator.createAccount(masterAccountId, keyPair.publicKey);
//   await keyStore.setKey(config.networkId, masterAccountId, keyPair);
//   await writeFile(accountFilePath, masterAccountId);
//   await writeFile(accountFilePathEnv, `CONTRACT_NAME=${masterAccountId}`);
//   return masterAccountId;
// };
//
//
// const createSubAccount = async (masterAccount) => {
//     const subAccountId = generateAccountId();
//     const keyPair = KeyPair.fromRandom("ed25519");
//     const publicKey = keyPair.publicKey.toString();
//     await keyStore.setKey(config.networkId, subAccountId, keyPair);
//     await masterAccount.functionCall({
//         contractId: "testnet",
//         methodName: "create_account",
//         args: {
//           new_account_id: subAccountId,
//           new_public_key: keyPair.publicKey.toString(),
//         },
//         gas: "300000000000000",
//         attachedDeposit: utils.format.parseNearAmount(AMOUNT),
//     });
//     return subAccountId;
// };

const playingWithRafflePrizes = async () => {

    console.log('start')
    const near = await connect(config);
    const masterAccountId = await createMasterAccount();
    console.log('master account id')
    console.log(masterAccountId)
    const masterAccount = await near.account(masterAccountId);
    await masterAccount.deployContract(await readFile('./smartContracts/prize.wasm'))
    console.log('master deployed...')
     const aliceId = await createSubAccount(masterAccount);
    const alice = await near.account(aliceId);
    await alice.deployContract(await readFile('./smartContracts/fungibleToken.wasm'));
    console.log('alice deployed...')
    const bobId = await createSubAccount(masterAccount);
    const bob = await near.account(bobId);
    await bob.deployContract(await readFile('./smartContracts/fungibleToken.wasm'));
    console.log('bob  deployed...')
    console.log(bobId)


    const fungibleTokenArgsAlice = {
        owner_id: alice.accountId,
        total_supply: "100000000",
        metadata: {
          spec: "ft-1.0.0",
          name: "Prize token",
          symbol: "Prize",
          decimals: 8
        }
    }

    await alice.functionCall({
        contractId: alice.accountId,
        methodName: "new",
        gas: "30000000000000",
        args: fungibleTokenArgsAlice,
    });
    console.log('ft for alice done...')
    const fungibleTokenArgsBob = {
        owner_id: bob.accountId,
        total_supply: "100000000",
        metadata: {
            spec: "ft-1.0.0",
            name: "Prize token",
            symbol: "Prize",
            decimals: 8
        }
    }

    await bob.functionCall({
        contractId: bob.accountId,
        methodName: "new",
        gas: "30000000000000",
        args: fungibleTokenArgsBob,
    });
    console.log('ft for bob done...')
    console.log('balance alice starts ...')
    const balanc = await alice.getAccountBalance()
    console.log(balanc)
    console.log('balance  bob starts ...')
    const balancBob = await bob.getAccountBalance()

    console.log(balancBob)

    console.log('created raffle account ...')
    const raffleId = await createRuffleAccount(masterAccount);
    const raffle = await near.account(raffleId);
    await raffle.deployContract(await readFile('./smartContracts/raffle.wasm'))
    console.log('raffle account ')
    console.log(raffle)
    console.log('raffle id...')
    console.log(raffleId)

    const raffBal = await raffle.getAccountBalance()
    console.log('balance raffle account ')
    console.log(raffBal)
    console.log('raffle done...')
    console.log('start call raffle .. ')

  const transaction =  await masterAccount.functionCall({
      contractId: raffle.accountId,
      methodName:"new",
        args: {
            fungible_token_account_id: masterAccount.accountId,
            tokens_per_ticket: 5,
            number_of_predefined: 3,
        }
    });
    console.log('transaction .. ')
    console.log(transaction)
    console.log('end')

}

playingWithRafflePrizes();