import { task, types } from 'hardhat/config';

task(
  'storage-calculate-diff',
  'Calculate the storage changes needed to repair diamond proxy',
)
  .addParam('diamond', 'Address of the diamond proxy', undefined, types.string)
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
    const blockNumber = await hre.network.provider.send('eth_blockNumber', []);

    const storageLayoutSlot = BigInt(
      hre.ethers.solidityPackedKeccak256(['string'], [args.storageLayoutSeed]),
    );

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
    const facetsMapping: {
      [selector: string]: { index: number; target: string; removed: boolean };
    } = {};

    for (const { data } of events) {
      const [facetCuts] = hre.ethers.AbiCoder.defaultAbiCoder().decode(
        ['(address,uint8,bytes4[])[]', 'address', 'bytes'],
        data,
      );

      for (const [target, action, selectors] of facetCuts) {
        if (action === 0n) {
          for (const selector of selectors) {
            const index = currentSelectors.indexOf(selector);

            if (index !== -1) {
              throw new Error('invalid DiamondCut');
            }

            currentSelectors.push(selector);

            facetsMapping[selector] = {
              index: currentSelectors.length - 1,
              target,
              removed: false,
            };
          }
        } else {
          for (const selector of selectors) {
            const index = currentSelectors.indexOf(selector);

            if (index === -1) {
              throw new Error('invalid DiamondCut');
            }

            if (action === 1n) {
              facetsMapping[selector] = { index, target, removed: false };
            }

            if (action === 2n) {
              currentSelectors[index] =
                currentSelectors[currentSelectors.length - 1];
              currentSelectors.pop();

              facetsMapping[selector].removed = true;
            }
          }
        }
      }
    }

    // group selectors into buckets of 8, as they would be stored in the EVM

    const packedSelectors = currentSelectors
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

    // declare array to track expected storage data

    const slots: { note: string; slot: bigint; data: string }[] = [];

    // calculate storage slot of each selector group, including those expected to be empty

    for (let i = 0; i < packedSelectors.length; i++) {
      const data = packedSelectors[i];

      const slot = BigInt(
        hre.ethers.solidityPackedKeccak256(
          ['uint256', 'uint256'],
          [i, storageLayoutSlot + args.selectorMappingOffset],
        ),
      );

      const note = `packed selectors index ${i}`;

      slots.push({ note, slot, data });
    }

    // calculate storage slot and data for each entry in the facets mapping

    for (const selector in facetsMapping) {
      const { index, target, removed } = facetsMapping[selector];

      const slot = BigInt(
        hre.ethers.solidityPackedKeccak256(
          ['bytes32', 'uint256'],
          [
            hre.ethers.zeroPadBytes(selector, 32),
            storageLayoutSlot + args.facetsMappingOffset,
          ],
        ),
      );

      const data = removed
        ? hre.ethers.ZeroHash
        : hre.ethers.solidityPacked(
            ['address', 'bytes10', 'uint16'],
            [target, '0x00000000000000000000', index],
          );

      const note = `facets mapping: ${target} / ${index}`;

      slots.push({ note, slot, data });
    }

    // include slot of selector count

    slots.push({
      note: 'selector count',
      slot: storageLayoutSlot + args.selectorCountOffset,
      data: hre.ethers.zeroPadValue(
        hre.ethers.toBeHex(currentSelectors.length),
        32,
      ),
    });

    // check high-index slots that should be empty

    while (slots.length < 32) {
      const slot = BigInt(
        hre.ethers.solidityPackedKeccak256(
          ['uint256', 'uint256'],
          [slots.length - 1, storageLayoutSlot + args.selectorMappingOffset],
        ),
      );

      const data = hre.ethers.ZeroHash;

      const note = `packed selectors index ${i}`;

      slots.push({ note, slot, data });
    }

    // compare expected values to on-chain values to determine which slots need to be rewritten

    const slotsToUpdate: {
      note: string;
      slot: bigint;
      data: string;
      observed: string;
    }[] = [];

    for (const slot of slots) {
      const observed = await hre.network.provider.send('eth_getStorageAt', [
        args.diamond,
        hre.ethers.toBeHex(slot.slot),
        blockNumber,
      ]);

      if (observed !== slot.data) {
        slotsToUpdate.push({ ...slot, observed });
      }
    }

    console.log(slotsToUpdate);

    return slotsToUpdate;
  });
