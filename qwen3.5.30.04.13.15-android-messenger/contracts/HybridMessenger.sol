// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title HybridMessenger
 * @dev Контракт для хранения метаданных сообщений (хэши) при использовании XMTP
 * 
 * Для гибридной архитектуры:
 * - XMTP хранит сами сообщения (оффчейн, быстро, бесплатно)
 * - Этот контракт хранит только хэши (ончейн, для верификации)
 */
contract HybridMessenger is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    struct MessageMetadata {
        bytes32 messageHash;
        uint256 timestamp;
        bool isEncrypted;
    }
    
    // Маппинг хэшей сообщений
    mapping(bytes32 => MessageMetadata) public messageMetadata;
    
    // Маппинг диалогов (отсортированные адреса → массив хэшей)
    mapping(bytes32 => bytes32[]) public conversationHashes;
    
    // Счётчик сообщений
    uint256 public totalMessages;
    
    // События
    event MessageHashStored(
        bytes32 indexed hash,
        address indexed sender,
        address indexed recipient,
        uint256 timestamp
    );
    
    event ConversationCreated(
        address indexed userA,
        address indexed userB,
        bytes32 conversationKey
    );
    
    modifier onlyValidAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }
    
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
    }
    
    /**
     * @dev Сохранение хэша сообщения
     * @param recipient Адрес получателя
     * @param messageHash SHA-256 хэш сообщения
     */
    function storeMessageHash(
        address recipient,
        bytes32 messageHash
    ) external onlyValidAddress(recipient) nonReentrant {
        require(messageHash != bytes32(0), "Empty hash");
        
        // Создаём уникальный ключ для диалога (сортируем адреса)
        bytes32 conversationKey = _getConversationKey(msg.sender, recipient);
        
        // Сохраняем метаданные
        messageMetadata[messageHash] = MessageMetadata({
            messageHash: messageHash,
            timestamp: block.timestamp,
            isEncrypted: true
        });
        
        // Добавляем хэш в диалог
        conversationHashes[conversationKey].push(messageHash);
        
        totalMessages++;
        
        emit MessageHashStored(messageHash, msg.sender, recipient, block.timestamp);
        
        // Событие создания диалога (если первое сообщение)
        if (conversationHashes[conversationKey].length == 1) {
            emit ConversationCreated(msg.sender, recipient, conversationKey);
        }
    }
    
    /**
     * @dev Получение хэшей сообщений из диалога
     * @param userA Первый участник
     * @param userB Второй участник
     * @param startIndex Начальный индекс
     * @param count Количество сообщений
     */
    function getConversationHashes(
        address userA,
        address userB,
        uint256 startIndex,
        uint256 count
    ) external view returns (bytes32[] memory, uint256) {
        bytes32 conversationKey = _getConversationKey(userA, userB);
        bytes32[] memory hashes = conversationHashes[conversationKey];
        
        uint256 total = hashes.length;
        uint256 end = startIndex + count > total ? total : startIndex + count;
        
        if (startIndex >= total) {
            return (new bytes32[](0), total);
        }
        
        uint256 resultLength = end - startIndex;
        bytes32[] memory result = new bytes32[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = hashes[startIndex + i];
        }
        
        return (result, total);
    }
    
    /**
     * @dev Проверка существования хэша
     */
    function messageHashExists(bytes32 messageHash) external view returns (bool) {
        return messageMetadata[messageHash].timestamp != 0;
    }
    
    /**
     * @dev Получение количества сообщений в диалоге
     */
    function getConversationCount(address userA, address userB) external view returns (uint256) {
        bytes32 conversationKey = _getConversationKey(userA, userB);
        return conversationHashes[conversationKey].length;
    }
    
    /**
     * @dev Создание ключа диалога (сортировка адресов)
     */
    function _getConversationKey(address a, address b) internal pure returns (bytes32) {
        return a < b 
            ? keccak256(abi.encodePacked(a, b))
            : keccak256(abi.encodePacked(b, a));
    }
    
    /**
     * @dev Очистка старых хэшей (для экономии газа)
     */
    function clearOldHashes(
        address userA,
        address userB,
        uint256 count
    ) external onlyValidAddress(userA) onlyValidAddress(userB) {
        bytes32 conversationKey = _getConversationKey(userA, userB);
        bytes32[] storage hashes = conversationHashes[conversationKey];
        
        require(hashes.length > count, "Not enough hashes");
        
        // Очищаем первые count хэшей
        for (uint256 i = 0; i < count; i++) {
            delete messageMetadata[hashes[i]];
        }
        
        // Сдвигаем массив
        for (uint256 i = count; i < hashes.length; i++) {
            hashes[i - count] = hashes[i];
        }
        
        // Удаляем последние элементы
        for (uint256 i = 0; i < count; i++) {
            hashes.pop();
        }
    }
}
