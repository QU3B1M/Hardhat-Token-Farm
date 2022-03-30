// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract TokenFarm is AccessControlEnumerable {
    IERC20 public immutable qbmToken;
    address[] public allowedTokens;
    address[] public stakers;
    mapping(address => mapping(address => uint256)) public stakingBalance;
    mapping(address => uint256) public uniqueTokensStaked;

    constructor(address _qbmToken) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        qbmToken = IERC20(_qbmToken);
    }

    function issueTokens() public {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),"TokenFarm: Only an admin can issue tokens.");
        for (uint256 i = 0; i < stakers.length; i++) {
            address staker = stakers[i];
            uint256 staked = uniqueTokensStaked[staker];
            qbmToken.transfer(staker, staked);
            uniqueTokensStaked[staker] = 0;
        }
    }

    function stakeTokens(uint256 _amount, address _token) public {
        require(_amount > 0, "TokenFarm: Amount must be greater than 0.");
        require(tokenIsAllowed(_token), "TokenFarm: Token is not allowed.");
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        updateUniqueTokensStaked(msg.sender, _token);
        stakingBalance[_token][msg.sender] += _amount;
        if (uniqueTokensStaked[msg.sender] == 1) {
            stakers.push(msg.sender);
        }
    }

    function updateUniqueTokensStaked(address _staker, address _token) internal {
        if (stakingBalance[_token][_staker] == 0) {
            uniqueTokenStaked[_staker]++;
        }
    }

    function getUserTotalValue(address _user) public view returns (uint256) {
        require(uniqueTokensStaked[_user] > 0, "TokenFarm: User has no tokens staked.");
        uint256 total = 0;
        for (uint256 i = 0; i < allowedTokens.length; i++) {
            total += getUserSingleTokenValue(_user, allowedTokens[i]);
        }
        return total;
    }

    function addAllowedToken(address _token) public {
        require(!tokenIsAllowed(_token),"TokenFarm: Token is already allowed.");
        allowedTokens.push(_token);
    }

    function tokenIsAllowed(address _token) public view returns (bool) {
        for (uint256 i = 0; i < allowedTokens.length; i++) {
            if (allowedTokens[i] == _token) {
                return true;
            }
        }
    }
}
