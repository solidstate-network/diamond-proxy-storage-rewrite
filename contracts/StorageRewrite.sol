// SPDX-License-Identifier: TODO

pragma solidity ^0.8.0;

/**
 * @notice Contract for writing arbitrary data to arbitrary storage slots
 * @dev deploy as EIP-2535 Diamond facet
 */
contract StorageRewrite {
    struct Slot {
        uint256 slot;
        bytes32 data;
    }

    address private immutable AUTHORIZED_SENDER;

    constructor(address authorizedSender) {
        AUTHORIZED_SENDER = authorizedSender;
    }

    /**
     * @notice write arbitrary data to arbitrary storage slots
     * @dev reverts if sender is not the authorizedSender defined at deployment time
     * @param slots array of Slot structs indicating which data to write to which storage slots
     */
    function rewrite(Slot[] calldata slots) external {
        require(msg.sender == AUTHORIZED_SENDER);

        for (uint256 i = 0; i < slots.length; i++) {
            uint256 slot = slots[i].slot;
            bytes32 data = slots[i].data;

            assembly {
                sstore(slot, data)
            }
        }
    }
}
