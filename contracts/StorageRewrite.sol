// SPDX-License-Identifier: TODO

pragma solidity ^0.8.0;

contract StorageRewrite {
    struct Slot {
        uint256 slot;
        bytes32 data;
    }

    address private immutable AUTHORIZED_SENDER;

    constructor(address authorizedSender) {
        AUTHORIZED_SENDER = authorizedSender;
    }

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
