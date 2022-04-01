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
            const token = testToken.address;
            await contract.addAllowedToken(token);
            expect(await contract.tokenIsAllowed(token)).to.equal(true);
        });

        it("Should not add a new allowed token being non-Admin", async function () {
            const token = testToken.address;
            await expect(contract.connect(accounts[1]).addAllowedToken(token))
                .to.be.revertedWith("TokenFarm: Only admins can call this function.");
        });

        it("Should remove an allowed token being Admin", async function () {
            const token = testToken.address;
            // Add the token first.
            await contract.addAllowedToken(token);
            expect(await contract.tokenIsAllowed(token)).to.equal(true);
            // Remove the token.
            await contract.removeAllowedToken(token);
            expect(await contract.tokenIsAllowed(token)).to.equal(false);
        });

        it("Should not remove an allowed token being non-Admin", async function () {
            const token = testToken.address;
            // Add the token first.
            await contract.addAllowedToken(token);
            expect(await contract.tokenIsAllowed(token)).to.equal(true);
            // Remove the token.
            await expect(contract.connect(accounts[1]).removeAllowedToken(token))
                .to.be.revertedWith("TokenFarm: Only admins can call this function.");
        });
    });
});
