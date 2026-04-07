// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract InventoryProvenance {

    enum EventType {
        Manufactured,
        Inspected,
        Shipped,
        Received,
        Stored,
        Sold,
        Returned
    }

    struct ProvenanceEvent {
        bytes32 eventHash;
        bytes32 previousHash;
        EventType eventType;
        address actor;
        uint48 timestamp;
        string productId;
        string location;
        string metadataURI;
    }

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    /// @notice Contract owner — can manage authorized actors.
    address public owner;

    /// @notice Addresses allowed to record provenance events.
    mapping(address => bool) public authorizedActors;

    /// @notice productId → ordered list of event indices in `allEvents`.
    mapping(string => uint256[]) private _productChains;

    /// @notice Flat append-only log of every event ever recorded.
    ProvenanceEvent[] public allEvents;

    /// @notice productId → latest event hash (head of the chain).
    mapping(string => bytes32) public chainHead;

    /// @notice Total events recorded (convenience getter).
    uint256 public totalEvents;

    // ──────────────────────────────────────────────
    //  Events (logs)
    // ──────────────────────────────────────────────

    event EventRecorded(
        uint256 indexed eventIndex,
        string indexed productId,
        EventType eventType,
        bytes32 eventHash,
        address actor
    );

    event ActorAuthorized(address indexed actor);
    event ActorRevoked(address indexed actor);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error Unauthorized();
    error ZeroAddress();
    error EmptyProductId();
    error ChainIntegrityBroken(string productId, bytes32 expected, bytes32 provided);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedActors[msg.sender] && msg.sender != owner) revert Unauthorized();
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        authorizedActors[msg.sender] = true;
        emit ActorAuthorized(msg.sender);
    }

    // ──────────────────────────────────────────────
    //  Admin functions
    // ──────────────────────────────────────────────

    /// @notice Transfer contract ownership.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Authorize an address to record events.
    function authorizeActor(address actor) external onlyOwner {
        if (actor == address(0)) revert ZeroAddress();
        authorizedActors[actor] = true;
        emit ActorAuthorized(actor);
    }

    /// @notice Revoke an address's recording rights.
    function revokeActor(address actor) external onlyOwner {
        authorizedActors[actor] = false;
        emit ActorRevoked(actor);
    }

    // ──────────────────────────────────────────────
    //  Core: record a provenance event
    // ──────────────────────────────────────────────

    /**
     * @notice Append an immutable event to a product's provenance chain.
     * @param productId  Off-chain product identifier (SKU or UUID).
     * @param eventType  Enum representing what happened.
     * @param location   Human-readable location string.
     * @param metadataURI  IPFS CID or URL pointing to full event metadata JSON.
     * @return eventIndex  Index in the global `allEvents` array.
     * @return eventHash   The computed hash for this block.
     */
    function recordEvent(
        string calldata productId,
        EventType eventType,
        string calldata location,
        string calldata metadataURI
    ) external onlyAuthorized returns (uint256 eventIndex, bytes32 eventHash) {
        if (bytes(productId).length == 0) revert EmptyProductId();

        bytes32 prevHash = chainHead[productId]; // 0x0 for first event

        // Compute the block hash — links to previous hash for chain integrity
        eventHash = keccak256(
            abi.encodePacked(
                prevHash,
                productId,
                eventType,
                msg.sender,
                block.timestamp,
                location,
                metadataURI
            )
        );

        ProvenanceEvent memory evt = ProvenanceEvent({
            eventHash: eventHash,
            previousHash: prevHash,
            eventType: eventType,
            actor: msg.sender,
            timestamp: uint48(block.timestamp),
            productId: productId,
            location: location,
            metadataURI: metadataURI
        });

        eventIndex = allEvents.length;
        allEvents.push(evt);
        _productChains[productId].push(eventIndex);
        chainHead[productId] = eventHash;
        totalEvents = allEvents.length;

        emit EventRecorded(eventIndex, productId, eventType, eventHash, msg.sender);
    }

    // ──────────────────────────────────────────────
    //  Query functions
    // ──────────────────────────────────────────────

    /// @notice Get the number of events for a product.
    function getChainLength(string calldata productId) external view returns (uint256) {
        return _productChains[productId].length;
    }

    /// @notice Get all event indices for a product (then fetch each with `allEvents(i)`).
    function getProductChain(string calldata productId) external view returns (uint256[] memory) {
        return _productChains[productId];
    }

    /// @notice Convenience: return a single event by index.
    function getEvent(uint256 index) external view returns (ProvenanceEvent memory) {
        return allEvents[index];
    }

    /// @notice Paginated event retrieval for a product's chain.
    /// @param offset Start position in the product's chain array.
    /// @param limit  Max number of events to return.
    function getProductEvents(
        string calldata productId,
        uint256 offset,
        uint256 limit
    ) external view returns (ProvenanceEvent[] memory events) {
        uint256[] storage chain = _productChains[productId];
        uint256 chainLen = chain.length;

        if (offset >= chainLen) {
            return new ProvenanceEvent[](0);
        }

        uint256 end = offset + limit;
        if (end > chainLen) {
            end = chainLen;
        }
        uint256 count = end - offset;

        events = new ProvenanceEvent[](count);
        for (uint256 i = 0; i < count; i++) {
            events[i] = allEvents[chain[offset + i]];
        }
    }

    // ──────────────────────────────────────────────
    //  Verification
    // ──────────────────────────────────────────────

    /**
     * @notice Walk a product's chain and verify hash linkage.
     * @param productId The product to verify.
     * @return valid True if the entire chain is consistent.
     * @return length Number of events in the chain.
     */
    function verifyChain(string calldata productId)
        external
        view
        returns (bool valid, uint256 length)
    {
        uint256[] storage chain = _productChains[productId];
        length = chain.length;

        if (length == 0) return (true, 0);

        // First block must reference 0x0
        if (allEvents[chain[0]].previousHash != bytes32(0)) {
            return (false, length);
        }

        for (uint256 i = 1; i < length; i++) {
            if (allEvents[chain[i]].previousHash != allEvents[chain[i - 1]].eventHash) {
                return (false, length);
            }
        }

        return (true, length);
    }

    /**
     * @notice Verify a single event's hash is correct (not tampered).
     * @param index Global event index.
     * @return valid True if recomputed hash matches the stored eventHash.
     */
    function verifyEvent(uint256 index) external view returns (bool valid) {
        ProvenanceEvent storage evt = allEvents[index];

        bytes32 recomputed = keccak256(
            abi.encodePacked(
                evt.previousHash,
                evt.productId,
                evt.eventType,
                evt.actor,
                uint256(evt.timestamp),
                evt.location,
                evt.metadataURI
            )
        );

        return recomputed == evt.eventHash;
    }
}
