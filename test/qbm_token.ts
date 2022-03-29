import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, deployments, getNamedAccounts } from "hardhat";

describe("QBM Token", function () {
	let contract: Contract;
	let accounts, deployer;
	const ContractName = "QBMToken";

	beforeEach(async () => {
		await deployments.fixture([ContractName]);
		const ContractDeployment = await deployments.get(ContractName);
		// Get the accounts.
		{ deployer = await getNamedAccounts(); }
		accounts = await ethers.getSigners();
		// Get a contract instance.
		contract = await ethers.getContractAt(ContractName, ContractDeployment.address);
	});

    describe("Basic configuration", function () {
        it("should have the correct name", async function () {
            expect(await contract.name()).to.equal("QBM Token");
        });

        it("should have the correct symbol", async function () {
            expect(await contract.symbol()).to.equal("QBM");
        });

        it("should have the correct decimals", async function () {
            expect(await contract.decimals()).to.equal(18);
        });
    });
});
