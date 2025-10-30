// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title VeryMarket Order Receipt NFT
/// @notice Automatically mints a proof-of-purchase NFT when an order is completed
contract ReceiptNFT is ERC721URIStorage, Ownable {
    address public marketplace;
    uint256 public nextTokenId;

    /// @notice Emitted when a receipt NFT is minted
    event ReceiptMinted(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 indexed orderId,
        string tokenURI
    );

    /// @notice Restricts certain functions to only the marketplace contract
    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "Not marketplace");
        _;
    }

    /// @param _marketplace The deployed marketplace contract address
    /// @param _owner The owner of the contract
    constructor(address _marketplace, address _owner) ERC721("VeryMarket Receipt", "VMR") Ownable(_owner) {
        require(_marketplace != address(0), "Invalid marketplace");
        marketplace = _marketplace;
    }

    /// @notice Mints a receipt NFT for a completed order
    /// @param buyer The wallet of the order’s buyer
    /// @param orderId The corresponding marketplace order ID
    /// @param tokenURI The IPFS URL (metadata JSON)
    function mintReceipt(
        address buyer,
        uint256 orderId,
        string memory tokenURI
    ) external onlyMarketplace returns (uint256) {
        uint256 tokenId = ++nextTokenId;
        _safeMint(buyer, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit ReceiptMinted(tokenId, buyer, orderId, tokenURI);
        return tokenId;
    }

    /// @notice Allows the contract owner to change the marketplace address
    /// @param _marketplace New marketplace contract address
    function updateMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Invalid marketplace");
        marketplace = _marketplace;
    }
}