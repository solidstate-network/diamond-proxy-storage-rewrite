import IDiamondWritable from '@solidstate/abi/IDiamondWritable.json';
import { task, types } from 'hardhat/config';

task(
  'facet-cut-remove',
  'Remove the storage rewrite function from a diamond proxy',
)
  .addParam('diamond', 'Address of the diamond proxy', undefined, types.string)
  .setAction(async (args, hre) => {
    const ownerSigner = await hre.ethers.getImpersonatedSigner(
      '0x01F2d0BD6Ea5F04547F671157285025708a200E8',
    );

    const diamondContract = await hre.ethers.getContractAt(
      IDiamondWritable,
      args.diamond,
      ownerSigner,
    );

    const facetContract = await hre.ethers.getContractAt(
      'StorageRewrite',
      args.diamond,
    );

    const { selector } = facetContract.getFunction(
      'rewrite((uint256,bytes32)[])',
    ).fragment;

    const facetCuts = [
      {
        target: hre.ethers.ZeroAddress,
        selectors: [selector],
        action: 2,
      },
    ];

    await diamondContract.diamondCut(facetCuts, hre.ethers.ZeroAddress, '0x');
  });
