import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, deployments, getNamedAccounts } from "hardhat";

const etherToWei = (eth: string) => ethers.utils.parseUnits(eth);

const ContractName = "TokenFarm";
const QBMTokenName = "QBMToken";
const TestTokenName = "TestToken";
const PriceFeedName = "MockV3Aggregator";

describe("Token Farm", function () {
    let deployer: string;
    let accounts: SignerWithAddress[];
    // Contracts instances.
    let contract: Contract;
    let qbmToken: Contract;
    let testToken: Contract;
    let priceFeed: Contract;

    beforeEach(async () => {
        // Get the deployment
        await deployments.fixture([ContractName, QBMTokenName]);
        const ContractDeployment = await deployments.get(ContractName);
        const TokenDeployment = await deployments.get(QBMTokenName);
        const TestTokenDeployment = await deployments.get(TestTokenName);
        const PriceFeedDeployment = await deployments.get(PriceFeedName);
        // Get the accounts.
        deployer = (await getNamedAccounts()).deployer;
        accounts = await ethers.getSigners();
        // Get a contract instance.
        contract = await ethers.getContractAt(ContractName, ContractDeployment.address);
        qbmToken = await ethers.getContractAt(QBMTokenName, TokenDeployment.address);
        testToken = await ethers.getContractAt(TestTokenName, TestTokenDeployment.address);
        priceFeed = await ethers.getContractAt(PriceFeedName, PriceFeedDeployment.address);
    });

    describe("Basic configuration", function () {
        it("Should have set the correct roles", async function () {
            const AdminRole = await contract.DEFAULT_ADMIN_ROLE();
            expect(await contract.hasRole(AdminRole, deployer)).to.equal(true);
        });
    });

    describe("Allowed tokens", function () {
        it("Should have the QBM Token allowed by default", async function () {
            expect(await contract.tokenIsAllowed(qbmToken.address)).to.equal(true);
        });

        it("Should add a new allowed token being Admin", async function () {
            await contract.addAllowedToken(testToken.address);
            expect(await contract.tokenIsAllowed(testToken.address)).to.equal(true);
        });

        it("Should not add a new allowed token being non-Admin", async function () {
            await expect(contract.connect(accounts[1]).addAllowedToken(testToken.address))
                .to.be.revertedWith("TokenFarm: Only admins can call this function.");
        });

        it("Should remove an allowed token being Admin", async function () {
            await contract.addAllowedToken(testToken.address);
            expect(await contract.tokenIsAllowed(testToken.address)).to.equal(true);
            // Remove the token.
            await contract.removeAllowedToken(testToken.address);
            expect(await contract.tokenIsAllowed(testToken.address)).to.equal(false);
        });

        it("Should not remove an allowed token being non-Admin", async function () {
            await contract.addAllowedToken(testToken.address);
            expect(await contract.tokenIsAllowed(testToken.address)).to.equal(true);
            // Remove the token.
            await expect(contract.connect(accounts[1]).removeAllowedToken(testToken.address))
                .to.be.revertedWith("TokenFarm: Only admins can call this function.");
        });
    });

    describe("Token Price feed", function () {
        it("Should get the correct token value", async function () {
            await contract.addAllowedToken(testToken.address);
            // Set the price feed and get the token value.
            await contract.setPriceFeed(testToken.address, priceFeed.address);
            const [price, decimals] = await contract.getTokenValue(testToken.address);
            // Assert the price and decimlas are correct.
            expect(price).to.equal(2000);
            expect(decimals).to.equal(18);
        });

        it("Should not set the price feed for a non-allowed token", async function () {
            await expect(contract.setPriceFeed(testToken.address, priceFeed.address))
                .to.be.revertedWith("TokenFarm: Token is not allowed.");
        });

        it("Should not set the price feed being non-Admin", async function () {
            await contract.addAllowedToken(testToken.address);
            await expect(contract.connect(accounts[1]).setPriceFeed(testToken.address, priceFeed.address))
                .to.be.revertedWith("TokenFarm: Only admins can call this function.");
        });

        it("Should not get the token value for a non-allowed token", async function () {
            await expect(contract.getTokenValue(testToken.address))
                .to.be.revertedWith("TokenFarm: Token is not allowed.");
        });
    });

    describe("Staking", function () {
        beforeEach(async () => {
            await contract.addAllowedToken(testToken.address);
            await contract.setPriceFeed(testToken.address, priceFeed.address);
            await contract.setPriceFeed(qbmToken.address, priceFeed.address);
            await testToken.mint(deployer, etherToWei("1"))
            await qbmToken.mint(deployer, etherToWei("1"));
        });

        it("Should stake single token", async function () {
            await testToken.approve(contract.address, etherToWei("1"));
            // Stake the tokens.
            await contract.stakeTokens(etherToWei("1"), testToken.address);
            // Assert the tokens are staked.
            expect(await testToken.balanceOf(contract.address)).to.equal(etherToWei("1"));
            expect(await contract.getUserSingleTokenValue(deployer, testToken.address)).to.equal(2000);
        });

        it("Should stake multiple tokens", async function () {
            await qbmToken.approve(contract.address, etherToWei("1"));
            await testToken.approve(contract.address, etherToWei("1"));
            // Stake the tokens.
            await contract.stakeTokens(etherToWei("1"), testToken.address);
            await contract.stakeTokens(etherToWei("1"), qbmToken.address);
            // Assert the tokens are staked.
            expect(await testToken.balanceOf(contract.address)).to.equal(etherToWei("1"));
            expect(await qbmToken.balanceOf(contract.address)).to.equal(etherToWei("2")); // Because the contract already has some of this tokens
            expect(await contract.getUserTotalValue(deployer)).to.equal(4000);
            expect(await contract.getUserSingleTokenValue(deployer, testToken.address)).to.equal(2000);
            expect(await contract.getUserSingleTokenValue(deployer, qbmToken.address)).to.equal(2000);
        });

        it("Should not stake non-allowed token", async function () {
            await contract.removeAllowedToken(testToken.address);
            await expect(contract.stakeTokens(etherToWei("1"), testToken.address))
                .to.be.revertedWith("TokenFarm: Token is not allowed.");
        });

        it("Should not stake tokens if the amount is 0", async function () {
            await testToken.approve(contract.address, etherToWei("1"));
            await expect(contract.stakeTokens(etherToWei("0"), testToken.address))
                .to.be.revertedWith("TokenFarm: Amount must be greater than 0.");
        });

        it("Should not stake tokens without enough allowance", async function () {
            await expect(contract.stakeTokens(etherToWei("1"), testToken.address))
                .to.be.revertedWith("TokenFarm: Contract does not have enough allowance for this token.");
        });
    });
});
