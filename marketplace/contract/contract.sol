// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**

VeryMarket Marketplace
Flow:
Seller registers a Store (name, desc, location, phone, image).
Seller creates Listings (linked to their Store).
Buyer creates an Order Request (inputs buyerLocation, reserves qty).
Seller sets shippingFee + estimatedDeliveryDays.
Buyer accepts + pays -> escrow (price*qty + shipping).
Seller marks Shipped.
Buyer confirms Delivery -> funds released to seller.
Buyer can rate seller (positive/negative + comment).
Refunds possible pre-shipping.
Disputes possible -> mediator resolves split.
*/

contract Marketplace is ReentrancyGuard, Ownable {
enum OrderStatus {
None,
Requested,
ShippingSet,
Escrowed,
Shipped,
Disputed,
Refunded,
Released
}

struct Store {  
    uint256 id;  
    address owner;  
    string name;  
    string description;  
    string location;  
    string phoneNumber;  
    string image;  
    uint256 positiveRatings;  
    uint256 negativeRatings;  
    bool exists;  
}  

struct Listing {  
    address seller;  
    address paymentToken;   
    uint256 price;          
    string title;  
    string uri;             
    bool active;  
    uint256 quantity;       
    uint256 initialQuantity;  
    uint256 storeId;        
    string category;        
    string dateAdded;       
    string description;     
}  

struct Order {  
    address buyer;  
    address seller;  
    uint256 listingId;  
    address paymentToken;  
    uint256 amount;         
    uint256 quantity;       
    uint256 shippingFee;    
    uint16 estimatedDeliveryDays;   
    string buyerLocation;   
    OrderStatus status;  
    bool fundsEscrowed;  
    bool completed;  
    string buyerComment;  
    bool rated;  
    uint64 createdAt;  
}  

// fees & roles  
uint96 public feeBps;  
address public feeCollector;  
address public mediator;  

// counters  
uint256 public storeCount;  
uint256 public listingCount;  
uint256 public orderCount;  

// storage  
mapping(uint256 => Store) public stores;  
mapping(address => uint256) public storeByOwner;  
mapping(uint256 => Listing) public listings;  
mapping(uint256 => Order) public orders;  
mapping(address => uint256[]) public userOrders;  

// approved tokens  
mapping(address => bool) public approvedTokens;  
address[] public approvedTokenList;  

// events  
event StoreCreated(uint256 indexed storeId, address indexed owner, string name, string image);  
event StoreUpdated(uint256 indexed storeId);  

event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 storeId, address paymentToken, uint256 price, string title, uint256 quantity);  
event ListingUpdated(uint256 indexed listingId, uint256 price, bool active, uint256 quantity);  
event ListingCanceled(uint256 indexed listingId);  

event OrderRequested(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer, uint256 quantity);  
event ShippingSet(uint256 indexed orderId, uint256 shippingFee, uint16 etaDays);  
event OrderConfirmedAndPaid(uint256 indexed orderId, uint256 totalAmount);  
event MarkedShipped(uint256 indexed orderId);  
event DeliveryConfirmed(uint256 indexed orderId, uint256 sellerAmount, uint256 feeAmount);  
event Refunded(uint256 indexed orderId, uint256 amount);  
event DisputeOpened(uint256 indexed orderId, address opener);  
event DisputeResolved(uint256 indexed orderId, uint256 toBuyer, uint256 toSellerNet);  
event TokenApproved(address token, bool approved);  
event OrderCanceledByBuyer(uint256 indexed orderId);  
event SellerRated(uint256 indexed storeId, address indexed buyer, bool positive, string comment);  

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

// ---------------- STORES ----------------  

function createStore(  
    string calldata name,  
    string calldata description,  
    string calldata location,  
    string calldata phoneNumber,  
    string calldata image  
) external returns (uint256 id) {  
    require(storeByOwner[msg.sender] == 0, "store exists");  
    storeCount += 1;  
    id = storeCount;  

    stores[id] = Store({  
        id: id,  
        owner: msg.sender,  
        name: name,  
        description: description,  
        location: location,  
        phoneNumber: phoneNumber,  
        image: image,  
        positiveRatings: 0,  
        negativeRatings: 0,  
        exists: true  
    });  

    storeByOwner[msg.sender] = id;  
    emit StoreCreated(id, msg.sender, name, image);  
}  

