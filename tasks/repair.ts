import IERC173 from '@solidstate/abi/IERC173.json';
import { task, types } from 'hardhat/config';

task(
  'repair',
  'Deploy the storage rewrite facet, connect it to a diamond, fix the storage, and remove the facet',
)
  .addOptionalParam(
    'deployer',
    'The account used to deploy the storage rewrite facet (defaults to first account loaded into Hardhat environment)',
    undefined,
    types.string,
  )
  .addParam('diamond', 'Address of the diamond proxy', undefined, types.string)
  .addOptionalParam(
    'authorizedSender',
    'The account authorized to call the storage rewrite function (defaults to EIP-173 owner if diamond is specified)',
    undefined,
    types.string,
  )
  .addParam(
    'storageLayoutSeed',
    'Seed string used to calculate storage layout struct location (see README',
    undefined,
    types.string,
  )
  .addParam(
    'selectorMappingOffset',
    'Index within storage layout of the mapping where selectors are stored (see README)',
    undefined,
    types.bigint,
  )
  .addParam(
    'facetsMappingOffset',
    'Index within storage layout of the mapping where facets are stored (see README)',
    undefined,
    types.bigint,
  )
  .addParam(
    'selectorCountOffset',
    'Index within storage layout where the selector count is stored (see README)',
    undefined,
    types.bigint,
  )
  .setAction(async (args, hre) => {
    let authorizedSender = args.authorizedSender;

    if (!authorizedSender) {
      try {
        const ownable = await hre.ethers.getContractAt(IERC173, args.diamond);
        authorizedSender = await ownable.owner.staticCall();
      } catch (error) {
        throw new Error('unable to read owner from diamond');
      }
    }

    const slotsBeforeCut = await hre.run('storage-calculate-diff', {
      diamond: args.diamond,
      storageLayoutSeed: args.storageLayoutSeed,
      selectorMappingOffset: args.selectorMappingOffset,
      facetsMappingOffset: args.facetsMappingOffset,
      selectorCountOffset: args.selectorCountOffset,
    });

    if (slotsBeforeCut.length === 0) {
      console.log('No issues detected, aborting.');
      return;
    }

    const facet = await hre.run('facet-deploy', {
      deployer: args.deployer,
      authorizedSender,
    });

    await hre.run('facet-cut-add', { diamond: args.diamond, facet });

    const slots = await hre.run('storage-calculate-diff', {
      diamond: args.diamond,
      storageLayoutSeed: args.storageLayoutSeed,
      selectorMappingOffset: args.selectorMappingOffset,
      facetsMappingOffset: args.facetsMappingOffset,
      selectorCountOffset: args.selectorCountOffset,
    });

    // TODO: fail loudly if selectorMappingSlot is incorrect

    await hre.run('storage-rewrite', { slots });

    await hre.run('facet-cut-remove', { diamond: args.diamond });
  });
