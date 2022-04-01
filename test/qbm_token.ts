import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, deployments, getNamedAccounts } from "hardhat";

const etherToWei = (eth: string) => ethers.utils.parseUnits(eth);
const ContractName = "QBMToken";

describe("QBM Token", function () {
    let contract: Contract;
    let deployer: string;
	let accounts: SignerWithAddress[];
    
	beforeEach(async () => {
        // Get the deployment
		await deployments.fixture([ContractName]);
		const ContractDeployment = await deployments.get(ContractName);
		// Get the accounts.
		deployer = (await getNamedAccounts()).deployer;
		accounts = await ethers.getSigners();
		// Get a contract instance.
		contract = await ethers.getContractAt(ContractName, ContractDeployment.address);
	});

    describe("Basic configuration", function () {
        it("Should have the correct name", async function () {
            expect(await contract.name()).to.equal("QBM Token");
        });

        it("Should have the correct symbol", async function () {
            expect(await contract.symbol()).to.equal("QBM");
        });

        it("Should have the correct decimals", async function () {
            expect(await contract.decimals()).to.equal(18);
        });

        it("Should have set the correct roles", async function () {
            const AdminRole = await contract.DEFAULT_ADMIN_ROLE();
            expect(await contract.hasRole(AdminRole, deployer)).to.equal(true);
        });
    });

    describe("Minting", function () {
        it("Should mint tokens being minter", async function () {
            const amount = etherToWei("1");
            await contract.mint(deployer, amount);
            expect(await contract.balanceOf(deployer)).to.equal(amount);
        });

        it("Should mint tokens to another user being minter", async function () {
            const amount = etherToWei("1");
            const user = accounts[1].address;
            await contract.mint(user, amount);
            expect(await contract.balanceOf(user)).to.equal(amount);
        }); 

        it("Should not mint tokens being other accounts", async function () {
            const amount = etherToWei("1");
            const account = accounts[1].address;
            await expect(contract.connect(accounts[1]).mint(account, amount))
                .to.be.revertedWith("Only a minter can mint.");
        });

        it("Should mint tokens after receiving Minter role", async function () {
            const amount = etherToWei("1");
            const account = accounts[1].address;
            await contract.grantRole(contract.MINTER_ROLE(), account);
            await contract.connect(accounts[1]).mint(account, amount);
            expect(await contract.balanceOf(account)).to.equal(amount);
        });
    });
});