function updateStore(  
    uint256 storeId,  
    string calldata name,  
    string calldata description,  
    string calldata location,  
    string calldata phoneNumber,  
    string calldata image  
) external {  
    Store storage S = stores[storeId];  
    require(S.exists, "no store");  
    require(S.owner == msg.sender, "not owner");  

    S.name = name;  
    S.description = description;  
    S.location = location;  
    S.phoneNumber = phoneNumber;  
    S.image = image;  

    emit StoreUpdated(storeId);  
}  

// ---------------- ADMIN ----------------  

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

// ---------------- LISTINGS ----------------  

function createListing(  
    address paymentToken,  
    uint256 price,  
    string calldata title,  
    string calldata uri,  
    uint256 quantity,  
    uint256 storeId,  
    string calldata category,  
    string calldata dateAdded,  
    string calldata description  
) external returns (uint256 id) {  
    require(price > 0, "price=0");  
    require(quantity > 0, "quantity=0");  
    require(approvedTokens[paymentToken], "token not approved");  
    require(storeId != 0 && stores[storeId].exists, "invalid store");  
    require(stores[storeId].owner == msg.sender, "not store owner");  

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
        initialQuantity: quantity,  
        storeId: storeId,  
        category: category,  
        dateAdded: dateAdded,  
        description: description  
    });  

    emit ListingCreated(id, msg.sender, storeId, paymentToken, price, title, quantity);  
}  

function updateListing(uint256 listingId, uint256 price, bool active, uint256 quantity) external {  
    Listing storage L = listings[listingId];  
    require(L.seller == msg.sender, "not seller");  
    require(price > 0, "price=0");  
    L.price = price;  
    L.active = active;  
    L.quantity = quantity;  
    emit ListingUpdated(listingId, price, active, quantity);  
}  

function deactivateListing(uint256 listingId) external {  
    Listing storage L = listings[listingId];  
    require(L.seller == msg.sender, "not seller");  
    L.active = false;  
    emit ListingUpdated(listingId, L.price, false, L.quantity);  
}  

function cancelListingIfNoSales(uint256 listingId) external {  
    Listing storage L = listings[listingId];  
    require(L.seller == msg.sender, "not seller");  
    require(L.quantity == L.initialQuantity, "has sales");  
    delete listings[listingId];  
    emit ListingCanceled(listingId);  
}  

// ---------------- ORDERS ----------------  

function createOrderRequest(uint256 listingId, uint256 quantity, string calldata buyerLocation)  
    external  
    returns (uint256 id)  
{  
    Listing storage L = listings[listingId];  
    require(L.active, "listing inactive");  
    require(quantity > 0 && quantity <= L.quantity, "bad qty");  

    orderCount += 1;  
    id = orderCount;  

    orders[id] = Order({  
        buyer: msg.sender,  
        seller: L.seller,  
        listingId: listingId,  
        paymentToken: L.paymentToken,  
        amount: L.price * quantity,  
        quantity: quantity,  
        shippingFee: 0,  
        estimatedDeliveryDays: 0,  
        buyerLocation: buyerLocation,  
        status: OrderStatus.Requested,  
        fundsEscrowed: false,  
        completed: false,  
        buyerComment: "",  
        rated: false,  
        createdAt: uint64(block.timestamp)  
    });  

    userOrders[msg.sender].push(id);  
    userOrders[L.seller].push(id);  

    L.quantity -= quantity;  

    emit OrderRequested(id, listingId, msg.sender, quantity);  
}  

function sellerSetShipping(uint256 orderId, uint256 shippingFee, uint16 etaDays) external {  
    Order storage O = orders[orderId];  
    require(O.status == OrderStatus.Requested, "bad status");  
    require(msg.sender == O.seller, "not seller");  

    O.shippingFee = shippingFee;  
    O.estimatedDeliveryDays = etaDays;  
    O.status = OrderStatus.ShippingSet;  

    emit ShippingSet(orderId, shippingFee, etaDays);  
}  

function buyerConfirmAndPay(uint256 orderId) external payable nonReentrant {  
    Order storage O = orders[orderId];  
    require(msg.sender == O.buyer, "not buyer");  
    require(O.status == OrderStatus.ShippingSet, "bad status");  
    uint256 total = O.amount + O.shippingFee;  

    if (O.paymentToken == address(0)) {  
        require(msg.value == total, "bad eth");  
    } else {  
        require(msg.value == 0, "no eth");  
        IERC20(O.paymentToken).transferFrom(msg.sender, address(this), total);  
    }  

    O.status = OrderStatus.Escrowed;  
    O.fundsEscrowed = true;  
    emit OrderConfirmedAndPaid(orderId, total);  
}  

