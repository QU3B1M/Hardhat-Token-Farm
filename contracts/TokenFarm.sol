// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract TokenFarm is AccessControlEnumerable {
    IERC20 public immutable qbmToken;

    constructor(address _qbmToken) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        qbmToken = IERC20(_qbmToken);
    }
}
