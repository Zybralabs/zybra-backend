import { ethers } from "ethers"

// Load helper configuration
import HelperConfig from "./HelperConfig.js"

// Load contract ABIs
import MinimalAccountABI from "../abi/MinimalAccount.json" assert { type: "json" };
import EntryPointABI from "../abi/EntryPoint.json" assert { type: "json" };

/**
 * Initialize the blockchain environment.
 * @returns {object} - Contains provider, signer, and config instances.
 */
const initializeBlockchain = () => {
  const helperConfig = new HelperConfig();
  const config = helperConfig.getConfig();

  // Initialize the Ethereum provider
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);

  // Initialize the signer using the private key
  const signer = new ethers.Wallet(config.privateKey, provider);

  return { provider, signer, config };
};



/**
 * Initialize EntryPoint contract instance.
 * @param {string} entryPointAddress - The address of the EntryPoint contract.
 * @param {object} signerOrProvider - Ethers.js signer or provider instance.
 * @returns {object} - EntryPoint contract instance.
 */
const initializeEntryPoint = (entryPointAddress, signerOrProvider) => {
  if (!entryPointAddress) {
    throw new Error("EntryPoint address is required");
  }

  return new ethers.Contract(entryPointAddress, EntryPointABI, signerOrProvider);
};

/**
 * Deploy a contract on the blockchain.
 * @param {array} abi - ABI of the contract.
 * @param {string} bytecode - Bytecode of the contract.
 * @param {object} signer - Ethers.js signer instance.
 * @param {...any} constructorArgs - Constructor arguments for the contract.
 * @returns {object} - Deployed contract instance.
 */
const deployContract = async (abi, bytecode, signer, ...constructorArgs) => {
  try {
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    console.log("Deploying contract...");
    const contract = await factory.deploy(...constructorArgs);
    await contract.deployed();

    console.log(`Contract deployed at: ${contract.address}`);
    return contract;
  } catch (error) {
    console.error("Error deploying contract:", error);
    throw new Error("Contract deployment failed");
  }
};

const generateAndExecuteUserOperation = async (
  minimalAccountAddress,
  dest,
  calldata,
  senderAccount
) => {
  const { signer, config } = initializeBlockchain();

  const entryPoint = initializeEntryPoint(config.entryPoint, signer);

  try {
    // Nonce and gas information
    const nonce = await signer.provider.getTransactionCount(minimalAccountAddress);
    const gasPrice = await signer.provider.getGasPrice();
    const verificationGasLimit = ethers.BigNumber.from("200000");
    const callGasLimit = ethers.BigNumber.from("100000");
    const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei");
    const maxFeePerGas = gasPrice.add(maxPriorityFeePerGas);

    // Create user operation
    const userOp = {
      sender: minimalAccountAddress,
      nonce,
      initCode: "0x",
      callData: calldata,
      accountGasLimits: ethers.BigNumber.from("0x")
        .shl(128)
        .or(verificationGasLimit)
        .or(callGasLimit),
      preVerificationGas: verificationGasLimit,
      gasFees: ethers.BigNumber.from("0x")
        .shl(128)
        .or(maxPriorityFeePerGas)
        .or(maxFeePerGas),
      paymasterAndData: "0x",
      signature: "0x", // Placeholder, to be signed below
    };

    // Hash and sign
    const userOpHash = await entryPoint.getUserOpHash(userOp);
    const digest = ethers.utils.hashMessage(userOpHash);
    const signature = await signer.signMessage(ethers.utils.arrayify(digest));
    userOp.signature = signature;

    console.log("User Operation signed:", userOp);

    // Execute the signed user operation
    console.log("Sending User Operation...");
    const tx = await entryPoint.handleOps([userOp], senderAccount);
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    return receipt;
  } catch (error) {
    console.error("Error during User Operation execution:", error);
    throw new Error("Failed to generate and execute User Operation");
  }
};

/**
 * Initialize a contract instance.
 * @param {string} address - The address of the contract.
 * @param {array} abi - ABI of the contract.
 * @param {object} signerOrProvider - Signer or provider instance.
 * @returns {object} - Contract instance.
 */
const getContractInstance = (address, abi, signerOrProvider) => {
  try {
    return new ethers.Contract(address, abi, signerOrProvider);
  } catch (error) {
    console.error("Error initializing contract instance:", error);
    throw new Error("Failed to initialize contract instance");
  }
};


const deployMinimalAccount = async (userId) => {
  const { signer, config } = initializeBlockchain();

  const MinimalAccountFactory = new ethers.ContractFactory(
    MinimalAccountABI,
    MinimalAccountABI.bytecode,
    signer
  );

  console.log("Deploying MinimalAccount...");
  const minimalAccount = await MinimalAccountFactory.deploy(config.entryPoint);
  await minimalAccount.deployed();

  console.log(`MinimalAccount deployed at: ${minimalAccount.address}`);

  // Optionally transfer ownership to the user
  const tx = await minimalAccount.transferOwnership(config.account);
  await tx.wait();

  console.log(`Ownership transferred to: ${config.account}`);
  return minimalAccount.address;
};


export {
  initializeBlockchain,
  deployContract,
  generateAndExecuteUserOperation,
  getContractInstance,
  deployMinimalAccount,
  initializeEntryPoint,
};