function markShipped(uint256 orderId) external {  
    Order storage O = orders[orderId];  
    require(msg.sender == O.seller, "not seller");  
    require(O.status == OrderStatus.Escrowed, "bad status");  
    O.status = OrderStatus.Shipped;  
    emit MarkedShipped(orderId);  
}  

function confirmDelivery(uint256 orderId, bool positive, string calldata comment) external nonReentrant {  
    Order storage O = orders[orderId];  
    require(msg.sender == O.buyer, "not buyer");  
    require(O.status == OrderStatus.Shipped, "bad status");  

    uint256 total = O.amount + O.shippingFee;  
    uint256 feeAmt = (total * feeBps) / 10000;  
    uint256 sellerAmt = total - feeAmt;  

    if (O.paymentToken == address(0)) {  
        payable(O.seller).transfer(sellerAmt);  
        payable(feeCollector).transfer(feeAmt);  
    } else {  
        IERC20 token = IERC20(O.paymentToken);  
        token.transfer(O.seller, sellerAmt);  
        token.transfer(feeCollector, feeAmt);  
    }  

    O.status = OrderStatus.Released;  
    O.completed = true;  
    O.buyerComment = comment;  
    O.rated = true;  

    uint256 storeId = listings[O.listingId].storeId;  
    if (positive) {  
        stores[storeId].positiveRatings += 1;  
    } else {  
        stores[storeId].negativeRatings += 1;  
    }  

    emit DeliveryConfirmed(orderId, sellerAmt, feeAmt);  
    emit SellerRated(storeId, O.buyer, positive, comment);  
}  

function buyerCancelBeforeEscrow(uint256 orderId) external {  
    Order storage O = orders[orderId];  
    require(msg.sender == O.buyer, "not buyer");  
    require(O.status == OrderStatus.Requested, "bad status");  

    listings[O.listingId].quantity += O.quantity;  
    O.status = OrderStatus.None;  

    emit OrderCanceledByBuyer(orderId);  
}  

function buyerCancelAndRefund(uint256 orderId) external nonReentrant {  
    Order storage O = orders[orderId];  
    require(msg.sender == O.buyer, "not buyer");  
    require(O.status == OrderStatus.Escrowed, "bad status");  

    uint256 total = O.amount + O.shippingFee;  

    if (O.paymentToken == address(0)) {  
        payable(O.buyer).transfer(total);  
    } else {  
        IERC20(O.paymentToken).transfer(O.buyer, total);  
    }  

    listings[O.listingId].quantity += O.quantity;  
    O.status = OrderStatus.Refunded;  

    emit Refunded(orderId, total);  
}  

function openDispute(uint256 orderId) external {  
    Order storage O = orders[orderId];  
    require(msg.sender == O.buyer || msg.sender == O.seller, "not party");  
    require(O.status == OrderStatus.Escrowed || O.status == OrderStatus.Shipped, "bad status");  

    O.status = OrderStatus.Disputed;  
    emit DisputeOpened(orderId, msg.sender);  
}  

function resolveDispute(uint256 orderId, uint256 refundToBuyer, uint256 payoutToSeller)  
    external  
    nonReentrant  
{  
    require(msg.sender == mediator, "not mediator");  
    Order storage O = orders[orderId];  
    require(O.status == OrderStatus.Disputed, "not disputed");  

    uint256 total = O.amount + O.shippingFee;  
    require(refundToBuyer + payoutToSeller <= total, "exceeds total");  

    uint256 feeAmt = (payoutToSeller * feeBps) / 10000;  
    uint256 sellerNet = payoutToSeller - feeAmt;  

    if (O.paymentToken == address(0)) {  
        if (refundToBuyer > 0) payable(O.buyer).transfer(refundToBuyer);  
        if (sellerNet > 0) payable(O.seller).transfer(sellerNet);  
        if (feeAmt > 0) payable(feeCollector).transfer(feeAmt);  
    } else {  
        IERC20 token = IERC20(O.paymentToken);  
        if (refundToBuyer > 0) token.transfer(O.buyer, refundToBuyer);  
        if (sellerNet > 0) token.transfer(O.seller, sellerNet);  
        if (feeAmt > 0) token.transfer(feeCollector, feeAmt);  
    }  

    O.status = OrderStatus.Released;  
    O.completed = true;  
    emit DisputeResolved(orderId, refundToBuyer, sellerNet);  
}  

