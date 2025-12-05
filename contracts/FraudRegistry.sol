// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract FraudRegistry {
    address public owner;
    mapping(address => bool) public blacklistedAccounts;
    mapping(address => uint256) public blacklistTimestamp;
    mapping(address => string) public fraudType;
    
    address[] private blacklistArray;
    
    event AccountBlacklisted(address indexed account, string fraudType, uint256 timestamp);
    event AccountRemoved(address indexed account, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function blacklistAccount(address account) external onlyOwner {
        require(!blacklistedAccounts[account], "Account already blacklisted");
        
        blacklistedAccounts[account] = true;
        blacklistTimestamp[account] = block.timestamp;
        fraudType[account] = "FLAGGED";
        blacklistArray.push(account);
        
        emit AccountBlacklisted(account, "FLAGGED", block.timestamp);
    }
    
    function blacklistAccountWithType(address account, string calldata _fraudType) external onlyOwner {
        require(!blacklistedAccounts[account], "Account already blacklisted");
        
        blacklistedAccounts[account] = true;
        blacklistTimestamp[account] = block.timestamp;
        fraudType[account] = _fraudType;
        blacklistArray.push(account);
        
        emit AccountBlacklisted(account, _fraudType, block.timestamp);
    }
    
    function removeFromBlacklist(address account) external onlyOwner {
        require(blacklistedAccounts[account], "Account not blacklisted");
        
        blacklistedAccounts[account] = false;
        
        for (uint256 i = 0; i < blacklistArray.length; i++) {
            if (blacklistArray[i] == account) {
                blacklistArray[i] = blacklistArray[blacklistArray.length - 1];
                blacklistArray.pop();
                break;
            }
        }
        
        emit AccountRemoved(account, block.timestamp);
    }
    
    function isBlacklisted(address account) external view returns (bool) {
        return blacklistedAccounts[account];
    }
    
    function getBlacklistInfo(address account) external view returns (
        bool isBlacklistedStatus,
        uint256 timestamp,
        string memory _fraudType
    ) {
        return (
            blacklistedAccounts[account],
            blacklistTimestamp[account],
            fraudType[account]
        );
    }
    
    function getAllBlacklisted() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < blacklistArray.length; i++) {
            if (blacklistedAccounts[blacklistArray[i]]) {
                count++;
            }
        }
        
        address[] memory result = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < blacklistArray.length; i++) {
            if (blacklistedAccounts[blacklistArray[i]]) {
                result[index] = blacklistArray[i];
                index++;
            }
        }
        
        return result;
    }
    
    function getBlacklistCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < blacklistArray.length; i++) {
            if (blacklistedAccounts[blacklistArray[i]]) {
                count++;
            }
        }
        return count;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}