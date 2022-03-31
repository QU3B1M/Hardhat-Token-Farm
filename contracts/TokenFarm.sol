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
    mapping(address => address) public tokenPriceFeed;

    constructor(address _qbmToken) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        qbmToken = IERC20(_qbmToken);
    }

    function setPriceFeed(address _tokenPriceFeed) public {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "TokenFarm: Only admins can set the price feed");
        tokenPriceFeed[_tokenPriceFeed] = _tokenPriceFeed;
    }

    function issueTokens() public {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),"TokenFarm: Only admins can issue tokens.");
        for (uint256 i = 0; i < stakers.length; i++) {
            address staker = stakers[i];
            uint256 staked = uniqueTokensStaked[staker];
            qbmToken.transfer(staker, staked);
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
            uniqueTokensStaked[_staker]++;
        }
    }

    function getUserTotalValue(address _staker) public view returns (uint256) {
        require(uniqueTokensStaked[_staker] > 0, "TokenFarm: User has no tokens staked.");
        uint256 total = 0;
        for (uint256 i = 0; i < allowedTokens.length; i++) {
            total += getUserSingleTokenValue(_staker, allowedTokens[i]);
        }
        return total;
    }

    function getUserSingleTokenValue(address _staker, address _token) public view returns (uint256) {
        require(tokenIsAllowed(_token), "TokenFarm: Token is not allowed.");
        if (uniqueTokensStaked[_staker] == 0) {
            return 0;
        }
        (uint256 price, uint256 decimals) = getTokenValue(_token);
        return (price * stakingBalance[_token][_staker]) / (10 ** decimals);
    }

    function getTokenValue(address _token) public view returns (uint256, uint256) {
        require(tokenIsAllowed(_token), "TokenFarm: Token is not allowed.");
        AggregatorV3Interface priceFeed = AggregatorV3Interface(tokenPriceFeed[_token]);
        (,int256 price,,,) = priceFeed.latestRoundData();
        uint256 decimals = uint256(priceFeed.decimals());
        return (uint256(price), decimals);
    }

    function addAllowedToken(address _token) public {
        require(!tokenIsAllowed(_token),"TokenFarm: Token is already allowed.");
        allowedTokens.push(_token);
    }

    function unstakeTokens(address _token) public {
        uint256 balance = stakingBalance[_token][msg.sender];
        require(tokenIsAllowed(_token), "TokenFarm: Token is not allowed.");
        require(uniqueTokensStaked[msg.sender] > 0, "TokenFarm: User has no tokens staked.");
        IERC20(_token).transfer(msg.sender, balance);
        if (uniqueTokensStaked[msg.sender] == 1) {
            _removeStaker(msg.sender);
        }
        uniqueTokensStaked[msg.sender]--;
        stakingBalance[_token][msg.sender] = 0;
    }

    function _removeStaker(address _staker) internal {
        for (uint256 i = 0; i < stakers.length; i++) {
            if (stakers[i] == _staker) {
                delete stakers[i];
                break;
            }
        }
    }

    function tokenIsAllowed(address _token) public view returns (bool) {
        for (uint256 i = 0; i < allowedTokens.length; i++) {
            if (allowedTokens[i] == _token) {
                return true;
            }
        }
        return false;
    }
}
