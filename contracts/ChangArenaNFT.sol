// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChangArenaNFT
 * @notice สัญญาอัจฉริยะสำหรับจัดการตั๋ว NFT เข้าชมสนามช้างอารีนา (บุรีรัมย์ ยูไนเต็ด)
 * รองรับทั้งตั๋วรายแมตช์ (Single Match) และตั๋วรายปี (Season Pass)
 */
contract ChangArenaNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;

    enum TicketType { SINGLE_MATCH, SEASON_PASS }

    struct TicketInfo {
        TicketType ticketType;
        string tierName;      // เช่น PLATINUM, EAST_A10, WEST, NORTH
        string seatZone;      // โซนที่นั่ง เช่น A10, Stand-W
        string seatNumber;    // เลขที่นั่ง เช่น Seat-14 หรือ FREE_SEATING
        string targetMatchId; // สำหรับ SINGLE_MATCH เช่น BRU-vs-MU-2026
        uint256 seasonYear;   // เช่น 2026
        bool isUsedSingle;    // สถานะสำหรับตั๋วรายแมตช์
    }

    // tokenId => ข้อมูลตั๋ว
    mapping(uint256 => TicketInfo) public tickets;

    // สำหรับตั๋วรายปี : tokenId => (matchId => สถานะเข้าชมในนัดนั้น)
    mapping(uint256 => mapping(string => bool)) public seasonMatchCheckedIn;

    // สิทธิ์เจ้าหน้าที่ประตูสนาม (Gatekeeper)
    mapping(address => bool) public isStaff;

    // Events
    event TicketMinted(uint256 indexed tokenId, address indexed to, TicketType tType, string tierName);
    event CheckedIn(uint256 indexed tokenId, string matchId, address indexed staff, uint256 timestamp);
    event StaffUpdated(address indexed staff, bool status);

    modifier onlyStaffOrOwner() {
        require(msg.sender == owner() || isStaff[msg.sender], "Unauthorized : Staff only");
        _;
    }

    constructor() ERC721("Chang Arena NFT Ticket", "BRU-TKT") Ownable(msg.sender) {
        isStaff[msg.sender] = true;
    }

    function setStaffStatus(address staff, bool status) external onlyOwner {
        isStaff[staff] = status;
        emit StaffUpdated(staff, status);
    }

    // 1. Mint ตั๋วรายแมตช์ (Single Match)
    function mintSingleTicket(
        address to,
        string memory tokenURI,
        string memory tierName,
        string memory seatZone,
        string memory seatNumber,
        string memory matchId
    ) external onlyStaffOrOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        tickets[tokenId] = TicketInfo({
            ticketType: TicketType.SINGLE_MATCH,
            tierName: tierName,
            seatZone: seatZone,
            seatNumber: seatNumber,
            targetMatchId: matchId,
            seasonYear: 2026,
            isUsedSingle: false
        });

        emit TicketMinted(tokenId, to, TicketType.SINGLE_MATCH, tierName);
        return tokenId;
    }

    // 2. Mint ตั๋วรายปี (Season Pass)
    function mintSeasonPass(
        address to,
        string memory tokenURI,
        string memory tierName,
        string memory seatZone,
        string memory seatNumber,
        uint256 seasonYear
    ) external onlyStaffOrOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        tickets[tokenId] = TicketInfo({
            ticketType: TicketType.SEASON_PASS,
            tierName: tierName,
            seatZone: seatZone,
            seatNumber: seatNumber,
            targetMatchId: "",
            seasonYear: seasonYear,
            isUsedSingle: false
        });

        emit TicketMinted(tokenId, to, TicketType.SEASON_PASS, tierName);
        return tokenId;
    }

    // 3. ฟังก์ชันตรวจบัตรเข้าประตูสนาม (Gate Check-in)
    function checkInEntry(uint256 tokenId, string memory currentMatchId) external onlyStaffOrOwner {
        require(_ownerOf(tokenId) != address(0), "Error : Ticket does not exist");
        TicketInfo storage t = tickets[tokenId];

        if (t.ticketType == TicketType.SINGLE_MATCH) {
            require(
                keccak256(bytes(t.targetMatchId)) == keccak256(bytes(currentMatchId)),
                "Invalid Match : Ticket not valid for this game"
            );
            require(!t.isUsedSingle, "Fraud Alert : Single ticket already used");
            t.isUsedSingle = true;
        } else {
            require(
                !seasonMatchCheckedIn[tokenId][currentMatchId],
                "Fraud Alert : Season pass already scanned for this match"
            );
            seasonMatchCheckedIn[tokenId][currentMatchId] = true;
        }

        emit CheckedIn(tokenId, currentMatchId, msg.sender, block.timestamp);
    }

    // 4. ดึงข้อมูลรายละเอียดตั๋ว
    function getTicketDetails(uint256 tokenId) external view returns (TicketInfo memory) {
        require(_ownerOf(tokenId) != address(0), "Error : Ticket does not exist");
        return tickets[tokenId];
    }
}
