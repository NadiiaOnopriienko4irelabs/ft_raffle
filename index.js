const {
    createMasterAccount,
    createSubAccountAndDepositPrize,
    createRuffleAccount,
} = require("./createAccounts");
const { connect, keyStores, Contract } = require("near-api-js");
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
    helperUrl: "https://near-contract-helper.onrender.com",
};

const raffleContractDemo = async () => {
    const near = await connect(config);
    const prizeAccount = await deployPrizeContract(near);
    const raffleAccount = await deployRaffleContract(near, prizeAccount);
    const prizeContract = new Contract(prizeAccount, prizeAccount.accountId, {
        viewMethods: ["ft_balance_of"],
    });

    const alice = await createSubAccountAndDepositPrize(
        near,
        "alice",
        prizeAccount,
        "10"
    );
    const bob = await createSubAccountAndDepositPrize(
        near,
        "bob",
        prizeAccount,
        "10"
    );

    await displayStatsFor(alice, prizeContract);
    await displayStatsFor(bob, prizeContract);

    //Sending 5 tokens, but as 1 ticket costs 5 prizes 1 price ft token will be refunded to alice
    await buyTicket(prizeAccount, raffleAccount, alice, 6);
    await buyTicket(prizeAccount, raffleAccount, bob, 5);

    await displayStatsFor(alice, prizeContract);
    await displayStatsFor(bob, prizeContract);
};

// deploy prizeAccountId contract
deployPrizeContract = async (near) => {
    const prizeAccountId = await createMasterAccount();
    const prizeAccount = await near.account(prizeAccountId);

    await prizeAccount.deployContract(
        await readFile("./smartContracts/prize.wasm")
    );

    await prizeAccount.functionCall({
        contractId: prizeAccountId,
        methodName: "new",
        gas: "30000000000000",
        args: {
            owner_id: prizeAccountId,
            total_supply: "100000000",
            metadata: {
                spec: "ft-1.0.0",
                name: "Prize token",
                symbol: "Prize",
                decimals: 8,
            },
        },
    });
    return prizeAccount;
};
// deploy raffleId contract
deployRaffleContract = async (near, prizeAccount) => {
    const raffleId = await createRuffleAccount(prizeAccount);
    const raffle = await near.account(raffleId);
    await raffle.deployContract(await readFile("./smartContracts/raffle.wasm"));

    await prizeAccount.functionCall({
        contractId: raffleId,
        methodName: "new",
        gas: "30000000000000",
        args: {
            fungible_token_account_id: prizeAccount.accountId,
            tokens_per_ticket: 5,
            number_of_predefined: 3,
        },
    });
    //Register raffle for FT token
    await prizeAccount.functionCall({
        contractId: prizeAccount.accountId,
        methodName: "storage_deposit",
        args: { account_id: raffleId },
        gas: "30000000000000",
        attachedDeposit: "2350000000000000000000",
    });
    return raffle;
};

//The key part of this example, is a tranfer call
buyTicket = async (prizeAccount, raffleAccount, subAccount, prizeAmmount) => {
    await subAccount.functionCall({
        contractId: prizeAccount.accountId,
        methodName: "ft_transfer_call",
        args: {
            receiver_id: raffleAccount.accountId,
            amount: String(prizeAmmount),
            msg: "buy_ticket",
        },
        gas: "200000000000000",
        attachedDeposit: "1",
    });
};
// get balance of subAccount.accountId
displayStatsFor = async (subAccount, prizeContract) => {
     await prizeContract.ft_balance_of({
        account_id: subAccount.accountId,
    });
};

raffleContractDemo();