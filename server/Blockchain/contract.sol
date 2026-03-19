// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FedShieldCoordinator {

    // ─────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────

    struct GlobalModelVersion {
        uint256 version;
        uint256 round;
        string ipfsCID;
        uint256 timestamp;
        address recordedBy;
    }

    struct ClientUpdate {
        address nodeAddress;
        string ipfsCID;
        uint256 timestamp;
        string metadata;
    }

    struct NodeRequest {
        address requester;
        uint256 timestamp;
        bool reviewed;
        bool approved;
    }

    // ─────────────────────────────────────────────
    // State Variables
    // ─────────────────────────────────────────────

    address public owner;

    uint256 public currentRound;

    GlobalModelVersion[] public modelVersionHistory;

    mapping(uint256 => ClientUpdate[]) public roundClientUpdates;

    mapping(uint256 => mapping(address => bool)) public hasSubmitted;

    mapping(address => bool) public authorizedNodes;

    NodeRequest[] public nodeRequests;

    mapping(address => bool) public hasRequested;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event NodeAuthorized(address indexed node);
    event NodeRevoked(address indexed node);

    event NodeRequestSubmitted(address indexed requester, uint256 requestId);
    event NodeRequestReviewed(address indexed requester, bool approved);

    event ClientUpdateSubmitted(
        address indexed node,
        uint256 indexed round,
        string ipfsCID,
        string metadata
    );

    event GlobalModelUpdated(
        uint256 indexed version,
        uint256 indexed round,
        string ipfsCID,
        address recordedBy
    );

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        currentRound = 0;
    }

    // ─────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedNodes[msg.sender], "Node not authorised");
        _;
    }

    // ─────────────────────────────────────────────
    // Node Request System
    // ─────────────────────────────────────────────

    function requestNodeAccess() external {

        require(!authorizedNodes[msg.sender], "Already authorised");
        require(!hasRequested[msg.sender], "Request already submitted");

        nodeRequests.push(
            NodeRequest({
                requester: msg.sender,
                timestamp: block.timestamp,
                reviewed: false,
                approved: false
            })
        );

        hasRequested[msg.sender] = true;

        emit NodeRequestSubmitted(msg.sender, nodeRequests.length - 1);
    }

    function reviewNodeRequest(uint256 requestId, bool approve) external onlyOwner {

        require(requestId < nodeRequests.length, "Invalid request");

        NodeRequest storage req = nodeRequests[requestId];

        require(!req.reviewed, "Already reviewed");

        req.reviewed = true;
        req.approved = approve;

        if (approve) {
            authorizedNodes[req.requester] = true;
            emit NodeAuthorized(req.requester);
        }

        emit NodeRequestReviewed(req.requester, approve);
    }

    function getNodeRequests() external view returns (NodeRequest[] memory) {
        return nodeRequests;
    }

    // ─────────────────────────────────────────────
    // Node Management (Owner Direct Control)
    // ─────────────────────────────────────────────

    function addNode(address _node) external onlyOwner {
        authorizedNodes[_node] = true;
        emit NodeAuthorized(_node);
    }

    function revokeNode(address _node) external onlyOwner {
        authorizedNodes[_node] = false;
        emit NodeRevoked(_node);
    }

    // ─────────────────────────────────────────────
    // Client Submission (Federated Learning Nodes)
    // ─────────────────────────────────────────────

    function submitLocalUpdate(
        string memory _ipfsCID,
        string memory _metadata
    ) external onlyAuthorized {

        require(
            !hasSubmitted[currentRound][msg.sender],
            "Already submitted for this round"
        );

        hasSubmitted[currentRound][msg.sender] = true;

        roundClientUpdates[currentRound].push(
            ClientUpdate({
                nodeAddress: msg.sender,
                ipfsCID: _ipfsCID,
                timestamp: block.timestamp,
                metadata: _metadata
            })
        );

        emit ClientUpdateSubmitted(
            msg.sender,
            currentRound,
            _ipfsCID,
            _metadata
        );
    }

    // ─────────────────────────────────────────────
    // Global Model Update (Aggregation done off-chain)
    // ─────────────────────────────────────────────

    function updateGlobalModel(string memory _newCID) external onlyOwner {
        _recordGlobalModel(_newCID);
        currentRound++;
    }

    // ─────────────────────────────────────────────
    // Read Functions
    // ─────────────────────────────────────────────

    function getLatestModelCID() external view returns (string memory) {
        require(modelVersionHistory.length > 0, "No model recorded yet");
        return modelVersionHistory[modelVersionHistory.length - 1].ipfsCID;
    }

    function totalModelVersions() external view returns (uint256) {
        return modelVersionHistory.length;
    }

    function getAllModelVersions()
        external
        view
        returns (GlobalModelVersion[] memory)
    {
        return modelVersionHistory;
    }

    function getClientUpdatesForRound(uint256 _round)
        external
        view
        returns (ClientUpdate[] memory)
    {
        return roundClientUpdates[_round];
    }

    function getClientUpdateCount(uint256 _round)
        external
        view
        returns (uint256)
    {
        return roundClientUpdates[_round].length;
    }

    // ─────────────────────────────────────────────
    // Internal Function
    // ─────────────────────────────────────────────

    function _recordGlobalModel(string memory _cid) internal {

        uint256 newVersion = modelVersionHistory.length + 1;

        modelVersionHistory.push(
            GlobalModelVersion({
                version: newVersion,
                round: currentRound,
                ipfsCID: _cid,
                timestamp: block.timestamp,
                recordedBy: msg.sender
            })
        );

        emit GlobalModelUpdated(
            newVersion,
            currentRound,
            _cid,
            msg.sender
        );
    }
}