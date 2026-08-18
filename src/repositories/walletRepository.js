const db = require('../config/database');

class WalletRepository {
  async createTransaction(transactionData) {
    const query = `
      INSERT INTO wallet_transactions (
        user_id, booking_id, type, amount,
        transaction_type, description, reference_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const params = [
      transactionData.userId,
      transactionData.bookingId,
      transactionData.type,
      transactionData.amount,
      transactionData.transactionType,
      transactionData.description,
      transactionData.referenceId,
    ];
    
    const result = await db.query(query, params);
    return result.rows[0];
  }
  
  async getUserTransactions(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const countQuery = 'SELECT COUNT(*) as total FROM wallet_transactions WHERE user_id = $1';
    const countResult = await db.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total);
    
    const dataQuery = `
      SELECT * FROM wallet_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(dataQuery, [userId, limit, offset]);
    
    return {
      transactions: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
  async getUserBalance(userId) {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as total_credit,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as balance
      FROM wallet_transactions
      WHERE user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
  
  async createCommissionTransaction(client, transactionData) {
    const query = `
      INSERT INTO wallet_transactions (
        user_id, booking_id, type, amount,
        transaction_type, description, reference_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const params = [
      transactionData.userId,
      transactionData.bookingId,
      transactionData.type,
      transactionData.amount,
      transactionData.transactionType,
      transactionData.description,
      transactionData.referenceId,
    ];
    
    const result = await client.query(query, params);
    return result.rows[0];
  }
}

module.exports = new WalletRepository();