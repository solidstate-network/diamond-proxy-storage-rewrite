import { task, types } from 'hardhat/config';

task(
  'storage-calculate-diff',
  'Calculate the storage changes needed to repair diamond proxy',
)
  .addParam('diamond', 'Address of the diamond proxy', undefined, types.string)
  .addParam(
    'selectorMappingSlot',
    'EVM storage slot of the mapping where selectors are stored (see README)',
    undefined,
    types.bigint,
  )
  .addParam(
    'selectorCountSlot',
    'EVM storage slot the selector count is stored (see README)',
    undefined,
    types.bigint,
  )
  .setAction(async (args, hre) => {
    const blockNumber = await hre.network.provider.send('eth_blockNumber', []);

    // query all DiamondCut events emitted from diamond

    const events: { data: string }[] = await hre.network.provider.send(
      'eth_getLogs',
      [
        {
          fromBlock: '0x0',
          toBlock: blockNumber,
          address: args.diamond,
          topics: [
            '0x8faa70878671ccd212d20771b795c50af8fd3ff6cf27f4bde57e5d4de0aeb673',
          ],
        },
      ],
    );

    // sort events by block number and log index

    events.sort((a, b) => {
      const aIndex =
        (BigInt((a as any).blockNumber) << 256n) + BigInt((a as any).logIndex);
      const bIndex =
        (BigInt((b as any).blockNumber) << 256n) + BigInt((b as any).logIndex);

      if (aIndex > bIndex) {
        return 1;
      } else if (bIndex > aIndex) {
        return -1;
      } else {
        return 0;
      }
    });

    // simulate all diamondCut transactions to determine correct order of selectors in storage

    const currentSelectors: string[] = [];

    for (const { data } of events) {
      const [facetCuts] = hre.ethers.AbiCoder.defaultAbiCoder().decode(
        ['(address,uint8,bytes4[])[]', 'address', 'bytes'],
        data,
      );

      for (const [, action, selectors] of facetCuts) {
        if (action === 0n) {
          for (const selector of selectors) {
            const index = currentSelectors.indexOf(selector);

            if (index >= 0) {
              throw new Error('invalid DiamondCut');
            }

            currentSelectors.push(selector);
          }
        } else {
          for (const selector of selectors) {
            const index = currentSelectors.indexOf(selector);

            if (index === -1) {
              throw new Error('invalid DiamondCut');
            }

            if (action === 2n) {
              currentSelectors[index] =
                currentSelectors[currentSelectors.length - 1];
              currentSelectors.pop();
            }
          }
        }
      }
    }

    // group selectors into buckets of 8, as they would be stored in the EVM

    const packedSelectors = Array.from(currentSelectors.values())
      .reduce<string[][]>((acc, el, index) => {
        const slotIndex = Number(BigInt(index) / 8n);
        acc[slotIndex] ??= [];
        acc[slotIndex].push(el);
        return acc;
      }, [])
      .map((el) => {
        const types = el.map(() => 'bytes4');
        const values = el;

        for (let i = el.length; i < 8; i++) {
          types.push('bytes4');
          values.push('0x00000000');
        }

        return hre.ethers.solidityPacked(types, values);
      });

    // TODO: make sure to check slots that should be empty but might not be

    // calculate storage slot of each selector group

    const slots: { slot: bigint; data: string }[] = packedSelectors.map(
      (data, index) => {
        // const slot= args.selectorMappingSlot + BigInt(index)

        const slot = BigInt(
          hre.ethers.solidityPackedKeccak256(
            ['uint256', 'uint256'],
            [index, args.selectorMappingSlot],
          ),
        );
        return { slot, data };
      },
    );

    // include slot of selector count

    slots.push({
      slot: args.selectorCountSlot,
      data: hre.ethers.zeroPadValue(
        hre.ethers.toBeHex(currentSelectors.length),
        32,
      ),
    });

    // compare expected values to on-chain values to determine which slots need to be rewritten

    const slotsToUpdate: { slot: bigint; data: string }[] = [];

    for (const slot of slots) {
      const observed = await hre.network.provider.send('eth_getStorageAt', [
        args.diamond,
        hre.ethers.toBeHex(slot.slot),
        blockNumber,
      ]);

      if (observed !== slot.data) {
        // TODO: too many slots don't match
        console.log('>');
        console.log(observed);
        console.log(slot.data);

        slotsToUpdate.push(slot);
      }
    }

    console.log(slotsToUpdate);

    return slotsToUpdate;
  });
