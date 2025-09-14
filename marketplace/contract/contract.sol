// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * VeryMarket Marketplace
 * - Listings with price, token, title, URI, quantity
 * - Buy into escrow (ETH or ERC20)
 * - Seller marks shipped; Buyer confirms delivery (fee taken then)
 * - Disputes resolved by owner/mediator with split
 * - Quantity auto-decrements on purchase; auto-deactivates at 0
 * - NEW: Seller can cancel listing ONLY if no sales yet
 * - NEW: Buyer can cancel order while Escrowed (pre-ship): full refund + restock
 */
contract Marketplace is ReentrancyGuard, Ownable {
    enum OrderStatus { None, Escrowed, Shipped, Disputed, Refunded, Released }

    struct Listing {
        address seller;
        address paymentToken; // address(0) = native coin
        uint256 price;        // in smallest units (wei for native)
        string title;
        string uri;           // JSON/IPFS metadata
        bool active;
        uint256 quantity;     // current units available
        uint256 initialQuantity; // snapshot to know if any sale happened
    }

    struct Order {
        address buyer;
        address seller;
        uint256 listingId;
        address paymentToken;
        uint256 amount;       // total price (price * quantity)
        uint256 quantity;     // quantity bought
        OrderStatus status;
        uint64 createdAt;
    }

    // fees & roles
    uint96 public feeBps;
    address public feeCollector;
    address public mediator;

    // counters
    uint256 public listingCount;
    uint256 public orderCount;

    // storage
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;

    // approved tokens + enumeration
    mapping(address => bool) public approvedTokens;
    address[] public approvedTokenList;

    // events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address paymentToken,
        uint256 price,
        string title,
        string uri,
        uint256 quantity
    );
    event ListingUpdated(uint256 indexed listingId, uint256 price, bool active, uint256 quantity);
    event ListingCanceled(uint256 indexed listingId); // NEW

    event Purchased(
        uint256 indexed orderId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount,
        uint256 quantity,
        address paymentToken
    );
    event MarkedShipped(uint256 indexed orderId);
    event DeliveryConfirmed(uint256 indexed orderId, uint256 sellerAmount, uint256 feeAmount);
    event Refunded(uint256 indexed orderId, uint256 amount);
    event DisputeOpened(uint256 indexed orderId, address opener);
    event DisputeResolved(uint256 indexed orderId, uint256 toBuyer, uint256 toSellerNet);
    event VerychatSuggestedThread(uint256 indexed orderId, string threadHint);
    event TokenApproved(address token, bool approved);

    event OrderCanceledByBuyer(uint256 indexed orderId); // NEW

    // ----------------------
    // Constructor
    // ----------------------
    constructor(
        uint96 _feeBps,
        address _feeCollector,
        address _mediator,
        address[] memory initialTokens
    ) Ownable(msg.sender) {
        require(_feeCollector != address(0), "feeCollector=0");
        require(_mediator != address(0), "mediator=0");
        require(_feeBps <= 2000, "fee too high");

        feeBps = _feeBps;
        feeCollector = _feeCollector;
        mediator = _mediator;

        for (uint256 i = 0; i < initialTokens.length; i++) {
            address t = initialTokens[i];
            if (!approvedTokens[t]) {
                approvedTokens[t] = true;
                approvedTokenList.push(t);
                emit TokenApproved(t, true);
            }
        }
    }

    // ----------------------
    // Admin
    // ----------------------
    function setFees(uint96 _feeBps, address _collector) external onlyOwner {
        require(_collector != address(0), "collector=0");
        require(_feeBps <= 2000, "fee too high");
        feeBps = _feeBps;
        feeCollector = _collector;
    }

    function setMediator(address _mediator) external onlyOwner {
        require(_mediator != address(0), "mediator=0");
        mediator = _mediator;
    }

    function approveToken(address token, bool approved) external onlyOwner {
        approvedTokens[token] = approved;
        if (approved && !_existsInList(token)) {
            approvedTokenList.push(token);
        }
        emit TokenApproved(token, approved);
    }

    function getApprovedTokens() external view returns (address[] memory) {
        return approvedTokenList;
    }

    function _existsInList(address token) internal view returns (bool) {
        for (uint256 i = 0; i < approvedTokenList.length; i++) {
            if (approvedTokenList[i] == token) return true;
        }
        return false;
    }

    // ----------------------
    // Listings
    // ----------------------
    function createListing(
        address paymentToken,
        uint256 price,
        string calldata title,
        string calldata uri,
        uint256 quantity
    ) external returns (uint256 id) {
        require(price > 0, "price=0");
        require(quantity > 0, "quantity=0");
        require(approvedTokens[paymentToken], "token not approved");

        listingCount += 1;
        id = listingCount;

        listings[id] = Listing({
            seller: msg.sender,
            paymentToken: paymentToken,
            price: price,
            title: title,
            uri: uri,
            active: true,
            quantity: quantity,
            initialQuantity: quantity
        });

        emit ListingCreated(id, msg.sender, paymentToken, price, title, uri, quantity);
    }

    function updateListing(
        uint256 listingId,
        uint256 price,
        bool active,
        uint256 quantity
    ) external {
        Listing storage L = listings[listingId];
        require(L.seller == msg.sender, "not seller");
        // You may allow price update, active toggle, and quantity reset upward/downward
        if (price > 0) L.price = price;
        L.active = active;
        L.quantity = quantity;
        // Keep initialQuantity unchanged; it represents "ever sold" detection baseline
        emit ListingUpdated(listingId, L.price, L.active, L.quantity);
    }

    function deactivateListing(uint256 listingId) external {
        Listing storage L = listings[listingId];
        require(L.seller == msg.sender, "not seller");
        require(L.active, "already inactive");
        L.active = false;
        emit ListingUpdated(listingId, L.price, false, L.quantity);
    }

    /**
     * NEW: Hard-cancel a listing ONLY if nothing has been sold yet.
     * We detect "no sales yet" by checking quantity == initialQuantity.
     * If any unit was sold, seller must keep listing history; they can only deactivate.
     */
    function cancelListingIfNoSales(uint256 listingId) external {
        Listing storage L = listings[listingId];
        require(L.seller == msg.sender, "not seller");
        require(L.active, "inactive");
        require(L.quantity == L.initialQuantity, "some units sold");
        L.active = false;
        emit ListingCanceled(listingId);
    }

    // ----------------------
    // Buy / Escrow
    // ----------------------
    function buy(
        uint256 listingId,
        uint256 quantity,
        string calldata verychatThreadHint
    ) external payable nonReentrant returns (uint256 orderId) {
        Listing storage L = listings[listingId];
        require(L.active, "inactive");
        require(L.price > 0, "bad price");
        require(quantity > 0 && quantity <= L.quantity, "invalid quantity");
        require(approvedTokens[L.paymentToken], "token not approved");

        uint256 totalAmount = L.price * quantity;

        orderCount += 1;
        orderId = orderCount;

        orders[orderId] = Order({
            buyer: msg.sender,
            seller: L.seller,
            listingId: listingId,
            paymentToken: L.paymentToken,
            amount: totalAmount,
            quantity: quantity,
            status: OrderStatus.Escrowed,
            createdAt: uint64(block.timestamp)
        });

        userOrders[msg.sender].push(orderId);
        userOrders[L.seller].push(orderId);

        if (L.paymentToken == address(0)) {
            require(msg.value == totalAmount, "wrong value");
        } else {
            require(msg.value == 0, "do not send native");
            bool ok = IERC20(L.paymentToken).transferFrom(msg.sender, address(this), totalAmount);
            require(ok, "erc20 transferFrom failed");
        }

        // reduce available quantity
        L.quantity -= quantity;
        if (L.quantity == 0) L.active = false;

        emit Purchased(orderId, listingId, msg.sender, totalAmount, quantity, L.paymentToken);
        if (bytes(verychatThreadHint).length > 0) {
            emit VerychatSuggestedThread(orderId, verychatThreadHint);
        }
    }

    // ----------------------
    // Seller / Buyer / Admin functions
    // ----------------------
    function markShipped(uint256 orderId) external {
        Order storage O = orders[orderId];
        require(O.seller == msg.sender, "not seller");
        require(O.status == OrderStatus.Escrowed, "bad status");
        O.status = OrderStatus.Shipped;
        emit MarkedShipped(orderId);
    }

    function confirmDelivery(uint256 orderId) external nonReentrant {
        Order storage O = orders[orderId];
        require(O.buyer == msg.sender, "not buyer");
        require(O.status == OrderStatus.Escrowed || O.status == OrderStatus.Shipped, "bad status");

        O.status = OrderStatus.Released;
        (uint256 feeAmt, uint256 sellerAmt) = _split(O.amount);

        if (O.paymentToken == address(0)) {
            if (feeAmt > 0) {
                (bool f,) = payable(feeCollector).call{value: feeAmt}("");
                require(f, "fee send failed");
            }
            (bool s,) = payable(O.seller).call{value: sellerAmt}("");
            require(s, "seller send failed");
        } else {
            IERC20 token = IERC20(O.paymentToken);
            if (feeAmt > 0) require(token.transfer(feeCollector, feeAmt), "fee erc20 failed");
            require(token.transfer(O.seller, sellerAmt), "seller erc20 failed");
        }

        emit DeliveryConfirmed(orderId, sellerAmt, feeAmt);
    }

    function openDispute(uint256 orderId) external {
        Order storage O = orders[orderId];
        require(msg.sender == O.buyer || msg.sender == O.seller, "not party");
        require(O.status == OrderStatus.Escrowed || O.status == OrderStatus.Shipped, "bad status");
        O.status = OrderStatus.Disputed;
        emit DisputeOpened(orderId, msg.sender);
    }

    /**
     * NEW: Buyer can cancel while order is still in ESCROW (pre-ship).
     * - Full refund to buyer.
     * - Restock listing quantity and reactivate if needed.
     * - No fee taken (since trade didn’t complete).
     */
    function cancelOrderByBuyer(uint256 orderId) external nonReentrant {
        Order storage O = orders[orderId];
        require(O.buyer == msg.sender, "not buyer");
        require(O.status == OrderStatus.Escrowed, "only while escrowed");

        O.status = OrderStatus.Refunded;

        // refund
        if (O.paymentToken == address(0)) {
            (bool b,) = payable(O.buyer).call{value: O.amount}("");
            require(b, "refund native failed");
        } else {
            IERC20 token = IERC20(O.paymentToken);
            require(token.transfer(O.buyer, O.amount), "refund erc20 failed");
        }

        // restock listing
        Listing storage L = listings[O.listingId];
        L.quantity += O.quantity;
        if (L.quantity > 0) {
            L.active = true;
        }

        emit OrderCanceledByBuyer(orderId);
        emit Refunded(orderId, O.amount);
    }

    function refundBuyer(uint256 orderId) external nonReentrant {
        require(msg.sender == mediator || msg.sender == owner(), "not mediator");
        Order storage O = orders[orderId];
        require(O.status == OrderStatus.Disputed, "order not disputed");

        O.status = OrderStatus.Refunded;
        if (O.paymentToken == address(0)) {
            (bool b,) = payable(O.buyer).call{value: O.amount}("");
            require(b, "refund native failed");
        } else {
            IERC20 token = IERC20(O.paymentToken);
            require(token.transfer(O.buyer, O.amount), "refund erc20 failed");
        }

        emit Refunded(orderId, O.amount);
    }

    function releaseToSeller(uint256 orderId, uint16 buyerPercent) external nonReentrant {
        require(msg.sender == mediator || msg.sender == owner(), "not mediator");
        require(buyerPercent <= 10000, "invalid percent");

        Order storage O = orders[orderId];
        require(O.status == OrderStatus.Disputed, "order not disputed");

        O.status = OrderStatus.Released;

        uint256 toBuyer = (O.amount * buyerPercent) / 10000;
        uint256 toSellerGross = O.amount - toBuyer;
        (uint256 feeAmt, uint256 toSellerNet) = _split(toSellerGross);

        if (O.paymentToken == address(0)) {
            if (toBuyer > 0) {
                (bool b,) = payable(O.buyer).call{value: toBuyer}("");
                require(b, "buyer pay failed");
            }
            if (toSellerNet > 0) {
                (bool s,) = payable(O.seller).call{value: toSellerNet}("");
                require(s, "seller pay failed");
            }
            if (feeAmt > 0) {
                (bool f,) = payable(feeCollector).call{value: feeAmt}("");
                require(f, "fee pay failed");
            }
        } else {
            IERC20 token = IERC20(O.paymentToken);
            if (toBuyer > 0) require(token.transfer(O.buyer, toBuyer), "erc20 buyer failed");
            if (toSellerNet > 0) require(token.transfer(O.seller, toSellerNet), "erc20 seller failed");
            if (feeAmt > 0) require(token.transfer(feeCollector, feeAmt), "erc20 fee failed");
        }

        emit DisputeResolved(orderId, toBuyer, toSellerNet);
    }

    // ----------------------
    // Views / Helpers
    // ----------------------
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function getOrdersByUser(address user) external view returns (Order[] memory) {
        uint256[] storage ids = userOrders[user];
        Order[] memory result = new Order[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = orders[ids[i]];
        }
        return result;
    }

    function _split(uint256 amount) internal view returns (uint256 feeAmt, uint256 sellerAmt) {
        feeAmt = (amount * feeBps) / 10000;
        sellerAmt = amount - feeAmt;
    }

    // Emergency withdraw (owner only) — for stuck tokens/ETH
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(0)) {
            (bool s,) = payable(owner()).call{value: amount}("");
            require(s, "withdraw native failed");
        } else {
            require(IERC20(token).transfer(owner(), amount), "withdraw erc20 failed");
        }
    }

    receive() external payable {}
    fallback() external payable {}
}