// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HederaUSDC {
    string public name = "HederaUSDC";
    string public symbol = "USDC";
    uint8 public decimals = 18;
    uint public totalSupply;
    address public owner;

    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
    event Mint(address indexed to, uint value);
    event Withdrawn(uint amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        _mint(msg.sender, 1_000_000 * (10 ** uint(decimals))); // Initial mint
    }

    function _mint(address to, uint amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    function mint(address to, uint amount) external onlyOwner {
        _mint(to, amount);
    }

    function transfer(address to, uint amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Allowance exceeded");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    // 🔓 Owner withdraws collected HBAR
    function withdraw() external onlyOwner {
        uint balance = address(this).balance;
        require(balance > 0, "No HBAR to withdraw");
        payable(owner).transfer(balance);
        emit Withdrawn(balance);
    }

    // 🔎 View contract HBAR balance
    function contractBalance() external view returns (uint) {
        return address(this).balance;
    }

    // ✅ Accept HBAR sent directly to contract
    receive() external payable {}

    fallback() external payable {}
}
