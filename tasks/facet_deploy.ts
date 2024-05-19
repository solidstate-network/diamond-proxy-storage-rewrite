import { task, types } from 'hardhat/config';

task('facet-deploy', 'Deploy the storage rewrite facet')
  .addOptionalParam(
    'deployer',
    'The account used to deploy the storage rewrite facet (defaults to first account loaded into Hardhat environment)',
    undefined,
    types.string,
  )
  .addParam(
    'authorizedSender',
    'The account authorized to call the storage rewrite function',
    undefined,
    types.string,
  )
  .setAction(async (args, hre) => {
    let deployerSigner;

    if (args.deployer) {
      deployerSigner = await hre.ethers.getSigner(args.deployer);
    } else {
      [deployerSigner] = await hre.ethers.getSigners();
    }

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
