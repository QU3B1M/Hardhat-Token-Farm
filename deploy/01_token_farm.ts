import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, DeploymentsExtension } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const LOCAL_ENVS = ["hardhat", "localhost", "ganache"]

const Contract = "TokenFarm";


const deployMocks = async function (deployer: string, deployments: DeploymentsExtension): Promise<void> {
	const { deploy } = deployments;
	const TestTokenConstract = "TestToken";
	const AggregatorConstract = "MockV3Aggregator";
	// Deploy the mocks.
	await deploy(TestTokenConstract, { from: deployer, autoMine: true });
	await deploy(AggregatorConstract, { from: deployer, args: [18, 2000], autoMine: true });
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	const { deployments, getNamedAccounts } = hre;
	const { deploy } = deployments;
	const { deployer } = await getNamedAccounts();
    // Get QBM Token deployment.
	const QBMTokenDeployment = await deployments.get("QBMToken");
	const QBMToken = await ethers.getContractAt("QBMToken", QBMTokenDeployment.address);
    // Deploy contract.
	const tokenFarm = await deploy(Contract, {
		from: deployer,
		args: [QBMTokenDeployment.address],
		log: true,
		autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
	});
    // Deploy mocks if needed.
    if (LOCAL_ENVS.includes(hre.network.name)) {
        await deployMocks(deployer, deployments);
    }
	// Mint tokens to the token farm contract.
	await QBMToken.mint(tokenFarm.address, ethers.utils.parseEther("1"));
};

export default func;
func.tags = [Contract];
