import { task, types } from 'hardhat/config';

task('storage-rewrite', 'Write the needed changes to storage')
  .addParam('diamond', 'Address of the diamond proxy', undefined, types.string)
  .addParam('slots', 'Array of slots and their contents', undefined, types.json)
  .setAction(async (args, hre) => {
    const chainId = parseInt(
      await hre.network.provider.send('eth_chainId', []),
    );

    await hre.run('txn-dot-xyz-send', {
      chainId,
      contractAddress: args.diamond,
      fn: 'rewrite',
      fnParams: args.slots,
    });
  });
