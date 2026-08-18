const db = require('../config/database');

class TokenRepository {
  async create(userId, tokenHash, expiresAt, ipAddress, userAgent) {
    const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, expires_at
    `;
    
    const result = await db.query(query, [userId, tokenHash, expiresAt, ipAddress, userAgent]);
    return result.rows[0];
  }
  
  async findByTokenHash(tokenHash) {
    const query = 'SELECT * FROM refresh_tokens WHERE token_hash = $1';
    const result = await db.query(query, [tokenHash]);
    return result.rows[0];
  }
  
  async revoke(tokenId) {
    const query = `
      UPDATE refresh_tokens 
      SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    await db.query(query, [tokenId]);
  }
  
  async revokeAllForUser(userId) {
    const query = `
      UPDATE refresh_tokens 
      SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP 
      WHERE user_id = $1 AND is_revoked = FALSE
    `;
    await db.query(query, [userId]);
  }
}

module.exports = new TokenRepository();