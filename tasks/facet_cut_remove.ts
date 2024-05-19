import IDiamondWritable from '@solidstate/abi/IDiamondWritable.json';
import { task, types } from 'hardhat/config';

task(
  'facet-cut-remove',
  'Remove the storage rewrite function from a diamond proxy',
)
  .addParam('diamond', 'Address of the diamond proxy', undefined, types.string)
  .addParam(
    'facet',
    'Address of the storage rewrite facet',
    undefined,
    types.string,
  )
  .setAction(async (args, hre) => {
    const diamondContract = await hre.ethers.getContractAt(
      IDiamondWritable,
      args.diamond,
    );

    const facetContract = await hre.ethers.getContractAt(
      'StorageRewrite',
      args.facet,
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

    const tx = await diamondContract.diamondCut.send(
      facetCuts,
      hre.ethers.ZeroAddress,
      '0x',
    );

    console.log(tx);
  });
