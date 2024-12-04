module.exports = {
    getConfig: () => {
      const networkConfig = {
        entryPoint: "0xEntryPointAddress",
        rpcUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`, // Replace with the actual RPC URL
        privateKey: process.env.PRIVATE_KEY, // Replace with a private key
        account:process.env.WALLET_ADDRESS,
      };
      return networkConfig;
    },
  };
  