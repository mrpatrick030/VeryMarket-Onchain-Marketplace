  // const approveEth = async () => {
  //   if (!walletProvider) return pushToast("⚠️ Connect wallet first", "warning");

  //   try {
  //     setLoading(true);
  //     const provider = new BrowserProvider(walletProvider);
  //     const signer = await provider.getSigner();
  //     const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

  //     // Zero address for ETH
  //     const tx = await contract.approveToken(
  //       "0xA85C486c0e57267c954064Fd500077BDEdFa6704",
  //       true
  //     );
  //     await tx.wait();

  //     pushToast("✅ ETH approved successfully!");
  //   } catch (err) {
  //     console.error(err);
  //     pushToast("❌ Failed to approve ETH", "error");
  //   } finally {
  //     setLoading(false);
  //   }
  // };