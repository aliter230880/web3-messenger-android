// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title IdentityV2
 * @dev Контракт профилей пользователей (улучшенная версия)
 * 
 * Функции:
 * - Регистрация профиля (никнейм + аватар)
 * - Проверка уникальности никнеймов
 * - Поиск по никнейму
 */
contract IdentityV2 is Initializable, OwnableUpgradeable {
    struct Profile {
        string nickname;
        uint256 avatarId;
        uint256 createdAt;
        bool exists;
    }
    
    // Маппинг адрес → профиль
    mapping(address => Profile) public profiles;
    
    // Маппинг никнейм → адрес (для проверки уникальности)
    mapping(string => address) public nicknameToAddress;
    
    // Счётчик пользователей
    uint256 public totalUsers;
    
    // События
    event ProfileRegistered(
        address indexed user,
        string nickname,
        uint256 avatarId,
        uint256 timestamp
    );
    
    event ProfileUpdated(
        address indexed user,
        string oldNickname,
        string newNickname,
        uint256 newAvatarId
    );
    
    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }
    
    /**
     * @dev Регистрация профиля
     * @param nickname Уникальный никнейм
     * @param avatarId ID аватара (0-27)
     */
    function registerProfile(
        string calldata nickname,
        uint256 avatarId
    ) external {
        require(bytes(nickname).length > 0, "Empty nickname");
        require(bytes(nickname).length <= 30, "Nickname too long");
        require(avatarId <= 27, "Invalid avatar ID");
        
        // Проверка что профиль ещё не создан
        require(!profiles[msg.sender].exists, "Profile already exists");
        
        // Проверка уникальности никнейма
        require(
            nicknameToAddress[nickname] == address(0),
            "Nickname already taken"
        );
        
        // Создание профиля
        profiles[msg.sender] = Profile({
            nickname: nickname,
            avatarId: avatarId,
            createdAt: block.timestamp,
            exists: true
        });
        
        nicknameToAddress[nickname] = msg.sender;
        totalUsers++;
        
        emit ProfileRegistered(msg.sender, nickname, avatarId, block.timestamp);
    }
    
    /**
     * @dev Обновление профиля
     * @param nickname Новый никнейм (можно пустой для сохранения текущего)
     * @param avatarId Новый ID аватара
     */
    function updateProfile(
        string calldata nickname,
        uint256 avatarId
    ) external {
        require(profiles[msg.sender].exists, "Profile does not exist");
        
        Profile storage profile = profiles[msg.sender];
        string memory oldNickname = profile.nickname;
        
        // Обновление никнейма
        if (bytes(nickname).length > 0) {
            require(bytes(nickname).length <= 30, "Nickname too long");
            require(
                nicknameToAddress[nickname] == address(0) ||
                nicknameToAddress[nickname] == msg.sender,
                "Nickname already taken"
            );
            
            // Освобождаем старый никнейм
            delete nicknameToAddress[oldNickname];
            
            // Регистрируем новый
            nicknameToAddress[nickname] = msg.sender;
            profile.nickname = nickname;
        }
        
        // Обновление аватара
        if (avatarId <= 27) {
            profile.avatarId = avatarId;
        }
        
        emit ProfileUpdated(msg.sender, oldNickname, profile.nickname, profile.avatarId);
    }
    
    /**
     * @dev Получение профиля по адресу
     */
    function getProfile(address user) external view returns (
        string memory nickname,
        uint256 avatarId,
        uint256 createdAt,
        bool exists
    ) {
        Profile memory profile = profiles[user];
        return (
            profile.nickname,
            profile.avatarId,
            profile.createdAt,
            profile.exists
        );
    }
    
    /**
     * @dev Проверка существования профиля
     */
    function profileExists(address user) external view returns (bool) {
        return profiles[user].exists;
    }
    
    /**
     * @dev Поиск адреса по никнейму
     */
    function getAddressByNickname(string calldata nickname) external view returns (address) {
        return nicknameToAddress[nickname];
    }
    
    /**
     * @dev Проверка доступности никнейма
     */
    function isNicknameAvailable(string calldata nickname) external view returns (bool) {
        return nicknameToAddress[nickname] == address(0);
    }
}
