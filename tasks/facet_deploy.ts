import { task, types } from 'hardhat/config';

task('facet-deploy', 'Deploy the storage rewrite facet')
  .addParam(
    'authorizedSender',
    'The account authorized to call the storage rewrite function',
    undefined,
    types.string,
  )
  .setAction(async (args, hre) => {
    const [deployerSigner] = await hre.ethers.getSigners();

    const facetContract = await hre.ethers.deployContract(
      'StorageRewrite',
      [args.authorizedSender],
      deployerSigner,
    );

    console.log(
      `Storage rewrite facet deployed to ${await facetContract.getAddress()}`,
    );

    return await facetContract.getAddress();
  });