// ---------------- VIEW FUNCTIONS ----------------  

function getStore(uint256 storeId) external view returns (Store memory) {  
    return stores[storeId];  
}  

function getMyStore() external view returns (Store memory) {  
    uint256 id = storeByOwner[msg.sender];  
    require(id != 0, "no store");  
    return stores[id];  
}  

function getListing(uint256 listingId) external view returns (Listing memory) {  
    return listings[listingId];  
}  

function getAllListings() external view returns (Listing[] memory) {  
    Listing[] memory arr = new Listing[](listingCount);  
    for (uint256 i = 1; i <= listingCount; i++) {  
        arr[i - 1] = listings[i];  
    }  
    return arr;  
}  

function getActiveListings() external view returns (Listing[] memory) {  
    uint256 activeCount = 0;  
    for (uint256 i = 1; i <= listingCount; i++) {  
        if (listings[i].active) activeCount++;  
    }  
    Listing[] memory arr = new Listing[](activeCount);  
    uint256 idx = 0;  
    for (uint256 i = 1; i <= listingCount; i++) {  
        if (listings[i].active) {  
            arr[idx] = listings[i];  
            idx++;  
        }  
    }  
    return arr;  
}  

function getOrder(uint256 orderId) external view returns (Order memory) {  
    return orders[orderId];  
}  

function getOrdersForUser(address user) external view returns (Order[] memory) {  
    uint256[] memory ids = userOrders[user];  
    Order[] memory arr = new Order[](ids.length);  
    for (uint256 i = 0; i < ids.length; i++) {  
        arr[i] = orders[ids[i]];  
    }  
    return arr;  
}  

function getOrdersForListing(uint256 listingId) external view returns (Order[] memory) {  
    uint256 count;  
    for (uint256 i = 1; i <= orderCount; i++) {  
        if (orders[i].listingId == listingId) count++;  
    }  
    Order[] memory arr = new Order[](count);  
    uint256 idx = 0;  
    for (uint256 i = 1; i <= orderCount; i++) {  
        if (orders[i].listingId == listingId) {  
            arr[idx] = orders[i];  
            idx++;  
        }  
    }  
    return arr;  
}  

function getOrdersForStore(uint256 storeId) external view returns (Order[] memory) {  
    uint256 count;  
    for (uint256 i = 1; i <= orderCount; i++) {  
        if (listings[orders[i].listingId].storeId == storeId) count++;  
    }  
    Order[] memory arr = new Order[](count);  
    uint256 idx = 0;  
    for (uint256 i = 1; i <= orderCount; i++) {  
        if (listings[orders[i].listingId].storeId == storeId) {  
            arr[idx] = orders[i];  
            idx++;  
        }  
    }  
    return arr;  
}  

function getStoreListings(uint256 storeId) external view returns (Listing[] memory) {  
    uint256 count;  
    for (uint256 i = 1; i <= listingCount; i++) {  
        if (listings[i].storeId == storeId) count++;  
    }  
    Listing[] memory arr = new Listing[](count);  
    uint256 idx = 0;  
    for (uint256 i = 1; i <= listingCount; i++) {  
        if (listings[i].storeId == storeId) {  
            arr[idx] = listings[i];  
            idx++;  
        }  
    }  
    return arr;  
}  

function getStoreByAddress(address owner) external view returns (Store memory) {  
    uint256 id = storeByOwner[owner];  
    require(id != 0, "store not found");  
    return stores[id];  
}  

function getAllStores() external view returns (Store[] memory) {  
    Store[] memory allStores = new Store[](storeCount);  
    for (uint256 i = 1; i <= storeCount; i++) {  
        allStores[i - 1] = stores[i];  
    }  
    return allStores;  
}  

// ---------------- MISC ----------------  

function emergencyWithdraw(address token, uint256 amount) external onlyOwner {  
    if (token == address(0)) {  
        payable(owner()).transfer(amount);  
    } else {  
        IERC20(token).transfer(owner(), amount);  
    }  
}  

receive() external payable {}  
fallback() external payable {}

}