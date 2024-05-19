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
    // TODO: remove test RPC methods and ownerSigner references
    await hre.network.provider.send('hardhat_setBalance', [
      '0x01F2d0BD6Ea5F04547F671157285025708a200E8',
      '0xffffffffffffffffffffffff',
    ]);

    const {
      deployer,
      diamond,
      storageLayoutSeed,
      selectorMappingOffset,
      facetsMappingOffset,
      selectorCountOffset,
    } = args;

    let authorizedSender = args.authorizedSender;

    if (!authorizedSender) {
      console.log(
        'No authorizedSender specified; attempting to use owner as fallback...',
      );

      try {
        const ownable = await hre.ethers.getContractAt(IERC173, args.diamond);
        authorizedSender = await ownable.owner.staticCall();
        console.log(
          `Using diamond owner as authorizedSender: ${authorizedSender}`,
        );
      } catch (error) {
        console.log(error);
        throw new Error(
          'Unable to read owner from diamond.  Must specify authorizedSender.',
        );
      }
    }

    console.log('Verifying diamond storage...');

    const slotsBeforeCut = await hre.run('storage-calculate-diff', {
      diamond,
      storageLayoutSeed,
      selectorMappingOffset,
      facetsMappingOffset,
      selectorCountOffset,
    });

    if (slotsBeforeCut.length === 0) {
      throw new Error('No storage rewrite needed for specified diamond.');
    }

    console.log('Deploying StorageRewrite facet...');

    const facet = await hre.run('facet-deploy', { deployer, authorizedSender });

    console.log('Adding StorageRewrite facet to diamond...');

    await hre.run('facet-cut-add', { diamond, facet });

    console.log('Calculating storage rewrites...');

    const slots = await hre.run('storage-calculate-diff', {
      diamond,
      storageLayoutSeed,
      selectorMappingOffset,
      facetsMappingOffset,
      selectorCountOffset,
    });

    console.log('Rewriting storage...');

    await hre.run('storage-rewrite', { diamond, slots });

    console.log('Removing StorageRewrite facet from diamond...');

    await hre.run('facet-cut-remove', { diamond });

    console.log('Validating rewritten storage...');

    const slotsAfterCut = await hre.run('storage-calculate-diff', {
      diamond,
      storageLayoutSeed,
      selectorMappingOffset,
      facetsMappingOffset,
      selectorCountOffset,
    });

    if (slotsAfterCut.length > 0) {
      throw new Error('Failed');
    }

    console.log('Okay');
  });
