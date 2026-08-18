const walletRepository = require('../repositories/walletRepository');
const ApiError = require('../utils/ApiError');

class WalletService {
  async getUserTransactions(userId, page, limit) {
    return walletRepository.getUserTransactions(userId, page, limit);
  }
  
  async getUserBalance(userId) {
    const balance = await walletRepository.getUserBalance(userId);
    
    return {
      totalCredit: parseFloat(balance.total_credit || 0),
      totalDebit: parseFloat(balance.total_debit || 0),
      currentBalance: parseFloat(balance.balance || 0),
    };
  }
}

module.exports = new WalletService();