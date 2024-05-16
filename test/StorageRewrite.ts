import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { StorageRewrite } from '../typechain-types';

describe('StorageRewrite', () => {
  let authorizedSigner: HardhatEthersSigner;
  let unauthorizedSigner: HardhatEthersSigner;
  let instance: StorageRewrite;

  beforeEach(async () => {
    let deployer;

    [deployer, authorizedSigner, unauthorizedSigner] =
      await ethers.getSigners();

    instance = await ethers.deployContract(
      'StorageRewrite',
      [authorizedSigner.address],
      deployer,
    );
  });

  describe('#rewrite((uint256,bytes32)[])', () => {
    it('writes arbitrary data to arbitratry storage slot', async () => {
      const slot0 = BigInt(ethers.hexlify(ethers.randomBytes(32)));
      const data0 = ethers.hexlify(ethers.randomBytes(32));
      const slot1 = BigInt(ethers.hexlify(ethers.randomBytes(32)));
      const data1 = ethers.hexlify(ethers.randomBytes(32));

      await instance.connect(authorizedSigner).rewrite([
        { slot: slot0, data: data0 },
        { slot: slot1, data: data1 },
      ]);

      expect(
        await hre.network.provider.send('eth_getStorageAt', [
          await instance.getAddress(),
          ethers.toBeHex(slot0),
          'latest',
        ]),
      ).to.equal(data0);

      expect(
        await hre.network.provider.send('eth_getStorageAt', [
          await instance.getAddress(),
          ethers.toBeHex(slot1),
          'latest',
        ]),
      ).to.equal(data1);
    });

    describe('reverts if', () => {
      it('sender is not authorized sender', async () => {
        await expect(instance.connect(unauthorizedSigner).rewrite([])).to.be
          .reverted;
      });
    });
  });
});
